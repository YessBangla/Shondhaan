// routes/payments.js
const express = require("express");
const router = express.Router();
const mysql = require("mysql2");
const requireAuth = require("../middleware/requireAuth");
const {
  initiateShurjoPayCheckout,
  verifyShurjoPayPayment,
  paymentRecordFrom,
  isSuccessfulPayment,
} = require("../utils/shurjopay");
// NEW: turn a verified payment into an enrolled_packages row so the
// employer's job posts inherit the package's visibility.
const { enrollEmployerInPackage } = require("./enrolledPackages");

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'yessjob_backend',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
}).promise();

// Guarded — this used to crash the whole module at require-time if
// FRONTEND_URL wasn't set in .env, because .replace() was called on undefined.
if (!process.env.FRONTEND_URL) {
  console.warn("⚠️ FRONTEND_URL is not set in the backend environment");
}
const configuredFrontendUrls = String(
  process.env.FRONTEND_URL || process.env.FRONTEND_BASE_URL || ""
)
  .split(",")
  .map((url) => url.trim())
  .filter(Boolean);
const FRONTEND_URL =
  configuredFrontendUrls.find((url) => {
    try {
      const parsed = new URL(url);
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
      return false;
    }
  })?.replace(/\/+$/, "") || "https://shondhaan.com";

// -----------------------------------------------------------------------
// Initiate: create a ShurjoPay session for a job package and hand the
// browser off to ShurjoPay's hosted checkout page.
// -----------------------------------------------------------------------
router.post("/shurjopay/initiate", requireAuth, async (req, res) => {
  const { package_id, amount } = req.body;
  const employer_user_id = req.user?.id;

  if (!employer_user_id) return res.status(401).json({ message: "Unauthorized" });
  if (!package_id || !amount) return res.status(400).json({ message: "package_id ও amount আবশ্যক" });

  try {
    const order_id = `ORD-${Date.now()}-${employer_user_id}`;

    const spResponse = await initiateShurjoPayCheckout({
      amount,
      orderId: order_id,
      customerName: req.user?.name,
      customerEmail: req.user?.email,
      customerPhone: req.user?.phone,
      packageId: package_id,
    });

    const checkout_url = spResponse.checkout_url;
    if (!checkout_url) {
      console.error("ShurjoPay initiate: no checkout URL in response:", spResponse);
      return res.status(502).json({ message: "পেমেন্ট গেটওয়ে থেকে সাড়া পাওয়া যায়নি" });
    }

    const record = paymentRecordFrom(spResponse);
    // Keep the precise order ID sent to ShurjoPay.  ShurjoPay prepends the
    // merchant prefix (for example, `SPORD-...`) and returns that same value
    // to our callback.  Falling back to our unprefixed internal ID makes the
    // callback impossible to match when the initiate response omits order_id.
    const sp_order_id =
      spResponse.sp_order_id ||
      spResponse.customer_order_id ||
      record.sp_order_id ||
      record.order_id ||
      order_id;

    await pool.query(
      `INSERT INTO payment_transactions
        (employer_user_id, package_id, amount, order_id, sp_order_id, status, raw_response)
       VALUES (?, ?, ?, ?, ?, 'pending', ?)`,
      [employer_user_id, package_id, amount, order_id, sp_order_id, JSON.stringify(spResponse)]
    );

    res.json({ checkout_url });
  } catch (err) {
    console.error("POST /api/payments/shurjopay/initiate failed:", err);
    res.status(500).json({ message: err.message || "পেমেন্ট শুরু করতে সমস্যা হয়েছে" });
  }
});

// -----------------------------------------------------------------------
// Verify: ShurjoPay redirects the customer's browser here after completing
// payment. This is a GET (browser navigation), so no auth header is present.
// -----------------------------------------------------------------------
function callbackOrderId(req) {
  const rawOrderId = String(
    req.params.orderId ||
      req.query.order_id ||
      req.query.sp_order_id ||
      req.query.merchant_order_id ||
      ""
  ).trim();

  // Recover callbacks created by the earlier URL format:
  // `...?order_id=ORD-... ?order_id=<gateway-id>`. Express treats the
  // second question mark as part of the first value, while our internal
  // order ID is the portion before it.
  return rawOrderId.split("?")[0].trim();
}

function orderIdCandidates(orderId) {
  const candidates = new Set([orderId]);
  const prefix = String(process.env.SURJOPAY_MERCHANT_PREFIX || "").trim();

  // Be backward-compatible with rows created before we began saving the
  // gateway order ID.  Only remove the configured prefix, never arbitrary
  // characters from an order ID.
  if (prefix && orderId.startsWith(prefix)) {
    candidates.add(orderId.slice(prefix.length));
  }

  return [...candidates].filter(Boolean);
}

async function findTransactionByCallbackOrderId(orderId) {
  const candidates = orderIdCandidates(orderId);
  const placeholders = candidates.map(() => "?").join(", ");
  const [rows] = await pool.query(
    `SELECT * FROM payment_transactions
     WHERE order_id IN (${placeholders}) OR sp_order_id IN (${placeholders})
     ORDER BY id DESC LIMIT 1`,
    [...candidates, ...candidates]
  );
  return rows[0];
}

async function verifyCallback(req, res) {
  const orderId = callbackOrderId(req);

  if (!orderId) {
    return res.redirect(`${FRONTEND_URL}/employer/packages?payment=error&reason=missing_order_id`);
  }

  try {
    const txn = await findTransactionByCallbackOrderId(orderId);

    if (!txn) {
      return res.redirect(`${FRONTEND_URL}/employer/packages?payment=error&reason=not_found`);
    }

    // Already finalized (e.g. user hit back/refresh on this URL) — don't
    // re-process the payment, but do look up the enrollment it already
    // created so the redirect still carries enrolled_package_id.
    if (txn.status === "success") {
      const [enrolledRows] = await pool.query(
        `SELECT id FROM enrolled_packages WHERE payment_transaction_id = ? LIMIT 1`,
        [txn.id]
      );
      const enrolledPackageId = enrolledRows[0]?.id;
      const suffix = enrolledPackageId ? `&enrolled_package_id=${enrolledPackageId}` : "";
      return res.redirect(`${FRONTEND_URL}/jobs/post?package_id=${txn.package_id}&payment_type=prepaid&order_id=${txn.order_id}${suffix}`);
    }

    // Prefer the callback's gateway ID when it includes the configured
    // prefix. This also repairs payments whose old DB row saved only ORD-….
    const prefix = String(process.env.SURJOPAY_MERCHANT_PREFIX || "").trim();
    const spOrderIdToVerify =
      prefix && orderId.startsWith(prefix) ? orderId : txn.sp_order_id || orderId;
    const verification = await verifyShurjoPayPayment(spOrderIdToVerify);

    const record = Array.isArray(verification) ? verification[0] : paymentRecordFrom(verification);
    const isSuccess = isSuccessfulPayment(record);

    await pool.query(
      `UPDATE payment_transactions
       SET status = ?, raw_response = ?, sp_order_id = COALESCE(sp_order_id, ?)
       WHERE order_id = ?`,
      [isSuccess ? "success" : "failed", JSON.stringify(verification), record?.order_id || null, txn.order_id]
    );

    if (isSuccess) {
      // NEW: payment cleared -> create the enrolled_packages row so the
      // employer's next job post can draw its visibility/quota from it.
      let enrolledPackageId = null;
      try {
        const enrollment = await enrollEmployerInPackage({
          employer_user_id: txn.employer_user_id,
          package_id: txn.package_id,
          payment_transaction_id: txn.id,
          order_id: txn.order_id,
        });
        enrolledPackageId = enrollment.id;
      } catch (enrollErr) {
        // Payment already succeeded — don't fail the redirect over this,
        // but log loudly since it means the employer paid without getting
        // a usable enrollment. Worth an admin alert/retry job in practice.
        console.error(`Enrollment creation failed for order ${orderId}:`, enrollErr);
      }

      const suffix = enrolledPackageId ? `&enrolled_package_id=${enrolledPackageId}` : "";
      return res.redirect(`${FRONTEND_URL}/jobs/post?package_id=${txn.package_id}&payment_type=prepaid&order_id=${txn.order_id}${suffix}`);
    }
    return res.redirect(`${FRONTEND_URL}/employer/packages?payment=failed&order_id=${orderId}`);
  } catch (err) {
    console.error(`GET /api/payments/shurjopay/verify/${orderId} failed:`, err);
    return res.redirect(`${FRONTEND_URL}/employer/packages?payment=error`);
  }
}

// Prefer the path form generated for new payments; keep the query-only form
// so payments started with the earlier callback URL can still be recovered.
router.get("/shurjopay/verify", verifyCallback);
router.get("/shurjopay/verify/:orderId", verifyCallback);

// -----------------------------------------------------------------------
// Cancel: customer backed out of ShurjoPay checkout before paying.
// -----------------------------------------------------------------------
async function cancelCallback(req, res) {
  const orderId = callbackOrderId(req);

  if (!orderId) {
    return res.redirect(`${FRONTEND_URL}/employer/packages?payment=cancelled`);
  }

  try {
    const candidates = orderIdCandidates(orderId);
    const placeholders = candidates.map(() => "?").join(", ");
    await pool.query(
      `UPDATE payment_transactions SET status = 'cancelled'
       WHERE (order_id IN (${placeholders}) OR sp_order_id IN (${placeholders}))
         AND status IN ('initiated','pending')`,
      [...candidates, ...candidates]
    );
  } catch (err) {
    console.error(`GET /api/payments/shurjopay/cancel/${orderId} failed:`, err);
  }

  return res.redirect(`${FRONTEND_URL}/employer/packages?payment=cancelled&order_id=${orderId}`);
}

router.get("/shurjopay/cancel", cancelCallback);
router.get("/shurjopay/cancel/:orderId", cancelCallback);

module.exports = router;

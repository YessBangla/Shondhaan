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
const FRONTEND_URL = (process.env.FRONTEND_URL || process.env.FRONTEND_BASE_URL || "").replace(/\/+$/, "");

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
    const sp_order_id = record.sp_order_id || record.order_id || order_id;

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
router.get("/shurjopay/verify/:orderId", async (req, res) => {
  const { orderId } = req.params;

  try {
    const [rows] = await pool.query(
      `SELECT * FROM payment_transactions WHERE order_id = ? LIMIT 1`,
      [orderId]
    );
    const txn = rows[0];

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
      return res.redirect(`${FRONTEND_URL}/jobs/post?package_id=${txn.package_id}&payment_type=prepaid&order_id=${orderId}${suffix}`);
    }

    const spOrderIdToVerify = txn.sp_order_id || orderId;
    const verification = await verifyShurjoPayPayment(spOrderIdToVerify);

    const record = Array.isArray(verification) ? verification[0] : paymentRecordFrom(verification);
    const isSuccess = isSuccessfulPayment(record);

    await pool.query(
      `UPDATE payment_transactions
       SET status = ?, raw_response = ?, sp_order_id = COALESCE(sp_order_id, ?)
       WHERE order_id = ?`,
      [isSuccess ? "success" : "failed", JSON.stringify(verification), record?.order_id || null, orderId]
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
      return res.redirect(`${FRONTEND_URL}/jobs/post?package_id=${txn.package_id}&payment_type=prepaid&order_id=${orderId}${suffix}`);
    }
    return res.redirect(`${FRONTEND_URL}/employer/packages?payment=failed&order_id=${orderId}`);
  } catch (err) {
    console.error(`GET /api/payments/shurjopay/verify/${orderId} failed:`, err);
    return res.redirect(`${FRONTEND_URL}/employer/packages?payment=error`);
  }
});

// -----------------------------------------------------------------------
// Cancel: customer backed out of ShurjoPay checkout before paying.
// -----------------------------------------------------------------------
router.get("/shurjopay/cancel/:orderId", async (req, res) => {
  const { orderId } = req.params;

  try {
    await pool.query(
      `UPDATE payment_transactions SET status = 'cancelled' WHERE order_id = ? AND status IN ('initiated','pending')`,
      [orderId]
    );
  } catch (err) {
    console.error(`GET /api/payments/shurjopay/cancel/${orderId} failed:`, err);
  }

  return res.redirect(`${FRONTEND_URL}/employer/packages?payment=cancelled&order_id=${orderId}`);
});

module.exports = router;

const express = require("express");
const pool = require("../db");
const axios = require("axios");

const router = express.Router();
const FREE_PRODUCT_LIMIT = 5;
const publicBackendUrl = () => String(process.env.BACKEND_URL || "http://localhost:8081").replace(/\/$/, "");
const publicFrontendUrl = () => String(process.env.FRONTEND_URL || "http://localhost:8080").replace(/\/$/, "");
const surjoPayBaseUrl = () => String(process.env.SURJOPAY_BASE_URL || "https://sandbox.shurjopayment.com/api").replace(/\/$/, "");

function clientIp(req) {
  return String(req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1").split(",")[0].trim();
}

async function getSurjoPayToken() {
  const { SURJOPAY_USERNAME: username, SURJOPAY_PASSWORD: password, SURJOPAY_PREFIX: prefix } = process.env;
  if (!username || !password || !prefix) throw new Error("SurjoPay is not configured. Set SURJOPAY_USERNAME, SURJOPAY_PASSWORD and SURJOPAY_PREFIX.");
  const { data } = await axios.post(`${surjoPayBaseUrl()}/get_token`, { username, password });
  if (!data?.token) throw new Error(data?.message || "SurjoPay authentication failed");
  return data;
}

async function activatePaidPackage(purchaseId) {
  const [[purchase]] = await pool.query("SELECT * FROM mart_seller_packages WHERE id = ?", [purchaseId]);
  if (!purchase) throw new Error("Package purchase not found");
  if (purchase.status === "active") return;
  const [[pkg]] = await pool.query("SELECT * FROM mart_packages WHERE id = ?", [purchase.package_id]);
  const expiresAtSql = pkg.duration_days ? `DATE_ADD(NOW(), INTERVAL ${Number(pkg.duration_days)} DAY)` : "NULL";
  await pool.query(`UPDATE mart_seller_packages SET status = 'active', starts_at = NOW(), expires_at = ${expiresAtSql} WHERE id = ?`, [purchaseId]);
}

// ── Core allowance calculation ─────────────────────────────────────────────
async function getSellerProductAllowance(sellerId) {
  const [[{ productCount }]] = await pool.query(
    "SELECT COUNT(*) AS productCount FROM products WHERE seller_id = ?",
    [sellerId]
  );

  const [activePackages] = await pool.query(
    `SELECT sp.id, sp.package_id, sp.product_limit, sp.expires_at, sp.status,
            p.name, p.name_bn
       FROM mart_seller_packages sp
       JOIN mart_packages p ON p.id = sp.package_id
      WHERE sp.seller_id = ?
        AND sp.status = 'active'
        AND (sp.expires_at IS NULL OR sp.expires_at > NOW())`,
    [sellerId]
  );

  const hasUnlimited = activePackages.some((p) => p.product_limit === null);
  const purchasedLimit = activePackages.reduce(
    (sum, p) => sum + (p.product_limit || 0),
    0
  );
  const totalAllowed = hasUnlimited ? null : FREE_PRODUCT_LIMIT + purchasedLimit;

  return {
    productCount,
    freeLimit: FREE_PRODUCT_LIMIT,
    activePackages,
    hasUnlimited,
    totalAllowed, // null means unlimited
    canAdd: hasUnlimited ? true : productCount < totalAllowed,
  };
}

// ── GET /api/mart-packages/sellers/:id/product-allowance ──────────────────
router.get("/sellers/:id/product-allowance", async (req, res) => {
  try {
    const allowance = await getSellerProductAllowance(Number(req.params.id));
    res.json({ success: true, data: allowance });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Could not load product allowance" });
  }
});

// ── Guard middleware — plug into your create-product route ─────────────────
async function requireProductAllowance(req, res, next) {
  try {
    const sellerId = Number(req.body.seller_id || req.body.sellerId);
    if (!sellerId) {
      return res.status(400).json({ success: false, message: "seller_id required" });
    }

    const allowance = await getSellerProductAllowance(sellerId);
    if (!allowance.canAdd) {
      return res.status(403).json({
        success: false,
        code: "PRODUCT_LIMIT_REACHED",
        message: "Free product limit reached. Please purchase a package to add more products.",
        data: allowance,
      });
    }
    next();
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Could not verify product allowance" });
  }
}

// ── GET /api/mart-packages — public catalog ─────────────────────────────────
router.get("/mart-packages", async (_req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM mart_packages WHERE is_active = 1 ORDER BY sort_order ASC, price ASC"
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Could not load packages" });
  }
});

// ── POST /api/mart-packages/purchase — seller submits a purchase request ───
router.post("/mart-packages/purchase", async (req, res) => {
  const { seller_id, package_id, payment_method, transaction_ref } = req.body;

  if (!seller_id || !package_id) {
    return res.status(400).json({ success: false, message: "seller_id and package_id required" });
  }

  try {
    const [[pkg]] = await pool.query(
      "SELECT * FROM mart_packages WHERE id = ? AND is_active = 1",
      [package_id]
    );
    if (!pkg) return res.status(404).json({ success: false, message: "Package not found" });

    const [result] = await pool.query(
      `INSERT INTO mart_seller_packages
         (seller_id, package_id, status, product_limit, price_paid, payment_method, transaction_ref)
       VALUES (?, ?, 'pending', ?, ?, ?, ?)`,
      [seller_id, package_id, pkg.product_limit, pkg.price, payment_method || "manual", transaction_ref || null]
    );

    // Uses your existing generic notifications table
    await pool
      .query(
        `INSERT INTO notifications (user_id, title, message, type)
         VALUES (?, ?, ?, ?)`,
        [
          seller_id,
          "Package request received",
          `Your request for the "${pkg.name}" package has been received and is awaiting approval.`,
          "mart_package_purchase_pending",
        ]
      )
      .catch(() => {});

    res.json({ success: true, data: { id: result.insertId, status: "pending" } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Could not submit package request" });
  }
});

// Starts hosted SurjoPay checkout. A package only activates after verification below.
router.post("/mart-packages/purchase/surjopay", async (req, res) => {
  const { seller_id, package_id } = req.body;
  if (!seller_id || !package_id) return res.status(400).json({ success: false, message: "seller_id and package_id required" });
  try {
    const [[pkg]] = await pool.query("SELECT * FROM mart_packages WHERE id = ? AND is_active = 1", [package_id]);
    const [[seller]] = await pool.query("SELECT * FROM sellers WHERE id = ?", [seller_id]);
    if (!pkg) return res.status(404).json({ success: false, message: "Package not found" });
    if (!seller) return res.status(404).json({ success: false, message: "Seller not found" });
    const [purchaseResult] = await pool.query(
      `INSERT INTO mart_seller_packages (seller_id, package_id, status, product_limit, price_paid, payment_method)
       VALUES (?, ?, 'pending', ?, ?, 'surjopay')`,
      [seller_id, package_id, pkg.product_limit, pkg.price]
    );
    const purchaseId = purchaseResult.insertId;
    const merchantOrderId = `MARTPKG-${purchaseId}-${Date.now()}`;
    const [transactionResult] = await pool.query(
      `INSERT INTO mart_package_transactions (package_purchase_id, seller_id, merchant_order_id, amount) VALUES (?, ?, ?, ?)`,
      [purchaseId, seller_id, merchantOrderId, pkg.price]
    );
    const auth = await getSurjoPayToken();
    const returnUrl = `${publicBackendUrl()}/api/mart-packages/surjopay/callback`;
    const { data: payment } = await axios.post(`${surjoPayBaseUrl()}/secret-pay`, {
      prefix: process.env.SURJOPAY_PREFIX, token: auth.token, return_url: returnUrl, cancel_url: returnUrl,
      store_id: auth.store_id, amount: Number(pkg.price), order_id: merchantOrderId, currency: "BDT",
      customer_name: seller.seller_name || seller.shop_name || "Mart Seller",
      customer_address: seller.seller_address || "Dhaka, Bangladesh", customer_city: "Dhaka",
      customer_phone: seller.seller_mobile || "01700000000", customer_email: seller.seller_email || "seller@example.com",
      client_ip: clientIp(req),
    }, { headers: { Authorization: `${auth.token_type || "Bearer"} ${auth.token}`, "Content-Type": "application/json" } });
    if (!payment?.checkout_url || !payment?.sp_order_id) throw new Error(payment?.message || "SurjoPay did not return a checkout URL");
    await pool.query("UPDATE mart_package_transactions SET gateway_order_id = ?, checkout_url = ?, gateway_payload = ? WHERE id = ?", [payment.sp_order_id, payment.checkout_url, JSON.stringify(payment), transactionResult.insertId]);
    await pool.query("UPDATE mart_seller_packages SET transaction_ref = ? WHERE id = ?", [merchantOrderId, purchaseId]);
    res.json({ success: true, data: { purchase_id: purchaseId, checkout_url: payment.checkout_url } });
  } catch (error) {
    console.error("SurjoPay package checkout error:", error.response?.data || error.message);
    res.status(500).json({ success: false, message: error.response?.data?.message || error.message || "Could not start SurjoPay checkout" });
  }
});

// The gateway redirect is verified server-to-server before an entitlement is activated.
router.all("/mart-packages/surjopay/callback", async (req, res) => {
  const payload = { ...req.query, ...req.body };
  const gatewayOrderId = payload.order_id || payload.sp_order_id;
  const redirect = (status, purchaseId = "") => `${publicFrontendUrl()}/mart?package_payment=${status}${purchaseId ? `&package_purchase_id=${purchaseId}` : ""}`;
  try {
    const [[transaction]] = await pool.query("SELECT * FROM mart_package_transactions WHERE gateway_order_id = ?", [gatewayOrderId]);
    if (!transaction) return res.redirect(302, redirect("failed"));
    const auth = await getSurjoPayToken();
    const { data: verification } = await axios.post(`${surjoPayBaseUrl()}/verification`, { order_id: gatewayOrderId }, { headers: { Authorization: `${auth.token_type || "Bearer"} ${auth.token}`, "Content-Type": "application/json" } });
    const verified = Array.isArray(verification) ? verification[0] : verification;
    const paid = String(verified?.sp_code) === "1000" && String(verified?.bank_status || "").toLowerCase() === "success";
    await pool.query("UPDATE mart_package_transactions SET status = ?, gateway_payload = ?, verified_at = ? WHERE id = ?", [paid ? "paid" : "verification_failed", JSON.stringify(verified || {}), paid ? new Date() : null, transaction.id]);
    if (!paid) return res.redirect(302, redirect("failed", transaction.package_purchase_id));
    await activatePaidPackage(transaction.package_purchase_id);
    res.redirect(302, redirect("success", transaction.package_purchase_id));
  } catch (error) {
    console.error("SurjoPay package callback error:", error.response?.data || error.message);
    res.redirect(302, redirect("failed"));
  }
});

// ── GET /api/sellers/:id/package-requests — seller's own purchase history ──
router.get("/sellers/:id/package-requests", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT sp.*, p.name, p.name_bn
         FROM mart_seller_packages sp
         JOIN mart_packages p ON p.id = sp.package_id
        WHERE sp.seller_id = ?
        ORDER BY sp.created_at DESC`,
      [req.params.id]
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Could not load package requests" });
  }
});

// ── PUT /api/mart-packages/purchase/:id/approve — ADMIN ONLY ───────────────
router.put("/mart-packages/purchase/:id/approve", async (req, res) => {
  try {
    const [[purchase]] = await pool.query(
      "SELECT * FROM mart_seller_packages WHERE id = ?",
      [req.params.id]
    );
    if (!purchase) return res.status(404).json({ success: false, message: "Request not found" });

    const [[pkg]] = await pool.query("SELECT * FROM mart_packages WHERE id = ?", [purchase.package_id]);

    const expiresAtSql = pkg.duration_days
      ? `DATE_ADD(NOW(), INTERVAL ${Number(pkg.duration_days)} DAY)`
      : "NULL";

    await pool.query(
      `UPDATE mart_seller_packages
          SET status = 'active', starts_at = NOW(), expires_at = ${expiresAtSql}
        WHERE id = ?`,
      [req.params.id]
    );

    await pool
      .query(
        `INSERT INTO notifications (user_id, title, message, type)
         VALUES (?, ?, ?, ?)`,
        [
          purchase.seller_id,
          "Package activated ✓",
          `Your "${pkg.name}" package is now active. You can add up to ${
            pkg.product_limit ? pkg.product_limit + FREE_PRODUCT_LIMIT : "unlimited"
          } products.`,
          "mart_package_activated",
        ]
      )
      .catch(() => {});

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Could not approve request" });
  }
});

// ── PUT /api/mart-packages/purchase/:id/reject — ADMIN ONLY ────────────────
router.put("/mart-packages/purchase/:id/reject", async (req, res) => {
  try {
    await pool.query(
      "UPDATE mart_seller_packages SET status = 'rejected', admin_note = ? WHERE id = ?",
      [req.body.admin_note || null, req.params.id]
    );
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Could not reject request" });
  }
});

module.exports = router;
module.exports.requireProductAllowance = requireProductAllowance;
module.exports.getSellerProductAllowance = getSellerProductAllowance;

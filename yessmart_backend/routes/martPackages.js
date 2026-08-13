const express = require("express");
const pool = require("../db");

const router = express.Router();
const FREE_PRODUCT_LIMIT = 5;
const publicBackendUrl = () => String(process.env.BACKEND_URL || "http://localhost:8081").replace(/\/$/, "");
const publicFrontendUrl = () => String(process.env.FRONTEND_URL || "http://localhost:8080").replace(/\/$/, "");
const surjoPayBaseUrl = () => String(process.env.SURJOPAY_BASE_URL || "https://sandbox.shurjopayment.com/api").replace(/\/$/, "");

function clientIp(req) {
  return String(req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1").split(",")[0].trim();
}

const money = (value) => Math.round(Number(value || 0) * 100) / 100;

async function surjoPayRequest(url, body, token, label = "request") {
  if (!url) throw new Error(`SurjoPay ${label} failed: target URL is not set`);
  
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error(`SurjoPay ${label} error (HTTP ${response.status}):`, data);
      throw new Error(data?.message || data?.sp_massage || data?.sp_message || `SurjoPay ${label} failed (HTTP ${response.status})`);
    }

    return data;
  } catch (err) {
    console.error(`SurjoPay ${label} request error:`, err.message);
    throw err;
  }
}

async function getSurjoPayToken() {
  const { SURJOPAY_USERNAME: username, SURJOPAY_PASSWORD: password, SURJOPAY_PREFIX: prefix } = process.env;
  if (!username || !password || !prefix) throw new Error("SurjoPay is not configured. Set SURJOPAY_USERNAME, SURJOPAY_PASSWORD and SURJOPAY_PREFIX.");
  
  const data = await surjoPayRequest(`${surjoPayBaseUrl()}/get_token`, { username, password }, null, "get_token");
  if (!data?.token) throw new Error(data?.message || data?.sp_message || "SurjoPay token was not returned");
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

// ── GET /api/mart-packages/purchases — ADMIN: all package purchase/transaction history ──
// Joins mart_seller_packages (the purchase/entitlement record) with mart_packages
// (plan name), sellers (who bought it), and mart_package_transactions (the actual
// gateway payment attempt, if any — a purchase can exist without a gateway
// transaction yet, e.g. manual/pending requests).
router.get("/mart-packages/purchases", async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const status = req.query.status; // filters on purchase status: pending | active | rejected
    const search = req.query.search;
    const sellerId = req.query.seller_id ? Number(req.query.seller_id) : null;

    const where = [];
    const params = [];

    if (status && status !== "all") {
      where.push("sp.status = ?");
      params.push(status);
    }
    if (sellerId) {
      where.push("sp.seller_id = ?");
      params.push(sellerId);
    }
    if (search) {
      where.push(`(
        sp.transaction_ref LIKE ? OR mpt.merchant_order_id LIKE ? OR mpt.gateway_order_id LIKE ?
        OR s.seller_name LIKE ? OR s.shop_name LIKE ? OR p.name LIKE ?
      )`);
      const like = `%${search}%`;
      params.push(like, like, like, like, like, like);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const [rows] = await pool.query(
      `SELECT sp.id, sp.seller_id, sp.package_id, sp.status AS purchase_status,
              sp.product_limit, sp.price_paid, sp.payment_method, sp.transaction_ref,
              sp.starts_at, sp.expires_at, sp.created_at AS purchase_created_at,
              p.name AS package_name, p.name_bn AS package_name_bn,
              s.seller_name, s.shop_name, s.seller_mobile AS seller_phone,
              mpt.id AS transaction_id, mpt.gateway, mpt.merchant_order_id, mpt.gateway_order_id,
              mpt.amount, mpt.currency, mpt.status AS payment_status,
              mpt.verified_at, mpt.created_at AS transaction_created_at
         FROM mart_seller_packages sp
         JOIN mart_packages p ON p.id = sp.package_id
         LEFT JOIN sellers s ON s.id = sp.seller_id
         LEFT JOIN mart_package_transactions mpt ON mpt.package_purchase_id = sp.id
         ${whereSql}
        ORDER BY sp.created_at DESC
        LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total
         FROM mart_seller_packages sp
         JOIN mart_packages p ON p.id = sp.package_id
         LEFT JOIN sellers s ON s.id = sp.seller_id
         LEFT JOIN mart_package_transactions mpt ON mpt.package_purchase_id = sp.id
         ${whereSql}`,
      params
    );

    res.json({
      success: true,
      data: rows,
      pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Could not load package transactions" });
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
    
    // Get SurjoPay authentication token
    const auth = await getSurjoPayToken();
    const returnUrl = `${publicBackendUrl()}/api/mart-packages/surjopay/callback`;
    
    // Build payment payload with all required fields
    const paymentPayload = {
      prefix: process.env.SURJOPAY_PREFIX,
      token: auth.token,
      store_id: auth.store_id,
      return_url: returnUrl,
      cancel_url: returnUrl,
      amount: money(pkg.price),
      order_id: merchantOrderId,
      currency: "BDT",
      customer_name: seller.seller_name || seller.shop_name || "Mart Seller",
      customer_address: seller.seller_address || "Dhaka, Bangladesh",
      customer_city: "Dhaka",
      customer_phone: seller.seller_mobile || "01700000000",
      customer_email: seller.seller_email || "seller@example.com",
      client_ip: clientIp(req),
    };
    
    console.log("SurjoPay payment payload:", { ...paymentPayload, token: "[REDACTED]" });
    
    const payment = await surjoPayRequest(`${surjoPayBaseUrl()}/secret-pay`, paymentPayload, auth.token, "secret-pay");
    
    const checkoutUrl = payment?.checkout_url || payment?.payment_url || payment?.url || payment?.redirect_url;
    const gatewayOrderId = payment?.sp_order_id || payment?.order_id || merchantOrderId;
    
    if (!checkoutUrl) {
      throw new Error(payment?.message || payment?.sp_message || "SurjoPay did not return a checkout URL");
    }
    
    await pool.query(
      "UPDATE mart_package_transactions SET gateway_order_id = ?, checkout_url = ?, gateway_payload = ? WHERE id = ?",
      [gatewayOrderId, checkoutUrl, JSON.stringify(payment), transactionResult.insertId]
    );
    
    await pool.query(
      "UPDATE mart_seller_packages SET transaction_ref = ? WHERE id = ?",
      [merchantOrderId, purchaseId]
    );
    
    res.json({ success: true, data: { purchase_id: purchaseId, checkout_url: checkoutUrl } });
  } catch (error) {
    console.error("SurjoPay package checkout error:", error.message);
    res.status(500).json({ success: false, message: error.message || "Could not start SurjoPay checkout" });
  }
});

// The gateway redirect is verified server-to-server before an entitlement is activated.
router.all("/mart-packages/surjopay/callback", async (req, res) => {
  const payload = { ...req.query, ...req.body };
  const gatewayOrderId = payload.order_id || payload.sp_order_id;
  const redirect = (status, purchaseId = "") => `${publicFrontendUrl()}/mart?package_payment=${status}${purchaseId ? `&package_purchase_id=${purchaseId}` : ""}`;
  
  try {
    if (!gatewayOrderId) {
      console.error("SurjoPay callback: no gateway_order_id in payload", payload);
      return res.redirect(302, redirect("failed"));
    }
    
    const [[transaction]] = await pool.query("SELECT * FROM mart_package_transactions WHERE gateway_order_id = ?", [gatewayOrderId]);
    if (!transaction) {
      console.error(`SurjoPay callback: no transaction found for gateway_order_id=${gatewayOrderId}`);
      return res.redirect(302, redirect("failed"));
    }
    
    const auth = await getSurjoPayToken();
    
    const verification = await surjoPayRequest(
      `${surjoPayBaseUrl()}/verification`,
      { order_id: gatewayOrderId },
      auth.token,
      "verification"
    );
    
    const verified = Array.isArray(verification) ? verification[0] : verification;
    const isSuccessful = String(verified?.sp_code) === "1000" && String(verified?.bank_status || "").toLowerCase() === "success";
    
    console.log(`SurjoPay verification for order ${gatewayOrderId}:`, { sp_code: verified?.sp_code, bank_status: verified?.bank_status, isSuccessful });
    
    await pool.query(
      "UPDATE mart_package_transactions SET status = ?, gateway_payload = ?, verified_at = ? WHERE id = ?",
      [isSuccessful ? "paid" : "verification_failed", JSON.stringify(verified || {}), isSuccessful ? new Date() : null, transaction.id]
    );
    
    if (!isSuccessful) {
      console.error("SurjoPay payment verification failed", verified);
      return res.redirect(302, redirect("failed", transaction.package_purchase_id));
    }
    
    await activatePaidPackage(transaction.package_purchase_id);
    console.log(`SurjoPay package ${transaction.package_purchase_id} activated successfully`);
    res.redirect(302, redirect("success", transaction.package_purchase_id));
  } catch (error) {
    console.error("SurjoPay package callback error:", error.message);
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

// ── POST /api/mart-packages — ADMIN ONLY: Create new package ────────────────
router.post("/mart-packages", async (req, res) => {
  const { name, name_bn, price, product_limit, duration_days, description, description_bn, sort_order, is_active } = req.body;
  
  if (!name || !name_bn || price === undefined) {
    return res.status(400).json({ success: false, message: "name, name_bn, and price are required" });
  }

  try {
    const [result] = await pool.query(
      `INSERT INTO mart_packages (name, name_bn, price, product_limit, duration_days, description, description_bn, sort_order, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name,
        name_bn,
        Number(price),
        product_limit !== null && product_limit !== undefined ? Number(product_limit) : null,
        duration_days !== null && duration_days !== undefined ? Number(duration_days) : null,
        description || null,
        description_bn || null,
        sort_order !== undefined ? Number(sort_order) : 0,
        is_active !== undefined ? (is_active ? 1 : 0) : 1,
      ]
    );

    const [[newPackage]] = await pool.query("SELECT * FROM mart_packages WHERE id = ?", [result.insertId]);
    res.status(201).json({ success: true, data: newPackage });
  } catch (error) {
    console.error("Create package error:", error);
    res.status(500).json({ success: false, message: error.message || "Could not create package" });
  }
});

// ── PUT /api/mart-packages/:id — ADMIN ONLY: Update package ──────────────────
router.put("/mart-packages/:id", async (req, res) => {
  const { name, name_bn, price, product_limit, duration_days, description, description_bn, sort_order, is_active } = req.body;

  try {
    const [[pkg]] = await pool.query("SELECT * FROM mart_packages WHERE id = ?", [req.params.id]);
    if (!pkg) return res.status(404).json({ success: false, message: "Package not found" });

    const updates = {};
    if (name !== undefined) updates.name = name;
    if (name_bn !== undefined) updates.name_bn = name_bn;
    if (price !== undefined) updates.price = Number(price);
    if (product_limit !== undefined) updates.product_limit = product_limit !== null ? Number(product_limit) : null;
    if (duration_days !== undefined) updates.duration_days = duration_days !== null ? Number(duration_days) : null;
    if (description !== undefined) updates.description = description || null;
    if (description_bn !== undefined) updates.description_bn = description_bn || null;
    if (sort_order !== undefined) updates.sort_order = Number(sort_order);
    if (is_active !== undefined) updates.is_active = is_active ? 1 : 0;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, message: "No fields to update" });
    }

    const setClause = Object.keys(updates).map(key => `${key} = ?`).join(", ");
    const values = Object.values(updates);
    values.push(req.params.id);

    await pool.query(`UPDATE mart_packages SET ${setClause} WHERE id = ?`, values);

    const [[updatedPackage]] = await pool.query("SELECT * FROM mart_packages WHERE id = ?", [req.params.id]);
    res.json({ success: true, data: updatedPackage });
  } catch (error) {
    console.error("Update package error:", error);
    res.status(500).json({ success: false, message: error.message || "Could not update package" });
  }
});

// ── DELETE /api/mart-packages/:id — ADMIN ONLY: Delete package ───────────────
router.delete("/mart-packages/:id", async (req, res) => {
  try {
    const [[pkg]] = await pool.query("SELECT * FROM mart_packages WHERE id = ?", [req.params.id]);
    if (!pkg) return res.status(404).json({ success: false, message: "Package not found" });

    // Check if any sellers have active purchases of this package
    const [[activeCount]] = await pool.query(
      `SELECT COUNT(*) AS count FROM mart_seller_packages WHERE package_id = ? AND status IN ('active', 'pending')`,
      [req.params.id]
    );

    if (activeCount.count > 0) {
      return res.status(403).json({
        success: false,
        message: "Cannot delete package with active purchases. Mark it as inactive instead.",
        activeCount: activeCount.count
      });
    }

    await pool.query("DELETE FROM mart_packages WHERE id = ?", [req.params.id]);
    res.json({ success: true, message: "Package deleted" });
  } catch (error) {
    console.error("Delete package error:", error);
    res.status(500).json({ success: false, message: error.message || "Could not delete package" });
  }
});

module.exports = router;
module.exports.requireProductAllowance = requireProductAllowance;
module.exports.getSellerProductAllowance = getSellerProductAllowance;
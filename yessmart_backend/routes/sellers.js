const express = require("express");
const router = express.Router();
const pool = require("../db");
const { getBackendBaseUrl } = require("../utils/baseUrl");

const createSlug = (value = "") =>
  String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u0980-\u09FF]+/g, "-")
    .replace(/(^-|-$)/g, "");

// Generates a unique store slug WITHOUT appending the user id, so the URL can
// show just the store name (e.g. /mart/store/tavi instead of /mart/store/tavi-8).
async function generateUniqueSellerSlug(baseText, excludeUserId = null) {
  const base = createSlug(baseText) || "seller";
  let candidate = base;
  let counter = 2;

  while (true) {
    const query = excludeUserId
      ? "SELECT id FROM sellers WHERE slug = ? AND user_id != ? LIMIT 1"
      : "SELECT id FROM sellers WHERE slug = ? LIMIT 1";
    const params = excludeUserId ? [candidate, excludeUserId] : [candidate];
    const [rows] = await pool.query(query, params);
    if (rows.length === 0) return candidate;
    candidate = `${base}-${counter}`;
    counter++;
  }
}

// ==========================
// CREATE SELLER (POST)
// ==========================
router.post("/", async (req, res) => {
  try {
    const {
      user_id,
      slug,
      shop_name,
      shop_type,
      seller_name,
      seller_email,
      seller_mobile,
      seller_address,
    } = req.body;
    const displayName = shop_name || seller_name;

    if (!displayName) {
      return res.status(400).json({
        success: false,
        message: "shop_name or seller_name is required",
      });
    }
const sellerSlug = await generateUniqueSellerSlug(slug || displayName, user_id);

    await pool.query(
      `
        INSERT INTO sellers (
          user_id,
          slug,
          shop_name,
          shop_type,
          seller_name,
          seller_email,
          seller_mobile,
          seller_address,
          seller_verified
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)
        ON DUPLICATE KEY UPDATE
          slug = VALUES(slug),
          shop_name = VALUES(shop_name),
          shop_type = VALUES(shop_type),
          seller_name = VALUES(seller_name),
          seller_email = VALUES(seller_email),
          seller_mobile = VALUES(seller_mobile),
          seller_address = VALUES(seller_address),
          seller_verified = CASE
            WHEN seller_verified = 1 THEN 1
            ELSE 0
          END
      `,
      [
        user_id || null,
        sellerSlug || null,
        shop_name || displayName,
        shop_type || null,
        displayName,
        seller_email || null,
        seller_mobile || null,
        seller_address || null,
      ]
    );

    // Always return a usable seller id. ON DUPLICATE KEY UPDATE may not set insertId.
    const [sellerRows] = await pool.query(
      "SELECT id FROM sellers WHERE user_id = ? ORDER BY id DESC LIMIT 1",
      [user_id]
    );

    const id = sellerRows?.[0]?.id || null;

    res.status(201).json({
      success: true,
      message: "Seller created successfully",
      data: { id },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to create seller",
      error: error.message,
    });
  }
});

// Admin manually marks/unmarks a shop as popular
router.patch("/:id/popular", async (req, res) => {
  try {
    const { popular } = req.body; // 1 or 0

    await pool.query(
      "UPDATE sellers SET shop_popular = ? WHERE id = ?",
      [popular ? 1 : 0, req.params.id]
    );

    const [rows] = await pool.query(
      "SELECT * FROM sellers WHERE id = ?",
      [req.params.id]
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, message: "Seller not found" });
    }

    res.json({
      success: true,
      message: popular ? "Shop marked as popular" : "Shop removed from popular",
      data: rows[0],
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update popular status",
      error: error.message,
    });
  }
});
// ==========================
// GET ALL SELLERS
// ==========================
router.get("/", async (req, res) => {
  try {
    const { user_id, slug, popular } = req.query;

    let rows;

    if (user_id) {
      [rows] = await pool.query(
        "SELECT * FROM sellers WHERE user_id = ? LIMIT 1",
        [user_id]
      );
    } else if (slug) {
      [rows] = await pool.query(
        "SELECT * FROM sellers WHERE slug = ? LIMIT 1",
        [slug]
      );
    } else if (popular === "1") {
      // ── Show shops that are manually marked popular OR have >= 10 orders ──
      [rows] = await pool.query(`
        SELECT
          s.*,
          COUNT(DISTINCT oi.order_id) AS total_orders,
          COUNT(DISTINCT o.user_id)   AS total_customers
        FROM sellers s
        LEFT JOIN order_items oi ON oi.seller_id = s.id
        LEFT JOIN orders o
          ON o.id = oi.order_id
          AND o.order_status NOT IN ('cancelled')
        WHERE COALESCE(s.seller_verified, 0) = 1
        GROUP BY s.id
        HAVING
          s.shop_popular = 1          -- ✅ Admin manually marked
          OR total_orders >= 10       -- ✅ Auto: too many orders
        ORDER BY
          s.shop_popular DESC,        -- Manual picks shown first
          total_orders DESC           -- Then sorted by order count
        LIMIT 8
      `);
    } else {
      [rows] = await pool.query(
        "SELECT * FROM sellers ORDER BY id DESC"
      );
    }

    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch sellers",
      error: error.message,
    });
  }
});


// ==========================
// GET SINGLE SELLER
// ==========================
router.get("/:id", async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM sellers WHERE id = ?",
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Seller not found",
      });
    }

    res.json({
      success: true,
      data: rows[0],
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch seller",
      error: error.message,
    });
  }
});
// ==========================
// UPDATE SELLER (PUT)
// ==========================
router.put("/:id", async (req, res) => {
  try {
    const {
      shop_name, seller_name, seller_email,
      seller_mobile, seller_address,
      banner_url, profile_image_url,
      store_carousel_media,
      bank_name, bank_account_name, bank_account_number,
      bank_branch, routing_number,
      mobile_banking_provider, mobile_banking_number,
      kyc_admin_message,
      nid_front_url, nid_back_url,
      trade_license_url, tin_certificate_url,
    } = req.body;

    const [existing] = await pool.query(
      "SELECT id FROM sellers WHERE id = ?", [req.params.id]
    );
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: "Seller not found" });
    }

    await pool.query(
      `UPDATE sellers SET
        shop_name = COALESCE(?, shop_name),
        seller_name = COALESCE(?, seller_name),
        seller_email = COALESCE(?, seller_email),
        seller_mobile = COALESCE(?, seller_mobile),
        seller_address = COALESCE(?, seller_address),
        banner_url = COALESCE(?, banner_url),
        profile_image_url = COALESCE(?, profile_image_url),
        store_carousel_media = COALESCE(?, store_carousel_media),
        bank_name = COALESCE(?, bank_name),
        bank_account_name = COALESCE(?, bank_account_name),
        bank_account_number = COALESCE(?, bank_account_number),
        bank_branch = COALESCE(?, bank_branch),
        routing_number = COALESCE(?, routing_number),
        mobile_banking_provider = COALESCE(?, mobile_banking_provider),
        mobile_banking_number = COALESCE(?, mobile_banking_number),
        kyc_admin_message = COALESCE(?, kyc_admin_message),
        nid_front_url = COALESCE(?, nid_front_url),
        nid_back_url = COALESCE(?, nid_back_url),
        trade_license_url = COALESCE(?, trade_license_url),
        tin_certificate_url = COALESCE(?, tin_certificate_url)
      WHERE id = ?`,
      [
        shop_name || null, seller_name || null, seller_email || null,
        seller_mobile || null, seller_address || null,
        banner_url || null, profile_image_url || null,
        store_carousel_media === undefined ? null : JSON.stringify(Array.isArray(store_carousel_media) ? store_carousel_media : []),
        bank_name || null, bank_account_name || null, bank_account_number || null,
        bank_branch || null, routing_number || null,
        mobile_banking_provider || null, mobile_banking_number || null,
        kyc_admin_message || null,
        nid_front_url || null, nid_back_url || null,
        trade_license_url || null, tin_certificate_url || null,
        req.params.id,
      ]
    );
    const [updated] = await pool.query(
      "SELECT * FROM sellers WHERE id = ?", [req.params.id]
    );

    res.json({ success: true, message: "Seller updated", data: updated[0] });
  } catch (error) {
    res.status(500).json({
      success: false, message: "Failed to update seller", error: error.message,
    });
  }
});
// PATCH /api/sellers/:id/kyc-message
router.patch("/:id/kyc-message", async (req, res) => {
  try {
    const { message } = req.body;
    const normalizedMessage = String(message || "").trim() || null;

    await pool.query(
      "UPDATE sellers SET kyc_admin_message = ? WHERE id = ?",
      [normalizedMessage, req.params.id]
    );

    const [rows] = await pool.query("SELECT * FROM sellers WHERE id = ?", [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: "Seller not found" });

    res.json({ success: true, message: "KYC message updated", data: rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to update KYC message", error: error.message });
  }
});

// PATCH /api/sellers/:id/verify
router.patch("/:id/verify", async (req, res) => {
  try {
    const { verified } = req.body; // true or false
    await pool.query(
      "UPDATE sellers SET seller_verified = ?, kyc_admin_message = CASE WHEN ? = 1 THEN NULL ELSE kyc_admin_message END WHERE id = ?",
      [verified ? 1 : 0, verified ? 1 : 0, req.params.id]
    );
    const [rows] = await pool.query("SELECT * FROM sellers WHERE id = ?", [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: "Seller not found" });
    res.json({ success: true, message: "Verification updated", data: rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to update", error: error.message });
  }
});
// GET /api/sellers/:id/top-customers
router.get("/:id/top-customers", async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const [rows] = await pool.query(`
      SELECT
        o.user_id,
        o.customer_name,
        o.customer_phone,
        COUNT(DISTINCT o.id)        AS order_count,
        SUM(oi.total_price)         AS total_spent,
        MAX(o.created_at)           AS last_order_at
      FROM order_items oi
      INNER JOIN orders o
        ON o.id = oi.order_id
        AND o.order_status NOT IN ('cancelled')
      WHERE oi.seller_id = ?
      GROUP BY o.user_id, o.customer_name, o.customer_phone
      ORDER BY order_count DESC, total_spent DESC
      LIMIT ?
    `, [req.params.id, Number(limit)]);

    res.json({
      success: true,
      seller_id: req.params.id,
      data: rows,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch top customers",
      error: error.message,
    });
  }
});
// GET /api/sellers/top-customers/all
router.get("/top-customers/all", async (req, res) => {
  try {
    const { limit = 20 } = req.query;

    const [rows] = await pool.query(`
      SELECT
        o.user_id,
        o.customer_name,
        o.customer_phone,
        COUNT(DISTINCT o.id)              AS order_count,
        COUNT(DISTINCT oi.seller_id)      AS sellers_ordered_from,
        SUM(oi.total_price)               AS total_spent,
        MAX(o.created_at)                 AS last_order_at
      FROM orders o
      INNER JOIN order_items oi ON oi.order_id = o.id
      WHERE o.order_status NOT IN ('cancelled')
      GROUP BY o.user_id, o.customer_name, o.customer_phone
      ORDER BY order_count DESC, total_spent DESC
      LIMIT ?
    `, [Number(limit)]);

    res.json({
      success: true,
      data: rows,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch top customers",
      error: error.message,
    });
  }
});
const path = require("path");
const fs   = require("fs");

router.post("/upload", express.json({ limit: "5mb" }), async (req, res) => {
  try {
    const { file, mime, name } = req.body;
    if (!file) return res.status(400).json({ success: false, message: "No file" });

    const ext      = (name || "file").split(".").pop() || "jpg";
    const filename = `kyc_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
    const uploadDir = path.join(__dirname, "../uploads/kyc");
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

    const buffer = Buffer.from(file, "base64");
    fs.writeFileSync(path.join(uploadDir, filename), buffer);

    const url = `${getBackendBaseUrl()}/uploads/kyc/${filename}`;
    res.json({ success: true, url });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;

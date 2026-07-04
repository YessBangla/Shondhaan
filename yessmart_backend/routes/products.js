const express = require("express");
const router = express.Router();
const pool = require("../db");

const normalizeGalleryUrls = (value) => {
  if (Array.isArray(value)) {
    return value
      .map((url) => String(url || "").trim())
      .filter(Boolean)
      .slice(0, 4);
  }

  if (typeof value === "string" && value.trim()) {
    try {
      return normalizeGalleryUrls(JSON.parse(value));
    } catch {
      return value
        .split(",")
        .map((url) => url.trim())
        .filter(Boolean)
        .slice(0, 4);
    }
  }

  return [];
};

const serializeGalleryUrls = (value) => JSON.stringify(normalizeGalleryUrls(value));

const normalizeProductRow = (row) => ({
  ...row,
  gallery_urls: normalizeGalleryUrls(row.gallery_urls),
});

// ── GET /api/products ──────────────────────────────────────────────────────────
router.get("/", async (req, res) => {
  try {
    const { seller_id, status, category_id, sub_category_id } = req.query;
    const where = [];
    const values = [];

    if (seller_id) {
      where.push("p.seller_id = ?");
      values.push(seller_id);
    }

    if (status) {
      where.push("p.status = ?");
      values.push(status);

      if (String(status).toLowerCase() === "active") {
        where.push("COALESCE(s.seller_verified, 0) = 1");
      }
    }

    if (category_id) {
      const ids = Array.isArray(category_id)
        ? category_id
        : String(category_id).split(",").map((id) => id.trim()).filter(Boolean);
      if (ids.length > 0) {
        where.push(`p.category_id IN (${ids.map(() => "?").join(",")})`);
        values.push(...ids);
      }
    }

    if (sub_category_id) {
      const ids = Array.isArray(sub_category_id)
        ? sub_category_id
        : String(sub_category_id).split(",").map((id) => id.trim()).filter(Boolean);
      if (ids.length > 0) {
        where.push(`p.sub_category_id IN (${ids.map(() => "?").join(",")})`);
        values.push(...ids);
      }
    }

    const [rows] = await pool.query(
      `
        SELECT
          p.*,
          COALESCE(order_stats.quantity_sold, p.sold_qty, 0) AS sold_count,
          COALESCE(order_stats.order_count, 0) AS order_count,
          COALESCE(review_stats.total_reviews, 0) AS review_count,
          COALESCE(review_stats.avg_rating, 0) AS avg_rating,
          c.name  AS category_name,
          sc.name AS sub_category_name,
          s.user_id  AS vendor_id,
          s.seller_name,
          s.shop_name,
          s.seller_verified
        FROM products p
        LEFT JOIN categories    c  ON p.category_id     = c.id
        LEFT JOIN sub_categories sc ON p.sub_category_id = sc.id
        LEFT JOIN sellers        s  ON p.seller_id       = s.id
        LEFT JOIN (
          SELECT
            oi.product_id,
            COUNT(DISTINCT oi.order_id) AS order_count,
            COALESCE(SUM(oi.quantity), 0) AS quantity_sold
          FROM order_items oi
          INNER JOIN orders o ON o.id = oi.order_id
          WHERE COALESCE(o.order_status, '') <> 'cancelled'
          GROUP BY oi.product_id
        ) order_stats ON order_stats.product_id = p.id
        LEFT JOIN (
          SELECT
            product_id,
            COUNT(*) AS total_reviews,
            AVG(star_review) AS avg_rating
          FROM reviews
          GROUP BY product_id
        ) review_stats ON review_stats.product_id = p.id
        ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
        ORDER BY p.id DESC
      `,
      values
    );

    res.json({ success: true, data: rows.map(normalizeProductRow) });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch products",
      error: error.message,
    });
  }
});
// ✅ PATCH must be BEFORE GET /:id to prevent route collision
router.patch("/:id/wishlist", async (req, res) => {
  try {
    const [result] = await pool.query(
      "UPDATE products SET wishlist = IF(wishlist = 1, 0, 1) WHERE id = ?",
      [req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    const [rows] = await pool.query(
      "SELECT wishlist FROM products WHERE id = ?",
      [req.params.id]
    );

    res.json({
      success: true,
      message: rows[0].wishlist ? "Added to wishlist" : "Removed from wishlist",
      data: { wishlist: rows[0].wishlist },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});
// ── GET /api/products/:id ──────────────────────────────────────────────────────
router.get("/:id", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `
        SELECT
          p.*,
          COALESCE(order_stats.quantity_sold, p.sold_qty, 0) AS sold_count,
          COALESCE(order_stats.order_count, 0) AS order_count,
          COALESCE(review_stats.total_reviews, 0) AS review_count,
          COALESCE(review_stats.avg_rating, 0) AS avg_rating,
          c.name  AS category_name,
          sc.name AS sub_category_name,
          s.user_id AS vendor_id,
          s.seller_name,
          s.shop_name,
          s.seller_verified
        FROM products p
        LEFT JOIN categories     c  ON p.category_id     = c.id
        LEFT JOIN sub_categories sc ON p.sub_category_id = sc.id
        LEFT JOIN sellers        s  ON p.seller_id       = s.id
        LEFT JOIN (
          SELECT
            oi.product_id,
            COUNT(DISTINCT oi.order_id) AS order_count,
            COALESCE(SUM(oi.quantity), 0) AS quantity_sold
          FROM order_items oi
          INNER JOIN orders o ON o.id = oi.order_id
          WHERE COALESCE(o.order_status, '') <> 'cancelled'
          GROUP BY oi.product_id
        ) order_stats ON order_stats.product_id = p.id
        LEFT JOIN (
          SELECT
            product_id,
            COUNT(*) AS total_reviews,
            AVG(star_review) AS avg_rating
          FROM reviews
          GROUP BY product_id
        ) review_stats ON review_stats.product_id = p.id
        WHERE p.id = ?
      `,
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    res.json({ success: true, data: normalizeProductRow(rows[0]) });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch product",
      error: error.message,
    });
  }
});

// ── POST /api/products ─────────────────────────────────────────────────────────
router.post("/", async (req, res) => {
  try {
    const {
      seller_id, category_id, sub_category_id,
      image, gallery_urls, name_bn, name_en, description,
      sale_price, original_price, stock, status,
      unit, featured, sold_qty, discount, is_freedelivery, wishlist,
    } = req.body;

    if (!name_bn) {
      return res.status(400).json({ success: false, message: "name_bn is required" });
    }

    const [result] = await pool.query(
      `
        INSERT INTO products (
          seller_id, category_id, sub_category_id,
          image, gallery_urls, name_bn, name_en, description,
          sale_price, original_price, stock, status,
          unit, featured, sold_qty, discount, is_freedelivery, wishlist
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        seller_id      || null,
        category_id    || null,
        sub_category_id || null,
        image          || null,
        serializeGalleryUrls(gallery_urls),
        name_bn,
        name_en        || null,
        description    || null,
        sale_price     ?? 0,
        original_price ?? null,
        stock          ?? 0,
        status         || "active",
        unit           || null,
        featured       ? 1 : 0,
        sold_qty       ?? 0,
        discount       ?? 0,
        is_freedelivery ? 1 : 0,
        wishlist       ? 1 : 0,
      ]
    );

    res.status(201).json({
      success: true,
      message: "Product created successfully",
      data: { id: result.insertId },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to create product",
      error: error.message,
    });
  }
});

// ── PUT /api/products/:id ──────────────────────────────────────────────────────
router.put("/:id", async (req, res) => {
  try {
    const {
      seller_id, category_id, sub_category_id,
      image, gallery_urls, name_bn, name_en, description,
      sale_price, original_price, stock, status,
      unit, featured, sold_qty, discount, is_freedelivery, wishlist,
    } = req.body;

    if (!name_bn) {
      return res.status(400).json({ success: false, message: "name_bn is required" });
    }

    const [result] = await pool.query(
      `
        UPDATE products SET
          seller_id       = ?,
          category_id     = ?,
          sub_category_id = ?,
          image           = ?,
          gallery_urls    = ?,
          name_bn         = ?,
          name_en         = ?,
          description     = ?,
          sale_price      = ?,
          original_price  = ?,
          stock           = ?,
          status          = ?,
          unit            = ?,
          featured        = ?,
          sold_qty        = ?,
          discount        = ?,
          is_freedelivery = ?,
          wishlist        = ?
        WHERE id = ?
      `,
      [
        seller_id       || null,
        category_id     || null,
        sub_category_id || null,
        image           || null,
        serializeGalleryUrls(gallery_urls),
        name_bn,
        name_en         || null,
        description     || null,
        sale_price      ?? 0,
        original_price  ?? null,
        stock           ?? 0,
        status          || "active",
        unit            || null,
        featured        ? 1 : 0,
        sold_qty        ?? 0,
        discount        ?? 0,
        is_freedelivery ? 1 : 0,
        wishlist        ? 1 : 0,
        req.params.id,
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    res.json({ success: true, message: "Product updated successfully" });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update product",
      error: error.message,
    });
  }
});

// ── DELETE /api/products/:id ───────────────────────────────────────────────────
router.delete("/:id", async (req, res) => {
  try {
    const [result] = await pool.query(
      "DELETE FROM products WHERE id = ?",
      [req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    res.json({ success: true, message: "Product deleted successfully" });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to delete product",
      error: error.message,
    });
  }
});




module.exports = router;

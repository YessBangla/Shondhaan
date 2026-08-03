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

// ── Slug helpers ─────────────────────────────────────────────────────────
function slugify(text) {
  return String(text || "")
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")   // strip punctuation
    .replace(/[\s_-]+/g, "-")   // collapse whitespace/underscores to a dash
    .replace(/^-+|-+$/g, "");   // trim leading/trailing dashes
}

// Ensures the slug is unique by appending -2, -3, etc. if needed.
// excludeId lets PUT skip comparing a product against itself.
async function generateUniqueSlug(baseText, excludeId = null) {
  const base = slugify(baseText) || "product";
  let slug = base;
  let counter = 2;

  while (true) {
    const query = excludeId
      ? "SELECT id FROM products WHERE slug = ? AND id != ? LIMIT 1"
      : "SELECT id FROM products WHERE slug = ? LIMIT 1";
    const params = excludeId ? [slug, excludeId] : [slug];
    const [rows] = await pool.query(query, params);
    if (rows.length === 0) return slug;
    slug = `${base}-${counter}`;
    counter++;
  }
}

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
          s.seller_verified,
          s.slug AS seller_slug
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

// ── GET /api/products/slug/:slug ────────────────────────────────────────────────
// Must also come before GET /:id so "slug" isn't parsed as an :id.
router.get("/slug/:slug", async (req, res) => {
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
          s.seller_verified,
          s.slug AS seller_slug
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
        WHERE p.slug = ?
      `,
      [req.params.slug]
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
          s.seller_verified,
          s.slug AS seller_slug
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

    // Prefer the English name for a clean URL slug; fall back to Bangla name.
    const slug = await generateUniqueSlug(name_en || name_bn);

    const [result] = await pool.query(
      `
        INSERT INTO products (
          seller_id, category_id, sub_category_id,
          image, gallery_urls, name_bn, name_en, slug, description,
          sale_price, original_price, stock, status,
          unit, featured, sold_qty, discount, is_freedelivery, wishlist
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        seller_id      || null,
        category_id    || null,
        sub_category_id || null,
        image          || null,
        serializeGalleryUrls(gallery_urls),
        name_bn,
        name_en        || null,
        slug,
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
      data: { id: result.insertId, slug },
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

    // Only regenerate the slug if the product name actually changed
    // (or if it never had one, e.g. an old row from before this migration).
    const [existingRows] = await pool.query(
      "SELECT name_bn, name_en, slug FROM products WHERE id = ?",
      [req.params.id]
    );
    if (existingRows.length === 0) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }
    const existing = existingRows[0];
    const nameChanged = existing.name_bn !== name_bn || existing.name_en !== (name_en || null);
    const slug = (nameChanged || !existing.slug)
      ? await generateUniqueSlug(name_en || name_bn, req.params.id)
      : existing.slug;

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
          slug            = ?,
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
        slug,
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

    res.json({ success: true, message: "Product updated successfully", data: { slug } });
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
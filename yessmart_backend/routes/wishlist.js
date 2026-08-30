const express = require("express");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const pool = require("../db");

const router = express.Router();
// The central auth service signs users with JWT_SECRET. Keep AUTH_TOKEN_SECRET
// as a fallback for deployments that explicitly configure the Mart service
// with the same shared secret.
const TOKEN_SECRET = process.env.JWT_SECRET || process.env.AUTH_TOKEN_SECRET || "secret";

function verifyCustomToken(token = "") {
  const parts = String(token).split(".");
  if (parts.length !== 2) return null;

  const [payload, signature] = parts;
  if (!payload || !signature) return null;

  const expected = crypto
    .createHmac("sha256", TOKEN_SECRET)
    .update(payload)
    .digest("base64url");

  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!data.exp || data.exp < Date.now()) return null;
    return data;
  } catch {
    return null;
  }
}

function verifyToken(token = "") {
  const parts = String(token).split(".");

  if (parts.length === 2) {
    return verifyCustomToken(token);
  }

  try {
    return jwt.verify(token, TOKEN_SECRET);
  } catch {
    return null;
  }
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ")
    ? header.slice(7)
    : req.cookies?.token || "";

  const auth = verifyToken(token);

  if (!auth || !auth.id) {
    return res.status(401).json({
      success: false,
      message: "Login required",
    });
  }

  req.auth = auth;
  next();
}

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

const normalizeProductRow = (row) => ({
  ...row,
  gallery_urls: normalizeGalleryUrls(row.gallery_urls),
  wishlist: 1,
  is_wishlisted: 1,
});

// GET /api/wishlist
// Logged-in user's wishlist only
router.get("/", requireAuth, async (req, res) => {
  try {
    const userId = req.auth.id;

    const [rows] = await pool.query(
      `
        SELECT
          p.*,
          1 AS wishlist,
          1 AS is_wishlisted,
          w.created_at AS wishlisted_at,
          c.name AS category_name,
          sc.name AS sub_category_name,
          s.user_id AS vendor_id,
          s.seller_name,
          s.shop_name,
          s.seller_verified
        FROM product_wishlists w
        INNER JOIN products p ON p.id = w.product_id
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN sub_categories sc ON p.sub_category_id = sc.id
        LEFT JOIN sellers s ON p.seller_id = s.id
        WHERE w.user_id = ?
        ORDER BY w.created_at DESC
      `,
      [userId]
    );

    res.json({
      success: true,
      data: rows.map(normalizeProductRow),
    });
  } catch (error) {
    console.error("Get wishlist error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch wishlist",
      error: error.message,
    });
  }
});

// POST /api/wishlist/:productId
// Add product to wishlist
router.post("/:productId", requireAuth, async (req, res) => {
  try {
    const userId = req.auth.id;
    const productId = Number(req.params.productId);

    if (!Number.isInteger(productId) || productId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Valid product id is required",
      });
    }

    const [productRows] = await pool.query(
      "SELECT id FROM products WHERE id = ? LIMIT 1",
      [productId]
    );

    if (productRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    await pool.query(
      `
        INSERT IGNORE INTO product_wishlists (user_id, product_id)
        VALUES (?, ?)
      `,
      [userId, productId]
    );

    res.json({
      success: true,
      message: "Added to wishlist",
      data: {
        wishlist: 1,
        is_wishlisted: 1,
      },
    });
  } catch (error) {
    console.error("Add wishlist error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to add wishlist",
      error: error.message,
    });
  }
});

// DELETE /api/wishlist/:productId
// Remove product from wishlist
router.delete("/:productId", requireAuth, async (req, res) => {
  try {
    const userId = req.auth.id;
    const productId = Number(req.params.productId);

    if (!Number.isInteger(productId) || productId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Valid product id is required",
      });
    }

    await pool.query(
      `
        DELETE FROM product_wishlists
        WHERE user_id = ? AND product_id = ?
      `,
      [userId, productId]
    );

    res.json({
      success: true,
      message: "Removed from wishlist",
      data: {
        wishlist: 0,
        is_wishlisted: 0,
      },
    });
  } catch (error) {
    console.error("Remove wishlist error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to remove wishlist",
      error: error.message,
    });
  }
});

// PATCH /api/wishlist/:productId/toggle
// Add/remove toggle
router.patch("/:productId/toggle", requireAuth, async (req, res) => {
  try {
    const userId = req.auth.id;
    const productId = Number(req.params.productId);

    if (!Number.isInteger(productId) || productId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Valid product id is required",
      });
    }

    const [productRows] = await pool.query(
      "SELECT id FROM products WHERE id = ? LIMIT 1",
      [productId]
    );

    if (productRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const [exists] = await pool.query(
      `
        SELECT id
        FROM product_wishlists
        WHERE user_id = ? AND product_id = ?
        LIMIT 1
      `,
      [userId, productId]
    );

    if (exists.length > 0) {
      await pool.query(
        `
          DELETE FROM product_wishlists
          WHERE user_id = ? AND product_id = ?
        `,
        [userId, productId]
      );

      return res.json({
        success: true,
        message: "Removed from wishlist",
        data: {
          wishlist: 0,
          is_wishlisted: 0,
        },
      });
    }

    await pool.query(
      `
        INSERT INTO product_wishlists (user_id, product_id)
        VALUES (?, ?)
      `,
      [userId, productId]
    );

    res.json({
      success: true,
      message: "Added to wishlist",
      data: {
        wishlist: 1,
        is_wishlisted: 1,
      },
    });
  } catch (error) {
    console.error("Toggle wishlist error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update wishlist",
      error: error.message,
    });
  }
});

module.exports = router;

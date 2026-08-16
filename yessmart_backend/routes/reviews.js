const express = require("express");
const pool = require("../db");

const router = express.Router();

function mapReview(row) {
  return {
    id: String(row.id),
    product_id: String(row.product_id),
    user_id: String(row.user_id),
    reviewer_name: row.reviewer_name || `User ${row.user_id}`,
    rating: Number(row.star_review || 0),
    comment: row.text_review,
    seller_reply: row.seller_reply,
    seller_reply_by: row.seller_reply_by,
    seller_reply_at: row.seller_reply_at,
    created_at: row.created_at,
  };
}

// Shared SELECT that joins users so we get the real reviewer name.
// users lives in shondhaan_db, reviews lives in ymart_db, so we
// cross-database join by fully qualifying the table name.
const REVIEW_SELECT = `
  SELECT r.id, r.user_id, r.product_id, r.text_review, r.star_review,
         r.seller_reply, r.seller_reply_by, r.seller_reply_at, r.created_at,
         u.name AS reviewer_name
  FROM reviews r
  LEFT JOIN shondhaan_db.users u ON u.id = r.user_id
`;

// Get reviews for a product
router.get("/", async (req, res) => {
  const { product_id } = req.query;

  if (!product_id) {
    return res.status(400).json({
      success: false,
      message: "product_id is required",
    });
  }

  try {
    const [rows] = await pool.query(
      `${REVIEW_SELECT} WHERE r.product_id = ? ORDER BY r.created_at DESC`,
      [product_id]
    );

    res.json({
      success: true,
      data: rows.map(mapReview),
    });
  } catch (error) {
    console.error("Fetch reviews error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Create new review
// Same user can review same product multiple times
router.post("/", async (req, res) => {
  const { user_id, product_id, text_review, star_review } = req.body;
  const rating = Number(star_review);

  if (!user_id || !product_id) {
    return res.status(400).json({
      success: false,
      message: "user_id and product_id are required",
    });
  }

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return res.status(400).json({
      success: false,
      message: "star_review must be between 1 and 5",
    });
  }

  try {
    const [result] = await pool.query(
      `INSERT INTO reviews (user_id, product_id, text_review, star_review)
       VALUES (?, ?, ?, ?)`,
      [user_id, product_id, text_review || null, rating]
    );

    const [rows] = await pool.query(
      `${REVIEW_SELECT} WHERE r.id = ?`,
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      data: mapReview(rows[0]),
    });
  } catch (error) {
    console.error("Save review error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Update review by owner
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { user_id, text_review, star_review } = req.body;
  const rating = Number(star_review);

  if (!user_id) {
    return res.status(400).json({
      success: false,
      message: "user_id is required",
    });
  }

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return res.status(400).json({
      success: false,
      message: "star_review must be between 1 and 5",
    });
  }

  try {
    const [result] = await pool.query(
      `UPDATE reviews
       SET text_review = ?, star_review = ?
       WHERE id = ? AND user_id = ?`,
      [text_review || null, rating, id, user_id]
    );

    if (!result.affectedRows) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    res.json({
      success: true,
      message: "Review updated",
    });
  } catch (error) {
    console.error("Update review error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

async function saveSellerReply(req, res) {
  const { id } = req.params;
  const userId = Number(req.body.user_id ?? req.body.seller_id);
  const sellerReply = String(req.body.seller_reply ?? req.body.reply ?? "").trim();

  if (!userId) {
    return res.status(400).json({
      success: false,
      message: "user_id is required",
    });
  }

  if (!sellerReply) {
    return res.status(400).json({
      success: false,
      message: "seller_reply is required",
    });
  }

  try {
    const [reviewRows] = await pool.query(
      `SELECT
          r.id,
          r.product_id,
          p.seller_id,
          s.user_id AS seller_user_id
       FROM reviews r
       INNER JOIN products p ON p.id = r.product_id
       LEFT JOIN sellers s ON s.id = p.seller_id
       WHERE r.id = ?
       LIMIT 1`,
      [id]
    );

    if (!reviewRows.length) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    if (Number(reviewRows[0].seller_user_id) !== userId) {
      return res.status(403).json({
        success: false,
        message: "Only the product seller can reply to this review",
      });
    }

    const [result] = await pool.query(
      `UPDATE reviews
       SET seller_reply = ?, seller_reply_by = ?, seller_reply_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [sellerReply, userId, id]
    );

    if (!result.affectedRows) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    const [rows] = await pool.query(
      `${REVIEW_SELECT} WHERE r.id = ?`,
      [id]
    );

    res.json({
      success: true,
      message: "Seller reply added",
      data: mapReview(rows[0]),
    });
  } catch (error) {
    console.error("Seller reply error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}

// Seller reply to a review. /reply matches the frontend; /seller-reply keeps old clients working.
router.put("/:id/reply", saveSellerReply);
router.put("/:id/seller-reply", saveSellerReply);

// Delete review by owner
router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  const userId = req.body?.user_id || req.query.user_id;

  if (!userId) {
    return res.status(400).json({
      success: false,
      message: "user_id is required",
    });
  }

  try {
    const [result] = await pool.query(
      "DELETE FROM reviews WHERE id = ? AND user_id = ?",
      [id, userId]
    );

    if (!result.affectedRows) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    res.json({
      success: true,
      message: "Review deleted",
    });
  } catch (error) {
    console.error("Delete review error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;
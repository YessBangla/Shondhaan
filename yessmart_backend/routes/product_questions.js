const express = require("express");
const pool = require("../db");

const router = express.Router();

function mapQuestion(row) {
  return {
    id: String(row.id),
    product_id: String(row.product_id),
    user_id: String(row.user_id),
    seller_id: row.seller_id == null ? null : String(row.seller_id),
    question: row.question,
    answer: row.answer,
    answered_by: row.answered_by == null ? null : String(row.answered_by),
    answered_at: row.answered_at,
    is_visible: Boolean(row.is_visible),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

async function getQuestionById(id) {
  const [rows] = await pool.query(
    `SELECT id, product_id, user_id, seller_id, question, answer, answered_by,
            answered_at, is_visible, created_at, updated_at
     FROM product_questions
     WHERE id = ?
     LIMIT 1`,
    [id]
  );

  return rows[0] || null;
}

async function userOwnsSeller(userId, sellerId) {
  if (!userId || !sellerId) return false;

  const [rows] = await pool.query(
    "SELECT id FROM sellers WHERE id = ? AND user_id = ? LIMIT 1",
    [sellerId, userId]
  );

  return rows.length > 0;
}

router.get("/", async (req, res) => {
  const { product_id } = req.query;

  if (!product_id) {
    return res.status(400).json({ success: false, message: "product_id is required" });
  }

  try {
    const [rows] = await pool.query(
      `SELECT id, product_id, user_id, seller_id, question, answer, answered_by,
              answered_at, is_visible, created_at, updated_at
       FROM product_questions
       WHERE product_id = ? AND is_visible = 1
       ORDER BY created_at DESC
       LIMIT 50`,
      [product_id]
    );

    res.json({ success: true, data: rows.map(mapQuestion) });
  } catch (error) {
    console.error("Fetch product questions error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post("/", async (req, res) => {
  const { product_id, user_id, question } = req.body;
  const cleanQuestion = String(question || "").trim();

  if (!product_id || !user_id) {
    return res.status(400).json({ success: false, message: "product_id and user_id are required" });
  }

  if (!cleanQuestion) {
    return res.status(400).json({ success: false, message: "question is required" });
  }

  try {
    const [products] = await pool.query(
      "SELECT seller_id FROM products WHERE id = ? LIMIT 1",
      [product_id]
    );

    if (!products[0]) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    const [result] = await pool.query(
      `INSERT INTO product_questions (product_id, user_id, seller_id, question)
       VALUES (?, ?, ?, ?)`,
      [product_id, user_id, products[0].seller_id || null, cleanQuestion]
    );

    const saved = await getQuestionById(result.insertId);
    res.status(201).json({ success: true, data: mapQuestion(saved) });
  } catch (error) {
    console.error("Save product question error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put("/:id/answer", async (req, res) => {
  const { id } = req.params;
  const { user_id, seller_id, answer } = req.body;
  const cleanAnswer = String(answer || "").trim();

  if (!user_id || !seller_id) {
    return res.status(400).json({ success: false, message: "user_id and seller_id are required" });
  }

  if (!cleanAnswer) {
    return res.status(400).json({ success: false, message: "answer is required" });
  }

  try {
    const question = await getQuestionById(id);
    if (!question) {
      return res.status(404).json({ success: false, message: "Question not found" });
    }

    if (String(question.seller_id) !== String(seller_id) || !(await userOwnsSeller(user_id, seller_id))) {
      return res.status(403).json({ success: false, message: "Only this product vendor can answer" });
    }

    await pool.query(
      `UPDATE product_questions
       SET answer = ?, answered_by = ?, answered_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [cleanAnswer, user_id, id]
    );

    const saved = await getQuestionById(id);
    res.json({ success: true, data: mapQuestion(saved) });
  } catch (error) {
    console.error("Answer product question error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  const userId = req.body?.user_id || req.query.user_id;

  if (!userId) {
    return res.status(400).json({ success: false, message: "user_id is required" });
  }

  try {
    const [result] = await pool.query(
      "UPDATE product_questions SET is_visible = 0 WHERE id = ? AND user_id = ?",
      [id, userId]
    );

    if (!result.affectedRows) {
      return res.status(404).json({ success: false, message: "Question not found" });
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Delete product question error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;

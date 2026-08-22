const express = require("express");
const router  = express.Router();
const pool    = require("../db");

const VALID_TYPES = ["PERCENTAGE", "FIXED"];

function validateRulePayload({ min_purchase_amount, reward_type, reward_value }) {
  const min = Number(min_purchase_amount);
  const value = Number(reward_value);
  if (!Number.isFinite(min) || min < 0) return "min_purchase_amount must be a non-negative number.";
  if (!VALID_TYPES.includes(reward_type)) return "reward_type must be PERCENTAGE or FIXED.";
  if (!Number.isFinite(value) || value <= 0) return "reward_value must be a positive number.";
  if (reward_type === "PERCENTAGE" && value > 100) return "Percentage reward_value cannot exceed 100.";
  return null;
}

// ─────────────────────────────────────────────────────
// GET /api/mart-reward-rules  (admin — all rules)
// ─────────────────────────────────────────────────────
router.get("/", async (req, res) => {
  try {
    const [rows] = await pool.query(`SELECT * FROM mart_reward_rules ORDER BY min_purchase_amount ASC`);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error("Get mart reward rules error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─────────────────────────────────────────────────────
// GET /api/mart-reward-rules/active  (public — storefront display)
// ─────────────────────────────────────────────────────
router.get("/active", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, label, min_purchase_amount, reward_type, reward_value
       FROM mart_reward_rules WHERE is_active = 1 ORDER BY min_purchase_amount ASC`
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error("Get active mart reward rules error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─────────────────────────────────────────────────────
// GET /api/mart-reward-rules/match?amount=1500
// Used internally by orders.routes.js to decide reward before crediting wallet
// ─────────────────────────────────────────────────────
router.get("/match", async (req, res) => {
  const amount = Number(req.query.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return res.status(400).json({ success: false, message: "Valid amount query param required" });
  }
  try {
    const [rows] = await pool.query(
      `SELECT * FROM mart_reward_rules
       WHERE is_active = 1 AND min_purchase_amount < ?
       ORDER BY min_purchase_amount DESC LIMIT 1`,
      [amount]
    );
    res.json({ success: true, data: rows[0] || null });
  } catch (error) {
    console.error("Match mart reward rule error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─────────────────────────────────────────────────────
// POST /api/mart-reward-rules
// ─────────────────────────────────────────────────────
router.post("/", async (req, res) => {
  const { label, min_purchase_amount, reward_type, reward_value, is_active = 1 } = req.body;
  const error = validateRulePayload({ min_purchase_amount, reward_type, reward_value });
  if (error) return res.status(400).json({ success: false, message: error });

  try {
    const [result] = await pool.query(
      `INSERT INTO mart_reward_rules (label, min_purchase_amount, reward_type, reward_value, is_active)
       VALUES (?, ?, ?, ?, ?)`,
      [label || null, min_purchase_amount, reward_type, reward_value, is_active ? 1 : 0]
    );
    res.status(201).json({ success: true, message: "Reward rule created", id: result.insertId });
  } catch (error) {
    console.error("Create mart reward rule error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─────────────────────────────────────────────────────
// PUT /api/mart-reward-rules/:id
// ─────────────────────────────────────────────────────
router.put("/:id", async (req, res) => {
  const { label, min_purchase_amount, reward_type, reward_value, is_active } = req.body;
  const error = validateRulePayload({ min_purchase_amount, reward_type, reward_value });
  if (error) return res.status(400).json({ success: false, message: error });

  try {
    const [result] = await pool.query(
      `UPDATE mart_reward_rules
       SET label = ?, min_purchase_amount = ?, reward_type = ?, reward_value = ?, is_active = ?
       WHERE id = ?`,
      [label || null, min_purchase_amount, reward_type, reward_value, is_active ? 1 : 0, req.params.id]
    );
    if (!result.affectedRows) return res.status(404).json({ success: false, message: "Reward rule not found" });
    res.json({ success: true, message: "Reward rule updated" });
  } catch (error) {
    console.error("Update mart reward rule error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─────────────────────────────────────────────────────
// PATCH /api/mart-reward-rules/:id/toggle
// ─────────────────────────────────────────────────────
router.patch("/:id/toggle", async (req, res) => {
  try {
    const [result] = await pool.query(
      `UPDATE mart_reward_rules SET is_active = NOT is_active WHERE id = ?`,
      [req.params.id]
    );
    if (!result.affectedRows) return res.status(404).json({ success: false, message: "Reward rule not found" });
    const [rows] = await pool.query(`SELECT is_active FROM mart_reward_rules WHERE id = ?`, [req.params.id]);
    res.json({ success: true, is_active: Boolean(rows[0]?.is_active) });
  } catch (error) {
    console.error("Toggle mart reward rule error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─────────────────────────────────────────────────────
// DELETE /api/mart-reward-rules/:id
// ─────────────────────────────────────────────────────
router.delete("/:id", async (req, res) => {
  try {
    const [result] = await pool.query(`DELETE FROM mart_reward_rules WHERE id = ?`, [req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ success: false, message: "Reward rule not found" });
    res.json({ success: true, message: "Reward rule deleted" });
  } catch (error) {
    console.error("Delete mart reward rule error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
const express = require("express");
const router  = express.Router();
const pool    = require("../db");

// GET /api/notifications?user_id=3
router.get("/", async (req, res) => {
  const { user_id } = req.query;
  if (!user_id) {
    return res.status(400).json({ success: false, message: "user_id is required" });
  }

  try {
    const [rows] = await pool.query(
      `SELECT * FROM notifications
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT 50`,
      [user_id]
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error("Fetch notifications error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/notifications
router.post("/", async (req, res) => {
  const {
    user_id,
    title,
    message,
    type,
    reference_id,
    product_id,
    productId,
    action_url,
    actionUrl,
    url,
    metadata,
  } = req.body;
  if (!user_id || !message) {
    return res.status(400).json({ success: false, message: "user_id and message are required" });
  }

  try {
    const resolvedProductId = product_id ?? productId ?? metadata?.product_id ?? metadata?.productId ?? null;
    const resolvedActionUrl = action_url ?? actionUrl ?? url ?? metadata?.action_url ?? metadata?.url ?? null;

    const [result] = await pool.query(
      `INSERT INTO notifications
         (user_id, title, message, type, reference_id, product_id, action_url, is_read, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, NOW())`,
      [
        user_id,
        title || null,
        message,
        type || "general",
        reference_id || null,
        resolvedProductId || null,
        resolvedActionUrl || null,
      ]
    );
    res.status(201).json({
      success: true,
      data: {
        id: result.insertId,
        user_id,
        title: title || null,
        message,
        type: type || "general",
        reference_id: reference_id || null,
        product_id: resolvedProductId || null,
        action_url: resolvedActionUrl || null,
        is_read: false,
        created_at: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Create notification error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/notifications/:id/read
router.put("/:id/read", async (req, res) => {
  try {
    await pool.query(
      `UPDATE notifications SET is_read = 1 WHERE id = ?`,
      [req.params.id]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/notifications/read-all
router.put("/read-all", async (req, res) => {
  const { user_id } = req.body;
  if (!user_id) {
    return res.status(400).json({ success: false, message: "user_id is required" });
  }
  try {
    await pool.query(
      `UPDATE notifications SET is_read = 1 WHERE user_id = ?`,
      [user_id]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/notifications/:id
router.delete("/:id", async (req, res) => {
  try {
    await pool.query(`DELETE FROM notifications WHERE id = ?`, [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;

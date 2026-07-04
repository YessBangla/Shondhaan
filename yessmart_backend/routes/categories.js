const express = require("express");
const router = express.Router();
const pool = require("../db");

// GET /api/categories
router.get("/", async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT id, name, name_en, slug, image_url, icon_url, sort_order, created_at FROM categories ORDER BY sort_order ASC, id ASC"
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch categories", error: error.message });
  }
});

// POST /api/categories  — create new category
router.post("/", async (req, res) => {
  try {
    const { name, name_en, slug, image_url, icon_url, sort_order = 0 } = req.body;
    if (!name) return res.status(400).json({ success: false, message: "name is required" });

    const [result] = await pool.query(
      "INSERT INTO categories (name, name_en, slug, image_url, icon_url, sort_order) VALUES (?, ?, ?, ?, ?, ?)",
      [name, name_en || null, slug || null, image_url || null, icon_url || null, sort_order]
    );
    const [rows] = await pool.query("SELECT * FROM categories WHERE id = ?", [result.insertId]);
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    const isDupe = err.code === "ER_DUP_ENTRY";
    res.status(isDupe ? 409 : 500).json({
      success: false,
      message: isDupe ? "Category name already exists" : err.message,
    });
  }
});

// PUT /api/categories/:id  — update existing category
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, name_en, slug, image_url, icon_url, sort_order } = req.body;
    if (!name) return res.status(400).json({ success: false, message: "name is required" });

    await pool.query(
      `UPDATE categories SET name=?, name_en=?, slug=?, image_url=?, icon_url=?, sort_order=? WHERE id=?`,
      [name, name_en || null, slug || null, image_url || null, icon_url || null, sort_order ?? 0, id]
    );
    const [rows] = await pool.query("SELECT * FROM categories WHERE id = ?", [id]);
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/categories/:id
router.delete("/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM categories WHERE id = ?", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
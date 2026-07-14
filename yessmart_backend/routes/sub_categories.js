const express = require("express");
const router = express.Router();
const pool = require("../db");

// GET /api/sub-categories
router.get("/", async (req, res) => {
  try {
    const { category_id } = req.query;
    const where = [];
    const values = [];

    if (category_id) {
      where.push("sc.category_id = ?");
      values.push(category_id);
    }

    const [rows] = await pool.query(`
      SELECT
        sc.id,
        sc.name,
        sc.category_id,
        c.name AS category_name
      FROM sub_categories sc
      JOIN categories c ON sc.category_id = c.id
      ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
      ORDER BY sc.id ASC
    `, values);

    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch sub-categories",
      error: error.message,
    });
  }
});

// POST /api/sub-categories
router.post("/", async (req, res) => {
  try {
    const { category_id, name } = req.body;
    if (!category_id) return res.status(400).json({ success: false, message: "category_id is required" });
    if (!String(name || "").trim()) return res.status(400).json({ success: false, message: "name is required" });

    const [result] = await pool.query(
      "INSERT INTO sub_categories (category_id, name) VALUES (?, ?)",
      [category_id, String(name).trim()]
    );
    const [rows] = await pool.query(
      `SELECT sc.id, sc.name, sc.category_id, c.name AS category_name
       FROM sub_categories sc
       JOIN categories c ON sc.category_id = c.id
       WHERE sc.id = ?`,
      [result.insertId]
    );
    res.json({ success: true, data: rows[0] });
  } catch (error) {
    const isDupe = error.code === "ER_DUP_ENTRY";
    res.status(isDupe ? 409 : 500).json({
      success: false,
      message: isDupe ? "Sub category already exists in this category" : "Failed to create sub-category",
      error: error.message,
    });
  }
});

// PUT /api/sub-categories/:id
router.put("/:id", async (req, res) => {
  try {
    const { category_id, name } = req.body;
    if (!category_id) return res.status(400).json({ success: false, message: "category_id is required" });
    if (!String(name || "").trim()) return res.status(400).json({ success: false, message: "name is required" });

    await pool.query(
      "UPDATE sub_categories SET category_id = ?, name = ? WHERE id = ?",
      [category_id, String(name).trim(), req.params.id]
    );
    const [rows] = await pool.query(
      `SELECT sc.id, sc.name, sc.category_id, c.name AS category_name
       FROM sub_categories sc
       JOIN categories c ON sc.category_id = c.id
       WHERE sc.id = ?`,
      [req.params.id]
    );
    res.json({ success: true, data: rows[0] || null });
  } catch (error) {
    const isDupe = error.code === "ER_DUP_ENTRY";
    res.status(isDupe ? 409 : 500).json({
      success: false,
      message: isDupe ? "Sub category already exists in this category" : "Failed to update sub-category",
      error: error.message,
    });
  }
});

// DELETE /api/sub-categories/:id
router.delete("/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM sub_categories WHERE id = ?", [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to delete sub-category",
      error: error.message,
    });
  }
});

module.exports = router;

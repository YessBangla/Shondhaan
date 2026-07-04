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

module.exports = router;

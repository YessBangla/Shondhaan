const express = require("express");
const mysql = require("mysql2");
const router = express.Router();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'yessjob_backend',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
}).promise();

router.get("/", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, name, price, duration_days, visibility_level,
              max_applications, max_jobs_per_year, features,
              is_featured
       FROM packages
       WHERE is_active = 1
       ORDER BY sort_order ASC, price ASC`
    );
    // features is already JSON in MySQL, but mysql2 sometimes returns it as a string
    const parsed = rows.map(r => ({
      ...r,
      features: typeof r.features === "string" ? JSON.parse(r.features) : r.features,
    }));
    res.json(parsed);
  } catch (err) {
    console.error("GET /api/packages failed:", err);
    res.status(500).json({ message: "প্যাকেজ লোড করতে সমস্যা হয়েছে" });
  }
});

module.exports = router;
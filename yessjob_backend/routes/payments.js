const express = require("express");
const mysql = require("mysql2");
const router = express.Router();

// TODO: import your existing admin auth middleware, e.g.:
// const { requireAdmin } = require("../middleware/auth");
// and add `requireAdmin` before the handler on every admin-only route below.

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'yessjob_backend',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
}).promise();

const ALLOWED_VISIBILITY = ["basic", "standard", "premium", "premium_plus", "hot"];

function parseFeatures(row) {
  return {
    ...row,
    features: typeof row.features === "string" ? JSON.parse(row.features) : row.features,
  };
}

function validatePackageBody(body, { partial = false } = {}) {
  const errors = [];
  const {
    name, price, duration_days, visibility_level,
    max_applications, max_jobs_per_year, features,
    is_featured, is_active, sort_order,
  } = body;

  if (!partial || name !== undefined) {
    if (!name || typeof name !== "string" || !name.trim()) errors.push("name is required");
  }
  if (!partial || price !== undefined) {
    if (price === undefined || price === null || isNaN(Number(price)) || Number(price) < 0) {
      errors.push("price must be a non-negative number");
    }
  }
  if (duration_days !== undefined && duration_days !== null) {
    if (isNaN(Number(duration_days)) || Number(duration_days) <= 0) errors.push("duration_days must be a positive number");
  }
  if (!partial || visibility_level !== undefined) {
    if (!ALLOWED_VISIBILITY.includes(visibility_level)) {
      errors.push(`visibility_level must be one of: ${ALLOWED_VISIBILITY.join(", ")}`);
    }
  }
  if (max_applications !== undefined && max_applications !== null) {
    if (isNaN(Number(max_applications)) || Number(max_applications) < 0) errors.push("max_applications must be a non-negative number or null");
  }
  if (max_jobs_per_year !== undefined && max_jobs_per_year !== null) {
    if (isNaN(Number(max_jobs_per_year)) || Number(max_jobs_per_year) < 0) errors.push("max_jobs_per_year must be a non-negative number or null");
  }
  if (!partial || features !== undefined) {
    if (!Array.isArray(features) || features.some(f => typeof f !== "string")) {
      errors.push("features must be an array of strings");
    }
  }
  if (sort_order !== undefined && sort_order !== null) {
    if (isNaN(Number(sort_order))) errors.push("sort_order must be a number");
  }
  if (is_featured !== undefined && ![0, 1, true, false].includes(is_featured)) errors.push("is_featured must be boolean");
  if (is_active !== undefined && ![0, 1, true, false].includes(is_active)) errors.push("is_active must be boolean");

  return errors;
}

// -----------------------------------------------------------------------
// Public: active packages only, used by the employer-facing package
// selection modal. Keep this route's path/shape unchanged.
// -----------------------------------------------------------------------
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
    res.json(rows.map(parseFeatures));
  } catch (err) {
    console.error("GET /api/packages failed:", err);
    res.status(500).json({ message: "প্যাকেজ লোড করতে সমস্যা হয়েছে" });
  }
});

// -----------------------------------------------------------------------
// Admin: full list including inactive packages, for the admin dashboard
// table. NOTE: this must be declared before GET "/:id" or Express will
// try to match "admin" as an :id param.
// -----------------------------------------------------------------------
router.get("/admin/all", /* requireAdmin, */ async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT * FROM packages ORDER BY sort_order ASC, price ASC`
    );
    res.json(rows.map(parseFeatures));
  } catch (err) {
    console.error("GET /api/packages/admin/all failed:", err);
    res.status(500).json({ message: "প্যাকেজ লোড করতে সমস্যা হয়েছে" });
  }
});

// Admin: single package by id
router.get("/:id", /* requireAdmin, */ async (req, res) => {
  try {
    const [rows] = await pool.query(`SELECT * FROM packages WHERE id = ?`, [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ message: "প্যাকেজ পাওয়া যায়নি" });
    res.json(parseFeatures(rows[0]));
  } catch (err) {
    console.error("GET /api/packages/:id failed:", err);
    res.status(500).json({ message: "প্যাকেজ লোড করতে সমস্যা হয়েছে" });
  }
});

// Admin: create package
router.post("/", /* requireAdmin, */ async (req, res) => {
  const errors = validatePackageBody(req.body);
  if (errors.length) return res.status(400).json({ message: "ইনপুট সঠিক নয়", errors });

  const {
    name, price, duration_days = 30, visibility_level,
    max_applications = null, max_jobs_per_year = null, features,
    is_featured = 0, is_active = 1, sort_order = 0,
  } = req.body;

  try {
    const [result] = await pool.query(
      `INSERT INTO packages
        (name, price, duration_days, visibility_level, max_applications,
         max_jobs_per_year, features, is_featured, is_active, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name.trim(), price, duration_days, visibility_level,
        max_applications, max_jobs_per_year, JSON.stringify(features),
        is_featured ? 1 : 0, is_active ? 1 : 0, sort_order,
      ]
    );
    const [rows] = await pool.query(`SELECT * FROM packages WHERE id = ?`, [result.insertId]);
    res.status(201).json(parseFeatures(rows[0]));
  } catch (err) {
    console.error("POST /api/packages failed:", err);
    res.status(500).json({ message: "প্যাকেজ তৈরি করতে সমস্যা হয়েছে" });
  }
});

// Admin: update package (partial update supported)
router.put("/:id", /* requireAdmin, */ async (req, res) => {
  const errors = validatePackageBody(req.body, { partial: true });
  if (errors.length) return res.status(400).json({ message: "ইনপুট সঠিক নয়", errors });

  const fields = [];
  const values = [];
  const fieldMap = {
    name: v => v.trim(),
    price: v => v,
    duration_days: v => v,
    visibility_level: v => v,
    max_applications: v => v,
    max_jobs_per_year: v => v,
    features: v => JSON.stringify(v),
    is_featured: v => (v ? 1 : 0),
    is_active: v => (v ? 1 : 0),
    sort_order: v => v,
  };

  for (const key of Object.keys(fieldMap)) {
    if (req.body[key] !== undefined) {
      fields.push(`${key} = ?`);
      values.push(fieldMap[key](req.body[key]));
    }
  }

  if (fields.length === 0) return res.status(400).json({ message: "কোনো ফিল্ড দেওয়া হয়নি" });

  try {
    values.push(req.params.id);
    const [result] = await pool.query(`UPDATE packages SET ${fields.join(", ")} WHERE id = ?`, values);
    if (result.affectedRows === 0) return res.status(404).json({ message: "প্যাকেজ পাওয়া যায়নি" });

    const [rows] = await pool.query(`SELECT * FROM packages WHERE id = ?`, [req.params.id]);
    res.json(parseFeatures(rows[0]));
  } catch (err) {
    console.error("PUT /api/packages/:id failed:", err);
    res.status(500).json({ message: "প্যাকেজ আপডেট করতে সমস্যা হয়েছে" });
  }
});

// Admin: delete package
// Prefer soft-delete (is_active = 0) if packages may already be referenced
// by past purchases; hard delete only makes sense once jobs.package_id
// has ON DELETE SET NULL / RESTRICT decided.
router.delete("/:id", /* requireAdmin, */ async (req, res) => {
  try {
    const [result] = await pool.query(`DELETE FROM packages WHERE id = ?`, [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ message: "প্যাকেজ পাওয়া যায়নি" });
    res.json({ message: "প্যাকেজ মুছে ফেলা হয়েছে" });
  } catch (err) {
    console.error("DELETE /api/packages/:id failed:", err);
    // Likely FK constraint from jobs.package_id referencing this package
    res.status(409).json({ message: "এই প্যাকেজটি ব্যবহৃত হচ্ছে, তাই মুছে ফেলা যাচ্ছে না। এটি নিষ্ক্রিয় (inactive) করুন।" });
  }
});

module.exports = router;



const express = require("express");
const router = express.Router();
const { pool } = require("../database/Createjobcategoriestable");

// ── Auth placeholder ─────────────────────────────────────────────────────
// employerProfile.js already has logic that reads `Authorization: Bearer <jwt>`
// and forwards/verifies it (e.g. against Shondhaan) to get req.user.
// Reuse that exact logic here instead of this stub — this is just a stand-in
// so the file runs on its own. Replace requireAdmin with your real check.
function requireAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "টোকেন প্রয়োজন" });
  }
  // TODO: verify authHeader's token the same way employerProfile.js does,
  // then check the resolved user's role === "admin" before calling next().
  next();
}

// ── GET /api/job-categories ──────────────────────────────────────────────
// Public — list active categories, sorted. This is the endpoint the
// frontend (useJobCategories) reads from.
router.get("/", async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT * FROM job_categories WHERE is_active = 1 ORDER BY sort_order ASC, id ASC`
    );
    res.set("Cache-Control", "no-store");
    res.json({ categories: rows });
  } catch (err) {
    console.error("[jobCategories] list error:", err);
    res.status(500).json({ message: "ক্যাটাগরি লোড করতে সমস্যা হয়েছে" });
  }
});

// ── GET /api/job-categories/admin/all ────────────────────────────────────
// Admin only — list EVERY category, active and inactive, so the admin
// panel can re-activate or edit categories a public list would hide.
// NOTE: registered before "/:id" so "admin" isn't swallowed as an id param.
router.get("/admin/all", requireAdmin, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT * FROM job_categories ORDER BY sort_order ASC, id ASC`
    );
    res.json({ categories: rows });
  } catch (err) {
    console.error("[jobCategories] admin list error:", err);
    res.status(500).json({ message: "ক্যাটাগরি লোড করতে সমস্যা হয়েছে" });
  }
});

// ── GET /api/job-categories/:id ──────────────────────────────────────────
router.get("/:id", async (req, res) => {
  try {
    const [rows] = await pool.execute(`SELECT * FROM job_categories WHERE id = ?`, [req.params.id]);
    if (!rows[0]) return res.status(404).json({ message: "ক্যাটাগরি পাওয়া যায়নি" });
    res.json(rows[0]);
  } catch (err) {
    console.error("[jobCategories] getOne error:", err);
    res.status(500).json({ message: "সমস্যা হয়েছে" });
  }
});

// ── POST /api/job-categories ─────────────────────────────────────────────
// Admin only — create a new category.
router.post("/", requireAdmin, async (req, res) => {
  try {
    const { value, labelBn, labelEn, sortOrder } = req.body;
    if (!value || !labelBn || !labelEn) {
      return res.status(400).json({ message: "value, labelBn, labelEn আবশ্যক" });
    }

    const [existing] = await pool.execute(`SELECT id FROM job_categories WHERE value = ?`, [value]);
    if (existing[0]) {
      return res.status(409).json({ message: "এই ভ্যালুর ক্যাটাগরি ইতিমধ্যে আছে" });
    }

    const [result] = await pool.execute(
      `INSERT INTO job_categories (value, label_bn, label_en, sort_order, is_active)
       VALUES (?, ?, ?, ?, 1)`,
      [value, labelBn, labelEn, Number.isFinite(sortOrder) ? sortOrder : 0]
    );

    const [rows] = await pool.execute(`SELECT * FROM job_categories WHERE id = ?`, [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error("[jobCategories] create error:", err);
    res.status(500).json({ message: "তৈরি করতে সমস্যা হয়েছে" });
  }
});

// ── PUT /api/job-categories/reorder ──────────────────────────────────────
// Admin only — body: { orderedIds: number[] }
// NOTE: registered before "/:id" so "reorder" isn't swallowed as an id param.
router.put("/reorder", requireAdmin, async (req, res) => {
  const { orderedIds } = req.body;
  if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
    return res.status(400).json({ message: "orderedIds (array) আবশ্যক" });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    for (let i = 0; i < orderedIds.length; i++) {
      await conn.execute(`UPDATE job_categories SET sort_order = ? WHERE id = ?`, [i, orderedIds[i]]);
    }
    await conn.commit();
    const [rows] = await pool.execute(`SELECT * FROM job_categories ORDER BY sort_order ASC, id ASC`);
    res.json({ categories: rows });
  } catch (err) {
    await conn.rollback();
    console.error("[jobCategories] reorder error:", err);
    res.status(500).json({ message: "সাজাতে সমস্যা হয়েছে" });
  } finally {
    conn.release();
  }
});

// ── PUT /api/job-categories/:id ──────────────────────────────────────────
// Admin only — update a category.
router.put("/:id", requireAdmin, async (req, res) => {
  try {
    const [existingRows] = await pool.execute(`SELECT * FROM job_categories WHERE id = ?`, [req.params.id]);
    if (!existingRows[0]) return res.status(404).json({ message: "ক্যাটাগরি পাওয়া যায়নি" });

    const { value, labelBn, labelEn, sortOrder, isActive } = req.body;

    if (value && value !== existingRows[0].value) {
      const [clash] = await pool.execute(`SELECT id FROM job_categories WHERE value = ?`, [value]);
      if (clash[0]) return res.status(409).json({ message: "এই ভ্যালুর ক্যাটাগরি ইতিমধ্যে আছে" });
    }

    await pool.execute(
      `UPDATE job_categories SET
         value = COALESCE(?, value),
         label_bn = COALESCE(?, label_bn),
         label_en = COALESCE(?, label_en),
         sort_order = COALESCE(?, sort_order),
         is_active = COALESCE(?, is_active)
       WHERE id = ?`,
      [
        value ?? null,
        labelBn ?? null,
        labelEn ?? null,
        Number.isFinite(sortOrder) ? sortOrder : null,
        isActive === undefined ? null : isActive ? 1 : 0,
        req.params.id,
      ]
    );

    const [rows] = await pool.execute(`SELECT * FROM job_categories WHERE id = ?`, [req.params.id]);
    res.json(rows[0]);
  } catch (err) {
    console.error("[jobCategories] update error:", err);
    res.status(500).json({ message: "আপডেট করতে সমস্যা হয়েছে" });
  }
});

// ── DELETE /api/job-categories/:id ───────────────────────────────────────
// Admin only — soft delete by default, ?hard=1 to permanently remove.
router.delete("/:id", requireAdmin, async (req, res) => {
  try {
    const [existingRows] = await pool.execute(`SELECT * FROM job_categories WHERE id = ?`, [req.params.id]);
    if (!existingRows[0]) return res.status(404).json({ message: "ক্যাটাগরি পাওয়া যায়নি" });

    if (req.query.hard === "1") {
      await pool.execute(`DELETE FROM job_categories WHERE id = ?`, [req.params.id]);
      return res.json({ message: "স্থায়ীভাবে মুছে ফেলা হয়েছে" });
    }

    await pool.execute(`UPDATE job_categories SET is_active = 0 WHERE id = ?`, [req.params.id]);
    const [rows] = await pool.execute(`SELECT * FROM job_categories WHERE id = ?`, [req.params.id]);
    res.json({ message: "নিষ্ক্রিয় করা হয়েছে", category: rows[0] });
  } catch (err) {
    console.error("[jobCategories] delete error:", err);
    res.status(500).json({ message: "মুছতে সমস্যা হয়েছে" });
  }
});

module.exports = router;
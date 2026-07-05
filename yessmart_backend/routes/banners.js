const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const router = express.Router();

// ⚠️ ADJUST THIS LINE if your db.js exports differently.
// This assumes: module.exports = mysql2Pool (a mysql2/promise pool)
const pool = require("../db");

// ── Multer setup: stores banner images in /uploads/banners ──
const uploadDir = path.join(__dirname, "..", "uploads", "banners");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const unique = `banner_${Date.now()}_${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, unique);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = [".jpg", ".jpeg", ".png", ".webp", ".gif"];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) cb(null, true);
  else cb(new Error("Only image files (jpg, jpeg, png, webp, gif) are allowed"));
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

// Build a full public URL for a stored image filename
const buildImageUrl = (req, filename) => {
  const backendUrl = process.env.BACKEND_URL || `${req.protocol}://${req.get("host")}`;
  return `${backendUrl}/uploads/banners/${filename}`;
};

const sanitizeColor = (value, fallback) => {
  const color = String(value || "").trim();
  return /^#[0-9a-f]{6}$/i.test(color) ? color : fallback;
};

// ── GET /api/banners ──
// Public: only active banners, ordered for the carousel.
// Admin: pass ?all=1 to get every banner (active + inactive) for the dashboard.
router.get("/", async (req, res) => {
  try {
    const showAll = req.query.all === "1";
    const sql = showAll
      ? "SELECT * FROM banners ORDER BY sort_order ASC, id DESC"
      : "SELECT * FROM banners WHERE is_active = 1 ORDER BY sort_order ASC, id DESC";
    const [rows] = await pool.query(sql);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error("GET /api/banners error:", err);
    res.status(500).json({ success: false, message: "Failed to fetch banners" });
  }
});

// ── GET /api/banners/:id ──
router.get("/:id", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM banners WHERE id = ?", [req.params.id]);
    if (!rows.length) {
      return res.status(404).json({ success: false, message: "Banner not found" });
    }
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error("GET /api/banners/:id error:", err);
    res.status(500).json({ success: false, message: "Failed to fetch banner" });
  }
});

// ── POST /api/banners ──
// multipart/form-data: title, title_en, subtitle, subtitle_en, link_url, is_active, image (file)
router.post("/", upload.single("image"), async (req, res) => {
  try {
    const {
      title,
      title_en,
      subtitle,
      subtitle_en,
      link_url,
      button_label,
      button_label_en,
      button_bg_color,
      button_text_color,
      is_active,
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: "Title is required" });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: "Banner image is required" });
    }

    const imageUrl = buildImageUrl(req, req.file.filename);

    // New banners go to the end of the order by default
    const [[{ maxOrder }]] = await pool.query(
      "SELECT COALESCE(MAX(sort_order), -1) AS maxOrder FROM banners"
    );

    const [result] = await pool.query(
      `INSERT INTO banners
        (title, title_en, subtitle, subtitle_en, image_url, link_url,
         button_label, button_label_en, button_bg_color, button_text_color,
         is_active, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        title.trim(),
        title_en || null,
        subtitle || null,
        subtitle_en || null,
        imageUrl,
        link_url || null,
        button_label || null,
        button_label_en || null,
        sanitizeColor(button_bg_color, "#ffffff"),
        sanitizeColor(button_text_color, "#0f172a"),
        is_active === "0" ? 0 : 1,
        maxOrder + 1,
      ]
    );

    const [rows] = await pool.query("SELECT * FROM banners WHERE id = ?", [result.insertId]);
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error("POST /api/banners error:", err);
    res.status(500).json({ success: false, message: err.message || "Failed to create banner" });
  }
});

// ── PUT /api/banners/:id ──
// multipart/form-data — image is optional; if omitted, existing image is kept.
router.put("/:id", upload.single("image"), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      title_en,
      subtitle,
      subtitle_en,
      link_url,
      button_label,
      button_label_en,
      button_bg_color,
      button_text_color,
      is_active,
    } = req.body;

    const [existingRows] = await pool.query("SELECT * FROM banners WHERE id = ?", [id]);
    if (!existingRows.length) {
      return res.status(404).json({ success: false, message: "Banner not found" });
    }
    const existing = existingRows[0];

    let imageUrl = existing.image_url;
    if (req.file) {
      imageUrl = buildImageUrl(req, req.file.filename);

      // Delete old image file from disk (best-effort)
      try {
        const oldFilename = existing.image_url.split("/uploads/banners/")[1];
        if (oldFilename) {
          const oldPath = path.join(uploadDir, oldFilename);
          if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        }
      } catch (cleanupErr) {
        console.warn("Could not delete old banner image:", cleanupErr.message);
      }
    }

    await pool.query(
      `UPDATE banners SET
        title = ?, title_en = ?, subtitle = ?, subtitle_en = ?,
        image_url = ?, link_url = ?,
        button_label = ?, button_label_en = ?,
        button_bg_color = ?, button_text_color = ?,
        is_active = ?
       WHERE id = ?`,
      [
        title !== undefined ? title.trim() : existing.title,
        title_en !== undefined ? title_en : existing.title_en,
        subtitle !== undefined ? subtitle : existing.subtitle,
        subtitle_en !== undefined ? subtitle_en : existing.subtitle_en,
        imageUrl,
        link_url !== undefined ? link_url : existing.link_url,
        button_label !== undefined ? button_label || null : existing.button_label,
        button_label_en !== undefined ? button_label_en || null : existing.button_label_en,
        button_bg_color !== undefined
          ? sanitizeColor(button_bg_color, existing.button_bg_color || "#ffffff")
          : existing.button_bg_color,
        button_text_color !== undefined
          ? sanitizeColor(button_text_color, existing.button_text_color || "#0f172a")
          : existing.button_text_color,
        is_active !== undefined ? (is_active === "0" ? 0 : 1) : existing.is_active,
        id,
      ]
    );

    const [rows] = await pool.query("SELECT * FROM banners WHERE id = ?", [id]);
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error("PUT /api/banners/:id error:", err);
    res.status(500).json({ success: false, message: err.message || "Failed to update banner" });
  }
});

// ── PATCH /api/banners/:id/toggle ──
router.patch("/:id/toggle", async (req, res) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;

    const [result] = await pool.query("UPDATE banners SET is_active = ? WHERE id = ?", [
      is_active ? 1 : 0,
      id,
    ]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Banner not found" });
    }

    res.json({ success: true });
  } catch (err) {
    console.error("PATCH /api/banners/:id/toggle error:", err);
    res.status(500).json({ success: false, message: "Failed to toggle banner" });
  }
});

// ── PATCH /api/banners/reorder ──
// body: { order: [{ id: 1, sort_order: 0 }, { id: 3, sort_order: 1 }, ...] }
router.patch("/reorder", async (req, res) => {
  try {
    const { order } = req.body;
    if (!Array.isArray(order) || order.length === 0) {
      return res.status(400).json({ success: false, message: "order array is required" });
    }

    // Run updates sequentially in a transaction for consistency
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      for (const item of order) {
        await connection.query("UPDATE banners SET sort_order = ? WHERE id = ?", [
          item.sort_order,
          item.id,
        ]);
      }
      await connection.commit();
    } catch (txErr) {
      await connection.rollback();
      throw txErr;
    } finally {
      connection.release();
    }

    res.json({ success: true });
  } catch (err) {
    console.error("PATCH /api/banners/reorder error:", err);
    res.status(500).json({ success: false, message: "Failed to reorder banners" });
  }
});

// ── DELETE /api/banners/:id ──
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await pool.query("SELECT * FROM banners WHERE id = ?", [id]);
    if (!rows.length) {
      return res.status(404).json({ success: false, message: "Banner not found" });
    }

    // Delete image file from disk (best-effort)
    try {
      const filename = rows[0].image_url.split("/uploads/banners/")[1];
      if (filename) {
        const filePath = path.join(uploadDir, filename);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      }
    } catch (cleanupErr) {
      console.warn("Could not delete banner image file:", cleanupErr.message);
    }

    await pool.query("DELETE FROM banners WHERE id = ?", [id]);
    res.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/banners/:id error:", err);
    res.status(500).json({ success: false, message: "Failed to delete banner" });
  }
});

module.exports = router;

import { v4 as uuidv4 } from "uuid";
import { pool as db } from "../config/db.js";


/**
 * GET /api/hero-banners
 * Admin list - returns all banners
 */
export const getHeroBanners = async (req, res) => {
  try {
    const activeOnly = req.query.active === "1" || req.query.active === "true";

    let sql = `
      SELECT 
        id,
        title_bn,
        title_en,
        subtitle_bn,
        subtitle_en,
        image_url,
        is_active,
        sort_order,
        created_at,
        updated_at
      FROM cms_hero_banners
    `;

    const params = [];

    if (activeOnly) {
      sql += ` WHERE is_active = ?`;
      params.push(1);
    }

    sql += ` ORDER BY sort_order ASC, id DESC`;

    const [rows] = await db.query(sql, params);

    res.json({
      success: true,
      data: rows,
    });
  } catch (error) {
    console.error("Get hero banners error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to load hero banners",
      error: error.message,
    });
  }
};

/**
 * GET /api/hero-banners/:id
 */
export const getHeroBannerById = async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await db.query(
      `
      SELECT 
        id,
        title_bn,
        title_en,
        subtitle_bn,
        subtitle_en,
        image_url,
        is_active,
        sort_order,
        created_at,
        updated_at
      FROM cms_hero_banners
      WHERE id = ?
      LIMIT 1
      `,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Hero banner not found",
      });
    }

    res.json({
      success: true,
      data: rows[0],
    });
  } catch (error) {
    console.error("Get hero banner by id error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to load hero banner",
      error: error.message,
    });
  }
};

/**
 * POST /api/hero-banners
 */
export const createHeroBanner = async (req, res) => {
  try {
    // ✅ ADD THIS: ensure table exists
    await db.query(`
      CREATE TABLE IF NOT EXISTS cms_hero_banners (
        id VARCHAR(191) NOT NULL,
        title_bn VARCHAR(255) NOT NULL,
        title_en VARCHAR(255),
        subtitle_bn VARCHAR(255),
        subtitle_en VARCHAR(255),
        image_url TEXT,
        is_active TINYINT(1) DEFAULT 1,
        sort_order INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    const {
      title_bn,
      title_en = "",
      subtitle_bn = "",
      subtitle_en = "",
      image_url = "",
      is_active = true,
      sort_order = 0,
    } = req.body;

    if (!title_bn || !String(title_bn).trim()) {
      return res.status(400).json({
        success: false,
        message: "Bangla title is required",
      });
    }

    const id = uuidv4();

    const [result] = await db.query(
      `
      INSERT INTO cms_hero_banners (
        id,
        title_bn,
        title_en,
        subtitle_bn,
        subtitle_en,
        image_url,
        is_active,
        sort_order
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        id,
        String(title_bn).trim(),
        String(title_en || "").trim(),
        String(subtitle_bn || "").trim(),
        String(subtitle_en || "").trim(),
        String(image_url || "").trim(),
        is_active === true || is_active === 1 || is_active === "1" ? 1 : 0,
        Number(sort_order || 0),
      ]
    );

    const [rows] = await db.query(
      `SELECT * FROM cms_hero_banners WHERE id = ? LIMIT 1`,
      [id]
    );

    res.status(201).json({
      success: true,
      message: "Hero banner created successfully",
      data: rows[0],
    });
  } catch (error) {
    console.error("Create hero banner error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create hero banner",
      error: error.message,
    });
  }
};

/**
 * PUT /api/hero-banners/:id
 */
export const updateHeroBanner = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      title_bn,
      title_en = "",
      subtitle_bn = "",
      subtitle_en = "",
      image_url = "",
      is_active = true,
      sort_order = 0,
    } = req.body;

    if (!title_bn || !String(title_bn).trim()) {
      return res.status(400).json({
        success: false,
        message: "Bangla title is required",
      });
    }

    const [exists] = await db.query(
      `SELECT id FROM cms_hero_banners WHERE id = ? LIMIT 1`,
      [id]
    );

    if (exists.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Hero banner not found",
      });
    }

    await db.query(
      `
      UPDATE cms_hero_banners
      SET 
        title_bn = ?,
        title_en = ?,
        subtitle_bn = ?,
        subtitle_en = ?,
        image_url = ?,
        is_active = ?,
        sort_order = ?
      WHERE id = ?
      `,
      [
        String(title_bn).trim(),
        String(title_en || "").trim(),
        String(subtitle_bn || "").trim(),
        String(subtitle_en || "").trim(),
        String(image_url || "").trim(),
        is_active === true || is_active === 1 || is_active === "1" ? 1 : 0,
        Number(sort_order || 0),
        id,
      ]
    );

    const [rows] = await db.query(
      `SELECT * FROM cms_hero_banners WHERE id = ? LIMIT 1`,
      [id]
    );

    res.json({
      success: true,
      message: "Hero banner updated successfully",
      data: rows[0],
    });
  } catch (error) {
    console.error("Update hero banner error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update hero banner",
      error: error.message,
    });
  }
};

/**
 * DELETE /api/hero-banners/:id
 */
export const deleteHeroBanner = async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await db.query(
      `DELETE FROM cms_hero_banners WHERE id = ?`,
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Hero banner not found",
      });
    }

    res.json({
      success: true,
      message: "Hero banner deleted successfully",
    });
  } catch (error) {
    console.error("Delete hero banner error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete hero banner",
      error: error.message,
    });
  }
};
import { pool as db } from "../config/db.js";

const parseServiceSlugs = (value) => {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value.map(String).map((item) => item.trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.map(String).map((item) => item.trim()).filter(Boolean);
      }
    } catch {
      return value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }

  return [];
};

const normalizeSection = (row) => ({
  ...row,
  service_slugs: parseServiceSlugs(row.service_slugs),
  is_active: row.is_active === 1 || row.is_active === true,
});

export const getHomepageSections = async (req, res) => {
  try {
    const activeOnly = req.query.active === "1" || req.query.active === "true";

    let sql = `
      SELECT 
        id,
        section_key,
        title_bn,
        title_en,
        service_slugs,
        sort_order,
        is_active,
        created_at,
        updated_at
      FROM cms_homepage_sections
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
      data: rows.map(normalizeSection),
    });
  } catch (error) {
    console.error("Get homepage sections error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to load homepage sections",
      error: error.message,
    });
  }
};

export const getHomepageSectionById = async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await db.query(
      `
      SELECT 
        id,
        section_key,
        title_bn,
        title_en,
        service_slugs,
        sort_order,
        is_active,
        created_at,
        updated_at
      FROM cms_homepage_sections
      WHERE id = ?
      LIMIT 1
      `,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Homepage section not found",
      });
    }

    res.json({
      success: true,
      data: normalizeSection(rows[0]),
    });
  } catch (error) {
    console.error("Get homepage section error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to load homepage section",
      error: error.message,
    });
  }
};

export const createHomepageSection = async (req, res) => {
  try {
    const {
      section_key,
      title_bn,
      title_en = "",
      service_slugs = [],
      sort_order = 0,
      is_active = true,
    } = req.body;

    if (!section_key || !String(section_key).trim()) {
      return res.status(400).json({
        success: false,
        message: "Section key is required",
      });
    }

    if (!title_bn || !String(title_bn).trim()) {
      return res.status(400).json({
        success: false,
        message: "Bangla title is required",
      });
    }

    const cleanSectionKey = String(section_key).trim();
    const cleanSlugs = parseServiceSlugs(service_slugs);

    const [exists] = await db.query(
      `SELECT id FROM cms_homepage_sections WHERE section_key = ? LIMIT 1`,
      [cleanSectionKey]
    );

    if (exists.length > 0) {
      return res.status(409).json({
        success: false,
        message: "This section key already exists",
      });
    }

    const [result] = await db.query(
      `
      INSERT INTO cms_homepage_sections (
        section_key,
        title_bn,
        title_en,
        service_slugs,
        sort_order,
        is_active
      )
      VALUES (?, ?, ?, ?, ?, ?)
      `,
      [
        cleanSectionKey,
        String(title_bn).trim(),
        String(title_en || "").trim(),
        JSON.stringify(cleanSlugs),
        Number(sort_order || 0),
        is_active === true || is_active === 1 || is_active === "1" ? 1 : 0,
      ]
    );

    const [rows] = await db.query(
      `SELECT * FROM cms_homepage_sections WHERE id = ? LIMIT 1`,
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      message: "Homepage section created successfully",
      data: normalizeSection(rows[0]),
    });
  } catch (error) {
    console.error("Create homepage section error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create homepage section",
      error: error.message,
    });
  }
};

export const updateHomepageSection = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      section_key,
      title_bn,
      title_en = "",
      service_slugs = [],
      sort_order = 0,
      is_active = true,
    } = req.body;

    if (!section_key || !String(section_key).trim()) {
      return res.status(400).json({
        success: false,
        message: "Section key is required",
      });
    }

    if (!title_bn || !String(title_bn).trim()) {
      return res.status(400).json({
        success: false,
        message: "Bangla title is required",
      });
    }

    const cleanSectionKey = String(section_key).trim();
    const cleanSlugs = parseServiceSlugs(service_slugs);

    const [exists] = await db.query(
      `SELECT id FROM cms_homepage_sections WHERE id = ? LIMIT 1`,
      [id]
    );

    if (exists.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Homepage section not found",
      });
    }

    const [duplicate] = await db.query(
      `
      SELECT id 
      FROM cms_homepage_sections 
      WHERE section_key = ? AND id != ? 
      LIMIT 1
      `,
      [cleanSectionKey, id]
    );

    if (duplicate.length > 0) {
      return res.status(409).json({
        success: false,
        message: "This section key already exists",
      });
    }

    await db.query(
      `
      UPDATE cms_homepage_sections
      SET
        section_key = ?,
        title_bn = ?,
        title_en = ?,
        service_slugs = ?,
        sort_order = ?,
        is_active = ?
      WHERE id = ?
      `,
      [
        cleanSectionKey,
        String(title_bn).trim(),
        String(title_en || "").trim(),
        JSON.stringify(cleanSlugs),
        Number(sort_order || 0),
        is_active === true || is_active === 1 || is_active === "1" ? 1 : 0,
        id,
      ]
    );

    const [rows] = await db.query(
      `SELECT * FROM cms_homepage_sections WHERE id = ? LIMIT 1`,
      [id]
    );

    res.json({
      success: true,
      message: "Homepage section updated successfully",
      data: normalizeSection(rows[0]),
    });
  } catch (error) {
    console.error("Update homepage section error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update homepage section",
      error: error.message,
    });
  }
};

export const deleteHomepageSection = async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await db.query(
      `DELETE FROM cms_homepage_sections WHERE id = ?`,
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Homepage section not found",
      });
    }

    res.json({
      success: true,
      message: "Homepage section deleted successfully",
    });
  } catch (error) {
    console.error("Delete homepage section error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete homepage section",
      error: error.message,
    });
  }
};
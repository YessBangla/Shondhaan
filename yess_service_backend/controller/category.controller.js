import { pool as db } from "../config/db.js";




// ✅ Get all ACTIVE categories (FIXED)
export const getAllCategories = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        id,
        name,
        name_en,
        slug,
        icon_url,
        sort_order,
        is_active,
        created_at
      FROM service_categories
      WHERE is_active = 1
      ORDER BY sort_order ASC, created_at DESC
    `);

    res.status(200).json({
      success: true,
      count: rows.length,
      data: rows,
    });
  } catch (error) {
    console.error("Get Categories Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch categories",
    });
  }
};


// ✅ Get single ACTIVE category by slug (FIXED)
export const getCategoryBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    const [rows] = await db.query(
      `
      SELECT 
        id,
        name,
        name_en,
        slug,
        icon_url,
        sort_order,
        is_active,
        created_at
      FROM service_categories
      WHERE slug = ? AND is_active = 1
      `,
      [slug]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Category not found or inactive",
      });
    }

    res.status(200).json({
      success: true,
      data: rows[0],
    });
  } catch (error) {
    console.error("Get Category Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch category",
    });
  }
};

// ✅ Create category (optional - admin use)
export const createCategory = async (req, res) => {
  try {
    const {
      name,
      name_en,
      slug,
      icon_url,
      color_gradient,
      color_overlay,
      color_chip_bg,
      color_chip_text,
      color_accent,
      sort_order,
      is_active,
    } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Name is required",
      });
    }

    const finalSlug =
      slug ||
      name.toLowerCase().replace(/\s+/g, "-").replace(/[^\w-]+/g, "");

    // Generate UUID in Node to avoid MySQL dialect differences (e.g., UUID() not supported)
    const { randomUUID } = await import("crypto");
    const id = randomUUID();

    await db.query(
      `INSERT INTO service_categories (
        id,
        name,
        name_en,
        slug,
        icon_url,
        color_gradient,
        color_overlay,
        color_chip_bg,
        color_chip_text,
        color_accent,
        sort_order,
        is_active,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        id,
        name,
        name_en || null,
        finalSlug,
        icon_url || null,
        color_gradient || null,
        color_overlay || null,
        color_chip_bg || null,
        color_chip_text || null,
        color_accent || null,
        sort_order || 0,
        is_active !== undefined ? is_active : true,
      ]
    );

    res.status(201).json({
      success: true,
      message: "Category created successfully",
    });
  } catch (error) {
    console.error("Create Category Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create category",
    });
  }
};

// ✅ Delete category (optional)
export const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await db.query(
      "DELETE FROM service_categories WHERE id = ?",
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Category deleted successfully",
    });
  } catch (error) {
    console.error("Delete Category Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete category",
    });
  }
};

export const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      name,
      name_en,
      icon_url,
      color_gradient,
      color_overlay,
      color_chip_bg,
      color_chip_text,
      color_accent,
      sort_order,
      is_active,
    } = req.body;

    const [existing] = await db.query(
      "SELECT id FROM service_categories WHERE id = ?",
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    await db.query(
      `UPDATE service_categories SET
        name = ?,
        name_en = ?,
        icon_url = ?,
        color_gradient = ?,
        color_overlay = ?,
        color_chip_bg = ?,
        color_chip_text = ?,
        color_accent = ?,
        sort_order = ?,
        is_active = ?
      WHERE id = ?`,
      [
        name,
        name_en || null,
        icon_url || null,
        color_gradient || null,
        color_overlay || null,
        color_chip_bg || null,
        color_chip_text || null,
        color_accent || null,
        sort_order || 0,
        is_active !== undefined ? is_active : true,
        id,
      ]
    );

    res.json({
      success: true,
      message: "Category updated",
    });
  } catch (error) {
    console.error("Update Category Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update category",
    });
  }
};

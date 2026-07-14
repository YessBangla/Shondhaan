import dealDb from "../config.js";

export const getDealCategories = async (req, res) => {
  try {
    const [rows] = await dealDb.query(
      `
      SELECT 
        id,
        name,
        name_en,
        slug,
        icon,
        parent_id,
        sort_order,
        is_active,
        created_at,
        updated_at
      FROM deal_categories
      WHERE is_active = 1
      ORDER BY sort_order ASC, id ASC
      `
    );

    res.json({
      success: true,
      data: rows.map((row) => ({
        ...row,
        id: String(row.id),
        parent_id: row.parent_id ? String(row.parent_id) : null,
        is_active: !!Number(row.is_active),
      })),
    });
  } catch (error) {
    console.error("Get deal categories error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to load deal categories",
      error: error.message,
    });
  }
};

export const getDealCategoryTree = async (req, res) => {
  try {
    const [rows] = await dealDb.query(
      `
      SELECT 
        id,
        name,
        name_en,
        slug,
        icon,
        parent_id,
        sort_order,
        is_active
      FROM deal_categories
      WHERE is_active = 1
      ORDER BY sort_order ASC, id ASC
      `
    );

    const all = rows.map((row) => ({
      ...row,
      id: String(row.id),
      parent_id: row.parent_id ? String(row.parent_id) : null,
      is_active: !!Number(row.is_active),
    }));

    const parents = all.filter((cat) => !cat.parent_id);

    const tree = parents.map((parent) => ({
      ...parent,
      children: all.filter((cat) => cat.parent_id === parent.id),
    }));

    res.json({
      success: true,
      data: tree,
    });
  } catch (error) {
    console.error("Get deal category tree error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to load category tree",
      error: error.message,
    });
  }
};



export const createDealCategory = async (req, res) => {
  try {
    const {
      name,
      name_en,
      slug,
      icon,
      parent_id,
      sort_order,
      is_active,
    } = req.body;

    if (!name || !slug) {
      return res.status(400).json({
        success: false,
        message: "Name and slug are required",
      });
    }

    const [exist] = await dealDb.query(
      "SELECT id FROM deal_categories WHERE slug = ? LIMIT 1",
      [slug]
    );

    if (exist.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Slug already exists",
      });
    }

    const [result] = await dealDb.query(
      `
      INSERT INTO deal_categories
      (
        name,
        name_en,
        slug,
        icon,
        parent_id,
        sort_order,
        is_active
      )
      VALUES (?,?,?,?,?,?,?)
      `,
      [
        name,
        name_en || null,
        slug,
        icon || null,
        parent_id || null,
        sort_order || 0,
        is_active ? 1 : 0,
      ]
    );

    res.status(201).json({
      success: true,
      message: "Category created successfully",
      id: result.insertId,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


export const updateDealCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      name,
      name_en,
      slug,
      icon,
      parent_id,
      sort_order,
      is_active,
    } = req.body;

    const [exist] = await dealDb.query(
      "SELECT id FROM deal_categories WHERE id=? LIMIT 1",
      [id]
    );

    if (exist.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    const [slugExist] = await dealDb.query(
      `
      SELECT id
      FROM deal_categories
      WHERE slug=?
      AND id<>?
      LIMIT 1
      `,
      [slug, id]
    );

    if (slugExist.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Slug already exists",
      });
    }

    await dealDb.query(
      `
      UPDATE deal_categories
      SET
      name=?,
      name_en=?,
      slug=?,
      icon=?,
      parent_id=?,
      sort_order=?,
      is_active=?
      WHERE id=?
      `,
      [
        name,
        name_en || null,
        slug,
        icon || null,
        parent_id || null,
        sort_order || 0,
        is_active ? 1 : 0,
        id,
      ]
    );

    res.json({
      success: true,
      message: "Category updated successfully",
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const deleteDealCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const [child] = await dealDb.query(
      `
      SELECT id
      FROM deal_categories
      WHERE parent_id=?
      LIMIT 1
      `,
      [id]
    );

    if (child.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Delete subcategories first",
      });
    }

    const [listing] = await dealDb.query(
      `
      SELECT id
      FROM deal_listings
      WHERE category_id=?
      LIMIT 1
      `,
      [id]
    );

    if (listing.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Category contains listings",
      });
    }

    const [result] = await dealDb.query(
      "DELETE FROM deal_categories WHERE id=?",
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    res.json({
      success: true,
      message: "Category deleted successfully",
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};



export const getDealCategoryById = async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await dealDb.query(
      `
      SELECT *
      FROM deal_categories
      WHERE id=?
      LIMIT 1
      `,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    const category = rows[0];

    res.json({
      success: true,
      data: {
        ...category,
        id: String(category.id),
        parent_id: category.parent_id
          ? String(category.parent_id)
          : null,
        is_active: !!category.is_active,
      },
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


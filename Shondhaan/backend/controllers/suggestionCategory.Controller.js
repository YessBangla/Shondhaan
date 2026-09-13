import { pool } from "../db/pool.js";

// Helper function to validate source
const isValidSource = (source) => source === "service" || source === "deal";

/**
 * Create a new suggestion category
 * POST /api/suggestion-categories
 */
export const createSuggestionCategory = async (req, res) => {
  try {
    const { category_name, source } = req.body;

    if (!category_name || !source) {
      return res.status(400).json({ error: "category_name and source are required" });
    }

    if (!isValidSource(source)) {
      return res.status(400).json({ error: "source must be either 'service' or 'deal'" });
    }

    const [result] = await pool.query(
      "INSERT INTO suggestion_categories (category_name, source) VALUES (?, ?)",
      [category_name, source]
    );

    const [rows] = await pool.query(
      "SELECT * FROM suggestion_categories WHERE id = ?",
      [result.insertId]
    );

    res.status(201).json({
      message: "Category created successfully",
      data: rows[0],
    });
  } catch (error) {
    // Handle duplicate entry error (MySQL error code 1062)
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ error: "This category for this source already exists." });
    }
    console.error("Error creating suggestion category:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * Get all categories
 * Optional query param: ?source=service or ?source=deal
 * GET /api/suggestion-categories
 */
export const getAllSuggestionCategories = async (req, res) => {
  try {
    const { source } = req.query;
    let query = "SELECT * FROM suggestion_categories";
    let params = [];

    if (source) {
      if (!isValidSource(source)) {
        return res.status(400).json({ error: "Invalid source filter" });
      }
      query += " WHERE source = ?";
      params.push(source);
    }

    query += " ORDER BY created_at DESC";

    const [rows] = await pool.query(query, params);
    res.status(200).json({ data: rows });
  } catch (error) {
    console.error("Error fetching suggestion categories:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * Get a single category by ID
 * GET /api/suggestion-categories/:id
 */
export const getSuggestionCategoryById = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query(
      "SELECT * FROM suggestion_categories WHERE id = ?",
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Category not found" });
    }

    res.status(200).json({ data: rows[0] });
  } catch (error) {
    console.error("Error fetching suggestion category:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * Update a category
 * PUT /api/suggestion-categories/:id
 */
export const updateSuggestionCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { category_name, source } = req.body;

    if (source && !isValidSource(source)) {
      return res.status(400).json({ error: "source must be either 'service' or 'deal'" });
    }

    // Build dynamic query
    const updates = [];
    const params = [];

    if (category_name) {
      updates.push("category_name = ?");
      params.push(category_name);
    }
    if (source) {
      updates.push("source = ?");
      params.push(source);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: "No fields provided to update" });
    }

    params.push(id);
    const [result] = await pool.query(
      `UPDATE suggestion_categories SET ${updates.join(", ")} WHERE id = ?`,
      params
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Category not found" });
    }

    const [rows] = await pool.query(
      "SELECT * FROM suggestion_categories WHERE id = ?",
      [id]
    );

    res.status(200).json({
      message: "Category updated successfully",
      data: rows[0],
    });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ error: "This category for this source already exists." });
    }
    console.error("Error updating suggestion category:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * Delete a category
 * DELETE /api/suggestion-categories/:id
 */
export const deleteSuggestionCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await pool.query(
      "DELETE FROM suggestion_categories WHERE id = ?",
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Category not found" });
    }

    res.status(200).json({ message: "Category deleted successfully" });
  } catch (error) {
    console.error("Error deleting suggestion category:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
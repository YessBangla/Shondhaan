import { pool as db } from "../config/db.js";

// @desc    Get all service offers
// @route   GET /api/service-offers
export const getAllOffers = async (req, res) => {
  try {
    const { is_active, is_featured } = req.query;
    let query = "SELECT * FROM service_offers WHERE 1=1";
    const params = [];

    if (is_active !== undefined) {
      query += " AND is_active = ?";
      params.push(is_active === "true" ? 1 : 0);
    }
    if (is_featured !== undefined) {
      query += " AND is_featured = ?";
      params.push(is_featured === "true" ? 1 : 0);
    }

    query += " ORDER BY created_at DESC";

    const [offers] = await db.query(query, params);
    return res.status(200).json({ success: true, count: offers.length, data: offers });
  } catch (error) {
    console.error("Error fetching service offers:", error);
    return res.status(500).json({ success: false, message: "Server Error", error: error.message });
  }
};

// @desc    Get single service offer by ID
// @route   GET /api/service-offers/:id
export const getOfferById = async (req, res) => {
  try {
    const offerId = req.params.id;
    const [offer] = await db.query("SELECT * FROM service_offers WHERE id = ?", [offerId]);

    if (offer.length === 0) {
      return res.status(404).json({ success: false, message: "Offer not found" });
    }

    return res.status(200).json({ success: true, data: offer[0] });
  } catch (error) {
    console.error("Error fetching service offer:", error);
    return res.status(500).json({ success: false, message: "Server Error", error: error.message });
  }
};

// @desc    Create a new service offer
// @route   POST /api/service-offers
export const createOffer = async (req, res) => {
  try {
    const {
      title,
      title_bn,
      description,
      description_bn,
      image_url,
      discount_type,
      discount_value,
      service_id,
      category_id,
      offer_code,
      start_date,
      end_date,
      is_featured,
      is_active,
    } = req.body;

    if (!title) {
      return res.status(400).json({ success: false, message: "Title is required" });
    }

    const [result] = await db.query(
      `INSERT INTO service_offers 
        (title, title_bn, description, description_bn, image_url, discount_type, discount_value,
         service_id, category_id, offer_code, start_date, end_date, is_featured, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        title,
        title_bn ?? null,
        description ?? null,
        description_bn ?? null,
        image_url ?? null,
        discount_type || "percentage",
        discount_value || 0,
        service_id ?? null,
        category_id ?? null,
        offer_code ?? null,
        start_date ?? null,
        end_date ?? null,
        is_featured !== undefined ? (is_featured ? 1 : 0) : 0,
        is_active !== undefined ? (is_active ? 1 : 0) : 1,
      ]
    );

    return res.status(201).json({
      success: true,
      message: "Offer created successfully",
      data: { id: result.insertId, ...req.body },
    });
  } catch (error) {
    console.error("Error creating service offer:", error);
    return res.status(500).json({ success: false, message: "Server Error", error: error.message });
  }
};

// @desc    Update a service offer
// @route   PUT /api/service-offers/:id
export const updateOffer = async (req, res) => {
  try {
    const offerId = req.params.id;
    const {
      title,
      title_bn,
      description,
      description_bn,
      image_url,
      discount_type,
      discount_value,
      service_id,
      category_id,
      offer_code,
      start_date,
      end_date,
      is_featured,
      is_active,
    } = req.body;

    const [existing] = await db.query("SELECT id, title FROM service_offers WHERE id = ?", [offerId]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: "Offer not found" });
    }

    await db.query(
      `UPDATE service_offers SET 
        title = ?, title_bn = ?, description = ?, description_bn = ?, image_url = ?,
        discount_type = ?, discount_value = ?, service_id = ?, category_id = ?,
        offer_code = ?, start_date = ?, end_date = ?, is_featured = ?, is_active = ?
       WHERE id = ?`,
      [
        title || existing[0].title,
        title_bn ?? null,
        description ?? null,
        description_bn ?? null,
        image_url ?? null,
        discount_type || "percentage",
        discount_value || 0,
        service_id ?? null,
        category_id ?? null,
        offer_code ?? null,
        start_date ?? null,
        end_date ?? null,
        is_featured !== undefined ? (is_featured ? 1 : 0) : 0,
        is_active !== undefined ? (is_active ? 1 : 0) : 1,
        offerId,
      ]
    );

    return res.status(200).json({
      success: true,
      message: "Offer updated successfully",
      data: { id: parseInt(offerId, 10), ...req.body },
    });
  } catch (error) {
    console.error("Error updating service offer:", error);
    return res.status(500).json({ success: false, message: "Server Error", error: error.message });
  }
};

// @desc    Delete a service offer
// @route   DELETE /api/service-offers/:id
export const deleteOffer = async (req, res) => {
  try {
    const offerId = req.params.id;

    const [result] = await db.query("DELETE FROM service_offers WHERE id = ?", [offerId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Offer not found" });
    }

    return res.status(200).json({ success: true, message: "Offer deleted successfully" });
  } catch (error) {
    console.error("Error deleting service offer:", error);
    return res.status(500).json({ success: false, message: "Server Error", error: error.message });
  }
};
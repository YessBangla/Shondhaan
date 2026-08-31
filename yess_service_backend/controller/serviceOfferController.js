import { pool as db } from "../config/db.js";
import path from "path";
import fs from "fs";

// ─── Upload Directory ───
const uploadDir = path.join(process.cwd(), "uploads", "service-offers");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// ─── Save Base64 Image to Disk ───
const saveBase64Image = (base64String) => {
  if (!base64String || !base64String.startsWith("data:image/")) return null;

  const matches = base64String.match(/^data:image\/([a-z]+);base64,/);
  if (!matches) return null;

  const ext = matches[1] === "jpeg" ? "jpg" : matches[1];
  const filename = `offer-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const filepath = path.join(uploadDir, filename);

  const base64Data = base64String.replace(/^data:image\/[a-z]+;base64,/, "");
  fs.writeFileSync(filepath, base64Data, "base64");

  return `/uploads/service-offers/${filename}`;
};

// ─── Delete Image from Disk ───
const deleteImageFromDisk = (imageUrl) => {
  if (!imageUrl) return;
  try {
    const filename = imageUrl.split("/").pop();
    const filepath = path.join(uploadDir, filename);
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
    }
  } catch (err) {
    console.error("Failed to delete image from disk:", err);
  }
};

// ─── Get all service offers ───
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

    query += " ORDER BY is_featured DESC, created_at DESC";

    const [offers] = await db.query(query, params);
    return res.status(200).json({ success: true, count: offers.length, data: offers });
  } catch (error) {
    console.error("Error fetching service offers:", error);
    return res.status(500).json({ success: false, message: "Server Error", error: error.message });
  }
};

// ─── Get single service offer by ID ───
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

// ─── Create a new service offer ───
export const createOffer = async (req, res) => {
  try {
    const { image_base64, image_url, ...rest } = req.body;

    if (!rest.title) {
      return res.status(400).json({ success: false, message: "Title is required" });
    }

    const finalImageUrl = saveBase64Image(image_base64) || image_url || null;

    const [result] = await db.query(
      `INSERT INTO service_offers 
        (title, title_bn, description, description_bn, image_url, discount_type, discount_value,
         service_id, service_slug, category_id, offer_code, start_date, end_date, is_featured, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        rest.title,
        rest.title_bn ?? null,
        rest.description ?? null,
        rest.description_bn ?? null,
        finalImageUrl,
        rest.discount_type || "percentage",
        rest.discount_value || 0,
        rest.service_id ?? null,
        rest.service_slug ?? null,
        rest.category_id ?? null,
        rest.offer_code ?? null,
        rest.start_date ?? null,
        rest.end_date ?? null,
        rest.is_featured !== undefined ? (rest.is_featured ? 1 : 0) : 0,
        rest.is_active !== undefined ? (rest.is_active ? 1 : 0) : 1,
      ]
    );

    return res.status(201).json({
      success: true,
      message: "Offer created successfully",
      data: { id: result.insertId, ...rest, image_url: finalImageUrl },
    });
  } catch (error) {
    console.error("Error creating service offer:", error);
    return res.status(500).json({ success: false, message: "Server Error", error: error.message });
  }
};

// ─── Update a service offer ───
export const updateOffer = async (req, res) => {
  try {
    const offerId = req.params.id;
    const { image_base64, image_url, ...rest } = req.body;

    const [existing] = await db.query("SELECT id, title, image_url FROM service_offers WHERE id = ?", [offerId]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: "Offer not found" });
    }

    let finalImageUrl = existing[0].image_url;

    if (image_base64) {
      const saved = saveBase64Image(image_base64);
      if (saved) {
        deleteImageFromDisk(existing[0].image_url);
        finalImageUrl = saved;
      }
    } else if (image_url !== undefined) {
      if (image_url && existing[0].image_url && image_url !== existing[0].image_url) {
        deleteImageFromDisk(existing[0].image_url);
      }
      finalImageUrl = image_url === "" ? null : image_url;
    }

    await db.query(
      `UPDATE service_offers SET 
        title = ?, title_bn = ?, description = ?, description_bn = ?, image_url = ?,
        discount_type = ?, discount_value = ?, service_id = ?, service_slug = ?, category_id = ?,
        offer_code = ?, start_date = ?, end_date = ?, is_featured = ?, is_active = ?
       WHERE id = ?`,
      [
        rest.title || existing[0].title,
        rest.title_bn ?? null,
        rest.description ?? null,
        rest.description_bn ?? null,
        finalImageUrl,
        rest.discount_type || "percentage",
        rest.discount_value || 0,
        rest.service_id ?? null,
        rest.service_slug ?? null,
        rest.category_id ?? null,
        rest.offer_code ?? null,
        rest.start_date ?? null,
        rest.end_date ?? null,
        rest.is_featured !== undefined ? (rest.is_featured ? 1 : 0) : 0,
        rest.is_active !== undefined ? (rest.is_active ? 1 : 0) : 1,
        offerId,
      ]
    );

    return res.status(200).json({
      success: true,
      message: "Offer updated successfully",
      data: { id: parseInt(offerId, 10), ...rest, image_url: finalImageUrl },
    });
  } catch (error) {
    console.error("Error updating service offer:", error);
    return res.status(500).json({ success: false, message: "Server Error", error: error.message });
  }
};

// ─── Delete a service offer ───
export const deleteOffer = async (req, res) => {
  try {
    const offerId = req.params.id;

    const [existing] = await db.query("SELECT image_url FROM service_offers WHERE id = ?", [offerId]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: "Offer not found" });
    }

    deleteImageFromDisk(existing[0].image_url);

    await db.query("DELETE FROM service_offers WHERE id = ?", [offerId]);

    return res.status(200).json({ success: true, message: "Offer deleted successfully" });
  } catch (error) {
    console.error("Error deleting service offer:", error);
    return res.status(500).json({ success: false, message: "Server Error", error: error.message });
  }
};

// ─── Validate offer code and return discount info ───
export const validateOfferCode = async (req, res) => {
  try {
    const { code } = req.params;

    const [offers] = await db.query(
      `SELECT * FROM service_offers 
       WHERE offer_code = ? AND is_active = 1 
       AND (end_date IS NULL OR end_date > NOW())`,
      [code]
    );

    if (offers.length === 0) {
      return res.status(404).json({
        success: false,
        message: "অফার কোডটি বৈধ নয় বা মেয়াদ উত্তীর্ণ",
      });
    }

    const offer = offers[0];
    return res.status(200).json({
      success: true,
      data: {
        id: offer.id,
        title: offer.title,
        title_bn: offer.title_bn,
        discount_type: offer.discount_type,
        discount_value: Number(offer.discount_value),
        service_id: offer.service_id,
        service_slug: offer.service_slug,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};


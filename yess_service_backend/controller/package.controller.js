import { randomUUID } from "crypto";
import { pool } from "../config/db.js";

// ✅ Slug maker
const makeSlug = (text = "") => {
  const slug = String(text)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return slug || `package-${Date.now()}`;
};

// ✅ Safe JSON stringify for features
const stringifyFeatures = (features) => {
  if (!features) return JSON.stringify([]);

  if (Array.isArray(features)) {
    return JSON.stringify(features);
  }

  if (typeof features === "string") {
    try {
      const parsed = JSON.parse(features);
      return Array.isArray(parsed) ? JSON.stringify(parsed) : JSON.stringify([features]);
    } catch {
      return JSON.stringify([features]);
    }
  }

  return JSON.stringify([]);
};

// ✅ Safe JSON parse for response
const parseFeatures = (features) => {
  if (!features) return [];

  if (Array.isArray(features)) return features;

  if (typeof features === "string") {
    try {
      const parsed = JSON.parse(features);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  return [];
};

const formatPackage = (pkg) => ({
  ...pkg,
  features: parseFeatures(pkg.features),
  price: Number(pkg.price || 0),
  discount_price:
    pkg.discount_price === null || pkg.discount_price === undefined
      ? null
      : Number(pkg.discount_price),
  is_popular: Boolean(pkg.is_popular),
  is_active: Boolean(pkg.is_active),
});

// ✅ Update services.price as starting price from active packages
const syncServiceStartingPrice = async (serviceId) => {
  const [rows] = await pool.query(
    `
    SELECT 
      MIN(
        CASE 
          WHEN discount_price IS NOT NULL AND discount_price > 0 
          THEN discount_price 
          ELSE price 
        END
      ) AS min_price
    FROM service_packages
    WHERE service_id = ?
    AND is_active = 1
    `,
    [serviceId]
  );

  const minPrice = rows?.[0]?.min_price || 0;

  await pool.query(
    `
    UPDATE services
    SET price = ?
    WHERE id = ?
    `,
    [minPrice, serviceId]
  );
};

// ✅ CREATE package
export const createPackage = async (req, res) => {
  try {
    const {
      service_id,
      slug,
      name,
      name_en,
      description,
      description_en,
      price,
      discount_price,
      original_price, // old frontend support
      duration,
      duration_en,
      features,
      is_popular,
      is_active,
      sort_order,
    } = req.body;

    if (!service_id || !name || price === undefined || price === null || price === "") {
      return res.status(400).json({
        message: "service_id, name and price are required",
      });
    }

    const numericPrice = Number(price);

    if (Number.isNaN(numericPrice) || numericPrice < 0) {
      return res.status(400).json({
        message: "Price must be a valid number",
      });
    }

    const finalDiscountPrice =
      discount_price !== undefined && discount_price !== null && discount_price !== ""
        ? Number(discount_price)
        : original_price !== undefined && original_price !== null && original_price !== ""
        ? Number(original_price)
        : null;

    if (finalDiscountPrice !== null && Number.isNaN(finalDiscountPrice)) {
      return res.status(400).json({
        message: "discount_price must be a valid number",
      });
    }

    // ✅ Check service exists
    const [serviceRows] = await pool.query(
      `
      SELECT id
      FROM services
      WHERE id = ?
      LIMIT 1
      `,
      [service_id]
    );

    if (!serviceRows.length) {
      return res.status(404).json({
        message: "Service not found",
      });
    }

    const id = randomUUID();
    const finalSlug = slug ? makeSlug(slug) : makeSlug(name_en || name);

    await pool.query(
      `
      INSERT INTO service_packages
      (
        id,
        service_id,
        slug,
        name,
        name_en,
        description,
        description_en,
        price,
        discount_price,
        duration,
        duration_en,
        features,
        is_popular,
        is_active,
        sort_order
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        id,
        service_id,
        finalSlug,
        name,
        name_en || null,
        description || null,
        description_en || null,
        numericPrice,
        finalDiscountPrice,
        duration || null,
        duration_en || null,
        stringifyFeatures(features),
        is_popular ? 1 : 0,
        is_active === false || is_active === 0 || is_active === "0" ? 0 : 1,
        Number(sort_order || 0),
      ]
    );

    await syncServiceStartingPrice(service_id);

    const [rows] = await pool.query(
      `
      SELECT *
      FROM service_packages
      WHERE id = ?
      LIMIT 1
      `,
      [id]
    );

    return res.status(201).json({
      message: "Package created successfully",
      data: formatPackage(rows[0]),
    });
  } catch (error) {
    console.error("Create package error:", error);

    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        message: "Package slug already exists for this service",
      });
    }

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

// ✅ GET packages
// /api/packages
// /api/packages?service_id=SERVICE_ID
export const getPackages = async (req, res) => {
  try {
    const { service_id, active } = req.query;

    let query = `
      SELECT 
        sp.*,
        s.title AS service_title,
        s.title_en AS service_title_en,
        s.slug AS service_slug
      FROM service_packages sp
      LEFT JOIN services s ON s.id = sp.service_id
      WHERE 1 = 1
    `;

    const values = [];

    if (service_id) {
      query += ` AND sp.service_id = ?`;
      values.push(service_id);
    }

    if (active === "1" || active === "true") {
      query += ` AND sp.is_active = 1`;
    }

    query += `
      ORDER BY sp.sort_order ASC, sp.price ASC
    `;

    const [rows] = await pool.query(query, values);

    return res.json({
      data: rows.map(formatPackage),
    });
  } catch (error) {
    console.error("Get packages error:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

// ✅ GET single package
export const getPackageById = async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await pool.query(
      `
      SELECT 
        sp.*,
        s.title AS service_title,
        s.title_en AS service_title_en,
        s.slug AS service_slug
      FROM service_packages sp
      LEFT JOIN services s ON s.id = sp.service_id
      WHERE sp.id = ?
      LIMIT 1
      `,
      [id]
    );

    if (!rows.length) {
      return res.status(404).json({
        message: "Package not found",
      });
    }

    return res.json({
      data: formatPackage(rows[0]),
    });
  } catch (error) {
    console.error("Get package by id error:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

// ✅ UPDATE package
export const updatePackage = async (req, res) => {
  try {
    const { id } = req.params;

    const [oldRows] = await pool.query(
      `
      SELECT *
      FROM service_packages
      WHERE id = ?
      LIMIT 1
      `,
      [id]
    );

    if (!oldRows.length) {
      return res.status(404).json({
        message: "Package not found",
      });
    }

    const oldPackage = oldRows[0];

    const {
      service_id,
      slug,
      name,
      name_en,
      description,
      description_en,
      price,
      discount_price,
      original_price,
      duration,
      duration_en,
      features,
      is_popular,
      is_active,
      sort_order,
    } = req.body;

    const finalServiceId = service_id || oldPackage.service_id;
    const finalName = name !== undefined ? name : oldPackage.name;
    const finalSlug =
      slug !== undefined
        ? makeSlug(slug)
        : oldPackage.slug || makeSlug(name_en || finalName);

    const finalPrice =
      price !== undefined && price !== null && price !== ""
        ? Number(price)
        : Number(oldPackage.price || 0);

    if (Number.isNaN(finalPrice) || finalPrice < 0) {
      return res.status(400).json({
        message: "Price must be a valid number",
      });
    }

    const finalDiscountPrice =
      discount_price !== undefined && discount_price !== null && discount_price !== ""
        ? Number(discount_price)
        : original_price !== undefined && original_price !== null && original_price !== ""
        ? Number(original_price)
        : discount_price === null || original_price === null
        ? null
        : oldPackage.discount_price;

    if (finalDiscountPrice !== null && Number.isNaN(Number(finalDiscountPrice))) {
      return res.status(400).json({
        message: "discount_price must be a valid number",
      });
    }

    await pool.query(
      `
      UPDATE service_packages
      SET
        service_id = ?,
        slug = ?,
        name = ?,
        name_en = ?,
        description = ?,
        description_en = ?,
        price = ?,
        discount_price = ?,
        duration = ?,
        duration_en = ?,
        features = ?,
        is_popular = ?,
        is_active = ?,
        sort_order = ?
      WHERE id = ?
      `,
      [
        finalServiceId,
        finalSlug,
        finalName,
        name_en !== undefined ? name_en || null : oldPackage.name_en,
        description !== undefined ? description || null : oldPackage.description,
        description_en !== undefined ? description_en || null : oldPackage.description_en,
        finalPrice,
        finalDiscountPrice,
        duration !== undefined ? duration || null : oldPackage.duration,
        duration_en !== undefined ? duration_en || null : oldPackage.duration_en,
        features !== undefined ? stringifyFeatures(features) : oldPackage.features,
        is_popular !== undefined ? (is_popular ? 1 : 0) : oldPackage.is_popular,
        is_active !== undefined
          ? is_active === false || is_active === 0 || is_active === "0"
            ? 0
            : 1
          : oldPackage.is_active,
        sort_order !== undefined ? Number(sort_order || 0) : oldPackage.sort_order,
        id,
      ]
    );

    await syncServiceStartingPrice(finalServiceId);

    if (oldPackage.service_id !== finalServiceId) {
      await syncServiceStartingPrice(oldPackage.service_id);
    }

    const [rows] = await pool.query(
      `
      SELECT *
      FROM service_packages
      WHERE id = ?
      LIMIT 1
      `,
      [id]
    );

    return res.json({
      message: "Package updated successfully",
      data: formatPackage(rows[0]),
    });
  } catch (error) {
    console.error("Update package error:", error);

    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        message: "Package slug already exists for this service",
      });
    }

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

// ✅ DELETE package
export const deletePackage = async (req, res) => {
  try {
    const { id } = req.params;

    const [oldRows] = await pool.query(
      `
      SELECT service_id
      FROM service_packages
      WHERE id = ?
      LIMIT 1
      `,
      [id]
    );

    if (!oldRows.length) {
      return res.status(404).json({
        message: "Package not found",
      });
    }

    const serviceId = oldRows[0].service_id;

    await pool.query(
      `
      DELETE FROM service_packages
      WHERE id = ?
      `,
      [id]
    );

    await syncServiceStartingPrice(serviceId);

    return res.json({
      message: "Package deleted successfully",
    });
  } catch (error) {
    console.error("Delete package error:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};
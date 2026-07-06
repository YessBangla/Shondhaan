import { v4 as uuidv4 } from "uuid";
import { ensurePlatformFeeSchema, pool } from "../config/db.js";

const parseJsonArray = (value) => {
  if (!value) return [];

  if (Array.isArray(value)) return value;

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }

  return [];
};

const stringifyArray = (value) => {
  if (!value) return JSON.stringify([]);

  if (Array.isArray(value)) {
    return JSON.stringify(value);
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return JSON.stringify(Array.isArray(parsed) ? parsed : [value]);
    } catch {
      return JSON.stringify(
        value
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)
      );
    }
  }

  return JSON.stringify([]);
};

const normalizeBool = (value, defaultValue = true) => {
  if (value === undefined || value === null || value === "") return defaultValue;

  return value === true || value === 1 || value === "1" || value === "true";
};

const formatService = (item) => ({
  ...item,
  price: Number(item.price || 0),
  platform_fee: Number(item.platform_fee || 0),
  rating: Number(item.rating || 0),
  total_reviews: Number(item.total_reviews || 0),
  total_orders: Number(item.total_orders || 0),
  commission_percent: Number(item.commission_percent || 0),
  features: parseJsonArray(item.features),
  available_cities: parseJsonArray(item.available_cities),
  is_active: Boolean(item.is_active),
});

export const createService = async (req, res) => {
  console.log("BODY:", req.body);

  try {
    await ensurePlatformFeeSchema();

    const {
      slug,
      title,
      title_en,
      image_url,
      description,
      rating,
      total_reviews,
      total_orders,
      commission_percent,
      features,
      available_cities,
      category_id,
      is_active,
      sort_order,
      price,
      platform_fee,
    } = req.body;

    if (!slug || !title) {
      return res.status(400).json({
        message: "slug and title are required",
      });
    }

    const id = uuidv4();

    const finalPrice =
      price !== undefined && price !== null && price !== ""
        ? Number(price)
        : 0;

    if (Number.isNaN(finalPrice) || finalPrice < 0) {
      return res.status(400).json({
        message: "Price must be a valid number",
      });
    }

    const finalPlatformFee =
      platform_fee !== undefined && platform_fee !== null && platform_fee !== ""
        ? Number(platform_fee)
        : 0;

    if (Number.isNaN(finalPlatformFee) || finalPlatformFee < 0) {
      return res.status(400).json({
        message: "Platform fee must be a valid number",
      });
    }

    const query = `
      INSERT INTO services (
        id,
        slug,
        title,
        title_en,
        image_url,
        description,
        rating,
        total_reviews,
        total_orders,
        commission_percent,
        price,
        platform_fee,
        features,
        available_cities,
        category_id,
        is_active,
        sort_order
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      id,
      slug,
      title,
      title_en || null,
      image_url || null,
      description || null,
      rating || 4.5,
      total_reviews || 0,
      total_orders || 0,
      commission_percent || 10,
      finalPrice,
      finalPlatformFee,
      stringifyArray(features),
      stringifyArray(available_cities),
      category_id || null,
      normalizeBool(is_active, true) ? 1 : 0,
      sort_order || 0,
    ];

    await pool.execute(query, values);

    const [rows] = await pool.execute(
      `
      SELECT *
      FROM services
      WHERE id = ?
      LIMIT 1
      `,
      [id]
    );

    return res.status(201).json({
      message: "Service created successfully",
      data: formatService(rows[0]),
    });
  } catch (error) {
    console.error("Create service error:", error);

    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        message: "Service slug already exists",
      });
    }

    return res.status(500).json({
      message: "Failed to create service",
      error: error.message,
    });
  }
};

export const getServices = async (req, res) => {
  try {
    await ensurePlatformFeeSchema();

    const { category_id } = req.query;

    let query = `
      SELECT 
        s.*,
        COALESCE(pkg.min_price, s.price, 0) AS price,
        COALESCE(pkg.package_count, 0) AS package_count
      FROM services s
      LEFT JOIN (
        SELECT
          service_id,
          MIN(price) AS min_price,
          COUNT(*) AS package_count
        FROM service_packages
        GROUP BY service_id
      ) pkg ON pkg.service_id = s.id
      WHERE 1 = 1
    `;

    const values = [];

    if (category_id) {
      query += ` AND s.category_id = ?`;
      values.push(category_id);
    }

    query += ` ORDER BY s.sort_order ASC, s.created_at DESC`;

    const [rows] = await pool.execute(query, values);

    const formatted = rows.map((item) => ({
      ...item,
      price: Number(item.price || 0),
      platform_fee: Number(item.platform_fee || 0),
      rating: Number(item.rating || 0),
      total_reviews: Number(item.total_reviews || 0),
      total_orders: Number(item.total_orders || 0),
      commission_percent: Number(item.commission_percent || 0),
      features: item.features ? JSON.parse(item.features) : [],
      available_cities: item.available_cities
        ? JSON.parse(item.available_cities)
        : [],
      is_active: Boolean(item.is_active),
      package_count: Number(item.package_count || 0),
    }));

    res.json({
      data: formatted,
    });
  } catch (error) {
    console.error("Get services error:", error);

    res.status(500).json({
      message: "Failed to fetch services",
      error: error.message,
    });
  }
};

export const getServiceBySlug = async (req, res) => {
  try {
    await ensurePlatformFeeSchema();

    const { slug } = req.params;

    const [rows] = await pool.execute(
      `
      SELECT *
      FROM services
      WHERE slug = ?
      LIMIT 1
      `,
      [slug]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        message: "Service not found",
      });
    }

    const service = formatService(rows[0]);

    const [packageRows] = await pool.execute(
      `
      SELECT *
      FROM service_packages
      WHERE service_id = ?
      AND is_active = 1
      ORDER BY sort_order ASC, price ASC
      `,
      [service.id]
    );

    return res.json({
      data: {
        ...service,
        packages: packageRows.map((pkg) => ({
          ...pkg,
          price: Number(pkg.price || 0),
          original_price:
            pkg.original_price === null || pkg.original_price === undefined
              ? null
              : Number(pkg.original_price),
          features: parseJsonArray(pkg.features),
          is_active: Boolean(pkg.is_active),
        })),
      },
    });
  } catch (error) {
    console.error("Get service by slug error:", error);

    return res.status(500).json({
      message: "Failed to fetch service",
      error: error.message,
    });
  }
};

export const updateService = async (req, res) => {
  try {
    await ensurePlatformFeeSchema();

    const { id } = req.params;

    const {
      slug,
      title,
      title_en,
      image_url,
      description,
      rating,
      total_reviews,
      total_orders,
      commission_percent,
      features,
      available_cities,
      category_id,
      is_active,
      sort_order,
      price,
      platform_fee,
    } = req.body;

    const [existing] = await pool.execute(
      `
      SELECT *
      FROM services
      WHERE id = ?
      LIMIT 1
      `,
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        message: "Service not found",
      });
    }

    if (!slug || !title) {
      return res.status(400).json({
        message: "slug and title are required",
      });
    }

    const finalPrice =
      price !== undefined && price !== null && price !== ""
        ? Number(price)
        : Number(existing[0].price || 0);

    if (Number.isNaN(finalPrice) || finalPrice < 0) {
      return res.status(400).json({
        message: "Price must be a valid number",
      });
    }

    const finalPlatformFee =
      platform_fee !== undefined && platform_fee !== null && platform_fee !== ""
        ? Number(platform_fee)
        : Number(existing[0].platform_fee || 0);

    if (Number.isNaN(finalPlatformFee) || finalPlatformFee < 0) {
      return res.status(400).json({
        message: "Platform fee must be a valid number",
      });
    }

    const query = `
      UPDATE services SET
        slug = ?,
        title = ?,
        title_en = ?,
        image_url = ?,
        description = ?,
        rating = ?,
        total_reviews = ?,
        total_orders = ?,
        commission_percent = ?,
        price = ?,
        platform_fee = ?,
        features = ?,
        available_cities = ?,
        category_id = ?,
        is_active = ?,
        sort_order = ?
      WHERE id = ?
    `;

    const values = [
      slug,
      title,
      title_en || null,
      image_url || null,
      description || null,
      rating || 4.5,
      total_reviews || 0,
      total_orders || 0,
      commission_percent || 10,
      finalPrice,
      finalPlatformFee,
      stringifyArray(features),
      stringifyArray(available_cities),
      category_id || null,
      normalizeBool(is_active, true) ? 1 : 0,
      sort_order || 0,
      id,
    ];

    await pool.execute(query, values);

    const [rows] = await pool.execute(
      `
      SELECT *
      FROM services
      WHERE id = ?
      LIMIT 1
      `,
      [id]
    );

    return res.json({
      message: "Service updated successfully",
      data: formatService(rows[0]),
    });
  } catch (error) {
    console.error("Update service error:", error);

    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        message: "Service slug already exists",
      });
    }

    return res.status(500).json({
      message: "Failed to update service",
      error: error.message,
    });
  }
};

export const deleteService = async (req, res) => {
  try {
    const { id } = req.params;

    const [existing] = await pool.execute(
      `
      SELECT id
      FROM services
      WHERE id = ?
      LIMIT 1
      `,
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        message: "Service not found",
      });
    }

    await pool.execute(
      `
      DELETE FROM services
      WHERE id = ?
      `,
      [id]
    );

    return res.json({
      message: "Service deleted successfully",
      data: { id },
    });
  } catch (error) {
    console.error("Delete service error:", error);

    return res.status(500).json({
      message: "Failed to delete service",
      error: error.message,
    });
  }
};

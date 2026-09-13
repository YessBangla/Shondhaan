import { ensureProviderSchema, pool } from "../config/db.js";
import fs from "node:fs/promises";
import path from "node:path";

const PROVIDER_TABLE = "providers"; 
const providerNidUrl = (filename) => `/uploads/providers/nid/${filename}`;

const removeStoredFile = async (fileUrl) => {
  if (!fileUrl || !String(fileUrl).startsWith("/uploads/")) return;
  try {
    await fs.unlink(path.join(process.cwd(), String(fileUrl).slice(1)));
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.error("Could not remove replaced provider file:", error.message);
    }
  }
};

const reviewerRoles = new Set(["admin", "service_admin", "super_admin"]);
const callCenterProviderManagerRoles = new Set(["call_center", "admin", "service_admin", "super_admin"]);

export const requireProviderReviewer = (req, res, next) => {
  const role = req.user?.type || req.user?.role;
  if (!reviewerRoles.has(role)) {
    return res.status(403).json({ message: "Provider reviewer access required" });
  }
  next();
};

const selectProviderColumns = `
  id, user_id, name, full_name, phone, email, address,
  division, district, thana, area,
  services,
  service_category, experience_years, nid_front_url, nid_back_url,
  status, status_reason, is_active,
  created_at, updated_at
`;

const parseArrayValue = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [String(parsed)];
  } catch {
    return [String(value)];
  }
};

const formatProvider = (provider) => ({
  id: provider.id,
  user_id: provider.user_id,

  full_name: provider.full_name || provider.name,
  phone: provider.phone,
  email: provider.email,
  address: provider.address,
  division: provider.division,
  district: provider.district,
  provider_district: provider.district,
  raw_provider_district: provider.district,
  thana: parseArrayValue(provider.thana),
  area: provider.area,
  services: (() => {
    try {
      return provider.services ? JSON.parse(provider.services) : [];
    } catch {
      return provider.services ? [provider.services] : [];
    }
  })(),

  service_category: provider.service_category,
  experience_years: Number(provider.experience_years || 0),
  rating: 0,
  total_reviews: 0,
  total_jobs: 0,
  image_url: null,
  is_active: Boolean(provider.is_active),

  nid_front_url: provider.nid_front_url,
  nid_back_url: provider.nid_back_url,

  status: provider.status,
  status_reason: provider.status_reason,

  created_at: provider.created_at,
  updated_at: provider.updated_at,
});

export const getMyProviderApplication = async (req, res) => {
  try {
    await ensureProviderSchema();
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Authenticated user is required" });

    const [rows] = await pool.execute(
      `SELECT ${selectProviderColumns} FROM ${PROVIDER_TABLE} WHERE user_id = ? LIMIT 1`,
      [userId]
    );
    return res.json({ application: rows[0] ? formatProvider(rows[0]) : null });
  } catch (error) {
    console.error("Get provider application error:", error);
    return res.status(500).json({ message: "Failed to fetch provider application" });
  }
};

export const submitProviderApplication = async (req, res) => {
  try {
    await ensureProviderSchema();
    const userId = req.user?.id;
    const { full_name, phone, email, address, service_category, experience_years } = req.body;
    const front = req.files?.nid_front?.[0];
    const back = req.files?.nid_back?.[0];

    if (!userId) return res.status(401).json({ message: "Authenticated user is required" });

    const years = Number(experience_years);
    const normalizedYears = Number.isFinite(years) && years >= 0 && years <= 60 ? years : 0;

    if (service_category) {
      const [categoryRows] = await pool.execute(
        "SELECT id FROM service_categories WHERE id = ? AND is_active = 1 LIMIT 1",
        [service_category]
      );
      if (!categoryRows.length) return res.status(400).json({ message: "Select an active service category" });
    }

    const [existing] = await pool.execute(
      `SELECT id, status FROM ${PROVIDER_TABLE} WHERE user_id = ? LIMIT 1`,
      [userId]
    );
    if (existing[0]?.status === "approved") {
      return res.status(409).json({ message: "This account is already an approved provider" });
    }

    const frontUrl = front ? providerNidUrl(front.filename) : null;
    const backUrl = back ? providerNidUrl(back.filename) : null;
    const providerName = full_name?.trim() || "Provider";
    let providerId = existing[0]?.id;

    if (existing.length) {
      await pool.execute(
        `UPDATE ${PROVIDER_TABLE}
         SET name = ?, full_name = ?, phone = ?, email = ?, address = ?, service_category = ?,
             experience_years = ?, nid_front_url = ?, nid_back_url = ?, status = 'pending', status_reason = NULL
         WHERE id = ?`,
        [providerName, providerName, phone?.trim() || null, email?.trim() || null, address?.trim() || null, service_category || null, normalizedYears, frontUrl, backUrl, providerId]
      );
    } else {
      const [result] = await pool.execute(
        `INSERT INTO ${PROVIDER_TABLE}
         (user_id, name, full_name, phone, email, address, service_category, experience_years,
          nid_front_url, nid_back_url, status, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 0)`,
        [userId, providerName, providerName, phone?.trim() || null, email?.trim() || null, address?.trim() || null, service_category || null, normalizedYears, frontUrl, backUrl]
      );
      providerId = result.insertId;
    }

    const [rows] = await pool.execute(`SELECT ${selectProviderColumns} FROM ${PROVIDER_TABLE} WHERE id = ? LIMIT 1`, [providerId]);
    return res.status(201).json({ message: "Provider verification submitted", application: formatProvider(rows[0]) });
  } catch (error) {
    console.error("Submit provider application error:", error);
    return res.status(500).json({ message: "Failed to submit provider verification" });
  }
};

export const getProviderApplications = async (req, res) => {
  try {
    await ensureProviderSchema();
    const status = req.query.status && req.query.status !== "all" ? req.query.status : null;
    const values = status ? [status] : [];
    const [rows] = await pool.execute(
      `SELECT ${selectProviderColumns} FROM ${PROVIDER_TABLE} ${status ? "WHERE status = ?" : ""} ORDER BY created_at DESC`,
      values
    );
    return res.json({ applications: rows.map(formatProvider) });
  } catch (error) {
    console.error("Get provider applications error:", error);
    return res.status(500).json({ message: "Failed to fetch provider applications" });
  }
};

export const updateProviderApplicationStatus = async (req, res) => {
  try {
    await ensureProviderSchema();
    const { userId } = req.params;
    const { status, status_reason } = req.body;
    if (!["pending", "approved", "rejected"].includes(status)) return res.status(400).json({ message: "Invalid application status" });

    const [result] = await pool.execute(
      `UPDATE ${PROVIDER_TABLE} SET status = ?, status_reason = ?, is_active = ? WHERE user_id = ?`,
      [status, status_reason || null, status === "approved" ? 1 : 0, userId]
    );
    if (!result.affectedRows) return res.status(404).json({ message: "Provider application not found" });

    const [rows] = await pool.execute(`SELECT ${selectProviderColumns} FROM ${PROVIDER_TABLE} WHERE user_id = ? LIMIT 1`, [userId]);
    return res.json({ message: "Provider application updated", application: formatProvider(rows[0]) });
  } catch (error) {
    console.error("Update provider application error:", error);
    return res.status(500).json({ message: "Failed to update provider application" });
  }
};

export const getProviders = async (req, res) => {
  try {
    const {
      status = "approved",
      service_category,
      search,
      user_ids,
    } = req.query;

    let query = `SELECT ${selectProviderColumns}, district AS provider_district FROM ${PROVIDER_TABLE} WHERE 1 = 1`;

    const values = [];

    if (status && status !== "all") {
      query += ` AND status = ?`;
      values.push(status);
    }

    if (service_category) {
      query += ` AND service_category = ?`;
      values.push(service_category);
    }

    const matchingUserIds = String(user_ids || "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean)
      .slice(0, 500);

    if (search || matchingUserIds.length) {
      const searchConditions = [];
      const searchValues = [];

      if (search) {
        searchConditions.push(
          "full_name LIKE ?",
          "phone LIKE ?",
          "email LIKE ?",
          "address LIKE ?",
          "service_category LIKE ?"
        );
        const like = `%${search}%`;
        searchValues.push(like, like, like, like, like);
      }

      if (matchingUserIds.length) {
        searchConditions.push(`user_id IN (${matchingUserIds.map(() => "?").join(", ")})`);
        searchValues.push(...matchingUserIds);
      }

      query += `
        AND (${searchConditions.join(" OR ")})
      `;
      values.push(...searchValues);
    }

    query += `
      ORDER BY created_at DESC
    `;

    const [rows] = await pool.execute(query, values);

const getServiceNames = async (providers) => {
  const [categoryRows] = await pool.execute(
    "SELECT id, name, name_en FROM service_categories"
  );
  const categoryMap = new Map(
    categoryRows.map((category) => [String(category.id), category])
  );

  return providers.map((provider) => ({
    ...formatProvider(provider),
    service_names: parseArrayValue(provider.services).map((serviceId) => {
      const category = categoryMap.get(String(serviceId));
      return category?.name_en || category?.name || String(serviceId);
    }),
  }));
};
    return res.json({
      data: await getServiceNames(rows),
    });
  } catch (error) {
    console.error("Get providers error:", error);

    return res.status(500).json({
      message: "Failed to fetch providers",
      error: error.message,
    });
  }
};

export const getProviderById = async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await pool.execute(
      `
      SELECT
        id,
        user_id,
        full_name,
        phone,
        email,
        address,
        service_category,
        experience_years,
        nid_front_url,
        nid_back_url,
        status,
        status_reason,
        created_at,
        updated_at
      FROM ${PROVIDER_TABLE}
      WHERE id = ?
      LIMIT 1
      `,
      [id]
    );

    if (!rows.length) {
      return res.status(404).json({
        message: "Provider not found",
      });
    }

    return res.json({
      data: formatProvider(rows[0]),
    });
  } catch (error) {
    console.error("Get provider by id error:", error);

    return res.status(500).json({
      message: "Failed to fetch provider",
      error: error.message,
    });
  }
};

export const getProviderByUserId = async (req, res) => {
  try {
    const { userId } = req.params;

    const [rows] = await pool.execute(
      `
      SELECT
        id,
        user_id,
        full_name,
        phone,
        email,
        address,
        service_category,
        experience_years,
        nid_front_url,
        nid_back_url,
        status,
        status_reason,
        created_at,
        updated_at
      FROM ${PROVIDER_TABLE}
      WHERE user_id = ?
      LIMIT 1
      `,
      [userId]
    );

    if (!rows.length) {
      return res.status(404).json({
        message: "Provider not found",
      });
    }

    return res.json({
      data: formatProvider(rows[0]),
    });
  } catch (error) {
    console.error("Get provider by user id error:", error);

    return res.status(500).json({
      message: "Failed to fetch provider",
      error: error.message,
    });
  }
};

export const updateProviderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, status_reason } = req.body;

    const allowedStatuses = ["pending", "approved", "rejected", "suspended"];

    if (!status) {
      return res.status(400).json({
        message: "status is required",
      });
    }

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        message: "Invalid provider status",
      });
    }

    const [existing] = await pool.execute(
      `
      SELECT id
      FROM ${PROVIDER_TABLE}
      WHERE id = ?
      LIMIT 1
      `,
      [id]
    );

    if (!existing.length) {
      return res.status(404).json({
        message: "Provider not found",
      });
    }

    await pool.execute(
      `
      UPDATE ${PROVIDER_TABLE}
      SET
        status = ?,
        status_reason = ?
      WHERE id = ?
      `,
      [status, status_reason || null, id]
    );

    const [rows] = await pool.execute(
      `
      SELECT
        id,
        user_id,
        full_name,
        phone,
        email,
        address,
        service_category,
        experience_years,
        nid_front_url,
        nid_back_url,
        status,
        status_reason,
        created_at,
        updated_at
      FROM ${PROVIDER_TABLE}
      WHERE id = ?
      LIMIT 1
      `,
      [id]
    );

    return res.json({
      message: "Provider status updated successfully",
      data: formatProvider(rows[0]),
    });
  } catch (error) {
    console.error("Update provider status error:", error);

    return res.status(500).json({
      message: "Failed to update provider status",
      error: error.message,
    });
  }
};

export const createCallCenterProvider = async (req, res) => {
  try {
    await ensureProviderSchema();
    const {
      user_id, full_name, phone, email, address, service_category,
      experience_years, division, district, thana, area, services,
    } = req.body;
    const front = req.files?.nid_front?.[0];
    const back = req.files?.nid_back?.[0];
    const years = Number(experience_years);
    let thanaValues = [];
    try {
      const parsedThana = JSON.parse(thana || "[]");
      thanaValues = Array.isArray(parsedThana) ? parsedThana : [];
    } catch {
      thanaValues = thana ? [thana] : [];
    }

    const normalizedYears = Number.isFinite(years) && years >= 0 && years <= 60 ? years : 0;

    if (service_category) {
      const [categoryRows] = await pool.execute(
        "SELECT id FROM service_categories WHERE id = ? AND is_active = 1 LIMIT 1",
        [service_category]
      );
      if (!categoryRows.length) return res.status(400).json({ message: "Select an active service category" });
    }

    if (user_id) {
      const [existing] = await pool.execute(
        `SELECT id FROM ${PROVIDER_TABLE} WHERE user_id = ? LIMIT 1`,
        [user_id]
      );
      if (existing.length) return res.status(409).json({ message: "This user already has a provider record" });
    }

    const providerName = full_name?.trim() || "Provider";
    const [result] = await pool.execute(
      `INSERT INTO ${PROVIDER_TABLE}
       (user_id, name, full_name, phone, email, address, division, district, thana, area,
        services, service_category, experience_years, nid_front_url, nid_back_url, status, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'approved', 1)`,
      [user_id || null, providerName, providerName, phone?.trim() || null, email?.trim() || null, address?.trim() || null,
        division?.trim() || null, district?.trim() || null, JSON.stringify(thanaValues), area?.trim() || null,
        services || JSON.stringify(service_category ? [service_category] : []), service_category || null, normalizedYears,
        front ? providerNidUrl(front.filename) : null, back ? providerNidUrl(back.filename) : null]
    );
    const providerId = result.insertId;

    const [rows] = await pool.execute(`SELECT ${selectProviderColumns} FROM ${PROVIDER_TABLE} WHERE id = ? LIMIT 1`, [providerId]);
    return res.status(201).json({ message: "Provider created successfully", application: formatProvider(rows[0]) });
  } catch (error) {
    console.error("Create call center provider error:", error);
    return res.status(500).json({ message: "Failed to create provider" });
  }
};

export const requireCallCenterProviderManager = (req, res, next) => {
  const role = req.user?.type || req.user?.role;
  if (!callCenterProviderManagerRoles.has(role)) {
    return res.status(403).json({ message: "Provider management access required" });
  }
  next();
};

export const updateCallCenterProvider = async (req, res) => {
  const uploadedFiles = [
    req.files?.nid_front?.[0],
    req.files?.nid_back?.[0],
  ].filter(Boolean);

  try {
    await ensureProviderSchema();
    const { id } = req.params;
    const {
      user_id, full_name, phone, email, address, service_category,
      experience_years, division, district, thana, area, services,
    } = req.body;
    const front = req.files?.nid_front?.[0];
    const back = req.files?.nid_back?.[0];
    const years = Number(experience_years);
    let thanaValues = [];

    try {
      const parsedThana = JSON.parse(thana || "[]");
      thanaValues = Array.isArray(parsedThana) ? parsedThana : [];
    } catch {
      thanaValues = thana ? [thana] : [];
    }

    const normalizedYears = Number.isFinite(years) && years >= 0 && years <= 60 ? years : 0;
    if (service_category) {
      const [categoryRows] = await pool.execute(
        "SELECT id FROM service_categories WHERE id = ? AND is_active = 1 LIMIT 1",
        [service_category]
      );
      if (!categoryRows.length) {
        await Promise.all(uploadedFiles.map((file) => removeStoredFile(providerNidUrl(file.filename))));
        return res.status(400).json({ message: "Select an active service category" });
      }
    }

    const [existingRows] = await pool.execute(
      `SELECT ${selectProviderColumns} FROM ${PROVIDER_TABLE} WHERE id = ? LIMIT 1`,
      [id]
    );
    const existing = existingRows[0];
    if (!existing) {
      await Promise.all(uploadedFiles.map((file) => removeStoredFile(providerNidUrl(file.filename))));
      return res.status(404).json({ message: "Provider not found" });
    }

    if (user_id && String(user_id) !== String(existing.user_id || "")) {
      const [linkedRows] = await pool.execute(
        `SELECT id FROM ${PROVIDER_TABLE} WHERE user_id = ? AND id <> ? LIMIT 1`,
        [user_id, id]
      );
      if (linkedRows.length) {
        await Promise.all(uploadedFiles.map((file) => removeStoredFile(providerNidUrl(file.filename))));
        return res.status(409).json({ message: "This user already has a provider record" });
      }
    }

    const frontUrl = front ? providerNidUrl(front.filename) : existing.nid_front_url;
    const backUrl = back ? providerNidUrl(back.filename) : existing.nid_back_url;
    await pool.execute(
      `UPDATE ${PROVIDER_TABLE}
       SET name = ?, full_name = ?, phone = ?, email = ?, address = ?,
           division = ?, district = ?, thana = ?, area = ?, services = ?,
           service_category = ?, experience_years = ?, nid_front_url = ?, nid_back_url = ?, user_id = ?
       WHERE id = ?`,
      [
        full_name?.trim() || "Provider",
        full_name?.trim() || "Provider",
        phone?.trim() || null,
        email?.trim() || null,
        address?.trim() || null,
        division?.trim() || null,
        district?.trim() || null,
        JSON.stringify(thanaValues),
        area?.trim() || null,
        services || JSON.stringify(service_category ? [service_category] : []),
        service_category || null,
        normalizedYears,
        frontUrl,
        backUrl,
        user_id || existing.user_id || null,
        id,
      ]
    );

    if (front) await removeStoredFile(existing.nid_front_url);
    if (back) await removeStoredFile(existing.nid_back_url);

    const [rows] = await pool.execute(
      `SELECT ${selectProviderColumns} FROM ${PROVIDER_TABLE} WHERE id = ? LIMIT 1`,
      [id]
    );
    return res.json({ message: "Provider updated successfully", application: formatProvider(rows[0]) });
  } catch (error) {
    await Promise.all(uploadedFiles.map((file) => removeStoredFile(providerNidUrl(file.filename))));
    console.error("Update call center provider error:", error);
    return res.status(500).json({ message: "Failed to update provider" });
  }
};

export const deleteCallCenterProvider = async (req, res) => {
  try {
    await ensureProviderSchema();
    const { id } = req.params;
    const [rows] = await pool.execute(
      `SELECT id, user_id, nid_front_url, nid_back_url FROM ${PROVIDER_TABLE} WHERE id = ? LIMIT 1`,
      [id]
    );
    const provider = rows[0];

    if (!provider) {
      return res.status(404).json({ message: "Provider not found" });
    }

    await pool.execute("UPDATE bookings SET provider_id = NULL WHERE provider_id = ?", [id]);
    const [result] = await pool.execute(`DELETE FROM ${PROVIDER_TABLE} WHERE id = ?`, [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Provider not found" });
    }

    await Promise.all([
      removeStoredFile(provider.nid_front_url),
      removeStoredFile(provider.nid_back_url),
    ]);

    return res.json({ message: "Provider deleted successfully", user_id: provider.user_id });
  } catch (error) {
    console.error("Delete call center provider error:", error);
    return res.status(500).json({ message: "Failed to delete provider" });
  }
};

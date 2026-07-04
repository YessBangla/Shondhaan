import { pool } from "../config/db.js";

const PROVIDER_TABLE = "providers"; 


const formatProvider = (provider) => ({
  id: provider.id,
  user_id: provider.user_id,

  full_name: provider.full_name,
  phone: provider.phone,
  email: provider.email,
  address: provider.address,

  service_category: provider.service_category,
  experience_years: Number(provider.experience_years || 0),

  nid_front_url: provider.nid_front_url,
  nid_back_url: provider.nid_back_url,

  status: provider.status,
  status_reason: provider.status_reason,

  created_at: provider.created_at,
  updated_at: provider.updated_at,
});

export const getProviders = async (req, res) => {
  try {
    const {
      status = "approved",
      service_category,
      search,
    } = req.query;

    let query = `
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
      WHERE 1 = 1
    `;

    const values = [];

    if (status && status !== "all") {
      query += ` AND status = ?`;
      values.push(status);
    }

    if (service_category) {
      query += ` AND service_category = ?`;
      values.push(service_category);
    }

    if (search) {
      query += `
        AND (
          full_name LIKE ?
          OR phone LIKE ?
          OR email LIKE ?
          OR address LIKE ?
          OR service_category LIKE ?
        )
      `;

      const like = `%${search}%`;
      values.push(like, like, like, like, like);
    }

    query += `
      ORDER BY created_at DESC
    `;

    const [rows] = await pool.execute(query, values);

    return res.json({
      data: rows.map(formatProvider),
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
const express = require("express");
const fs = require("fs");
const path = require("path");
const router = express.Router();
const pool = require("../db");
const { getBackendBaseUrl } = require("../utils/baseUrl");

const USERS_DB_NAME =
  process.env.USERS_DB_NAME ||
  process.env.MAIN_DB_NAME ||
  process.env.YSERVICE_DB_NAME ||
  "yess-service";

const quoteIdentifier = (value) => `\`${String(value).replace(/`/g, "``")}\``;
const usersTableRef = `${quoteIdentifier(USERS_DB_NAME)}.${quoteIdentifier("users")}`;

const writableFields = [
  "full_name",
  "phone",
  "email",
  "date_of_birth",
  "present_address",
  "permanent_address",
  "nid_number",
  "emergency_contact_name",
  "emergency_contact_phone",
  "vehicle_type",
  "vehicle_registration_number",
  "driving_license_number",
  "service_district",
  "service_thana",
  "payout_method",
  "payout_account_name",
  "payout_account_number",
  "bank_name",
  "bank_branch",
  "routing_number",
  "nid_front_url",
  "nid_back_url",
  "selfie_url",
  "driving_license_url",
  "vehicle_registration_url",
];

const allowedStatuses = new Set(["draft", "submitted", "approved", "rejected"]);

const normalize = (value) => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const text = String(value).trim();
  return text || null;
};

async function tableExists(tableName, schemaName = null) {
  const [rows] = await pool.query(
    `SELECT TABLE_NAME
     FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = COALESCE(?, DATABASE())
       AND TABLE_NAME = ?
     LIMIT 1`,
    [schemaName, tableName]
  );

  return rows.length > 0;
}

async function selectDeliverymen(whereSql = "", params = [], orderSql = "ORDER BY d.id DESC") {
  const hasUsersTable = await tableExists("users", USERS_DB_NAME);
  const deliveryAreasJoin = `
       LEFT JOIN (
         SELECT
           area_rows.user_id,
           COUNT(*) AS delivery_area_count,
           GROUP_CONCAT(DISTINCT area_rows.district ORDER BY area_rows.district SEPARATOR ', ') AS delivery_districts,
           GROUP_CONCAT(area_rows.area_label ORDER BY area_rows.district, area_rows.thana_label SEPARATOR '; ') AS delivery_area_summary,
           MIN(area_rows.district) AS primary_service_district,
           MIN(area_rows.thana_label) AS primary_service_thana
         FROM (
           SELECT
             user_id,
             district,
             COALESCE(NULLIF(thana, ''), area) AS thana_label,
             CONCAT(district, ': ', COALESCE(NULLIF(thana, ''), area)) AS area_label
           FROM delivery_areas
         ) area_rows
         GROUP BY area_rows.user_id
       ) da_summary ON da_summary.user_id = d.user_id`;
  const baseSql = hasUsersTable
    ? `SELECT
         d.*,
         COALESCE(d.full_name, u.name) AS display_name,
         COALESCE(d.phone, u.mobile) AS display_phone,
         COALESCE(d.email, u.email) AS display_email,
         u.name AS user_name,
         u.mobile AS user_mobile,
         u.email AS user_email,
         da_summary.delivery_area_count,
         da_summary.delivery_districts,
         da_summary.delivery_area_summary,
         da_summary.primary_service_district,
         da_summary.primary_service_thana
       FROM deliverymen d
       LEFT JOIN ${usersTableRef} u ON u.id = d.user_id
       ${deliveryAreasJoin}`
    : `SELECT
         d.*,
         d.full_name AS display_name,
         d.phone AS display_phone,
         d.email AS display_email,
         NULL AS user_name,
         NULL AS user_mobile,
         NULL AS user_email,
         da_summary.delivery_area_count,
         da_summary.delivery_districts,
         da_summary.delivery_area_summary,
         da_summary.primary_service_district,
         da_summary.primary_service_thana
       FROM deliverymen d
       ${deliveryAreasJoin}`;

  const [rows] = await pool.query(
    `${baseSql} ${whereSql} ${orderSql}`,
    params
  );

  return rows;
}

router.post("/upload", express.json({ limit: "8mb" }), async (req, res) => {
  try {
    const { file, name } = req.body;
    if (!file) return res.status(400).json({ success: false, message: "No file" });

    const ext = (name || "file").split(".").pop() || "jpg";
    const filename = `delivery_kyc_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
    const uploadDir = path.join(__dirname, "../uploads/delivery-kyc");
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

    const buffer = Buffer.from(file, "base64");
    fs.writeFileSync(path.join(uploadDir, filename), buffer);

    const url = `${getBackendBaseUrl()}/uploads/delivery-kyc/${filename}`;
    res.json({ success: true, url });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/", async (req, res) => {
  try {
    const { user_id, status } = req.query;
    const params = [];
    const where = [];

    if (user_id) {
      where.push("d.user_id = ?");
      params.push(user_id);
    }
    if (status && allowedStatuses.has(String(status))) {
      where.push("d.kyc_status = ?");
      params.push(status);
    }

    const rows = await selectDeliverymen(
      where.length ? `WHERE ${where.join(" AND ")}` : "",
      params
    );

    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch deliverymen", error: error.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const rows = await selectDeliverymen("WHERE d.id = ?", [req.params.id], "");
    if (!rows.length) return res.status(404).json({ success: false, message: "Deliveryman not found" });
    res.json({ success: true, data: rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch deliveryman", error: error.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const { user_id } = req.body;
    if (!user_id) return res.status(400).json({ success: false, message: "user_id is required" });

    const status = allowedStatuses.has(req.body.kyc_status) ? req.body.kyc_status : "submitted";
    const values = writableFields.map((field) => normalize(req.body[field]));
    const insertFields = ["user_id", ...writableFields, "kyc_status", "verified", "submitted_at"];
    const updateFields = writableFields.map((field) => `${field} = VALUES(${field})`);

    await pool.query(
      `INSERT INTO deliverymen (${insertFields.join(", ")})
       VALUES (${insertFields.map(() => "?").join(", ")})
       ON DUPLICATE KEY UPDATE
         ${updateFields.join(", ")},
         kyc_status = VALUES(kyc_status),
         verified = CASE WHEN VALUES(kyc_status) = 'approved' THEN 1 ELSE 0 END,
         submitted_at = COALESCE(submitted_at, VALUES(submitted_at))`,
      [user_id, ...values, status, status === "approved" ? 1 : 0, status === "draft" ? null : new Date()]
    );

    const rows = await selectDeliverymen("WHERE d.user_id = ?", [user_id], "LIMIT 1");
    res.status(201).json({ success: true, message: "Delivery KYC submitted", data: rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to save delivery KYC", error: error.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const updates = [];
    const params = [];

    for (const field of writableFields) {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = ?`);
        params.push(normalize(req.body[field]));
      }
    }

    if (req.body.kyc_status && allowedStatuses.has(req.body.kyc_status)) {
      updates.push("kyc_status = ?");
      params.push(req.body.kyc_status);
      if (req.body.kyc_status === "submitted") {
        updates.push("submitted_at = COALESCE(submitted_at, NOW())");
        updates.push("verified = 0");
        updates.push("reviewed_at = NULL");
      }
    }

    if (!updates.length) return res.status(400).json({ success: false, message: "No fields to update" });

    params.push(req.params.id);
    await pool.query(`UPDATE deliverymen SET ${updates.join(", ")} WHERE id = ?`, params);

    const rows = await selectDeliverymen("WHERE d.id = ?", [req.params.id], "");
    if (!rows.length) return res.status(404).json({ success: false, message: "Deliveryman not found" });
    res.json({ success: true, message: "Delivery KYC updated", data: rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to update delivery KYC", error: error.message });
  }
});

router.patch("/:id/kyc-message", async (req, res) => {
  try {
    const message = normalize(req.body.message);
    await pool.query("UPDATE deliverymen SET kyc_admin_message = ? WHERE id = ?", [message, req.params.id]);

    const rows = await selectDeliverymen("WHERE d.id = ?", [req.params.id], "");
    if (!rows.length) return res.status(404).json({ success: false, message: "Deliveryman not found" });
    res.json({ success: true, message: "KYC message updated", data: rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to update KYC message", error: error.message });
  }
});

router.patch("/:id/verify", async (req, res) => {
  try {
    const verified = !!req.body.verified;
    const message = verified ? null : normalize(req.body.kyc_admin_message || req.body.message);

    await pool.query(
      `UPDATE deliverymen
       SET verified = ?,
           kyc_status = ?,
           kyc_admin_message = ?,
           reviewed_by = COALESCE(?, reviewed_by),
           reviewed_at = NOW()
       WHERE id = ?`,
      [verified ? 1 : 0, verified ? "approved" : "rejected", message, req.body.reviewed_by || null, req.params.id]
    );

    const rows = await selectDeliverymen("WHERE d.id = ?", [req.params.id], "");
    if (!rows.length) return res.status(404).json({ success: false, message: "Deliveryman not found" });
    res.json({ success: true, message: "Verification updated", data: rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to update verification", error: error.message });
  }
});

module.exports = router;

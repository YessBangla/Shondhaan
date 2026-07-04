const express = require("express");
const pool = require("../db");

const router = express.Router();

const USERS_DB_NAME =
  process.env.USERS_DB_NAME ||
  process.env.MAIN_DB_NAME ||
  process.env.YSERVICE_DB_NAME ||
  "yess-service";

const quoteIdentifier = (value) => `\`${String(value).replace(/`/g, "``")}\``;
const usersTableRef = `${quoteIdentifier(USERS_DB_NAME)}.${quoteIdentifier("users")}`;

function normalizeThanas(thana, thanas, area, areas) {
  const selectedThanas = Array.isArray(thanas)
    ? thanas
    : Array.isArray(areas)
      ? areas
      : [thana || area];

  return [...new Set(
    selectedThanas
      .map((item) => String(item || "").trim())
      .filter(Boolean)
  )];
}

async function tableExists(tableName, schemaName = null) {
  const [rows] = await pool.query(
    `SELECT TABLE_NAME
     FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = COALESCE(?, DATABASE())
       AND TABLE_NAME = ?`,
    [schemaName, tableName]
  );

  return rows.length > 0;
}

// GET /api/delivery-areas/matches?district=Dhaka&thana=Uttara
router.get("/matches", async (req, res) => {
  const district = String(req.query.district || "").trim();
  const thana    = String(req.query.thana || req.query.area || "").trim();

  if (!district && !thana) {
    return res.status(400).json({
      success: false,
      message: "district or thana is required",
    });
  }

  console.log("🔍 Matching deliverymen for district:", district, "thana:", thana);

  try {
    const filters     = [];
    const params      = [];
    const scoreParams = [district, thana, district, thana];

    // ── Case-insensitive match so Bengali/English mismatches are caught ────
    if (district) { filters.push("LOWER(da.district) = LOWER(?)");                               params.push(district); }
    if (thana)    { filters.push("LOWER(COALESCE(NULLIF(da.thana, ''), da.area)) = LOWER(?)");   params.push(thana);    }

    const where         = filters.join(" OR ");
    const hasUsersTable = await tableExists("users", USERS_DB_NAME);

    console.log("SQL WHERE:", where, "params:", params);

    const query = hasUsersTable
      ? `SELECT
           da.user_id,
           da.district,
           MIN(COALESCE(NULLIF(da.thana, ''), da.area)) AS thana,
           MIN(da.area)                                  AS area,
           u.name   AS deliveryman_name,
           u.mobile AS deliveryman_phone,
           u.email  AS deliveryman_email,
           MIN(
             CASE
               WHEN LOWER(da.district) = LOWER(?) AND LOWER(COALESCE(NULLIF(da.thana, ''), da.area)) = LOWER(?) THEN 1
               WHEN LOWER(da.district) = LOWER(?) THEN 2
               WHEN LOWER(COALESCE(NULLIF(da.thana, ''), da.area)) = LOWER(?) THEN 3
               ELSE 4
             END
           ) AS match_rank
         FROM delivery_areas da
         LEFT JOIN ${usersTableRef} u ON u.id = da.user_id
         WHERE (${where})
           AND (u.id IS NULL OR u.type = 'mart_delivery')
         GROUP BY da.user_id, u.name, u.mobile, u.email
         ORDER BY match_rank ASC, deliveryman_name ASC`
      : `SELECT
           user_id,
           district,
           MIN(COALESCE(NULLIF(thana, ''), area)) AS thana,
           MIN(area)                               AS area,
           MIN(
             CASE
               WHEN LOWER(district) = LOWER(?) AND LOWER(COALESCE(NULLIF(thana, ''), area)) = LOWER(?) THEN 1
               WHEN LOWER(district) = LOWER(?) THEN 2
               WHEN LOWER(COALESCE(NULLIF(thana, ''), area)) = LOWER(?) THEN 3
               ELSE 4
             END
           ) AS match_rank
         FROM delivery_areas da
         WHERE (${where})
         GROUP BY user_id, district
         ORDER BY match_rank ASC, user_id ASC`;

    const [rows] = await pool.query(query, [...scoreParams, ...params]);

    console.log(`✅ Found ${rows.length} matching deliverymen`);

    res.json({ success: true, data: rows });
  } catch (error) {
    console.error("❌ Fetch matches error:", error.message, error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch matching deliverymen",
      error: error.message,
    });
  }
});

// GET /api/delivery-areas?user_id=1&district=Dhaka
router.get("/", async (req, res) => {
  const { user_id, district } = req.query;

  if (!user_id) {
    return res.status(400).json({
      success: false,
      message: "user_id is required",
    });
  }

  try {
    const params = [user_id];
    let query = `
      SELECT
        id,
        user_id,
        district,
        COALESCE(NULLIF(thana, ''), area) AS thana,
        area,
        created_at,
        updated_at
      FROM delivery_areas
      WHERE user_id = ?
    `;

    if (district) {
      query += " AND district = ?";
      params.push(district);
    }

    query += " ORDER BY district ASC, thana ASC";

    const [rows] = await pool.query(query, params);

    res.json({
      success: true,
      data: rows,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch delivery areas",
      error: error.message,
    });
  }
});

// POST /api/delivery-areas
// Body: { user_id, district, thanas: ["Uttara", "Mirpur"] }
router.post("/", async (req, res) => {
  const { user_id, district, thana, thanas, area, areas } = req.body;
  const selectedThanas = normalizeThanas(thana, thanas, area, areas);
  const selectedDistrict = String(district || "").trim();

  if (!user_id || !selectedDistrict || selectedThanas.length === 0) {
    return res.status(400).json({
      success: false,
      message: "user_id, district and at least one thana are required",
    });
  }

  try {
    const values = selectedThanas.map((selectedThana) => [
      user_id,
      selectedDistrict,
      selectedThana,
      selectedThana,
    ]);

    await pool.query(
      `INSERT IGNORE INTO delivery_areas (user_id, district, thana, area)
       VALUES ?`,
      [values]
    );

    const [rows] = await pool.query(
      `SELECT
         id,
         user_id,
         district,
         COALESCE(NULLIF(thana, ''), area) AS thana,
         area,
         created_at,
         updated_at
       FROM delivery_areas
       WHERE user_id = ? AND district = ?
       ORDER BY thana ASC`,
      [user_id, selectedDistrict]
    );

    res.status(201).json({
      success: true,
      message: "Delivery areas saved",
      data: rows,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to save delivery areas",
      error: error.message,
    });
  }
});

// PUT /api/delivery-areas/:id
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { user_id, district, thana, area } = req.body;
  const selectedDistrict = String(district || "").trim();
  const selectedThana = String(thana || area || "").trim();

  if (!user_id || !selectedDistrict || !selectedThana) {
    return res.status(400).json({
      success: false,
      message: "user_id, district and thana are required",
    });
  }

  try {
    const [result] = await pool.query(
      `UPDATE delivery_areas
       SET district = ?, thana = ?, area = ?
       WHERE id = ? AND user_id = ?`,
      [selectedDistrict, selectedThana, selectedThana, id, user_id]
    );

    if (!result.affectedRows) {
      return res.status(404).json({
        success: false,
        message: "Delivery area not found",
      });
    }

    const [rows] = await pool.query(
      `SELECT
         id,
         user_id,
         district,
         COALESCE(NULLIF(thana, ''), area) AS thana,
         area,
         created_at,
         updated_at
       FROM delivery_areas
       WHERE id = ?`,
      [id]
    );

    res.json({
      success: true,
      message: "Delivery area updated",
      data: rows[0],
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update delivery area",
      error: error.message,
    });
  }
});

// DELETE /api/delivery-areas/:id?user_id=1
router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  const userId = req.body?.user_id || req.query.user_id;

  if (!userId) {
    return res.status(400).json({
      success: false,
      message: "user_id is required",
    });
  }

  try {
    const [result] = await pool.query(
      "DELETE FROM delivery_areas WHERE id = ? AND user_id = ?",
      [id, userId]
    );

    if (!result.affectedRows) {
      return res.status(404).json({
        success: false,
        message: "Delivery area not found",
      });
    }

    res.json({
      success: true,
      message: "Delivery area deleted",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to delete delivery area",
      error: error.message,
    });
  }
});

module.exports = router;

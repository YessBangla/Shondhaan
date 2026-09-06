const express = require("express");
const pool = require("../db");

const router = express.Router();
const readDeliveryFee = async (district = "", userIds = []) => {
  const ids = [...new Set((Array.isArray(userIds) ? userIds : [userIds])
    .map((id) => String(id || "").trim()).filter(Boolean))];
  if (!district || ids.length === 0) return 0;

  const [areaRows] = await pool.query(
    "SELECT * FROM mart_fee_settings WHERE user_id IN (?) ORDER BY id ASC",
    [ids]
  );
  return ids.reduce((total, userId) => {
    const sellerRows = areaRows.filter((row) => String(row.user_id) === userId);
    const matching = sellerRows.find((row) => parseAreas(row.selected_areas).includes(String(district).trim()));
    const setting = matching || sellerRows[0];
    if (!setting) return total;
    return total + Number((matching ? setting.area_fee : setting.other_area_fee) || 0);
  }, 0);
};

const parseAreas = (value) => {
  try {
    const areas = Array.isArray(value) ? value : JSON.parse(value || "[]");
    return Array.isArray(areas) ? areas.map((area) => String(area).trim()).filter(Boolean) : [];
  } catch {
    return [];
  }
};

router.get("/", async (req, res) => {
  try {
    const userId = String(req.query.user_id || "").trim();
    const district = String(req.query.district || "").trim();
    const userIds = String(req.query.user_ids || "").split(",").map((id) => id.trim()).filter(Boolean);
    if (district && userIds.length > 0 && !userId) {
      return res.json({ success: true, data: { delivery_fee: await readDeliveryFee(district, userIds) } });
    }
    const query = userId
      ? "SELECT * FROM mart_fee_settings WHERE user_id = ? ORDER BY id ASC"
      : "SELECT * FROM mart_fee_settings WHERE user_id IS NULL ORDER BY id ASC LIMIT 1";
    const [rows] = await pool.query(query, userId ? [userId] : []);
    if (!userId) {
      const setting = rows[0] || { area_fee: 0, other_area_fee: 0, user_id: null };
      return res.json({ success: true, data: setting });
    }
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error("Get mart fee settings error:", error);
    res.status(500).json({ success: false, message: "Failed to load Mart fee settings" });
  }
});

router.put("/", async (req, res) => {
  const userId = String(req.body.user_id || "").trim() || null;
  const deliveryArea = String(req.body.delivery_area || "").trim() || null;
  const selectedAreas = parseAreas(req.body.selected_areas);
  const areaFee = Number(req.body.area_fee ?? 0);
  const otherAreaFee = Number(req.body.other_area_fee ?? 0);
  if ([areaFee, otherAreaFee].some((value) => !Number.isFinite(value) || value < 0)) {
    return res.status(400).json({ success: false, message: "Fees must be non-negative numbers" });
  }

  try {
    if (!userId) {
      await pool.query(
          `INSERT INTO mart_fee_settings (id, area_fee, other_area_fee, selected_areas)
         VALUES (1, ?, ?, ?)
         ON DUPLICATE KEY UPDATE area_fee = VALUES(area_fee),
           other_area_fee = VALUES(other_area_fee), selected_areas = VALUES(selected_areas)`,
        [areaFee.toFixed(2), otherAreaFee.toFixed(2), JSON.stringify(selectedAreas)]
      );
    } else {
      const [existing] = await pool.query(
        `SELECT id FROM mart_fee_settings WHERE user_id = ? AND COALESCE(delivery_area, '') = COALESCE(?, '') LIMIT 1`,
        [userId, deliveryArea]
      );
      if (existing.length) {
        await pool.query(
          `UPDATE mart_fee_settings SET area_fee = ?, other_area_fee = ?, delivery_area = ?, selected_areas = ? WHERE id = ?`,
          [areaFee.toFixed(2), otherAreaFee.toFixed(2), deliveryArea, JSON.stringify(selectedAreas), existing[0].id]
        );
      } else {
        await pool.query(
          `INSERT INTO mart_fee_settings (user_id, delivery_area, selected_areas, area_fee, other_area_fee)
           VALUES (?, ?, ?, ?, ?)`,
          [userId, deliveryArea, JSON.stringify(selectedAreas), areaFee.toFixed(2), otherAreaFee.toFixed(2)]
        );
      }
    }
    res.json({ success: true, data: { user_id: userId, delivery_area: deliveryArea, selected_areas: selectedAreas, area_fee: areaFee, other_area_fee: otherAreaFee } });
  } catch (error) {
    console.error("Update mart fee settings error:", error);
    res.status(500).json({ success: false, message: "Failed to save Mart fee settings" });
  }
});

module.exports = { router, readDeliveryFee };
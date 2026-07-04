const express = require("express");
const pool = require("../db");

const router = express.Router();

const mapAddress = (row) => ({
  id: String(row.id),
  user_id: row.user_id,
  label: row.label,
  name: row.customer_name,
  phone: row.customer_phone,
  division: row.division,
  district: row.district,
  thana: row.thana,
  address: row.address,
  is_default: Boolean(row.is_default),
  created_at: row.created_at,
  updated_at: row.updated_at,
});

router.get("/", async (req, res) => {
  const { user_id } = req.query;

  if (!user_id) {
    return res.status(400).json({ success: false, message: "user_id is required" });
  }

  try {
    const [rows] = await pool.query(
      `SELECT *
       FROM shipping_addresses
       WHERE user_id = ?
       ORDER BY is_default DESC, created_at DESC`,
      [user_id]
    );

    res.json({ success: true, data: rows.map(mapAddress) });
  } catch (error) {
    console.error("Fetch shipping addresses error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post("/", async (req, res) => {
  const {
    user_id,
    label = "Home",
    name,
    phone,
    division,
    district,
    thana,
    address,
    is_default,
  } = req.body;

  if (!user_id || !name || !phone || !address) {
    return res.status(400).json({ success: false, message: "user_id, name, phone and address are required" });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const shouldDefault = Boolean(is_default);
    if (shouldDefault) {
      await conn.query("UPDATE shipping_addresses SET is_default = 0 WHERE user_id = ?", [user_id]);
    }

    const [result] = await conn.query(
      `INSERT INTO shipping_addresses
         (user_id, label, customer_name, customer_phone, division, district, thana, address, is_default)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        user_id,
        ["Home", "Office", "Other"].includes(label) ? label : "Home",
        name,
        phone,
        division || null,
        district || null,
        thana || null,
        address,
        shouldDefault ? 1 : 0,
      ]
    );

    const [rows] = await conn.query("SELECT * FROM shipping_addresses WHERE id = ? LIMIT 1", [result.insertId]);
    await conn.commit();
    res.status(201).json({ success: true, data: mapAddress(rows[0]) });
  } catch (error) {
    await conn.rollback();
    console.error("Create shipping address error:", error);
    res.status(500).json({ success: false, message: error.message });
  } finally {
    conn.release();
  }
});

router.put("/:id/default", async (req, res) => {
  const { user_id } = req.body;

  if (!user_id) {
    return res.status(400).json({ success: false, message: "user_id is required" });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query("UPDATE shipping_addresses SET is_default = 0 WHERE user_id = ?", [user_id]);
    const [result] = await conn.query(
      "UPDATE shipping_addresses SET is_default = 1 WHERE id = ? AND user_id = ?",
      [req.params.id, user_id]
    );

    if (!result.affectedRows) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: "Address not found" });
    }

    await conn.commit();
    res.json({ success: true });
  } catch (error) {
    await conn.rollback();
    console.error("Set default shipping address error:", error);
    res.status(500).json({ success: false, message: error.message });
  } finally {
    conn.release();
  }
});

router.delete("/:id", async (req, res) => {
  const { user_id } = req.query;

  if (!user_id) {
    return res.status(400).json({ success: false, message: "user_id is required" });
  }

  try {
    const [result] = await pool.query(
      "DELETE FROM shipping_addresses WHERE id = ? AND user_id = ?",
      [req.params.id, user_id]
    );

    if (!result.affectedRows) {
      return res.status(404).json({ success: false, message: "Address not found" });
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Delete shipping address error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;

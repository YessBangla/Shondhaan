const express = require("express");
const pool = require("../db");

const router = express.Router();
const MAX_REFUND_WINDOW_DAYS = 365;
const validId = (value) => String(value || "").trim();
const validDays = (value) => {
  const days = Number(value);
  return Number.isInteger(days) && days >= 0 && days <= MAX_REFUND_WINDOW_DAYS ? days : null;
};

const findOrderRefundData = async (orderId, customerUserId) => {
  const [rows] = await pool.query(
    `SELECT o.id, o.user_id, o.order_status, o.delivered_at, s.user_id AS vendor_user_id,
            p.refund_window_days, r.id AS refund_request_id, r.status AS refund_status
     FROM orders o
     INNER JOIN order_items oi ON oi.order_id = o.id
     INNER JOIN sellers s ON s.id = oi.seller_id
     LEFT JOIN mart_refund_policies p ON p.vendor_user_id = s.user_id
     LEFT JOIN mart_refund_requests r ON r.order_id = o.id
     WHERE o.id = ? AND o.user_id = ?
     ORDER BY oi.id ASC LIMIT 1`,
    [orderId, customerUserId]
  );
  return rows[0] || null;
};

const eligibilityFor = (order) => {
  const days = Number(order?.refund_window_days || 0);
  const deliveredAt = order?.delivered_at ? new Date(order.delivered_at) : null;
  const deadline = deliveredAt && days > 0 ? new Date(deliveredAt.getTime() + days * 86400000) : null;
  return {
    eligible: order?.order_status === "delivered" && !!deadline && deadline.getTime() >= Date.now() && !order.refund_request_id,
    refund_window_days: days,
    refund_deadline: deadline?.toISOString() || null,
    refund_status: order?.refund_status || null,
  };
};

router.get("/policy", async (req, res) => {
  const vendorUserId = validId(req.query.vendor_user_id || req.query.user_id);
  if (!vendorUserId) return res.status(400).json({ success: false, message: "A vendor user ID is required" });
  try {
    const [rows] = await pool.query("SELECT vendor_user_id, refund_window_days, updated_at FROM mart_refund_policies WHERE vendor_user_id = ?", [vendorUserId]);
    return res.json({ success: true, data: rows[0] || { vendor_user_id: vendorUserId, refund_window_days: 0 } });
  } catch (error) {
    console.error("Get Mart refund policy error:", error);
    return res.status(500).json({ success: false, message: "Could not load refund policy" });
  }
});

router.put("/policy", async (req, res) => {
  const vendorUserId = validId(req.body.vendor_user_id || req.body.user_id);
  const days = validDays(req.body.refund_window_days);
  if (!vendorUserId || days === null) return res.status(400).json({ success: false, message: "Refund days must be a whole number from 0 to 365" });
  try {
    await pool.query(
      `INSERT INTO mart_refund_policies (vendor_user_id, refund_window_days) VALUES (?, ?)
       ON DUPLICATE KEY UPDATE refund_window_days = VALUES(refund_window_days), updated_at = CURRENT_TIMESTAMP`,
      [vendorUserId, days]
    );
    return res.json({ success: true, data: { vendor_user_id: vendorUserId, refund_window_days: days } });
  } catch (error) {
    console.error("Save Mart refund policy error:", error);
    return res.status(500).json({ success: false, message: "Could not save refund policy" });
  }
});

router.get("/eligibility", async (req, res) => {
  const orderId = Number(req.query.order_id);
  const customerUserId = validId(req.query.user_id);
  if (!Number.isInteger(orderId) || orderId <= 0 || !customerUserId) return res.status(400).json({ success: false, message: "order_id and user_id are required" });
  try {
    const order = await findOrderRefundData(orderId, customerUserId);
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });
    return res.json({ success: true, data: eligibilityFor(order) });
  } catch (error) {
    console.error("Get Mart refund eligibility error:", error);
    return res.status(500).json({ success: false, message: "Could not check refund eligibility" });
  }
});

router.post("/requests", async (req, res) => {
  const orderId = Number(req.body.order_id);
  const customerUserId = validId(req.body.user_id);
  const reason = String(req.body.reason || "").trim();
  if (!Number.isInteger(orderId) || orderId <= 0 || !customerUserId || !reason) return res.status(400).json({ success: false, message: "order_id, user_id and reason are required" });
  try {
    const order = await findOrderRefundData(orderId, customerUserId);
    if (!order || !eligibilityFor(order).eligible) return res.status(422).json({ success: false, message: "This order is outside its refund window" });
    const [result] = await pool.query(
      "INSERT INTO mart_refund_requests (order_id, customer_user_id, vendor_user_id, reason) VALUES (?, ?, ?, ?)",
      [orderId, customerUserId, order.vendor_user_id, reason]
    );
    return res.status(201).json({ success: true, data: { id: result.insertId, status: "requested" } });
  } catch (error) {
    if (error?.code === "ER_DUP_ENTRY") return res.status(409).json({ success: false, message: "A refund request already exists for this order" });
    console.error("Create Mart refund request error:", error);
    return res.status(500).json({ success: false, message: "Could not create refund request" });
  }
});

module.exports = router;

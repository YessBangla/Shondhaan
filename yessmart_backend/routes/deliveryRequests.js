const express = require("express");
const router  = express.Router();
const pool    = require("../db");

// ─────────────────────────────────────────────────────
// POST /api/delivery-requests
// ─────────────────────────────────────────────────────
router.post("/", async (req, res) => {
  const {
    order_id, order_number, seller_id, deliveryman_user_id,
    customer_name, customer_phone, shipping_address,
    shipping_division, shipping_district, shipping_thana,
    total, notes,
  } = req.body;

  if (!order_id || !seller_id || !deliveryman_user_id) {
    return res.status(400).json({
      success: false,
      message: "order_id, seller_id and deliveryman_user_id are required",
    });
  }

  const orderId           = parseInt(order_id, 10);
  const sellerId          = parseInt(seller_id, 10);
  const deliverymanUserId = parseInt(deliveryman_user_id, 10);

  if (isNaN(orderId) || isNaN(sellerId) || isNaN(deliverymanUserId)) {
    return res.status(400).json({
      success: false,
      message: "order_id, seller_id and deliveryman_user_id must be valid integers",
    });
  }

  try {
    const [orderRows] = await pool.query(
      `SELECT id, order_number, customer_name, customer_phone,
              shipping_address, shipping_division, shipping_district,
              shipping_thana, total
       FROM orders WHERE id = ? LIMIT 1`,
      [orderId]
    );
    if (orderRows.length === 0) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    const [sellerRows] = await pool.query(
      `SELECT user_id FROM sellers WHERE user_id = ? LIMIT 1`,
      [sellerId]
    );
    if (sellerRows.length === 0) {
      return res.status(404).json({ success: false, message: "Seller not found" });
    }

    const [existing] = await pool.query(
      `SELECT id FROM delivery_requests
       WHERE order_id = ? AND deliveryman_user_id = ? AND status = 'pending'
       LIMIT 1`,
      [orderId, deliverymanUserId]
    );
    if (existing.length > 0) {
      return res.json({
        success: true,
        already_exists: true,
        message: "Request already sent to this deliveryman",
      });
    }

    const order = orderRows[0];

    const [result] = await pool.query(
      `INSERT INTO delivery_requests
         (order_id, order_number, seller_id, deliveryman_user_id,
          customer_name, customer_phone, shipping_address,
          shipping_division, shipping_district, shipping_thana,
          total, notes, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [
        orderId,
        order_number      || order.order_number      || null,
        sellerId,
        deliverymanUserId,
        customer_name     || order.customer_name     || null,
        customer_phone    || order.customer_phone    || null,
        shipping_address  || order.shipping_address  || null,
        shipping_division || order.shipping_division || null,
        shipping_district || order.shipping_district || null,
        shipping_thana    || order.shipping_thana    || null,
        total             ?? order.total             ?? 0,
        notes             || null,
      ]
    );

    res.status(201).json({
      success: true,
      message: "Delivery request sent",
      data: { id: result.insertId },
    });
  } catch (error) {
    console.error("Create delivery request error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─────────────────────────────────────────────────────
// GET /api/delivery-requests
// ─────────────────────────────────────────────────────
router.get("/", async (req, res) => {
  const { deliveryman_user_id, seller_id, order_id, status } = req.query;

  if (!deliveryman_user_id && !seller_id && !order_id) {
    return res.status(400).json({
      success: false,
      message: "Provide at least one of: deliveryman_user_id, seller_id, order_id",
    });
  }

  try {
    const conditions = [];
    const params     = [];

    if (deliveryman_user_id) { conditions.push("dr.deliveryman_user_id = ?"); params.push(parseInt(deliveryman_user_id, 10)); }
    if (seller_id)           { conditions.push("dr.seller_id = ?");           params.push(parseInt(seller_id, 10)); }
    if (order_id)            { conditions.push("dr.order_id = ?");            params.push(parseInt(order_id, 10)); }
    if (status)              { conditions.push("dr.status = ?");              params.push(status); }

    const [rows] = await pool.query(
      `SELECT
         dr.*,
         s.shop_name,
         s.seller_name,
         s.seller_mobile,
         s.profile_image_url AS seller_avatar
       FROM delivery_requests dr
       LEFT JOIN sellers s ON s.user_id = dr.seller_id
       WHERE ${conditions.join(" AND ")}
       ORDER BY dr.created_at DESC`,
      params
    );

    res.json({ success: true, data: rows });
  } catch (error) {
    console.error("Fetch delivery requests error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─────────────────────────────────────────────────────
// GET /api/delivery-requests/:id
// ─────────────────────────────────────────────────────
router.get("/:id", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT dr.*, s.shop_name, s.seller_name, s.seller_mobile
       FROM delivery_requests dr
       LEFT JOIN sellers s ON s.user_id = dr.seller_id
       WHERE dr.id = ? LIMIT 1`,
      [req.params.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: "Request not found" });
    }
    res.json({ success: true, data: rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─────────────────────────────────────────────────────
// PUT /api/delivery-requests/:id
// ─────────────────────────────────────────────────────
router.put("/:id", async (req, res) => {
  const { status, notes } = req.body;

  // ✅ "delivered" is now included
  const allowed = ["pending", "accepted", "declined", "cancelled", "delivered"];

  if (!status || !allowed.includes(status)) {
    return res.status(400).json({
      success: false,
      message: `status must be one of: ${allowed.join(", ")}`,
    });
  }

  try {
    // Step 1: Update delivery_requests status
    const [result] = await pool.query(
      `UPDATE delivery_requests
       SET status = ?, notes = COALESCE(?, notes)
       WHERE id = ?`,
      [status, notes || null, req.params.id]
    );

    if (!result.affectedRows) {
      return res.status(404).json({ success: false, message: "Request not found" });
    }

    // Step 2: Fetch the order_id for this delivery request
    const [reqRows] = await pool.query(
      `SELECT order_id FROM delivery_requests WHERE id = ? LIMIT 1`,
      [req.params.id]
    );

    if (reqRows.length > 0) {
      const { order_id } = reqRows[0];

      if (status === "accepted") {
        // Picked up by deliveryman → orders = shipped
        await pool.query(
          `UPDATE orders SET order_status = 'shipped' WHERE id = ?`,
          [order_id]
        );
        console.log(`✅ orders #${order_id} → shipped`);
      }

      if (status === "delivered") {
        // Delivered to customer → orders = delivered
        await pool.query(
          `UPDATE orders
           SET order_status = 'delivered',
               delivered_at = COALESCE(delivered_at, CURRENT_TIMESTAMP)
           WHERE id = ?`,
          [order_id]
        );
        console.log(`✅ orders #${order_id} → delivered`);
      }
    }

    res.json({ success: true, message: `Request marked as ${status}` });
  } catch (error) {
    console.error("❌ PUT /delivery-requests/:id error:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─────────────────────────────────────────────────────
// DELETE /api/delivery-requests/:id
// ─────────────────────────────────────────────────────
router.delete("/:id", async (req, res) => {
  try {
    const [result] = await pool.query(
      `DELETE FROM delivery_requests WHERE id = ?`,
      [req.params.id]
    );
    if (!result.affectedRows) {
      return res.status(404).json({ success: false, message: "Request not found" });
    }
    res.json({ success: true, message: "Request deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put("/:id/status", async (req, res) => {
  const { status, notes } = req.body;
  const allowed = ["pending", "accepted", "declined", "cancelled", "delivered"];

  if (!status || !allowed.includes(status)) {
    return res.status(400).json({
      success: false,
      message: `status must be one of: ${allowed.join(", ")}`,
    });
  }

  const orderStatusByRequestStatus = {
    pending: "confirmed",
    accepted: "shipped",
    declined: null,
    cancelled: "cancelled",
    delivered: "delivered",
  };

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [existingRows] = await connection.query(
      `SELECT id, order_id FROM delivery_requests WHERE id = ? LIMIT 1`,
      [req.params.id]
    );

    if (!existingRows.length) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: "Request not found" });
    }

    const { order_id } = existingRows[0];

    await connection.query(
      `UPDATE delivery_requests
       SET status = ?, notes = COALESCE(?, notes)
       WHERE id = ?`,
      [status, notes || null, req.params.id]
    );

    const orderStatus = orderStatusByRequestStatus[status];
    if (orderStatus) {
      await connection.query(
        `UPDATE orders SET order_status = ? WHERE id = ?`,
        [orderStatus, order_id]
      );
    }

    const [updatedRows] = await connection.query(
      `SELECT * FROM delivery_requests WHERE id = ? LIMIT 1`,
      [req.params.id]
    );

    await connection.commit();

    res.json({
      success: true,
      message: `Request marked as ${status}`,
      data: updatedRows[0] || null,
    });
  } catch (error) {
    await connection.rollback();
    console.error("PUT /delivery-requests/:id/status error:", error.message);
    res.status(500).json({ success: false, message: error.message });
  } finally {
    connection.release();
  }
});

module.exports = router;

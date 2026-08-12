const express = require("express");
const router = express.Router();
const pool = require("../db");

// GET /api/transactions?page=1&limit=20&status=&gateway=&search=
router.get("/", async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset = (page - 1) * limit;
    const { status, gateway, search } = req.query;

    const where = [];
    const params = [];

    if (status) {
      where.push("payment_status = ?");
      params.push(status);
    }
    if (gateway) {
      where.push("gateway = ?");
      params.push(gateway);
    }
    if (search) {
      where.push("(transaction_id LIKE ? OR order_number LIKE ? OR bkash_trx_id LIKE ?)");
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const [rows] = await pool.query(
      `SELECT t.id,
              t.order_id,
              t.order_number,
              t.user_id,
              COALESCE(up.display_name, o.customer_name, CONCAT('User ', COALESCE(o.user_id, t.user_id)), CONCAT('User ', t.user_id)) AS user_name,
              GROUP_CONCAT(DISTINCT oi.product_name ORDER BY oi.id SEPARATOR ', ') AS package_details,
              t.gateway,
              t.payment_method,
              t.transaction_id,
              t.bkash_trx_id,
              t.bank_transaction_id,
              t.card_type,
              t.amount,
              t.currency,
              t.gateway_status,
              t.payment_status,
              t.tran_date,
              t.created_at
       FROM \`transaction\` t
       LEFT JOIN orders o ON o.id = t.order_id
       LEFT JOIN user_profile up ON up.user_id = COALESCE(o.user_id, t.user_id)
       LEFT JOIN order_items oi ON oi.order_id = o.id
       ${whereClause}
       GROUP BY t.id
       ORDER BY t.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const [countRows] = await pool.query(
      `SELECT COUNT(*) AS total FROM \`transaction\` ${whereClause}`,
      params
    );

    res.json({
      data: rows,
      pagination: {
        page,
        limit,
        total: countRows[0].total,
        totalPages: Math.ceil(countRows[0].total / limit),
      },
    });
  } catch (error) {
    console.error("❌ GET /api/transactions error:", error.message);
    res.status(500).json({ error: "Failed to fetch transactions" });
  }
});

// GET /api/transactions/order/:orderId
router.get("/order/:orderId", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT * FROM \`transaction\` WHERE order_id = ? ORDER BY created_at DESC`,
      [req.params.orderId]
    );
    res.json({ data: rows });
  } catch (error) {
    console.error("❌ GET /api/transactions/order/:orderId error:", error.message);
    res.status(500).json({ error: "Failed to fetch order transactions" });
  }
});

module.exports = router;
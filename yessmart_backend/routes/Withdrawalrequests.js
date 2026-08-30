const express = require("express");
const pool = require("../db");

const router = express.Router();

// ═══════════════════════════════════════════════════════════════════════════
// Business rule: a seller may only withdraw money that has actually cleared
// through the SSLCommerz gateway. COD orders (cash collected by a
// deliveryman, not yet remitted) and wallet-paid orders (internal ledger,
// settled elsewhere) do NOT count toward the withdrawable balance — only
// orders where payment_method = 'sslcommerz' AND payment_status = 'paid'.
// ═══════════════════════════════════════════════════════════════════════════

const toNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

/**
 * Sum of everything this seller has ever earned via SSLCommerz-paid orders.
 * Uses order_items.seller_id (the per-line-item vendor) joined against orders
 * so a multi-vendor cart only credits each seller for their own items.
 */
const getSellerSslcommerzEarnings = async (sellerId) => {
  const [rows] = await pool.query(
    `SELECT COALESCE(SUM(oi.total_price), 0) AS total
     FROM order_items oi
     INNER JOIN orders o ON o.id = oi.order_id
     WHERE oi.seller_id = ?
       AND o.payment_method = 'sslcommerz'
       AND o.payment_status = 'paid'`,
    [sellerId]
  );
  return toNumber(rows?.[0]?.total);
};

/**
 * Money already claimed against that SSLCommerz balance: anything paid out,
 * approved (earmarked for payout), or currently pending review. Rejected
 * requests don't hold a claim on the balance.
 */
const getSellerReservedWithdrawals = async (sellerId) => {
  const [rows] = await pool.query(
    `SELECT
       COALESCE(SUM(CASE WHEN status IN ('approved','paid') THEN amount ELSE 0 END), 0) AS settled,
       COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) AS pending
     FROM withdrawal_requests
     WHERE seller_id = ?`,
    [sellerId]
  );
  return {
    settled: toNumber(rows?.[0]?.settled),
    pending: toNumber(rows?.[0]?.pending),
  };
};

/**
 * Full balance breakdown for a seller, used by both the balance endpoint and
 * the POST validation so the numbers can never drift apart.
 */
const getSellerWithdrawalBalance = async (sellerId) => {
  const sslcommerzEarnings = await getSellerSslcommerzEarnings(sellerId);
  const { settled, pending } = await getSellerReservedWithdrawals(sellerId);
  const availableBalance = Math.max(0, sslcommerzEarnings - settled - pending);

  return {
    sslcommerz_earnings: Number(sslcommerzEarnings.toFixed(2)),
    paid_out: Number(settled.toFixed(2)),
    pending_withdrawals: Number(pending.toFixed(2)),
    available_balance: Number(availableBalance.toFixed(2)),
  };
};

// ─────────────────────────────────────────────────────
// GET /api/withdrawal-requests/balance?seller_id=123
// Returns the seller's SSLCommerz-only withdrawable balance.
// ─────────────────────────────────────────────────────
router.get("/balance", async (req, res) => {
  const sellerId = Number(req.query.seller_id);
  if (!Number.isInteger(sellerId) || sellerId <= 0) {
    return res.status(400).json({ success: false, message: "seller_id is required" });
  }

  try {
    const balance = await getSellerWithdrawalBalance(sellerId);
    res.json({ success: true, data: balance });
  } catch (error) {
    console.error("Fetch withdrawal balance error:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─────────────────────────────────────────────────────
// GET /api/withdrawal-requests?seller_id=123
// Seller's own request history. Omit seller_id (admin use) to list all.
// ─────────────────────────────────────────────────────
router.get("/", async (req, res) => {
  const { seller_id, status } = req.query;

  try {
    let query = `
      SELECT
        wr.id, wr.seller_id, wr.amount, wr.method, wr.account_number,
        wr.account_name, wr.notes, wr.status, wr.admin_note,
        wr.reviewed_by, wr.reviewed_at, wr.created_at, wr.updated_at,
        s.shop_name AS seller_name
      FROM withdrawal_requests wr
      LEFT JOIN sellers s ON s.id = wr.seller_id
      WHERE 1 = 1`;
    const params = [];

    if (seller_id) {
      query += ` AND wr.seller_id = ?`;
      params.push(seller_id);
    }
    if (status) {
      query += ` AND wr.status = ?`;
      params.push(status);
    }

    query += ` ORDER BY wr.created_at DESC`;

    const [rows] = await pool.query(query, params);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error("Fetch withdrawal requests error:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─────────────────────────────────────────────────────
// POST /api/withdrawal-requests
// Seller submits a withdrawal request. Amount is re-validated server-side
// against the SSLCommerz-only balance — never trust the client's number.
// ─────────────────────────────────────────────────────
router.post("/", async (req, res) => {
  const {
    seller_id, amount, method, account_number, account_name, notes,
  } = req.body;

  const sellerId = Number(seller_id);
  const requestedAmount = Number(amount);
  const normalizedMethod = String(method || "bank").toLowerCase();

  if (!Number.isInteger(sellerId) || sellerId <= 0) {
    return res.status(400).json({ success: false, message: "Valid seller_id is required" });
  }
  if (!Number.isFinite(requestedAmount) || requestedAmount <= 0) {
    return res.status(400).json({ success: false, message: "Amount must be greater than 0" });
  }
  if (!["bank", "mobile_banking"].includes(normalizedMethod)) {
    return res.status(400).json({ success: false, message: "method must be 'bank' or 'mobile_banking'" });
  }
  if (!account_number || !String(account_number).trim()) {
    return res.status(400).json({ success: false, message: "account_number is required" });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Verify the seller exists
    const [sellerRows] = await conn.query(
      `SELECT id, user_id FROM sellers WHERE id = ? LIMIT 1`,
      [sellerId]
    );
    if (!sellerRows.length) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: "Seller not found" });
    }

    // Lock this seller's existing withdrawal rows so two concurrent requests
    // can't both pass the balance check against the same SSLCommerz earnings.
    await conn.query(
      `SELECT id FROM withdrawal_requests WHERE seller_id = ? FOR UPDATE`,
      [sellerId]
    );

    const [earningsRows] = await conn.query(
      `SELECT COALESCE(SUM(oi.total_price), 0) AS total
       FROM order_items oi
       INNER JOIN orders o ON o.id = oi.order_id
       WHERE oi.seller_id = ?
         AND o.payment_method = 'sslcommerz'
         AND o.payment_status = 'paid'`,
      [sellerId]
    );
    const sslcommerzEarnings = toNumber(earningsRows?.[0]?.total);

    const [reservedRows] = await conn.query(
      `SELECT
         COALESCE(SUM(CASE WHEN status IN ('approved','paid') THEN amount ELSE 0 END), 0) AS settled,
         COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) AS pending
       FROM withdrawal_requests
       WHERE seller_id = ?`,
      [sellerId]
    );
    const settled = toNumber(reservedRows?.[0]?.settled);
    const pending = toNumber(reservedRows?.[0]?.pending);
    const availableBalance = Math.max(0, sslcommerzEarnings - settled - pending);

    if (requestedAmount > availableBalance) {
      await conn.rollback();
      return res.status(400).json({
        success: false,
        message: `Requested amount exceeds your withdrawable balance (৳${availableBalance.toFixed(2)}). Only SSLCommerz-paid order earnings are withdrawable.`,
        available_balance: Number(availableBalance.toFixed(2)),
      });
    }

    const [insertResult] = await conn.query(
      `INSERT INTO withdrawal_requests
         (seller_id, amount, method, account_number, account_name, notes, status)
       VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
      [
        sellerId,
        requestedAmount,
        normalizedMethod,
        String(account_number).trim(),
        account_name ? String(account_name).trim() : null,
        notes ? String(notes).trim() : null,
      ]
    );

    await conn.commit();

    // ── Notify admins of a new withdrawal request (best-effort, non-fatal) ──
    try {
      const [adminRows] = await pool.query(
        `SELECT user_id FROM admins WHERE user_id IS NOT NULL`
      );
      if (adminRows.length > 0) {
        const notifyRows = adminRows.map((a) => [
          a.user_id,
          "New withdrawal request",
          `Seller #${sellerId} requested ৳${requestedAmount.toLocaleString()}`,
          "withdrawal_request",
          insertResult.insertId,
          null,
          `/admin/mart/withdrawals`,
        ]);
        await pool.query(
          `INSERT INTO notifications
             (user_id, title, message, type, reference_id, product_id, action_url, is_read, created_at)
           VALUES ${notifyRows.map(() => "(?, ?, ?, ?, ?, ?, ?, 0, NOW())").join(", ")}`,
          notifyRows.flat()
        );
      }
    } catch (notifyError) {
      // If there's no `admins` table in this project, this just no-ops.
      console.error("Admin withdrawal notification error:", notifyError.message);
    }

    const [createdRows] = await pool.query(
      `SELECT id, seller_id, amount, method, account_number, account_name,
              notes, status, admin_note, created_at, updated_at
       FROM withdrawal_requests WHERE id = ?`,
      [insertResult.insertId]
    );

    res.json({ success: true, data: createdRows[0] });
  } catch (error) {
    await conn.rollback();
    console.error("Create withdrawal request error:", error.message);
    res.status(500).json({ success: false, message: error.message });
  } finally {
    conn.release();
  }
});

// ─────────────────────────────────────────────────────
// PUT /api/withdrawal-requests/:id
// Admin-only: approve / reject / mark paid, with an optional admin note.
// ─────────────────────────────────────────────────────
router.put("/:id", async (req, res) => {
  const requestId = Number(req.params.id);
  const { status, admin_note, reviewed_by } = req.body;
  const allowed = ["pending", "approved", "rejected", "paid"];

  if (!Number.isInteger(requestId) || requestId <= 0) {
    return res.status(400).json({ success: false, message: "Invalid withdrawal request id" });
  }
  if (!status || !allowed.includes(status)) {
    return res.status(400).json({ success: false, message: `status must be one of: ${allowed.join(", ")}` });
  }

  try {
    const [existingRows] = await pool.query(
      `SELECT id, seller_id, amount, status FROM withdrawal_requests WHERE id = ? LIMIT 1`,
      [requestId]
    );
    if (!existingRows.length) {
      return res.status(404).json({ success: false, message: "Withdrawal request not found" });
    }

    await pool.query(
      `UPDATE withdrawal_requests
       SET status = ?, admin_note = ?, reviewed_by = ?, reviewed_at = NOW()
       WHERE id = ?`,
      [status, admin_note || null, reviewed_by || null, requestId]
    );

    // Notify the seller of the outcome (best-effort, non-fatal)
    try {
      const [sellerRows] = await pool.query(
        `SELECT user_id FROM sellers WHERE id = ? LIMIT 1`,
        [existingRows[0].seller_id]
      );
      const sellerUserId = sellerRows?.[0]?.user_id;
      if (sellerUserId) {
        const statusLabel = {
          approved: "approved",
          rejected: "rejected",
          paid: "paid out",
          pending: "moved back to pending",
        }[status];

        await pool.query(
          `INSERT INTO notifications
             (user_id, title, message, type, reference_id, product_id, action_url, is_read, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, 0, NOW())`,
          [
            sellerUserId,
            "Withdrawal request update",
            `Your withdrawal request for ৳${Number(existingRows[0].amount).toLocaleString()} was ${statusLabel}.`,
            "mart_withdrawal_status",
            requestId,
            null,
            `/mart?tab=withdrawal-requests`,
          ]
        );
      }
    } catch (notifyError) {
      console.error("Withdrawal status notification error:", notifyError.message);
    }

    res.json({ success: true, message: `Withdrawal request updated to ${status}` });
  } catch (error) {
    console.error("Update withdrawal request error:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─────────────────────────────────────────────────────
// DELETE /api/withdrawal-requests/:id
// Seller can cancel their own request while it's still pending.
// ─────────────────────────────────────────────────────
router.delete("/:id", async (req, res) => {
  const requestId = Number(req.params.id);
  if (!Number.isInteger(requestId) || requestId <= 0) {
    return res.status(400).json({ success: false, message: "Invalid withdrawal request id" });
  }

  try {
    const [result] = await pool.query(
      `DELETE FROM withdrawal_requests WHERE id = ? AND status = 'pending'`,
      [requestId]
    );
    if (!result.affectedRows) {
      return res.status(400).json({
        success: false,
        message: "Only pending requests can be cancelled, or the request was not found",
      });
    }
    res.json({ success: true, message: "Withdrawal request cancelled" });
  } catch (error) {
    console.error("Delete withdrawal request error:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
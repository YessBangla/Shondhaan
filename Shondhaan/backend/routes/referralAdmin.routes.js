import { Router } from "express";
import { pool } from "../db/pool.js";

const router = Router();

// ─── LIST CODES ───
router.get("/codes", async (req, res) => {
  try {
    const { search, status, page = "1", limit = "50" } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    let where = "WHERE 1=1";
    const params = [];

    if (search) {
      where += " AND (rc.code LIKE ? OR u.name LIKE ?)";
      params.push(`%${search}%`, `%${search}%`);
    }
    if (status === "active") {
      where += " AND rc.is_active = 1";
    } else if (status === "inactive") {
      where += " AND rc.is_active = 0";
    } else if (status === "expired") {
      where += " AND rc.expires_at IS NOT NULL AND rc.expires_at <= NOW()";
    }

    const [[countResult]] = await pool.execute(
      `SELECT COUNT(*) as total FROM referral_codes rc LEFT JOIN users u ON u.id = rc.user_id ${where}`,
      params
    );

    const [rows] = await pool.execute(
      `SELECT rc.*, u.name AS referrer_name
       FROM referral_codes rc
       LEFT JOIN users u ON u.id = rc.user_id
       ${where}
       ORDER BY rc.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, Number(limit), offset]
    );

    res.json({
      data: rows,
      total: countResult[0].total,
      page: Number(page),
      totalPages: Math.ceil(countResult[0].total / Number(limit)),
    });
  } catch (err) {
    console.error("List referral codes error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ─── CREATE CODE ───
router.post("/codes", async (req, res) => {
  try {
    const {
      user_id,
      code,
      reward_currency,
      reward_amount,
      referred_reward_type,
      referred_reward_amount,
      max_uses,
      min_order_amount,
      expires_at,
    } = req.body;

    if (!user_id || !code) {
      return res.status(400).json({ error: "user_id and code are required" });
    }

    const normalizedCode = String(code).trim().toUpperCase();
    if (!/^[A-Z0-9]{4,16}$/.test(normalizedCode)) {
      return res.status(400).json({ error: "Code must be 4-16 alphanumeric characters" });
    }

    const [existing] = await pool.execute(
      "SELECT id FROM referral_codes WHERE code = ?",
      [normalizedCode]
    );
    if (existing.length) {
      return res.status(409).json({ error: "Code already exists" });
    }

    const [result] = await pool.execute(
      `INSERT INTO referral_codes
         (id, user_id, code, reward_currency, reward_amount, referred_reward_type, referred_reward_amount, max_uses, min_order_amount, expires_at, is_active)
       VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        user_id,
        normalizedCode,
        reward_currency || "CASH",
        Number(reward_amount) || 0,
        referred_reward_type || "CASH",
        Number(referred_reward_amount) || 0,
        Number(max_uses) || null,
        min_order_amount !== undefined && min_order_amount !== null ? Number(min_order_amount) : null,
        expires_at || null,
      ]
    );

    res.status(201).json({ message: "Code created", id: result.insertId });
  } catch (err) {
    console.error("Create referral code error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ─── TOGGLE CODE ───
router.patch("/codes/:id/toggle", async (req, res) => {
  try {
    const [rows] = await pool.execute(
      "UPDATE referral_codes SET is_active = NOT is_active WHERE id = ?",
      [req.params.id]
    );
    if (rows.affectedRows === 0) {
      return res.status(404).json({ error: "Code not found" });
    }
    res.json({ message: "Toggled" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── DELETE CODE ───
router.delete("/codes/:id", async (req, res) => {
  try {
    const [rows] = await pool.execute(
      "DELETE FROM referral_codes WHERE id = ?",
      [req.params.id]
    );
    if (rows.affectedRows === 0) {
      return res.status(404).json({ error: "Code not found" });
    }
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET SETTINGS ───
router.get("/settings", async (req, res) => {
  try {
    const [rows] = await pool.execute(
      "SELECT * FROM referral_settings WHERE id = 1 LIMIT 1"
    );
    res.json({ data: rows[0] || null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── UPDATE SETTINGS ───
router.put("/settings", async (req, res) => {
  try {
    const fields = [
      "is_enabled",
      "qualification_window_days",
      "reward_valid_days",
      "referrer_reward_type",
      "referrer_reward_amount",
      "referred_reward_type",
      "referred_reward_amount",
      "min_order_amount",
    ];
    const updates = [];
    const values = [];

    for (const f of fields) {
      if (req.body[f] !== undefined) {
        updates.push(`${f} = ?`);
        values.push(req.body[f]);
      }
    }

    if (!updates.length) {
      return res.status(400).json({ error: "No fields to update" });
    }

    await pool.execute(
      `INSERT INTO referral_settings (id, ${updates.join(", ")}, created_at, updated_at)
       VALUES (1, ${updates.map(() => "?").join(", ")}, NOW(), NOW())
       ON DUPLICATE KEY UPDATE ${updates.join(", ")}, updated_at = NOW()`,
      [...values, ...values]
    );

    const [rows] = await pool.execute(
      "SELECT * FROM referral_settings WHERE id = 1 LIMIT 1"
    );
    res.json({ message: "Settings saved", data: rows[0] });
  } catch (err) {
    console.error("Update referral settings error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ─── LIST TRANSACTIONS ───
router.get("/transactions", async (req, res) => {
  try {
    const { status, page = "1", limit = "50" } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    let where = "WHERE wt.module = 'REFERRAL'";
    const params = [];

    if (status && status !== "all") {
      where += " AND wt.status = ?";
      params.push(status);
    }

    const [[countResult]] = await pool.execute(
      `SELECT COUNT(*) as total FROM wallet_transactions wt ${where}`,
      params
    );

    const [rows] = await pool.execute(
      `SELECT wt.*, u.name AS user_name
       FROM wallet_transactions wt
       LEFT JOIN users u ON u.id = wt.user_id
       ${where}
       ORDER BY wt.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, Number(limit), offset]
    );

    res.json({
      data: rows,
      total: countResult[0].total,
      page: Number(page),
      totalPages: Math.ceil(countResult[0].total / Number(limit)),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── REPORT / ANALYTICS ───
router.get("/report", async (req, res) => {
  try {
    const [[summary]] = await pool.execute(`
      SELECT
        (SELECT COUNT(*) FROM referral_codes) AS total_codes,
        (SELECT COUNT(*) FROM referral_codes WHERE is_active = 1) AS active_codes,
        (SELECT COUNT(*) FROM referrals) AS total_referrals,
        (SELECT COUNT(*) FROM referrals WHERE status = 'rewarded') AS rewarded_referrals,
        (SELECT COUNT(*) FROM referrals WHERE status = 'pending') AS pending_referrals,
        (SELECT COALESCE(SUM(amount), 0) FROM wallet_transactions WHERE module = 'REFERRAL' AND type = 'CREDIT' AND status = 'COMPLETED') AS total_rewards_paid,
        (SELECT COALESCE(SUM(amount), 0) FROM wallet_transactions WHERE module = 'REFERRAL' AND currency_type = 'COIN' AND status = 'COMPLETED') AS total_coins_paid
    `);

    const [topReferrers] = await pool.execute(`
      SELECT u.name, u.id, COUNT(r.id) AS referral_count,
             COALESCE(SUM(wt.amount), 0) AS total_rewarded
      FROM users u
      JOIN referral_codes rc ON rc.user_id = u.id
      LEFT JOIN referrals r ON r.referral_code_id = rc.id
      LEFT JOIN wallet_transactions wt ON wt.reference_id = CAST(r.id AS CHAR) AND wt.module = 'REFERRAL' AND wt.type = 'CREDIT'
      GROUP BY u.id, u.name
      ORDER BY referral_count DESC
      LIMIT 20
    `);

    const [recentReferrals] = await pool.execute(`
      SELECT r.*, rc.code, u_ref.name AS referrer_name, u_ref.id AS referrer_id,
             u_referred.name AS referred_name
      FROM referrals r
      JOIN referral_codes rc ON rc.id = r.referral_code_id
      LEFT JOIN users u_ref ON u_ref.id = rc.user_id
      LEFT JOIN users u_referred ON u_referred.id = r.referred_user_id
      ORDER BY r.created_at DESC
      LIMIT 20
    `);

    res.json({
      summary: summary[0],
      topReferrers,
      recentReferrals,
    });
  } catch (err) {
    console.error("Referral report error:", err);
    res.status(500).json({ error: err.message });
  }
});
// Health check
router.get("/", (req, res) => {
  res.json({ status: "ok", service: "referral-admin" });
});

export default router;
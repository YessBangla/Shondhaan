import { pool } from "../db/pool.js";

// ─── LIST CODES ───
export const listCodes = async (req, res) => {
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

    const [countRows] = await pool.execute(
      `SELECT COUNT(*) as total FROM referral_codes rc LEFT JOIN users u ON u.id = rc.user_id ${where}`,
      params
    );
    const total = Number(countRows[0]?.total || 0);

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
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
    });
  } catch (err) {
    console.error("List referral codes error:", err);
    res.status(500).json({ error: err.message });
  }
};

// ─── CREATE CODE ───
export const createCode = async (req, res) => {
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
};

// ─── TOGGLE CODE ───
export const toggleCode = async (req, res) => {
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
};

// ─── DELETE CODE ───
export const deleteCode = async (req, res) => {
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
};

// ─── GET SETTINGS ───
export const getSettings = async (_req, res) => {
  try {
    const [rows] = await pool.execute(
      "SELECT * FROM referral_settings WHERE id = 1 LIMIT 1"
    );
    res.json({ data: rows[0] || null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── UPDATE SETTINGS ───
export const updateSettings = async (req, res) => {
  try {
    const fields = [
      "is_enabled",
      "max_uses",
      "code_valid_days",
      "qualification_window_days",
      "reward_valid_days",
      "referrer_reward_currency",
      "referrer_reward_amount",
      "referred_reward_currency",
      "referred_reward_amount",
      "min_order_amount",
    ];
    const columns = [];
    const values = [];

    for (const f of fields) {
      if (req.body[f] !== undefined) {
        columns.push(f);
        values.push(req.body[f]);
      }
    }

    if (!columns.length) {
      return res.status(400).json({ error: "No fields to update" });
    }

    const setClause = columns.map((f) => `${f} = ?`).join(", ");

    await pool.execute(
      `INSERT INTO referral_settings (id, ${columns.join(", ")})
       VALUES (1, ${columns.map(() => "?").join(", ")})
       ON DUPLICATE KEY UPDATE ${setClause}`,
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
};


// ─── LIST TRANSACTIONS ───
export const listTransactions = async (req, res) => {
  try {
    const { status, role, search, page = "1", limit = "50" } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    let where = "WHERE 1=1";
    const params = [];

    if (status && status !== "all") {
      where += " AND rr.status = ?";
      params.push(status);
    }
    if (role && role !== "all") {
      where += " AND rr.role = ?";
      params.push(role);
    }
    if (search) {
      where += " AND (u.name LIKE ? OR u.email LIKE ? OR rc.code LIKE ?)";
      const like = `%${search}%`;
      params.push(like, like, like);
    }

    const [countRows] = await pool.execute(
      `SELECT COUNT(*) AS total
       FROM referral_rewards rr
       LEFT JOIN users u ON u.id = rr.user_id
       LEFT JOIN referrals r ON r.id = rr.referral_id
       LEFT JOIN referral_codes rc ON rc.id = r.referral_code_id
       ${where}`,
      params
    );
    const total = Number(countRows[0]?.total || 0);

    const [rows] = await pool.execute(
      `SELECT rr.id, rr.role, rr.reward_currency, rr.reward_amount,
              rr.status, rr.order_id, rr.created_at, rr.claimed_at, rr.expires_at,
              u.name AS user_name, u.email AS user_email,
              rc.code AS referral_code,
              ur.name AS referrer_name,
              ue.name AS referred_name
       FROM referral_rewards rr
       LEFT JOIN users u ON u.id = rr.user_id
       LEFT JOIN referrals r ON r.id = rr.referral_id
       LEFT JOIN referral_codes rc ON rc.id = r.referral_code_id
       LEFT JOIN users ur ON ur.id = r.referrer_user_id
       LEFT JOIN users ue ON ue.id = r.referred_user_id
       ${where}
       ORDER BY rr.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, Number(limit), offset]
    );

    // Summary
    const [summaryRows] = await pool.execute(
      `SELECT
         COUNT(*) AS total_rewards,
         SUM(CASE WHEN rr.status = 'pending' THEN 1 ELSE 0 END) AS pending_count,
         SUM(CASE WHEN rr.status = 'available' THEN 1 ELSE 0 END) AS available_count,
         SUM(CASE WHEN rr.status = 'claimed' THEN 1 ELSE 0 END) AS claimed_count,
         SUM(CASE WHEN rr.status = 'expired' THEN 1 ELSE 0 END) AS expired_count,
         COALESCE(SUM(CASE WHEN rr.status = 'claimed' AND rr.reward_currency = 'CASH' THEN rr.reward_amount ELSE 0 END), 0) AS total_cash_claimed,
         COALESCE(SUM(CASE WHEN rr.status = 'claimed' AND rr.reward_currency = 'COIN' THEN rr.reward_amount ELSE 0 END), 0) AS total_coin_claimed
       FROM referral_rewards rr
       LEFT JOIN users u ON u.id = rr.user_id
       LEFT JOIN referrals r ON r.id = rr.referral_id
       LEFT JOIN referral_codes rc ON rc.id = r.referral_code_id
       ${where}`,
      params
    );
    const summary = summaryRows[0] || {};

    res.json({
      data: rows.map((row) => ({
        ...row,
        reward_amount: Number(row.reward_amount || 0),
      })),
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
      summary: {
        total_rewards: Number(summary.total_rewards || 0),
        pending_count: Number(summary.pending_count || 0),
        available_count: Number(summary.available_count || 0),
        claimed_count: Number(summary.claimed_count || 0),
        expired_count: Number(summary.expired_count || 0),
        total_cash_claimed: Number(summary.total_cash_claimed || 0),
        total_coin_claimed: Number(summary.total_coin_claimed || 0),
      },
    });
  } catch (err) {
    console.error("List referral transactions error:", err);
    res.status(500).json({ error: err.message });
  }
};

// ─── REPORT / ANALYTICS ───
export const getReport = async (_req, res) => {
  try {
    const [summaryRows] = await pool.execute(`
      SELECT
        (SELECT COUNT(*) FROM referral_codes) AS total_codes,
        (SELECT COUNT(*) FROM referral_codes WHERE is_active = 1) AS active_codes,
        (SELECT COUNT(*) FROM referrals) AS total_referrals,
        (SELECT COUNT(*) FROM referrals WHERE status = 'rewarded') AS rewarded_referrals,
        (SELECT COUNT(*) FROM referrals WHERE status = 'pending') AS pending_referrals,
        (SELECT COALESCE(SUM(amount), 0) FROM wallet_transactions WHERE module = 'REFERRAL' AND type = 'CREDIT' AND status = 'COMPLETED') AS total_rewards_paid,
        (SELECT COALESCE(SUM(amount), 0) FROM wallet_transactions WHERE module = 'REFERRAL' AND currency_type = 'COIN' AND status = 'COMPLETED') AS total_coins_paid
    `);
    const summary = summaryRows[0] || {};

    const [topReferrers] = await pool.execute(`
      SELECT u.name, u.id, COUNT(r.id) AS referral_count,
             COALESCE(SUM(rr.reward_amount), 0) AS total_rewarded
      FROM users u
      JOIN referral_codes rc ON rc.user_id = u.id
      LEFT JOIN referrals r ON r.referral_code_id = rc.id
      LEFT JOIN referral_rewards rr ON rr.referral_id = r.id
        AND rr.role = 'referrer' AND rr.status = 'claimed'
      GROUP BY u.id, u.name
      ORDER BY referral_count DESC
      LIMIT 20
    `);

    const [recentReferrals] = await pool.execute(`
      SELECT r.id, r.status, r.created_at, r.qualified_at, r.rewarded_at,
             rc.code, u_ref.name AS referrer_name, u_ref.id AS referrer_id,
             u_referred.name AS referred_name
      FROM referrals r
      JOIN referral_codes rc ON rc.id = r.referral_code_id
      LEFT JOIN users u_ref ON u_ref.id = rc.user_id
      LEFT JOIN users u_referred ON u_referred.id = r.referred_user_id
      ORDER BY r.created_at DESC
      LIMIT 20
    `);

    // Monthly trend
    const [monthlyTrend] = await pool.execute(`
      SELECT
        DATE_FORMAT(r.created_at, '%Y-%m') AS month,
        COUNT(*) AS referrals,
        SUM(CASE WHEN r.status = 'rewarded' THEN 1 ELSE 0 END) AS rewarded,
        COALESCE(SUM(CASE WHEN rr.status = 'claimed' THEN rr.reward_amount ELSE 0 END), 0) AS amount_disbursed
      FROM referrals r
      LEFT JOIN referral_rewards rr ON rr.referral_id = r.id AND rr.status = 'claimed'
      WHERE r.created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
      GROUP BY DATE_FORMAT(r.created_at, '%Y-%m')
      ORDER BY month DESC
    `);

    // Funnel
    const [funnelRows] = await pool.execute(`
      SELECT
        (SELECT COUNT(*) FROM referral_codes) AS codes_created,
        (SELECT COUNT(*) FROM referrals) AS referrals_made,
        (SELECT COUNT(*) FROM referrals WHERE status IN ('qualified', 'rewarded')) AS qualified,
        (SELECT COUNT(*) FROM referrals WHERE status = 'rewarded') AS rewarded,
        (SELECT COUNT(*) FROM referral_rewards WHERE status = 'claimed') AS rewards_claimed
    `);
    const funnel = funnelRows[0] || {};

    res.json({
      summary: {
        ...summary,
        total_rewards_paid: Number(summary.total_rewards_paid || 0),
        total_coins_paid: Number(summary.total_coins_paid || 0),
      },
      top_referrers: topReferrers.map((r) => ({
        ...r,
        referral_count: Number(r.referral_count || 0),
        total_rewarded: Number(r.total_rewarded || 0),
      })),
      recent_referrals: recentReferrals,
      monthly_trend: monthlyTrend.map((m) => ({
        ...m,
        referrals: Number(m.referrals || 0),
        rewarded: Number(m.rewarded || 0),
        amount_disbursed: Number(m.amount_disbursed || 0),
      })),
      funnel: {
        codes_created: Number(funnel.codes_created || 0),
        referrals_made: Number(funnel.referrals_made || 0),
        qualified: Number(funnel.qualified || 0),
        rewarded: Number(funnel.rewarded || 0),
        rewards_claimed: Number(funnel.rewards_claimed || 0),
      },
    });
  } catch (err) {
    console.error("Referral report error:", err);
    res.status(500).json({ error: err.message });
  }
};
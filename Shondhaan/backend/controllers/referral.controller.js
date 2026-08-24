import crypto from "crypto";
import { pool } from "../db/pool.js";

const FRONTEND_URL =
  (process.env.FRONTEND_URL || process.env.FRONTEND_BASE_URL || "http://localhost:8080").replace(/\/+$/, "");

const money = (value) => Math.round(Number(value || 0) * 100) / 100;

function generateCode(length = 8) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.randomBytes(length);
  return Array.from(bytes, (byte) => chars[byte % chars.length]).join("");
}
function isValidCode(code) {
  return /^[A-Z2-9]{6,12}$/.test(String(code || "").trim().toUpperCase());
}
function normalizeCode(code) {
  return String(code || "").trim().toUpperCase();
}
function referredRewardType(currency) {
  return currency === "COIN" ? "WALLET_COIN" : "WALLET_CASH";
}
function codeLink(code) {
  return `${FRONTEND_URL}/ref/${code}`;
}
async function getSettings(conn = pool) {
  const [rows] = await conn.query("SELECT * FROM referral_settings WHERE id = 1 LIMIT 1");
  return rows[0] || {
    is_enabled: 1,
    max_uses: 50,
    code_valid_days: 90,
    qualification_window_days: 30,
    reward_valid_days: 60,
    referrer_reward_currency: "CASH",
    referrer_reward_amount: 50,
    referred_reward_currency: "CASH",
    referred_reward_amount: 20,
    min_order_amount: null,
  };
}

async function ensureWallet(conn, userId) {
  const walletUserId = String(userId);
  const [rows] = await conn.query("SELECT id FROM user_wallets WHERE user_id = ? LIMIT 1", [walletUserId]);
  if (rows.length) return walletUserId;

  await conn.query(
    "INSERT INTO user_wallets (id, user_id, cash_balance, coin_balance) VALUES (?, ?, 0.00, 0.00)",
    [crypto.randomUUID(), walletUserId]
  );
  return walletUserId;
}

async function creditReward(conn, reward) {
  const walletUserId = await ensureWallet(conn, reward.user_id);
  const balanceCol = reward.reward_currency === "COIN" ? "coin_balance" : "cash_balance";
  const txId = crypto.randomUUID();

  await conn.query(
    `UPDATE user_wallets SET ${balanceCol} = ${balanceCol} + ?, updated_at = NOW() WHERE user_id = ?`,
    [reward.reward_amount, walletUserId]
  );

  await conn.query(
    `INSERT INTO wallet_transactions
       (id, user_id, type, currency_type, amount, module, reference_id, status, description)
     VALUES (?, ?, 'CREDIT', ?, ?, 'REFERRAL', ?, 'COMPLETED', ?)`,
    [
      txId,
      walletUserId,
      reward.reward_currency,
      reward.reward_amount,
      String(reward.id),
      `Referral reward credited (${reward.role})`,
    ]
  );

  await conn.query(
    "UPDATE referral_rewards SET status = 'claimed', claimed_at = NOW() WHERE id = ?",
    [reward.id]
  );
}

async function reserveReferralForUser({ userId, code, bookingId = null, orderAmount = null }) {
  const normalizedCode = normalizeCode(code);
  if (!isValidCode(normalizedCode)) {
    return { success: false, reason: "INVALID_CODE" };
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const settings = await getSettings(conn);
    if (!Number(settings.is_enabled)) {
      await conn.rollback();
      return { success: false, reason: "REFERRALS_DISABLED" };
    }

    const [already] = await conn.query(
      "SELECT id, status FROM referrals WHERE referred_user_id = ? LIMIT 1",
      [userId]
    );
    if (already.length) {
      await conn.rollback();
      return { success: false, reason: "ALREADY_REFERRED", referral_id: already[0].id };
    }

    const [codeRows] = await conn.query(
      `SELECT *
       FROM referral_codes
       WHERE code = ? AND is_active = 1
       AND (expires_at IS NULL OR expires_at > NOW())
       FOR UPDATE`,
      [normalizedCode]
    );

    if (!codeRows.length) {
      await conn.rollback();
      return { success: false, reason: "CODE_NOT_FOUND" };
    }

    const rc = codeRows[0];
    if (Number(rc.user_id) === Number(userId)) {
      await conn.rollback();
      return { success: false, reason: "SELF_REFERRAL" };
    }

    if (Number(rc.used_count) >= Number(rc.max_uses)) {
      await conn.rollback();
      return { success: false, reason: "MAX_USES_REACHED" };
    }

    if (rc.min_order_amount !== null && orderAmount !== null && Number(orderAmount) < Number(rc.min_order_amount)) {
      await conn.rollback();
      return { success: false, reason: "MIN_ORDER_NOT_MET" };
    }

    const [refResult] = await conn.query(
      `INSERT INTO referrals
         (referral_code_id, referrer_user_id, referred_user_id, expires_at)
       VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL ? DAY))`,
      [rc.id, rc.user_id, userId, Number(settings.qualification_window_days || 30)]
    );

    await conn.query(
      "UPDATE referral_codes SET used_count = used_count + 1 WHERE id = ?",
      [rc.id]
    );

    await conn.query(
      `INSERT INTO referral_rewards
         (referral_id, user_id, role, reward_currency, reward_amount, order_id, expires_at)
       VALUES (?, ?, 'referrer', ?, ?, ?, DATE_ADD(NOW(), INTERVAL ? DAY))`,
      [
        refResult.insertId,
        rc.user_id,
        rc.reward_currency,
        rc.reward_amount,
        bookingId,
        Number(settings.reward_valid_days || 60),
      ]
    );

    await conn.query(
      `INSERT INTO referral_rewards
         (referral_id, user_id, role, reward_currency, reward_amount, order_id, expires_at)
       VALUES (?, ?, 'referred', ?, ?, ?, DATE_ADD(NOW(), INTERVAL ? DAY))`,
      [
        refResult.insertId,
        userId,
        rc.referred_reward_type === "WALLET_COIN" ? "COIN" : "CASH",
        rc.referred_reward_amount,
        bookingId,
        Number(settings.reward_valid_days || 60),
      ]
    );

    await conn.commit();
    return {
      success: true,
      referral_id: refResult.insertId,
      your_reward: {
        type: rc.referred_reward_type,
        value: Number(rc.referred_reward_amount),
      },
    };
  } catch (error) {
    await conn.rollback();
    if (error?.code === "ER_DUP_ENTRY") {
      return { success: false, reason: "ALREADY_REFERRED" };
    }
    throw error;
  } finally {
    conn.release();
  }
}

async function settleReferral({ userId, bookingId, orderAmount = null, autoClaim = true }) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [rows] = await conn.query(
      `SELECT r.*, rc.min_order_amount
       FROM referrals r
       JOIN referral_codes rc ON rc.id = r.referral_code_id
       WHERE r.referred_user_id = ? AND r.status = 'pending'
       AND r.expires_at > NOW()
       ORDER BY r.created_at ASC
       LIMIT 1
       FOR UPDATE`,
      [userId]
    );

    if (!rows.length) {
      await conn.rollback();
      return { success: false, reason: "NO_PENDING_REFERRAL" };
    }

    const referral = rows[0];
    if (referral.min_order_amount !== null && orderAmount !== null && Number(orderAmount) < Number(referral.min_order_amount)) {
      await conn.rollback();
      return { success: false, reason: "MIN_ORDER_NOT_MET" };
    }

    await conn.query(
      "UPDATE referrals SET status = 'qualified', qualified_at = NOW() WHERE id = ?",
      [referral.id]
    );

    await conn.query(
      `UPDATE referral_rewards
       SET status = 'available', order_id = COALESCE(?, order_id)
       WHERE referral_id = ? AND status = 'pending'`,
      [bookingId, referral.id]
    );

    let credited = [];
    if (autoClaim) {
      const [rewards] = await conn.query(
        "SELECT * FROM referral_rewards WHERE referral_id = ? AND status = 'available' FOR UPDATE",
        [referral.id]
      );

      for (const reward of rewards) {
        await creditReward(conn, reward);
      }
      credited = rewards.map((reward) => ({
        id: reward.id,
        user_id: reward.user_id,
        role: reward.role,
        currency: reward.reward_currency,
        amount: Number(reward.reward_amount),
      }));
    }

    await conn.query(
      "UPDATE referrals SET status = 'rewarded', rewarded_at = NOW() WHERE id = ?",
      [referral.id]
    );

    await conn.commit();
    return { success: true, referral_id: referral.id, credited };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

const generate = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const settings = await getSettings();
    if (!Number(settings.is_enabled)) {
      return res.status(403).json({ success: false, reason: "REFERRALS_DISABLED" });
    }

    const requestedMaxUses = Number(req.body.max_uses || settings.max_uses || 50);
    const maxUses = Math.max(1, Math.min(requestedMaxUses, Number(settings.max_uses || 50)));

    const [existing] = await pool.query(
      `SELECT id, code, used_count, max_uses, created_at, expires_at
       FROM referral_codes
       WHERE user_id = ? AND is_active = 1
       AND (expires_at IS NULL OR expires_at > NOW())
       ORDER BY created_at DESC
       LIMIT 1`,
      [userId]
    );

    if (existing.length) {
      const row = existing[0];
      return res.json({
        success: true,
        code: row.code,
        used_count: row.used_count,
        max_uses: row.max_uses,
        remaining: Math.max(Number(row.max_uses) - Number(row.used_count), 0),
        link: codeLink(row.code),
      });
    }

    let code = "";
    for (let attempt = 0; attempt < 12; attempt += 1) {
      code = generateCode();
      const [dup] = await pool.query("SELECT 1 FROM referral_codes WHERE code = ? LIMIT 1", [code]);
      if (!dup.length) break;
    }

    await pool.query(
      `INSERT INTO referral_codes
         (user_id, code, max_uses, reward_currency, reward_amount,
          referred_reward_type, referred_reward_amount, min_order_amount, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL ? DAY))`,
      [
        userId,
        code,
        maxUses,
        settings.referrer_reward_currency,
        money(settings.referrer_reward_amount),
        referredRewardType(settings.referred_reward_currency),
        money(settings.referred_reward_amount),
        settings.min_order_amount,
        Number(settings.code_valid_days || 90),
      ]
    );

    return res.status(201).json({
      success: true,
      code,
      max_uses: maxUses,
      remaining: maxUses,
      link: codeLink(code),
    });
  } catch (err) {
    next(err);
  }
};

const validate = async (req, res, next) => {
  try {
    const code = normalizeCode(req.params.code);
    if (!isValidCode(code)) {
      return res.status(400).json({ valid: false, reason: "INVALID_FORMAT" });
    }

    const [rows] = await pool.query(
      `SELECT rc.*, u.name AS referrer_name
       FROM referral_codes rc
       JOIN users u ON u.id = rc.user_id
       WHERE rc.code = ? AND rc.is_active = 1
       AND (rc.expires_at IS NULL OR rc.expires_at > NOW())`,
      [code]
    );

    if (!rows.length) {
      return res.status(404).json({ valid: false, reason: "NOT_FOUND_OR_EXPIRED" });
    }

    const rc = rows[0];
    if (Number(rc.used_count) >= Number(rc.max_uses)) {
      return res.status(410).json({ valid: false, reason: "MAX_USES_REACHED" });
    }

    return res.json({
      valid: true,
      code: rc.code,
      referrer_name: rc.referrer_name,
      referred_reward_type: rc.referred_reward_type,
      referred_reward_amount: Number(rc.referred_reward_amount),
      min_order_amount: rc.min_order_amount === null ? null : Number(rc.min_order_amount),
      remaining_uses: Number(rc.max_uses) - Number(rc.used_count),
    });
  } catch (err) {
    next(err);
  }
};

const apply = async (req, res, next) => {
  try {
    const result = await reserveReferralForUser({
      userId: req.user.id,
      code: req.body.code,
    });
    return res.status(result.success ? 200 : 400).json(result);
  } catch (err) {
    next(err);
  }
};

const qualify = async (req, res, next) => {
  try {
    const result = await settleReferral({
      userId: req.user.id,
      bookingId: req.body.order_id || req.params.referralId,
      orderAmount: req.body.order_amount,
      autoClaim: req.body.auto_claim !== false,
    });
    return res.status(result.success ? 200 : 400).json(result);
  } catch (err) {
    next(err);
  }
};

const stats = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const [codeRows] = await pool.query(
      `SELECT code, used_count, max_uses, reward_currency, reward_amount,
              referred_reward_type, referred_reward_amount, min_order_amount, created_at, expires_at
       FROM referral_codes
       WHERE user_id = ? AND is_active = 1
       ORDER BY created_at DESC
       LIMIT 1`,
      [userId]
    );

    const [referralRows] = await pool.query(
      `SELECT r.id, r.status, r.created_at, r.qualified_at, r.rewarded_at,
              u.name AS referred_name
       FROM referrals r
       JOIN users u ON u.id = r.referred_user_id
       WHERE r.referrer_user_id = ?
       ORDER BY r.created_at DESC
       LIMIT 50`,
      [userId]
    );
    const [rewardRows] = await pool.query(
      `SELECT id, role, reward_currency, reward_amount, status, order_id,
              created_at, claimed_at, expires_at
       FROM referral_rewards
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT 50`,
      [userId]
    );
    const code = codeRows[0] || null;
    const claimedRewards = rewardRows.filter((r) => r.status === "claimed");
    const availableRewards = rewardRows.filter((r) => r.status === "available");
    return res.json({
      code: code
        ? {
            ...code,
            link: codeLink(code.code),
            remaining: Math.max(Number(code.max_uses) - Number(code.used_count), 0),
          }
        : null,
      referrals: referralRows,
      rewards: rewardRows.map((reward) => ({
        ...reward,
        reward_amount: Number(reward.reward_amount),
      })),
      summary: {
        total_referred: referralRows.length,
        pending: referralRows.filter((r) => r.status === "pending").length,
        qualified: referralRows.filter((r) => r.status === "qualified").length,
        rewarded: referralRows.filter((r) => r.status === "rewarded").length,
        total_earned: claimedRewards.reduce((sum, r) => sum + Number(r.reward_amount), 0),
        pending_rewards: availableRewards.reduce((sum, r) => sum + Number(r.reward_amount), 0),
      },
    });
  } catch (err) {
    next(err);
  }
};

const claim = async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.query(
      `SELECT *
       FROM referral_rewards
       WHERE id = ? AND user_id = ? AND status = 'available'
       FOR UPDATE`,
      [req.params.rewardId, req.user.id]
    );

    if (!rows.length) {
      await conn.rollback();
      return res.status(404).json({ success: false, reason: "REWARD_NOT_AVAILABLE" });
    }

    await creditReward(conn, rows[0]);
    await conn.commit();

    return res.json({
      success: true,
      message: "Reward claimed",
      reward: {
        type: rows[0].reward_currency,
        value: Number(rows[0].reward_amount),
      },
    });
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
};

const qualifyByOrder = async (req, res, next) => {
  try {
    const result = await settleReferral({
      userId: req.user.id,
      bookingId: req.params.orderId || req.body.order_id,
      orderAmount: req.body.order_amount,
      autoClaim: req.body.auto_claim !== false,
    });
    return res.status(result.success ? 200 : 400).json(result);
  } catch (err) {
    next(err);
  }
};

const getSettingsHandler = async (_req, res, next) => {
  try {
    const settings = await getSettings();
    return res.json({
      ...settings,
      is_enabled: Boolean(settings.is_enabled),
      referrer_reward_amount: Number(settings.referrer_reward_amount),
      referred_reward_amount: Number(settings.referred_reward_amount),
      min_order_amount: settings.min_order_amount === null ? null : Number(settings.min_order_amount),
    });
  } catch (err) {
    next(err);
  }
};

const updateSettings = async (req, res, next) => {
  try {
    const payload = req.body || {};
    const boolEnabled = payload.is_enabled === undefined ? true : Boolean(payload.is_enabled);
    const referrerCurrency = payload.referrer_reward_currency === "COIN" ? "COIN" : "CASH";
    const referredCurrency = payload.referred_reward_currency === "COIN" ? "COIN" : "CASH";

    await pool.query(
      `UPDATE referral_settings
       SET is_enabled = ?,
           max_uses = ?,
           code_valid_days = ?,
           qualification_window_days = ?,
           reward_valid_days = ?,
           referrer_reward_currency = ?,
           referrer_reward_amount = ?,
           referred_reward_currency = ?,
           referred_reward_amount = ?,
           min_order_amount = ?,
           updated_by = ?
       WHERE id = 1`,
      [
        boolEnabled ? 1 : 0,
        Math.max(1, Number(payload.max_uses || 50)),
        Math.max(1, Number(payload.code_valid_days || 90)),
        Math.max(1, Number(payload.qualification_window_days || 30)),
        Math.max(1, Number(payload.reward_valid_days || 60)),
        referrerCurrency,
        money(payload.referrer_reward_amount),
        referredCurrency,
        money(payload.referred_reward_amount),
        payload.min_order_amount === "" || payload.min_order_amount === null || payload.min_order_amount === undefined
          ? null
          : money(payload.min_order_amount),
        req.user.id,
      ]
    );

    const settings = await getSettings();
    return res.json({ success: true, settings });
  } catch (err) {
    next(err);
  }
};

const adminList = async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit || 100), 500);
    const offset = Math.max(Number(req.query.offset || 0), 0);
    const search = (req.query.search || "").trim();

    let whereClause = "1=1";
    const params = [];

    if (search) {
      whereClause += " AND (rc.code LIKE ? OR u.name LIKE ? OR u.email LIKE ?)";
      const like = `%${search}%`;
      params.push(like, like, like);
    }

    // ── total count ──
    const [countRows] = await pool.query(
      `SELECT COUNT(DISTINCT rc.id) AS total
       FROM referral_codes rc
       JOIN users u ON u.id = rc.user_id
       WHERE ${whereClause}`,
      params
    );
    const total = Number(countRows[0]?.total || 0);

    // ── paginated data ──
    const [rows] = await pool.query(
      `SELECT rc.code, rc.used_count, rc.max_uses, rc.reward_currency, rc.reward_amount,
              rc.referred_reward_type, rc.referred_reward_amount, rc.min_order_amount,
              rc.is_active, rc.created_at, rc.expires_at,
              u.name AS referrer_name, u.email AS referrer_email,
              COUNT(r.id) AS referral_count,
              SUM(CASE WHEN r.status = 'rewarded' THEN 1 ELSE 0 END) AS rewarded_count
       FROM referral_codes rc
       JOIN users u ON u.id = rc.user_id
       LEFT JOIN referrals r ON r.referral_code_id = rc.id
       WHERE ${whereClause}
       GROUP BY rc.id
       ORDER BY rc.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return res.json({
      referrals: rows.map((row) => ({
        ...row,
        reward_amount: Number(row.reward_amount),
        referred_reward_amount: Number(row.referred_reward_amount),
        min_order_amount: row.min_order_amount === null ? null : Number(row.min_order_amount),
        referral_count: Number(row.referral_count || 0),
        rewarded_count: Number(row.rewarded_count || 0),
      })),
      total,
      limit,
      offset,
    });
  } catch (err) {
    next(err);
  }
};

// ─── Admin: Reward Transactions ────────────────────────────────────
const adminTransactions = async (req, res, next) => {
  try {
    const { search, status, role, currency, page = "1", limit = "50" } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    let where = "WHERE 1=1";
    const params = [];

    if (search) {
      where += " AND (u.name LIKE ? OR u.email LIKE ? OR rr.reference_note LIKE ?)";
      const like = `%${search}%`;
      params.push(like, like, like);
    }
    if (status && ["pending", "available", "claimed", "expired"].includes(status)) {
      where += " AND rr.status = ?";
      params.push(status);
    }
    if (role && ["referrer", "referred"].includes(role)) {
      where += " AND rr.role = ?";
      params.push(role);
    }
    if (currency && ["CASH", "COIN"].includes(currency)) {
      where += " AND rr.reward_currency = ?";
      params.push(currency);
    }

    const [countRows] = await pool.query(
      `SELECT COUNT(*) AS total
       FROM referral_rewards rr
       LEFT JOIN users u ON u.id = rr.user_id
       ${where}`,
      params
    );
    const total = Number(countRows[0]?.total || 0);

    const [rows] = await pool.query(
      `SELECT rr.*,
              u.name AS user_name, u.email AS user_email,
              r.referrer_user_id, r.referred_user_id,
              ur.name AS referrer_name,
              ue.name AS referred_name,
              rc.code AS referral_code
       FROM referral_rewards rr
       LEFT JOIN users u ON u.id = rr.user_id
       LEFT JOIN referrals r ON r.id = rr.referral_id
       LEFT JOIN users ur ON ur.id = r.referrer_user_id
       LEFT JOIN users ue ON ue.id = r.referred_user_id
       LEFT JOIN referral_codes rc ON rc.id = r.referral_code_id
       ${where}
       ORDER BY rr.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, Number(limit), offset]
    );

    // Summary totals
    const [summaryRows] = await pool.query(
      `SELECT
         COUNT(*) AS total_rewards,
         SUM(CASE WHEN rr.status = 'claimed' THEN 1 ELSE 0 END) AS claimed_count,
         SUM(CASE WHEN rr.status = 'available' THEN 1 ELSE 0 END) AS available_count,
         SUM(CASE WHEN rr.status = 'pending' THEN 1 ELSE 0 END) AS pending_count,
         SUM(CASE WHEN rr.status = 'expired' THEN 1 ELSE 0 END) AS expired_count,
         COALESCE(SUM(CASE WHEN rr.status = 'claimed' AND rr.reward_currency = 'CASH' THEN rr.reward_amount ELSE 0 END), 0) AS total_cash_claimed,
         COALESCE(SUM(CASE WHEN rr.status = 'claimed' AND rr.reward_currency = 'COIN' THEN rr.reward_amount ELSE 0 END), 0) AS total_coin_claimed
       FROM referral_rewards rr
       LEFT JOIN users u ON u.id = rr.user_id
       ${where}`,
      params
    );
    const summary = summaryRows[0] || {};

    return res.json({
      data: rows.map((row) => ({
        ...row,
        reward_amount: Number(row.reward_amount),
        summary,
      })),
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
      summary: {
        total_rewards: Number(summary.total_rewards || 0),
        claimed_count: Number(summary.claimed_count || 0),
        available_count: Number(summary.available_count || 0),
        pending_count: Number(summary.pending_count || 0),
        expired_count: Number(summary.expired_count || 0),
        total_cash_claimed: Number(summary.total_cash_claimed || 0),
        total_coin_claimed: Number(summary.total_coin_claimed || 0),
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─── Admin: Referral Report ────────────────────────────────────────
const adminReport = async (_req, res, next) => {
  try {
    // Overall stats
    const [overall] = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM referral_codes) AS total_codes,
        (SELECT COUNT(*) FROM referral_codes WHERE is_active = 1) AS active_codes,
        (SELECT COUNT(*) FROM referrals) AS total_referrals,
        (SELECT COUNT(*) FROM referrals WHERE status = 'pending') AS pending_referrals,
        (SELECT COUNT(*) FROM referrals WHERE status = 'qualified') AS qualified_referrals,
        (SELECT COUNT(*) FROM referrals WHERE status = 'rewarded') AS rewarded_referrals,
        (SELECT COUNT(*) FROM referral_rewards WHERE status = 'claimed') AS claimed_rewards,
        (SELECT COUNT(*) FROM referral_rewards WHERE status = 'available') AS available_rewards,
        (SELECT COUNT(*) FROM referral_rewards WHERE status = 'expired') AS expired_rewards,
        COALESCE((SELECT SUM(reward_amount) FROM referral_rewards WHERE status = 'claimed' AND reward_currency = 'CASH'), 0) AS total_cash_disbursed,
        COALESCE((SELECT SUM(reward_amount) FROM referral_rewards WHERE status = 'claimed' AND reward_currency = 'COIN'), 0) AS total_coin_disbursed,
        COALESCE((SELECT SUM(reward_amount) FROM referral_rewards WHERE status IN ('available', 'pending') AND reward_currency = 'CASH'), 0) AS pending_cash,
        COALESCE((SELECT SUM(reward_amount) FROM referral_rewards WHERE status IN ('available', 'pending') AND reward_currency = 'COIN'), 0) AS pending_coin
    `);
    const stats = overall[0] || {};

    // Top referrers
    const [topReferrers] = await pool.query(`
      SELECT
        u.id, u.name, u.email,
        rc.code,
        COUNT(r.id) AS referral_count,
        SUM(CASE WHEN r.status = 'rewarded' THEN 1 ELSE 0 END) AS rewarded_count,
        COALESCE(SUM(CASE WHEN rr.status = 'claimed' AND rr.role = 'referrer' THEN rr.reward_amount ELSE 0 END), 0) AS total_earned
      FROM referral_codes rc
      JOIN users u ON u.id = rc.user_id
      LEFT JOIN referrals r ON r.referral_code_id = rc.id
      LEFT JOIN referral_rewards rr ON rr.referral_id = r.id AND rr.role = 'referrer'
      GROUP BY rc.id
      ORDER BY rewarded_count DESC, total_earned DESC
      LIMIT 20
    `);

    // Monthly trend (last 12 months)
    const [monthlyTrend] = await pool.query(`
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

    // Conversion funnel
    const [funnel] = await pool.query(`
      SELECT
        COUNT(DISTINCT rc.id) AS codes_created,
        COUNT(DISTINCT r.id) AS referrals_made,
        COUNT(DISTINCT CASE WHEN r.status IN ('qualified', 'rewarded') THEN r.id END) AS qualified,
        COUNT(DISTINCT CASE WHEN r.status = 'rewarded' THEN r.id END) AS rewarded,
        COUNT(DISTINCT CASE WHEN rr.status = 'claimed' THEN rr.id END) AS rewards_claimed
      FROM referral_codes rc
      LEFT JOIN referrals r ON r.referral_code_id = rc.id
      LEFT JOIN referral_rewards rr ON rr.referral_id = r.id
    `);

    // Recent activity (last 50)
    const [recentActivity] = await pool.query(`
      SELECT
        'referral' AS type,
        r.id,
        r.created_at,
        r.status,
        ur.name AS referrer_name,
        ue.name AS referred_name,
        rc.code AS referral_code,
        NULL AS reward_amount,
        NULL AS reward_currency
      FROM referrals r
      JOIN referral_codes rc ON rc.id = r.referral_code_id
      LEFT JOIN users ur ON ur.id = r.referrer_user_id
      LEFT JOIN users ue ON ue.id = r.referred_user_id

      UNION ALL

      SELECT
        'reward' AS type,
        rr.id,
        rr.created_at,
        rr.status,
        u.name AS referrer_name,
        NULL AS referred_name,
        NULL AS referral_code,
        rr.reward_amount,
        rr.reward_currency
      FROM referral_rewards rr
      LEFT JOIN users u ON u.id = rr.user_id

      ORDER BY created_at DESC
      LIMIT 50
    `);

    return res.json({
      stats: {
        total_codes: Number(stats.total_codes || 0),
        active_codes: Number(stats.active_codes || 0),
        total_referrals: Number(stats.total_referrals || 0),
        pending_referrals: Number(stats.pending_referrals || 0),
        qualified_referrals: Number(stats.qualified_referrals || 0),
        rewarded_referrals: Number(stats.rewarded_referrals || 0),
        claimed_rewards: Number(stats.claimed_rewards || 0),
        available_rewards: Number(stats.available_rewards || 0),
        expired_rewards: Number(stats.expired_rewards || 0),
        total_cash_disbursed: Number(stats.total_cash_disbursed || 0),
        total_coin_disbursed: Number(stats.total_coin_disbursed || 0),
        pending_cash: Number(stats.pending_cash || 0),
        pending_coin: Number(stats.pending_coin || 0),
      },
      top_referrers: topReferrers.map((r) => ({
        ...r,
        referral_count: Number(r.referral_count || 0),
        rewarded_count: Number(r.rewarded_count || 0),
        total_earned: Number(r.total_earned || 0),
      })),
      monthly_trend: monthlyTrend.map((m) => ({
        ...m,
        referrals: Number(m.referrals || 0),
        rewarded: Number(m.rewarded || 0),
        amount_disbursed: Number(m.amount_disbursed || 0),
      })),
      funnel: {
        codes_created: Number(funnel[0]?.codes_created || 0),
        referrals_made: Number(funnel[0]?.referrals_made || 0),
        qualified: Number(funnel[0]?.qualified || 0),
        rewarded: Number(funnel[0]?.rewarded || 0),
        rewards_claimed: Number(funnel[0]?.rewards_claimed || 0),
      },
      recent_activity: recentActivity.map((a) => ({
        ...a,
        reward_amount: a.reward_amount === null ? null : Number(a.reward_amount),
      })),
    });
  } catch (err) {
    next(err);
  }
};

export const referralController = {
  generate,
  validate,
  apply,
  qualify,
  stats,
  claim,
  qualifyByOrder,
  getSettings: getSettingsHandler,
  updateSettings,
  adminList,
  reserveReferralForUser,
  settleReferral,
  adminReport,
  adminTransactions,
};

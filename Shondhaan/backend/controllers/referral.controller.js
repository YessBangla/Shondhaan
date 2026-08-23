// src/controllers/referral.controller.ts

import crypto from "crypto";
import { pool } from "../db/pool.js";

function getPool() {
  return pool;
}

function generateCode(length = 8) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  const bytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return code;
}

function isValidCode(code) {
  return /^[A-Z2-9]{6,12}$/.test(code);
}

function toWalletUid(id) {
  return String(id);
}


// ─── Generate Code ─────────────────────────────────────

const generate = async (req, res, next) => {
  let conn;
  try {
    const userId = req.user.id;
    const maxUses = req.body.max_uses || 50;
    conn = await getPool().getConnection();

    const [existing] = await conn.query(
      `SELECT id, code, used_count, max_uses
       FROM referral_codes
       WHERE user_id = ? AND is_active = 1
       AND (expires_at IS NULL OR expires_at > NOW())`,
      [userId]
    );

    if (existing.length > 0) {
      conn.release();
      res.json({
        success: true,
        code: existing[0].code,
        used_count: existing[0].used_count,
        max_uses: existing[0].max_uses,
        link: `${process.env.FRONTEND_URL}/ref/${existing[0].code}`,
      });
      return;
    }

    let code = "";
    for (let attempt = 0; attempt < 10; attempt++) {
      code = generateCode();
      const [dup] = await conn.query(
        "SELECT 1 FROM referral_codes WHERE code = ?",
        [code]
      );
      if (dup.length === 0) break;
    }

    await conn.query(
      `INSERT INTO referral_codes
         (user_id, code, max_uses, reward_currency, reward_amount,
          referred_reward_type, referred_reward_amount, expires_at)
       VALUES (?, ?, ?, 'CASH', 50.00, 'WALLET_CASH', 20.00, DATE_ADD(NOW(), INTERVAL 90 DAY))`,
      [userId, code, maxUses]
    );

    conn.release();
    res.status(201).json({
      success: true,
      code,
      max_uses: maxUses,
      link: `${process.env.FRONTEND_URL}/ref/${code}`,
    });
  } catch (err) {
    if (conn) conn.release();
    next(err);
  }
};

// ─── Validate Code ─────────────────────────────────────

const validate = async (req, res, next) => {
  try {
    const { code } = req.params;

    if (!isValidCode(code)) {
      res.status(400).json({ valid: false, reason: "INVALID_FORMAT" });
      return;
    }

    const [rows] = await getPool().query(
      `SELECT rc.*, u.name AS referrer_name, up.profile_image AS referrer_avatar
       FROM referral_codes rc
       JOIN users u ON u.id = rc.user_id
       LEFT JOIN user_profiles up ON up.user_id = rc.user_id
       WHERE rc.code = ? AND rc.is_active = 1
       AND (rc.expires_at IS NULL OR rc.expires_at > NOW())`,
      [code]
    );

    if (rows.length === 0) {
      res.status(404).json({ valid: false, reason: "NOT_FOUND_OR_EXPIRED" });
      return;
    }

    const rc = rows[0];

    if (rc.used_count >= rc.max_uses) {
      res.status(410).json({ valid: false, reason: "MAX_USES_REACHED" });
      return;
    }

    res.json({
      valid: true,
      referrer_name: rc.referrer_name,
      referrer_avatar: rc.referrer_avatar,
      referred_reward_type: rc.referred_reward_type,
      referred_reward_amount: Number(rc.referred_reward_amount),
      remaining_uses: rc.max_uses - rc.used_count,
    });
  } catch (err) {
    next(err);
  }
};

// ─── Apply Referral ────────────────────────────────────

const apply = async (req, res, next) => {
  let conn;
  try {
    const userId = req.user.id;
    const { code } = req.body;

    if (!code || !isValidCode(code)) {
      res.status(400).json({ success: false, reason: "INVALID_CODE" });
      return;
    }

    conn = await getPool().getConnection();
    await conn.beginTransaction();

    // Already referred?
    const [already] = await conn.query(
      "SELECT 1 FROM referrals WHERE referred_user_id = ?",
      [userId]
    );
    if (already.length > 0) {
      await conn.rollback();
      conn.release();
      res.status(409).json({ success: false, reason: "ALREADY_REFERRED" });
      return;
    }

    // Lock code row
    const [codeRows] = await conn.query(
      `SELECT * FROM referral_codes
       WHERE code = ? AND is_active = 1
       AND (expires_at IS NULL OR expires_at > NOW())
       FOR UPDATE`,
      [code]
    );

    if (codeRows.length === 0) {
      await conn.rollback();
      conn.release();
      res.status(404).json({ success: false, reason: "CODE_NOT_FOUND" });
      return;
    }

    const rc = codeRows[0];

    if (rc.user_id === userId) {
      await conn.rollback();
      conn.release();
      res.status(400).json({ success: false, reason: "SELF_REFERRAL" });
      return;
    }

    if (rc.used_count >= rc.max_uses) {
      await conn.rollback();
      conn.release();
      res.status(410).json({ success: false, reason: "MAX_USES_REACHED" });
      return;
    }

    // Create referral
    const [refResult] = await conn.query(
      `INSERT INTO referrals
         (referral_code_id, referrer_user_id, referred_user_id, expires_at)
       VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 30 DAY))`,
      [rc.id, rc.user_id, userId]
    );

    // Increment used_count
    await conn.query(
      "UPDATE referral_codes SET used_count = used_count + 1 WHERE id = ?",
      [rc.id]
    );

    // Referrer reward
    await conn.query(
      `INSERT INTO referral_rewards
         (referral_id, user_id, role, reward_currency, reward_amount, expires_at)
       VALUES (?, ?, 'referrer', ?, ?, DATE_ADD(NOW(), INTERVAL 60 DAY))`,
      [refResult.insertId, rc.user_id, rc.reward_currency, rc.reward_amount]
    );

    // Referred reward
    await conn.query(
      `INSERT INTO referral_rewards
         (referral_id, user_id, role, reward_currency, reward_amount, expires_at)
       VALUES (?, ?, 'referred', 'CASH', ?, DATE_ADD(NOW(), INTERVAL 60 DAY))`,
      [refResult.insertId, userId, rc.referred_reward_amount]
    );

    await conn.commit();
    conn.release();

    res.json({
      success: true,
      referral_id: refResult.insertId,
      message: "Referral applied successfully",
      your_reward: {
        type: rc.referred_reward_type,
        value: Number(rc.referred_reward_amount),
      },
    });
  } catch (err) {
    if (conn) {
      await conn.rollback();
      conn.release();
    }
    next(err);
  }
};

// ─── Qualify Referral ──────────────────────────────────

const qualify = async (req, res, next) => {
  let conn;
  try {
    const referralId = req.params.referralId;
    const orderId = req.body.order_id;
    const userId = req.user.id;

    conn = await getPool().getConnection();
    await conn.beginTransaction();

    const [rows] = await conn.query(
      `SELECT r.*, rc.reward_currency, rc.reward_amount,
              rc.referred_reward_type, rc.referred_reward_amount
       FROM referrals r
       JOIN referral_codes rc ON rc.id = r.referral_code_id
       WHERE r.id = ?
       FOR UPDATE`,
      [referralId]
    );

    if (rows.length === 0) {
      await conn.rollback();
      conn.release();
      res.status(404).json({ success: false, reason: "REFERRAL_NOT_FOUND" });
      return;
    }

    const ref = rows[0];

    if (ref.referred_user_id !== userId) {
      await conn.rollback();
      conn.release();
      res.status(403).json({ success: false, reason: "NOT_AUTHORIZED" });
      return;
    }

    if (ref.status !== "pending") {
      await conn.rollback();
      conn.release();
      res.status(409).json({ success: false, reason: `ALREADY_${ref.status.toUpperCase()}` });
      return;
    }

    await conn.query(
      "UPDATE referrals SET status = 'qualified', qualified_at = NOW() WHERE id = ?",
      [referralId]
    );

    await conn.query(
      `UPDATE referral_rewards
       SET status = 'available', order_id = ?
       WHERE referral_id = ? AND status = 'pending'`,
      [orderId, referralId]
    );

    await conn.query(
      "UPDATE referrals SET status = 'rewarded', rewarded_at = NOW() WHERE id = ?",
      [referralId]
    );

    await conn.commit();
    conn.release();

    res.json({
      success: true,
      message: "Referral qualified and rewards released!",
      referrer_reward: { type: ref.reward_currency, value: Number(ref.reward_amount) },
      referred_reward: { type: "CASH", value: Number(ref.referred_reward_amount) },
    });
  } catch (err) {
    if (conn) {
      await conn.rollback();
      conn.release();
    }
    next(err);
  }
};

// ─── Stats ─────────────────────────────────────────────

const stats = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const pool = getPool();

    const [codeRows] = await pool.query(
      `SELECT code, used_count, max_uses, created_at, expires_at
       FROM referral_codes WHERE user_id = ? AND is_active = 1`,
      [userId]
    );

    const [referralRows] = await pool.query(
      `SELECT r.status, r.created_at, r.qualified_at, r.rewarded_at,
              u.name AS referred_name, up.profile_image AS referred_avatar
       FROM referrals r
       JOIN users u ON u.id = r.referred_user_id
       LEFT JOIN user_profiles up ON up.user_id = r.referred_user_id
       WHERE r.referrer_user_id = ?
       ORDER BY r.created_at DESC LIMIT 50`,
      [userId]
    );

    const [rewardRows] = await pool.query(
      `SELECT id, role, reward_currency, reward_amount, status,
              created_at, claimed_at, expires_at
       FROM referral_rewards WHERE user_id = ?
       ORDER BY created_at DESC LIMIT 50`,
      [userId]
    );

    const code = codeRows[0] || null;
    const totalEarned = rewardRows
      .filter((r) => r.status === "claimed")
      .reduce((s, r) => s + Number(r.reward_amount), 0);
    const pendingRewards = rewardRows
      .filter((r) => r.status === "available")
      .reduce((s, r) => s + Number(r.reward_amount), 0);

    res.json({
      code: code
        ? { ...code, link: `${process.env.FRONTEND_URL}/ref/${code.code}`, remaining: code.max_uses - code.used_count }
        : null,
      referrals: referralRows,
      rewards: rewardRows,
      summary: {
        total_referred: referralRows.length,
        pending: referralRows.filter((r) => r.status === "pending").length,
        qualified: referralRows.filter((r) => r.status === "qualified").length,
        rewarded: referralRows.filter((r) => r.status === "rewarded").length,
        total_earned: totalEarned,
        pending_rewards: pendingRewards,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─── Claim Reward ──────────────────────────────────────

const claim = async (req, res, next) => {
  let conn;
  try {
    const rewardId = req.params.rewardId;
    const userId = req.user.id;
    const walletUid = toWalletUid(userId);

    conn = await getPool().getConnection();
    await conn.beginTransaction();

    const [rows] = await conn.query(
      `SELECT * FROM referral_rewards
       WHERE id = ? AND user_id = ? AND status = 'available'
       FOR UPDATE`,
      [rewardId, userId]
    );

    if (rows.length === 0) {
      await conn.rollback();
      conn.release();
      res.status(404).json({ success: false, reason: "REWARD_NOT_AVAILABLE" });
      return;
    }

    const reward = rows[0];
    const balanceCol = reward.reward_currency === "COIN" ? "coin_balance" : "cash_balance";
    const txId = crypto.randomUUID();

    // Credit wallet
    await conn.query(
      `UPDATE user_wallets SET ${balanceCol} = ${balanceCol} + ?, updated_at = NOW()
       WHERE user_id = ?`,
      [reward.reward_amount, walletUid]
    );

    // Log transaction
    await conn.query(
      `INSERT INTO wallet_transactions
         (id, user_id, type, currency_type, amount, module, reference_id, status, description)
       VALUES (?, ?, 'CREDIT', ?, ?, 'REFERRAL', ?, 'COMPLETED', ?)`,
      [txId, walletUid, reward.reward_currency, reward.reward_amount, String(reward.id), `Referral reward claimed (${reward.role})`]
    );

    // Mark claimed
    await conn.query(
      "UPDATE referral_rewards SET status = 'claimed', claimed_at = NOW() WHERE id = ?",
      [rewardId]
    );

    await conn.commit();
    conn.release();

    res.json({
      success: true,
      message: "Reward claimed!",
      reward: { type: reward.reward_currency, value: Number(reward.reward_amount) },
    });
  } catch (err) {
    if (conn) {
      await conn.rollback();
      conn.release();
    }
    next(err);
  }
};

// ─── Qualify By Order ──────────────────────────────────

const qualifyByOrder = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const [rows] = await getPool().query(
      `SELECT id FROM referrals
       WHERE referred_user_id = ? AND status = 'pending'
       AND expires_at > NOW()
       ORDER BY created_at ASC LIMIT 1`,
      [userId]
    );

    res.json({ referral_id: rows.length > 0 ? rows[0].id : null });
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
};

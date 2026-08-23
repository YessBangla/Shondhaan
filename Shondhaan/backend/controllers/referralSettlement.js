import crypto from "crypto";
import { pool } from "../db/pool.js";

const money = (value) => Math.round(Number(value || 0) * 100) / 100;
const isValidCode = (code) => /^[A-Z2-9]{6,12}$/.test(String(code || "").trim().toUpperCase());
const normalizeCode = (code) => String(code || "").trim().toUpperCase();

async function getSettings(conn = pool) {
  const [rows] = await conn.query("SELECT * FROM referral_settings WHERE id = 1 LIMIT 1");
  return rows[0] || {
    is_enabled: 1,
    qualification_window_days: 30,
    reward_valid_days: 60,
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

  await conn.query(
    `UPDATE user_wallets SET ${balanceCol} = ${balanceCol} + ?, updated_at = NOW() WHERE user_id = ?`,
    [reward.reward_amount, walletUserId]
  );

  await conn.query(
    `INSERT INTO wallet_transactions
       (id, user_id, type, currency_type, amount, module, reference_id, status, description)
     VALUES (?, ?, 'CREDIT', ?, ?, 'REFERRAL', ?, 'COMPLETED', ?)`,
    [
      crypto.randomUUID(),
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

export async function reserveReferralForBooking({ userId, code, bookingId, orderAmount }) {
  const referredUserId = Number(userId);
  const normalizedCode = normalizeCode(code);
  if (!Number.isInteger(referredUserId) || !isValidCode(normalizedCode)) {
    return { success: false, reason: "INVALID_REFERRAL_INPUT" };
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
      "SELECT id FROM referrals WHERE referred_user_id = ? LIMIT 1",
      [referredUserId]
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
    if (Number(rc.user_id) === referredUserId) {
      await conn.rollback();
      return { success: false, reason: "SELF_REFERRAL" };
    }

    if (Number(rc.used_count) >= Number(rc.max_uses)) {
      await conn.rollback();
      return { success: false, reason: "MAX_USES_REACHED" };
    }

    if (rc.min_order_amount !== null && Number(orderAmount || 0) < Number(rc.min_order_amount)) {
      await conn.rollback();
      return { success: false, reason: "MIN_ORDER_NOT_MET" };
    }

    const [refResult] = await conn.query(
      `INSERT INTO referrals
         (referral_code_id, referrer_user_id, referred_user_id, expires_at)
       VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL ? DAY))`,
      [rc.id, rc.user_id, referredUserId, Number(settings.qualification_window_days || 30)]
    );

    await conn.query("UPDATE referral_codes SET used_count = used_count + 1 WHERE id = ?", [rc.id]);

    await conn.query(
      `INSERT INTO referral_rewards
         (referral_id, user_id, role, reward_currency, reward_amount, order_id, expires_at)
       VALUES (?, ?, 'referrer', ?, ?, ?, DATE_ADD(NOW(), INTERVAL ? DAY))`,
      [refResult.insertId, rc.user_id, rc.reward_currency, money(rc.reward_amount), bookingId, Number(settings.reward_valid_days || 60)]
    );

    await conn.query(
      `INSERT INTO referral_rewards
         (referral_id, user_id, role, reward_currency, reward_amount, order_id, expires_at)
       VALUES (?, ?, 'referred', ?, ?, ?, DATE_ADD(NOW(), INTERVAL ? DAY))`,
      [
        refResult.insertId,
        referredUserId,
        rc.referred_reward_type === "WALLET_COIN" ? "COIN" : "CASH",
        money(rc.referred_reward_amount),
        bookingId,
        Number(settings.reward_valid_days || 60),
      ]
    );

    await conn.commit();
    return { success: true, referral_id: refResult.insertId };
  } catch (error) {
    await conn.rollback();
    if (error?.code === "ER_DUP_ENTRY") return { success: false, reason: "ALREADY_REFERRED" };
    throw error;
  } finally {
    conn.release();
  }
}

export async function settleReferralForPaidBooking({ userId, bookingId, orderAmount }) {
  const referredUserId = Number(userId);
  if (!Number.isInteger(referredUserId) || !bookingId) {
    return { success: false, reason: "INVALID_REFERRAL_INPUT" };
  }

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
      [referredUserId]
    );

    if (!rows.length) {
      await conn.rollback();
      return { success: false, reason: "NO_PENDING_REFERRAL" };
    }

    const referral = rows[0];
    if (referral.min_order_amount !== null && Number(orderAmount || 0) < Number(referral.min_order_amount)) {
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

    const [rewards] = await conn.query(
      "SELECT * FROM referral_rewards WHERE referral_id = ? AND status = 'available' FOR UPDATE",
      [referral.id]
    );

    for (const reward of rewards) {
      await creditReward(conn, reward);
    }

    await conn.query(
      "UPDATE referrals SET status = 'rewarded', rewarded_at = NOW() WHERE id = ?",
      [referral.id]
    );

    await conn.commit();
    return { success: true, referral_id: referral.id, credited: rewards.length };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

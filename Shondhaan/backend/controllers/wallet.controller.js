import mysql from "mysql2/promise";
import { v4 as uuidv4 } from "uuid";

// ==========================================
// DATABASE CONNECTION POOL
// ==========================================

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "shondhaan_db",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// ==========================================
// DEBIT WALLET
// ==========================================

export const debitWallet = async (req, res) => {
  const {
    user_id,
    amount_cash = 0,
    amount_coins = 0,
    module,
    reference_id,
    description = null,
  } = req.body;

  if (!user_id || !reference_id || !module) {
    return res.status(400).json({ success: false, message: "user_id, reference_id and module are required." });
  }

  const cash = Number(amount_cash);
  const coins = Number(amount_coins);

  if (!Number.isFinite(cash) || !Number.isFinite(coins) || cash < 0 || coins < 0) {
    return res.status(400).json({ success: false, message: "Invalid cash or coin amount." });
  }

  if (cash === 0 && coins === 0) {
    return res.status(400).json({ success: false, message: "No amount specified to debit." });
  }

  let connection;

  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    // IDEMPOTENCY CHECK
    const [existingTransactions] = await connection.execute(
      `SELECT id, status FROM wallet_transactions WHERE user_id = ? AND reference_id = ? AND type = 'DEBIT' AND status = 'COMPLETED' LIMIT 1`,
      [user_id, reference_id]
    );

    if (existingTransactions.length > 0) {
      await connection.rollback();
      return res.status(409).json({
        success: false,
        message: "This transaction has already been completed.",
        transaction_id: existingTransactions[0].id,
      });
    }

    // LOCK USER WALLET
    const [walletRows] = await connection.execute(
      `SELECT id, user_id, cash_balance, coin_balance FROM user_wallets WHERE user_id = ? FOR UPDATE`,
      [user_id]
    );

    if (walletRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: "Wallet not found." });
    }

    const wallet = walletRows[0];
    const currentCash = Number(wallet.cash_balance || 0);
    const currentCoins = Number(wallet.coin_balance || 0);

    if (currentCash < cash) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: "Insufficient cash balance." });
    }

    if (currentCoins < coins) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: "Insufficient coin balance." });
    }

    const newCashBalance = currentCash - cash;
    const newCoinBalance = currentCoins - coins;

    await connection.execute(
      `UPDATE user_wallets SET cash_balance = ?, coin_balance = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?`,
      [newCashBalance, newCoinBalance, user_id]
    );  

    const cashTransactionId = cash > 0 ? uuidv4() : null;
    const coinTransactionId = coins > 0 ? uuidv4() : null;

    if (cash > 0) {
      await connection.execute(
        `INSERT INTO wallet_transactions (id, user_id, type, currency_type, amount, module, reference_id, status, description, created_at) VALUES (?, ?, 'DEBIT', 'CASH', ?, ?, ?, 'COMPLETED', ?, CURRENT_TIMESTAMP)`,
        [cashTransactionId, user_id, cash, module, reference_id, description]
      );
    }

    if (coins > 0) {
      await connection.execute(
        `INSERT INTO wallet_transactions (id, user_id, type, currency_type, amount, module, reference_id, status, description, created_at) VALUES (?, ?, 'DEBIT', 'COIN', ?, ?, ?, 'COMPLETED', ?, CURRENT_TIMESTAMP)`,
        [coinTransactionId, user_id, coins, module, reference_id, description]
      );
    }

    await connection.commit();

    return res.status(200).json({
      success: true,
      message: "Wallet debited successfully.",
      transaction_id: cashTransactionId || coinTransactionId,
      transactions: { cash: cashTransactionId, coins: coinTransactionId },
      module,
      reference_id,
      new_balances: { cash: Number(newCashBalance.toFixed(2)), coins: Number(newCoinBalance.toFixed(2)) },
    });
  } catch (error) {
    if (connection) try { await connection.rollback(); } catch (e) { console.error("Rollback error:", e); }
    console.error("Wallet Debit Error:", error);
    return res.status(500).json({ success: false, message: "Internal server error during wallet debit.", error: process.env.NODE_ENV === "development" ? error.message : undefined });
  } finally {
    if (connection) connection.release();
  }
};

// ==========================================
// GET WALLET BALANCE
// ==========================================

export const getBalance = async (req, res) => {
  const { user_id } = req.params;

  if (!user_id) {
    return res.status(400).json({ success: false, message: "user_id is required." });
  }

  let connection;

  try {
    connection = await pool.getConnection();
    const [rows] = await connection.execute(
      `SELECT id, user_id, cash_balance, coin_balance, created_at, updated_at FROM user_wallets WHERE user_id = ? LIMIT 1`,
      [user_id]
    );

    if (rows.length === 0) {
      const walletId = uuidv4();
      await connection.execute(
        `INSERT INTO user_wallets (id, user_id, cash_balance, coin_balance) VALUES (?, ?, 0.00, 0.00)`,
        [walletId, user_id]
      );

      return res.status(200).json({
        success: true,
        wallet: { id: walletId, user_id, cash_balance: 0, coin_balance: 0 },
      });
    }

    const wallet = rows[0];

    return res.status(200).json({
      success: true,
      wallet: {
        id: wallet.id,
        user_id: wallet.user_id,
        cash_balance: Number(wallet.cash_balance || 0),
        coin_balance: Number(wallet.coin_balance || 0),
        created_at: wallet.created_at,
        updated_at: wallet.updated_at,
      },
    });
  } catch (error) {
    console.error("Get Balance Error:", error);
    return res.status(500).json({ success: false, message: "Internal server error." });
  } finally {
    if (connection) connection.release();
  }
};

// ==========================================
// ADMIN: GET PLATFORM STATS
// ==========================================

export const getAdminWalletStats = async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    const [rows] = await connection.execute(`
      SELECT 
        SUM(cash_balance) as total_cash,
        SUM(coin_balance) as total_coins,
        SUM(total_deposited) as total_deposited,
        SUM(total_withdrawn) as total_withdrawn,
        COUNT(id) as total_wallets
      FROM user_wallets
    `);

    const stats = rows[0] || {};
    
    return res.status(200).json({
      success: true,
      stats: {
        total_cash: Number(stats.total_cash || 0).toFixed(2),
        total_coins: Number(stats.total_coins || 0).toFixed(2),
        total_deposited: Number(stats.total_deposited || 0).toFixed(2),
        total_withdrawn: Number(stats.total_withdrawn || 0).toFixed(2),
        total_wallets: Number(stats.total_wallets || 0),
      },
    });
  } catch (error) {
    console.error("Admin Stats Error:", error);
    return res.status(500).json({ success: false, message: "Internal server error." });
  } finally {
    if (connection) connection.release();
  }
};

// ==========================================
// ADMIN: GET ALL WALLETS
// ==========================================

export const getAllWallets = async (req, res) => {
  const { page = 1, limit = 20, search = "" } = req.query;
  const offset = (Number(page) - 1) * Number(limit);
  
  let connection;
  try {
    connection = await pool.getConnection();
    
    let query = `SELECT * FROM user_wallets`;
    let countQuery = `SELECT COUNT(id) as total FROM user_wallets`;
    const params = [];
    
    if (search) {
      query += ` WHERE user_id LIKE ?`;
      countQuery += ` WHERE user_id LIKE ?`;
      params.push(`%${search}%`);
    }
    
    query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    
    const [rows] = await connection.execute(query, [...params, Number(limit), offset]);
    const [countRows] = await connection.execute(countQuery, params);
    
    return res.status(200).json({
      success: true,
      data: rows,
      pagination: {
        total: countRows[0].total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(countRows[0].total / Number(limit)),
      },
    });
  } catch (error) {
    console.error("Admin Get Wallets Error:", error);
    return res.status(500).json({ success: false, message: "Internal server error." });
  } finally {
    if (connection) connection.release();
  }
};

// ==========================================
// ADMIN: GET ALL TRANSACTIONS (LEDGER)
// ==========================================

export const getAllTransactions = async (req, res) => {
  const { page = 1, limit = 20, user_id, type, module, status } = req.query;
  const offset = (Number(page) - 1) * Number(limit);
  
  let connection;
  try {
    connection = await pool.getConnection();
    
    let query = `SELECT * FROM wallet_transactions WHERE 1=1`;
    let countQuery = `SELECT COUNT(id) as total FROM wallet_transactions WHERE 1=1`;
    const params = [];
    
    if (user_id) {
      query += ` AND user_id = ?`;
      countQuery += ` AND user_id = ?`;
      params.push(user_id);
    }
    if (type) {
      query += ` AND type = ?`;
      countQuery += ` AND type = ?`;
      params.push(type);
    }
    if (module) {
      query += ` AND module = ?`;
      countQuery += ` AND module = ?`;
      params.push(module);
    }
    if (status) {
      query += ` AND status = ?`;
      countQuery += ` AND status = ?`;
      params.push(status);
    }
    
    query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    
    const [rows] = await connection.execute(query, [...params, Number(limit), offset]);
    const [countRows] = await connection.execute(countQuery, params);
    
    return res.status(200).json({
      success: true,
      data: rows,
      pagination: {
        total: countRows[0].total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(countRows[0].total / Number(limit)),
      },
    });
  } catch (error) {
    console.error("Admin Get Transactions Error:", error);
    return res.status(500).json({ success: false, message: "Internal server error." });
  } finally {
    if (connection) connection.release();
  }
};

// ==========================================
// ADMIN: MANUAL ADJUSTMENT (CREDIT / DEBIT)
// ==========================================

export const adminAdjustWallet = async (req, res) => {
  const { user_id, type, currency_type, amount, description } = req.body;

  if (!user_id || !type || !currency_type || !amount) {
    return res.status(400).json({ success: false, message: "user_id, type, currency_type, and amount are required." });
  }

  if (!['CREDIT', 'DEBIT'].includes(type)) {
    return res.status(400).json({ success: false, message: "Type must be 'CREDIT' or 'DEBIT'." });
  }

  if (!['CASH', 'COIN'].includes(currency_type)) {
    return res.status(400).json({ success: false, message: "Currency type must be 'CASH' or 'COIN'." });
  }

  const numAmount = Number(amount);
  if (Number.isNaN(numAmount) || numAmount <= 0) {
    return res.status(400).json({ success: false, message: "Amount must be a positive number." });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Lock wallet row
    const [walletRows] = await connection.execute(
      `SELECT id, user_id, cash_balance, coin_balance FROM user_wallets WHERE user_id = ? FOR UPDATE`,
      [user_id]
    );

    if (walletRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: "Wallet not found." });
    }

    const wallet = walletRows[0];
    let newBalance;

    if (currency_type === 'CASH') {
      const currentCash = Number(wallet.cash_balance || 0);
      newBalance = type === 'CREDIT' ? currentCash + numAmount : currentCash - numAmount;
      
      if (newBalance < 0) {
        await connection.rollback();
        return res.status(400).json({ success: false, message: "Insufficient balance for debit." });
      }

      await connection.execute(
        `UPDATE user_wallets SET cash_balance = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?`,
        [newBalance, user_id]
      );
    } else {
      const currentCoins = Number(wallet.coin_balance || 0);
      newBalance = type === 'CREDIT' ? currentCoins + numAmount : currentCoins - numAmount;
      
      if (newBalance < 0) {
        await connection.rollback();
        return res.status(400).json({ success: false, message: "Insufficient coins for debit." });
      }

      await connection.execute(
        `UPDATE user_wallets SET coin_balance = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?`,
        [newBalance, user_id]
      );
    }

    const transactionId = uuidv4();

    // Insert into ledger
    await connection.execute(
      `INSERT INTO wallet_transactions (id, user_id, type, currency_type, amount, module, reference_id, status, description, created_at) 
       VALUES (?, ?, ?, ?, ?, 'ADMIN', ?, 'COMPLETED', ?, CURRENT_TIMESTAMP)`,
      [transactionId, user_id, type, currency_type, numAmount, `admin-${transactionId.substring(0, 8)}`, description || `Admin ${type}`]
    );

    await connection.commit();

    return res.status(200).json({
      success: true,
      message: `Wallet ${type.toLowerCase()} successful.`,
      transaction_id: transactionId,
      new_balance: Number(newBalance.toFixed(2)),
    });
  } catch (error) {
    if (connection) try { await connection.rollback(); } catch (e) { console.error("Rollback error:", e); }
    console.error("Admin Adjust Error:", error);
    return res.status(500).json({ success: false, message: "Internal server error." });
  } finally {
    if (connection) connection.release();
  }
};

// ==========================================
// CREDIT PURCHASE REWARD (COINS) — MART ONLY
// ==========================================

const COIN_REWARD_MODULES = ["MART"]; // only these modules qualify

export const creditPurchaseReward = async (req, res) => {
  const { user_id, purchase_amount, reward_coins, reference_id, module = "PURCHASE", description } = req.body;

  if (!user_id || !reference_id || purchase_amount == null || reward_coins == null) {
    return res.status(400).json({ success: false, message: "user_id, purchase_amount, reward_coins and reference_id are required." });
  }

  const amount = Number(purchase_amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return res.status(400).json({ success: false, message: "Invalid purchase amount." });
  }

  // Only Mart purchases are eligible
  if (!COIN_REWARD_MODULES.includes(module)) {
    return res.status(200).json({ success: true, awarded: false, reason: "module_not_eligible", coins_awarded: 0 });
  }

  const coinsToAward = Number(reward_coins);
  if (!Number.isFinite(coinsToAward) || coinsToAward <= 0) {
    return res.status(400).json({ success: false, message: "Invalid reward coin amount." });
  }
  let connection;

  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Idempotency check — never double-reward the same order
    const [existing] = await connection.execute(
      `SELECT id FROM wallet_transactions WHERE user_id = ? AND reference_id = ? AND type = 'CREDIT' AND currency_type = 'COIN' AND status = 'COMPLETED' LIMIT 1`,
      [user_id, reference_id]
    );
    if (existing.length > 0) {
      await connection.rollback();
      return res.status(409).json({ success: false, message: "Reward already credited for this purchase.", transaction_id: existing[0].id });
    }

    const [walletRows] = await connection.execute(
      `SELECT coin_balance FROM user_wallets WHERE user_id = ? FOR UPDATE`,
      [user_id]
    );

    let currentCoins = 0;
    if (walletRows.length === 0) {
      await connection.execute(
        `INSERT INTO user_wallets (id, user_id, cash_balance, coin_balance) VALUES (?, ?, 0.00, ?)`,
        [uuidv4(), user_id, coinsToAward]
      );
    } else {
      currentCoins = Number(walletRows[0].coin_balance || 0);
      await connection.execute(
        `UPDATE user_wallets SET coin_balance = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?`,
        [currentCoins + coinsToAward, user_id]
      );
    }

    const transactionId = uuidv4();
    await connection.execute(
      `INSERT INTO wallet_transactions (id, user_id, type, currency_type, amount, module, reference_id, status, description, created_at) VALUES (?, ?, 'CREDIT', 'COIN', ?, ?, ?, 'COMPLETED', ?, CURRENT_TIMESTAMP)`,
      [transactionId, user_id, coinsToAward, module, reference_id, description || `Mart reward on purchase of ${amount}`]
    );

    await connection.commit();

    return res.status(200).json({
      success: true,
      awarded: true,
      transaction_id: transactionId,
      coins_awarded: coinsToAward,
      new_coin_balance: Number((currentCoins + coinsToAward).toFixed(2)),
    });
  } catch (error) {
    if (connection) try { await connection.rollback(); } catch (e) { console.error("Rollback error:", e); }
    console.error("Purchase Reward Error:", error);
    return res.status(500).json({ success: false, message: "Internal server error during reward credit." });
  } finally {
    if (connection) connection.release();
  }
};
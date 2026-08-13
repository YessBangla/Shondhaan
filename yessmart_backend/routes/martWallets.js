const express = require("express");
const pool = require("../db");
const router = express.Router();
const asMoney = (value) => Math.round(Number(value) * 100) / 100;

router.get("/", async (_req, res) => {
  try {
    await pool.query(`INSERT INTO mart_wallets (seller_id)
      SELECT s.id FROM sellers s LEFT JOIN mart_wallets w ON w.seller_id = s.id WHERE w.id IS NULL`);
    const [rows] = await pool.query(`
      SELECT w.seller_id, s.shop_name, s.shop_name_bn, s.seller_mobile AS phone,
             w.balance, w.pending_balance, w.total_earned, w.total_withdrawn, w.status, w.last_transaction_at
      FROM mart_wallets w JOIN sellers s ON s.id = w.seller_id
      ORDER BY w.last_transaction_at DESC, s.shop_name ASC`);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error("Load mart wallets error:", error);
    res.status(500).json({ success: false, message: "Could not load mart wallets" });
  }
});

router.post("/:sellerId/adjust", async (req, res) => {
  const sellerId = Number(req.params.sellerId);
  const { type, amount, note } = req.body || {};
  const value = asMoney(amount);
  if (!Number.isInteger(sellerId) || sellerId <= 0 || !["credit", "debit"].includes(type) || !Number.isFinite(value) || value <= 0) {
    return res.status(400).json({ success: false, message: "Seller id, type, and a positive amount are required" });
  }
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [[seller]] = await connection.query("SELECT id FROM sellers WHERE id = ?", [sellerId]);
    if (!seller) { await connection.rollback(); return res.status(404).json({ success: false, message: "Seller not found" }); }
    await connection.query("INSERT IGNORE INTO mart_wallets (seller_id) VALUES (?)", [sellerId]);
    const [[wallet]] = await connection.query("SELECT * FROM mart_wallets WHERE seller_id = ? FOR UPDATE", [sellerId]);
    if (wallet.status === "frozen") { await connection.rollback(); return res.status(403).json({ success: false, message: "This wallet is frozen" }); }
    if (type === "debit" && Number(wallet.balance) < value) { await connection.rollback(); return res.status(400).json({ success: false, message: "Debit amount exceeds available balance" }); }
    const before = asMoney(wallet.balance);
    const after = asMoney(type === "credit" ? before + value : before - value);
    await connection.query("UPDATE mart_wallets SET balance = ?, total_earned = total_earned + ?, last_transaction_at = NOW() WHERE id = ?", [after, type === "credit" ? value : 0, wallet.id]);
    const [result] = await connection.query(`INSERT INTO mart_wallet_transactions
      (wallet_id, seller_id, type, amount, balance_before, balance_after, note, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [wallet.id, sellerId, type, value, before, after, note?.trim() || null, req.user?.id || null]);
    await connection.commit();
    res.status(201).json({ success: true, data: { transaction_id: result.insertId, seller_id: sellerId, balance: after } });
  } catch (error) {
    await connection.rollback();
    console.error("Adjust mart wallet error:", error);
    res.status(500).json({ success: false, message: "Could not adjust mart wallet" });
  } finally { connection.release(); }
});

module.exports = router;

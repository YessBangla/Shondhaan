const pool = require("../db");

async function createMartWalletTables() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS mart_wallets (
        id INT AUTO_INCREMENT PRIMARY KEY,
        seller_id INT NOT NULL UNIQUE,
        balance DECIMAL(12,2) NOT NULL DEFAULT 0,
        pending_balance DECIMAL(12,2) NOT NULL DEFAULT 0,
        total_earned DECIMAL(12,2) NOT NULL DEFAULT 0,
        total_withdrawn DECIMAL(12,2) NOT NULL DEFAULT 0,
        status ENUM('active', 'frozen') NOT NULL DEFAULT 'active',
        last_transaction_at TIMESTAMP NULL DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_mart_wallet_seller FOREIGN KEY (seller_id) REFERENCES sellers(id) ON DELETE CASCADE,
        INDEX idx_mart_wallet_status (status)
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS mart_wallet_transactions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        wallet_id INT NOT NULL,
        seller_id INT NOT NULL,
        type ENUM('credit', 'debit') NOT NULL,
        amount DECIMAL(12,2) NOT NULL,
        balance_before DECIMAL(12,2) NOT NULL,
        balance_after DECIMAL(12,2) NOT NULL,
        note VARCHAR(500) NULL,
        created_by INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_mart_wallet_transaction_wallet FOREIGN KEY (wallet_id) REFERENCES mart_wallets(id) ON DELETE CASCADE,
        CONSTRAINT fk_mart_wallet_transaction_seller FOREIGN KEY (seller_id) REFERENCES sellers(id) ON DELETE CASCADE,
        INDEX idx_mart_wallet_transactions_seller (seller_id, created_at)
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);
    await pool.query(`INSERT INTO mart_wallets (seller_id)
      SELECT s.id FROM sellers s LEFT JOIN mart_wallets w ON w.seller_id = s.id WHERE w.id IS NULL`);
    console.log("Mart wallet tables created");
  } catch (error) {
    console.error("Mart wallet tables error:", error.message);
  }
}

module.exports = createMartWalletTables;

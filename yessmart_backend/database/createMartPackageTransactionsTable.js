const pool = require("../db");

async function createMartPackageTransactionsTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS mart_package_transactions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        package_purchase_id INT NOT NULL,
        seller_id INT NOT NULL,
        gateway VARCHAR(40) NOT NULL DEFAULT 'surjopay',
        merchant_order_id VARCHAR(100) NOT NULL UNIQUE,
        gateway_order_id VARCHAR(120) NULL UNIQUE,
        amount DECIMAL(10,2) NOT NULL,
        currency VARCHAR(10) NOT NULL DEFAULT 'BDT',
        status ENUM('initiated','paid','failed','cancelled','verification_failed') NOT NULL DEFAULT 'initiated',
        checkout_url TEXT NULL,
        gateway_payload JSON NULL,
        verified_at TIMESTAMP NULL DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_mpt_purchase FOREIGN KEY (package_purchase_id) REFERENCES mart_seller_packages(id),
        INDEX idx_mpt_seller_status (seller_id, status),
        INDEX idx_mpt_purchase (package_purchase_id)
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);
    console.log("Mart package transactions table created");
  } catch (error) {
    console.error("Mart package transactions table error:", error.message);
  }
}

module.exports = createMartPackageTransactionsTable;

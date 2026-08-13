const pool = require("../db");

async function createMartSellerPackagesTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS mart_seller_packages (
        id INT AUTO_INCREMENT PRIMARY KEY,

        seller_id INT NOT NULL,
        package_id INT NOT NULL,

        status ENUM('pending','active','expired','rejected') DEFAULT 'pending',
        product_limit INT DEFAULT NULL,
        price_paid DECIMAL(10,2) NOT NULL,

        payment_method VARCHAR(40) DEFAULT NULL,
        transaction_ref VARCHAR(120) DEFAULT NULL,
        admin_note VARCHAR(255) DEFAULT NULL,

        starts_at TIMESTAMP NULL DEFAULT NULL,
        expires_at TIMESTAMP NULL DEFAULT NULL,

        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

        CONSTRAINT fk_msp_package
          FOREIGN KEY (package_id) REFERENCES mart_packages(id),

        INDEX idx_msp_seller_status (seller_id, status)
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);

    console.log("✅ Mart seller packages table created");
  } catch (error) {
    console.error(error);
  }
}

module.exports = createMartSellerPackagesTable;
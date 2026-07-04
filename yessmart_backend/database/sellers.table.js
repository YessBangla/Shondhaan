const pool = require("../db");

async function createSellersTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sellers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NULL UNIQUE,
        slug VARCHAR(255) NULL UNIQUE,
        shop_name VARCHAR(255) NULL,
        shop_type VARCHAR(50) NULL,
        shop_popular TINYINT(1) DEFAULT 0,
        seller_name VARCHAR(255) DEFAULT 'Yess Mart Seller',
        seller_email VARCHAR(255) NULL,
        seller_mobile VARCHAR(20) NULL,
        seller_address VARCHAR(300) NULL,
        seller_total_products INT DEFAULT 0,
        seller_verified TINYINT(1) DEFAULT 0,
        banner_url VARCHAR(500) NULL,
        profile_image_url VARCHAR(500) NULL,
        store_carousel_media JSON NULL,
        bank_name VARCHAR(255) NULL,
        bank_account_name VARCHAR(255) NULL,
        bank_account_number VARCHAR(100) NULL,
        bank_branch VARCHAR(255) NULL,
        routing_number VARCHAR(100) NULL,
        mobile_banking_provider VARCHAR(50) NULL,
        mobile_banking_number VARCHAR(20) NULL,
        kyc_admin_message TEXT NULL,
        nid_front_url VARCHAR(500) NULL,
        nid_back_url VARCHAR(500) NULL,
        trade_license_url VARCHAR(500) NULL,
        tin_certificate_url VARCHAR(500) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    const [columns] = await pool.query("SHOW COLUMNS FROM sellers");
    const existingColumns = new Set(columns.map((column) => column.Field));
    const columnsToAdd = [
      ["user_id", "INT NULL UNIQUE AFTER id"],
      ["slug", "VARCHAR(255) NULL UNIQUE AFTER user_id"],
      ["shop_name", "VARCHAR(255) NULL AFTER user_id"],
      ["shop_type", "VARCHAR(50) NULL AFTER shop_name"],
      ["shop_popular", "TINYINT(1) DEFAULT 0 AFTER shop_type"],  // ← added
      ["seller_email", "VARCHAR(255) NULL AFTER seller_name"],
      ["seller_mobile", "VARCHAR(20) NULL AFTER seller_email"],
      ["seller_address", "VARCHAR(300) NULL AFTER seller_mobile"],
      ["banner_url", "VARCHAR(500) NULL AFTER seller_address"],
      ["profile_image_url", "VARCHAR(500) NULL AFTER banner_url"],
      ["store_carousel_media", "JSON NULL AFTER profile_image_url"],
      ["bank_name", "VARCHAR(255) NULL AFTER profile_image_url"],
      ["bank_account_name", "VARCHAR(255) NULL AFTER bank_name"],
      ["bank_account_number", "VARCHAR(100) NULL AFTER bank_account_name"],
      ["bank_branch", "VARCHAR(255) NULL AFTER bank_account_number"],
      ["routing_number", "VARCHAR(100) NULL AFTER bank_branch"],
      ["mobile_banking_provider", "VARCHAR(50) NULL AFTER routing_number"],
      ["mobile_banking_number", "VARCHAR(20) NULL AFTER mobile_banking_provider"],
      ["kyc_admin_message", "TEXT NULL AFTER mobile_banking_number"],
      ["nid_front_url", "VARCHAR(500) NULL AFTER mobile_banking_number"],
      ["nid_back_url", "VARCHAR(500) NULL AFTER nid_front_url"],
      ["trade_license_url", "VARCHAR(500) NULL AFTER nid_back_url"],
      ["tin_certificate_url", "VARCHAR(500) NULL AFTER trade_license_url"],
      ["seller_total_products", "INT DEFAULT 0"],
      ["seller_verified", "TINYINT(1) DEFAULT 0"],
      ["created_at", "TIMESTAMP DEFAULT CURRENT_TIMESTAMP"],
      ["updated_at", "TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"],
    ];

    for (const [columnName, definition] of columnsToAdd) {
      if (!existingColumns.has(columnName)) {
        await pool.query(`ALTER TABLE sellers ADD COLUMN ${columnName} ${definition}`);
      }
    }

    if (existingColumns.has("seller_verified")) {
      await pool.query("ALTER TABLE sellers MODIFY seller_verified TINYINT(1) DEFAULT 0");
    }

    console.log("Sellers table created");
  } catch (error) {
    console.error("Sellers table error:", error.message);
  }
}

module.exports = createSellersTable;

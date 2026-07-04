const pool = require("../db");

async function createCouponsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS coupons (
      id INT AUTO_INCREMENT PRIMARY KEY,
      seller_id INT NULL,
      code VARCHAR(100) NOT NULL UNIQUE,
      description TEXT NULL,
      discount_type ENUM('percentage','fixed') NOT NULL DEFAULT 'fixed',
      discount_value DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      min_order_amount DECIMAL(10,2) NULL,
      max_discount_amount DECIMAL(10,2) NULL,
      usage_limit INT NULL,
      used_count INT NOT NULL DEFAULT 0,
      starts_at DATETIME NULL,
      expires_at DATETIME NULL,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

      INDEX idx_coupons_code (code),
      INDEX idx_coupons_seller_id (seller_id),
      INDEX idx_coupons_active (is_active),
      INDEX idx_coupons_expires_at (expires_at),

      CONSTRAINT fk_coupons_seller
        FOREIGN KEY (seller_id) REFERENCES sellers(id) ON DELETE SET NULL
    )
  `);

  const [columns] = await pool.query("SHOW COLUMNS FROM coupons");
  const existingColumns = new Set(columns.map((c) => c.Field));

  const columnsToAdd = [
    ["seller_id", "INT NULL"],
    ["code", "VARCHAR(100) NOT NULL UNIQUE"],
    ["description", "TEXT NULL"],
    ["discount_type", "ENUM('percentage','fixed') NOT NULL DEFAULT 'fixed'"],
    ["discount_value", "DECIMAL(10,2) NOT NULL DEFAULT 0.00"],
    ["min_order_amount", "DECIMAL(10,2) NULL"],
    ["max_discount_amount", "DECIMAL(10,2) NULL"],
    ["usage_limit", "INT NULL"],
    ["used_count", "INT NOT NULL DEFAULT 0"],
    ["starts_at", "DATETIME NULL"],
    ["expires_at", "DATETIME NULL"],
    ["is_active", "TINYINT(1) NOT NULL DEFAULT 1"],
  ];

  for (const [columnName, definition] of columnsToAdd) {
    if (!existingColumns.has(columnName)) {
      await pool.query(`ALTER TABLE coupons ADD COLUMN ${columnName} ${definition}`);
      console.log(`Added coupons column: ${columnName}`);
    }
  }

  const [fkRows] = await pool.query(`
    SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'coupons'
      AND CONSTRAINT_NAME = 'fk_coupons_seller'
  `);

  if (fkRows.length === 0) {
    try {
      await pool.query(`
        ALTER TABLE coupons
          ADD CONSTRAINT fk_coupons_seller
          FOREIGN KEY (seller_id) REFERENCES sellers(id) ON DELETE SET NULL
      `);
      console.log("Added FK: fk_coupons_seller");
    } catch (err) {
      console.warn("Could not add FK fk_coupons_seller:", err.message);
    }
  }

  console.log("Coupons table ready");
}

module.exports = createCouponsTable;

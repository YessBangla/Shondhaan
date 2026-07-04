const pool = require("../db");

async function createShippingAddressesTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS shipping_addresses (
        id INT AUTO_INCREMENT PRIMARY KEY,

        user_id INT NOT NULL,

        label ENUM(
          'Home',
          'Office',
          'Other'
        ) DEFAULT 'Home',

        customer_name VARCHAR(255) NOT NULL,
        customer_phone VARCHAR(20) NOT NULL,

        division VARCHAR(100) NULL,
        district VARCHAR(100) NULL,
        thana VARCHAR(100) NULL,

        address TEXT NOT NULL,

        is_default TINYINT(1) DEFAULT 0,

        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    console.log("✅ Shipping Addresses table created");
  } catch (error) {
    console.error("❌ Shipping Addresses table error:", error);
  }
}

module.exports = createShippingAddressesTable;
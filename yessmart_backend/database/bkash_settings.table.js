const pool = require("../db");

async function createBkashSettingsTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS bkash_settings (
        id INT AUTO_INCREMENT PRIMARY KEY,

        bkash_app_key VARCHAR(255) NOT NULL,
        bkash_app_secret VARCHAR(255) NOT NULL,
        bkash_username VARCHAR(255) NOT NULL,
        bkash_password VARCHAR(255) NOT NULL,

        is_sandbox TINYINT(1) DEFAULT 1,
        is_active TINYINT(1) DEFAULT 1,

        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    console.log("✅ bKash settings table created");
  } catch (error) {
    console.error(error);
  }
}

module.exports = createBkashSettingsTable;
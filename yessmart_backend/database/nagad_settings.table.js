const pool = require("../db");

async function createNagadSettingsTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS nagad_settings (
        id INT AUTO_INCREMENT PRIMARY KEY,

        nagad_merchant_id VARCHAR(255) NOT NULL,
        nagad_public_key TEXT NOT NULL,
        nagad_private_key TEXT NOT NULL,

        is_sandbox TINYINT(1) DEFAULT 1,
        is_active TINYINT(1) DEFAULT 1,

        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    console.log("✅ Nagad settings table created");
  } catch (error) {
    console.error(error);
  }
}

module.exports = createNagadSettingsTable;
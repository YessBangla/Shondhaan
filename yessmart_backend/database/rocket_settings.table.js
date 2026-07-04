const pool = require("../db");

async function createRocketSettingsTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS rocket_settings (
        id INT AUTO_INCREMENT PRIMARY KEY,

        rocket_merchant_id VARCHAR(255) NOT NULL,
        rocket_api_key VARCHAR(255) NOT NULL,
        rocket_api_secret VARCHAR(255) NOT NULL,

        is_active TINYINT(1) DEFAULT 1,

        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    console.log("✅ Rocket settings table created");
  } catch (error) {
    console.error(error);
  }
}

module.exports = createRocketSettingsTable;
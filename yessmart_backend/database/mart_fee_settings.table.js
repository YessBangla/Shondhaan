const pool = require("../db");

async function createMartFeeSettingsTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS mart_fee_settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id VARCHAR(255) NULL,
        delivery_area VARCHAR(255) NULL,
        selected_areas TEXT NULL,
        
        area_fee DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        other_area_fee DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    const columns = [
      ["user_id", "VARCHAR(255) NULL"],
      ["delivery_area", "VARCHAR(255) NULL"],
      ["selected_areas", "TEXT NULL"],
      ["area_fee", "DECIMAL(10,2) NOT NULL DEFAULT 0.00"],
      ["other_area_fee", "DECIMAL(10,2) NOT NULL DEFAULT 0.00"],
    ];
    for (const [name, definition] of columns) {
      const [columnRows] = await pool.query(
        `SELECT COUNT(*) AS count FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'mart_fee_settings' AND COLUMN_NAME = ?`,
        [name]
      );
      if (Number(columnRows[0]?.count) === 0) {
        await pool.query(`ALTER TABLE mart_fee_settings ADD COLUMN ${name} ${definition}`);
      }
    }

    const [rows] = await pool.query("SELECT id FROM mart_fee_settings LIMIT 1");
    if (rows.length === 0) await pool.query("INSERT INTO mart_fee_settings (area_fee, other_area_fee) VALUES (0.00, 0.00)");
    console.log("Mart fee settings table ready");
  } catch (error) {
    console.error("Mart fee settings table error:", error.message);
  }
}

module.exports = createMartFeeSettingsTable;
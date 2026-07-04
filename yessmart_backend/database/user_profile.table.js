const pool = require("../db");

async function createUserProfileTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_profile (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL UNIQUE,
        display_name VARCHAR(100) NULL,
        phone VARCHAR(20) NULL,
        address VARCHAR(300) NULL,
        profile_image_url VARCHAR(500) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_user_profile_user_id (user_id)
      )
    `);

    const [columns] = await pool.query("SHOW COLUMNS FROM user_profile");
    const existingColumns = new Set(columns.map((column) => column.Field));
    const columnsToAdd = [
      ["display_name", "VARCHAR(100) NULL AFTER user_id"],
      ["phone", "VARCHAR(20) NULL AFTER display_name"],
      ["address", "VARCHAR(300) NULL AFTER phone"],
      ["profile_image_url", "VARCHAR(500) NULL AFTER address"],
      ["created_at", "TIMESTAMP DEFAULT CURRENT_TIMESTAMP"],
      ["updated_at", "TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"],
    ];

    for (const [columnName, definition] of columnsToAdd) {
      if (!existingColumns.has(columnName)) {
        await pool.query(`ALTER TABLE user_profile ADD COLUMN ${columnName} ${definition}`);
      }
    }

    console.log("User profile table created");
  } catch (error) {
    console.error("User profile table error:", error.message);
  }
}

module.exports = createUserProfileTable;

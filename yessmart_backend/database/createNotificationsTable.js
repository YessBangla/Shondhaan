const pool = require("../db");

async function createNotificationsTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id           INT AUTO_INCREMENT PRIMARY KEY,
        user_id      INT NOT NULL,
        title        VARCHAR(255) NULL,
        message      TEXT NOT NULL,
        type         VARCHAR(50) DEFAULT 'general',
        reference_id INT NULL,
        product_id   INT NULL,
        action_url   VARCHAR(500) NULL,
        is_read      TINYINT(1) DEFAULT 0,
        created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const columns = [
      ["product_id", "INT NULL AFTER reference_id"],
      ["action_url", "VARCHAR(500) NULL AFTER product_id"],
    ];

    for (const [column, definition] of columns) {
      const [rows] = await pool.query("SHOW COLUMNS FROM notifications LIKE ?", [column]);
      if (rows.length === 0) {
        await pool.query(`ALTER TABLE notifications ADD COLUMN ${column} ${definition}`);
      }
    }

    // Add index for fast user lookups
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_notifications_user_id
      ON notifications (user_id)
    `).catch(() => {
      // Index may already exist — safe to ignore
    });

    console.log("✅ notifications table ready");
  } catch (error) {
    console.error("❌ notifications table error:", error.message);
  }
}

module.exports = createNotificationsTable;

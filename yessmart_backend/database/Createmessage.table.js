// migrations/createMessagesTable.js
const pool = require("../db");

async function createMessagesTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS mart_conversations (
        id              INT AUTO_INCREMENT PRIMARY KEY,
        product_id      INT NOT NULL,
        user_id         INT NOT NULL,           -- users.id (the buyer)
        seller_user_id  INT NOT NULL,           -- sellers.user_id (the seller's login)
        seller_id       INT NOT NULL,           -- sellers.id (for inbox queries)
        user_name       VARCHAR(255) NULL,      -- denormalized
        seller_name     VARCHAR(255) NULL,
        product_name    VARCHAR(255) NULL,
        product_image   VARCHAR(500) NULL,
        last_message    TEXT NULL,
        last_message_at TIMESTAMP NULL,
        user_unread     INT NOT NULL DEFAULT 0,
        seller_unread   INT NOT NULL DEFAULT 0,
        created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_conversation (product_id, user_id, seller_id),
        INDEX idx_conv_user        (user_id),
        INDEX idx_conv_seller_user (seller_user_id),
        INDEX idx_conv_seller      (seller_id),
        INDEX idx_conv_product     (product_id)
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS mart_messages (
        id              INT AUTO_INCREMENT PRIMARY KEY,
        conversation_id INT NOT NULL,
        sender_id       INT NOT NULL,           -- users.id of whoever sent it
        sender_role     ENUM('user','seller') NOT NULL,
        message         TEXT NOT NULL,
        is_read         TINYINT(1) DEFAULT 0,
        created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_msg_conversation (conversation_id),
        INDEX idx_msg_sender       (sender_id),
        CONSTRAINT fk_msg_conversation
          FOREIGN KEY (conversation_id)
          REFERENCES mart_conversations(id)
          ON DELETE CASCADE
      )
    `);

    // Auto-migration for existing tables
    const [convCols] = await pool.query("SHOW COLUMNS FROM mart_conversations");
    const existing = new Set(convCols.map((c) => c.Field));
    const toAdd = [
      ["user_id",         "INT NOT NULL DEFAULT 0 AFTER product_id"],
      ["seller_user_id",  "INT NOT NULL DEFAULT 0 AFTER user_id"],
      ["seller_id",       "INT NOT NULL DEFAULT 0 AFTER seller_user_id"],
      ["user_name",       "VARCHAR(255) NULL AFTER seller_id"],
      ["seller_name",     "VARCHAR(255) NULL AFTER user_name"],
      ["product_name",    "VARCHAR(255) NULL AFTER seller_name"],
      ["product_image",   "VARCHAR(500) NULL AFTER product_name"],
      ["last_message",    "TEXT NULL AFTER product_image"],
      ["last_message_at", "TIMESTAMP NULL AFTER last_message"],
      ["user_unread",     "INT NOT NULL DEFAULT 0 AFTER last_message_at"],
      ["seller_unread",   "INT NOT NULL DEFAULT 0 AFTER user_unread"],
    ];
    for (const [col, def] of toAdd) {
      if (!existing.has(col)) {
        await pool.query(`ALTER TABLE mart_conversations ADD COLUMN ${col} ${def}`);
        console.log(`Added mart_conversations.${col}`);
      }
    }

    console.log("✅ mart_conversations + mart_messages ready");
  } catch (error) {
    console.error("Messages table error:", error.message);
    throw error;
  }
}

module.exports = createMessagesTable;
const pool = require("../db");

async function createBannersTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS banners (
        id INT AUTO_INCREMENT PRIMARY KEY,

        title VARCHAR(255) NOT NULL,
        title_en VARCHAR(255) DEFAULT NULL,
        subtitle VARCHAR(500) DEFAULT NULL,
        subtitle_en VARCHAR(500) DEFAULT NULL,

        image_url VARCHAR(500) NOT NULL,
        link_url VARCHAR(500) DEFAULT NULL,
        button_label VARCHAR(100) DEFAULT NULL,
        button_label_en VARCHAR(100) DEFAULT NULL,
        button_bg_color VARCHAR(20) DEFAULT '#ffffff',
        button_text_color VARCHAR(20) DEFAULT '#0f172a',

        is_active TINYINT(1) DEFAULT 1,
        sort_order INT DEFAULT 0,

        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

        INDEX idx_banners_active_sort (is_active, sort_order)
      )
    `);

    console.log("✅ banners table created");
    const columns = [
      ["button_label", "VARCHAR(100) DEFAULT NULL AFTER link_url"],
      ["button_label_en", "VARCHAR(100) DEFAULT NULL AFTER button_label"],
      ["button_bg_color", "VARCHAR(20) DEFAULT '#ffffff' AFTER button_label_en"],
      ["button_text_color", "VARCHAR(20) DEFAULT '#0f172a' AFTER button_bg_color"],
    ];

    for (const [name, definition] of columns) {
      try {
        await pool.query(`ALTER TABLE banners ADD COLUMN ${name} ${definition}`);
      } catch (error) {
        if (error.code !== "ER_DUP_FIELDNAME") throw error;
      }
    }

  } catch (error) {
    console.error(error);
  }
}

module.exports = createBannersTable;

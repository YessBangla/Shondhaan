const pool = require("../db");

async function constraintExists(constraintName) {
  const [rows] = await pool.query(
    `SELECT CONSTRAINT_NAME
     FROM information_schema.KEY_COLUMN_USAGE
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'reviews'
       AND CONSTRAINT_NAME = ?`,
    [constraintName]
  );

  return rows.length > 0;
}

async function tableExists(tableName) {
  const [rows] = await pool.query(
    `SELECT TABLE_NAME
     FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?`,
    [tableName]
  );

  return rows.length > 0;
}

async function createReviewsTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS reviews (
        id INT AUTO_INCREMENT PRIMARY KEY,

        user_id INT NOT NULL,
        product_id INT NOT NULL,

        text_review TEXT NULL,
        star_review TINYINT UNSIGNED NOT NULL,

        seller_reply TEXT NULL,
        seller_reply_by INT NULL,
        seller_reply_at TIMESTAMP NULL,

        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

        INDEX idx_reviews_user_id (user_id),
        INDEX idx_reviews_product_id (product_id),
        INDEX idx_reviews_star_review (star_review),

        CONSTRAINT chk_reviews_star_review
          CHECK (star_review BETWEEN 1 AND 5),

        CONSTRAINT fk_reviews_product
          FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
      )
    `);

    const [columns] = await pool.query("SHOW COLUMNS FROM reviews");
    const existingColumns = new Set(columns.map((column) => column.Field));

    const columnsToAdd = [
      ["user_id", "INT NOT NULL AFTER id"],
      ["product_id", "INT NOT NULL AFTER user_id"],
      ["text_review", "TEXT NULL AFTER product_id"],
      ["star_review", "TINYINT UNSIGNED NOT NULL DEFAULT 5 AFTER text_review"],
      ["seller_reply", "TEXT NULL AFTER star_review"],
      ["seller_reply_by", "INT NULL AFTER seller_reply"],
      ["seller_reply_at", "TIMESTAMP NULL AFTER seller_reply_by"],
      ["created_at", "TIMESTAMP DEFAULT CURRENT_TIMESTAMP"],
      ["updated_at", "TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"],
    ];

    for (const [columnName, definition] of columnsToAdd) {
      if (!existingColumns.has(columnName)) {
        await pool.query(`ALTER TABLE reviews ADD COLUMN ${columnName} ${definition}`);
      }
    }

    if (!(await constraintExists("fk_reviews_product"))) {
      await pool.query(`
        ALTER TABLE reviews
          ADD CONSTRAINT fk_reviews_product
          FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
      `);
    }

    if ((await tableExists("users")) && !(await constraintExists("fk_reviews_user"))) {
      await pool.query(`
        ALTER TABLE reviews
          ADD CONSTRAINT fk_reviews_user
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      `);
    }

    console.log("Reviews table created/updated");
  } catch (error) {
    console.error("Reviews table error:", error.message);
  }
}

module.exports = createReviewsTable;

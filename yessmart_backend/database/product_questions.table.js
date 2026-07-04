const pool = require("../db");

async function constraintExists(constraintName) {
  const [rows] = await pool.query(
    `SELECT CONSTRAINT_NAME
     FROM information_schema.KEY_COLUMN_USAGE
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'product_questions'
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

async function createProductQuestionsTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS product_questions (
        id INT AUTO_INCREMENT PRIMARY KEY,

        product_id INT NOT NULL,
        user_id INT NOT NULL,
        seller_id INT NULL,

        question TEXT NOT NULL,
        answer TEXT NULL,
        answered_by INT NULL,
        answered_at TIMESTAMP NULL,
        is_visible TINYINT(1) NOT NULL DEFAULT 1,

        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

        INDEX idx_product_questions_product_id (product_id),
        INDEX idx_product_questions_user_id (user_id),
        INDEX idx_product_questions_seller_id (seller_id),
        INDEX idx_product_questions_visible (is_visible),

        CONSTRAINT fk_product_questions_product
          FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
      )
    `);

    const [columns] = await pool.query("SHOW COLUMNS FROM product_questions");
    const existingColumns = new Set(columns.map((column) => column.Field));
    const columnsToAdd = [
      ["product_id", "INT NOT NULL AFTER id"],
      ["user_id", "INT NOT NULL AFTER product_id"],
      ["seller_id", "INT NULL AFTER user_id"],
      ["question", "TEXT NOT NULL AFTER seller_id"],
      ["answer", "TEXT NULL AFTER question"],
      ["answered_by", "INT NULL AFTER answer"],
      ["answered_at", "TIMESTAMP NULL AFTER answered_by"],
      ["is_visible", "TINYINT(1) NOT NULL DEFAULT 1 AFTER answered_at"],
      ["created_at", "TIMESTAMP DEFAULT CURRENT_TIMESTAMP"],
      ["updated_at", "TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"],
    ];

    for (const [columnName, definition] of columnsToAdd) {
      if (!existingColumns.has(columnName)) {
        await pool.query(`ALTER TABLE product_questions ADD COLUMN ${columnName} ${definition}`);
      }
    }

    if (!(await constraintExists("fk_product_questions_product"))) {
      await pool.query(`
        ALTER TABLE product_questions
          ADD CONSTRAINT fk_product_questions_product
          FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
      `);
    }

    if (!(await constraintExists("fk_product_questions_seller"))) {
      await pool.query(`
        ALTER TABLE product_questions
          ADD CONSTRAINT fk_product_questions_seller
          FOREIGN KEY (seller_id) REFERENCES sellers(id) ON DELETE SET NULL
      `);
    }

    if ((await tableExists("users")) && !(await constraintExists("fk_product_questions_user"))) {
      await pool.query(`
        ALTER TABLE product_questions
          ADD CONSTRAINT fk_product_questions_user
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      `);
    }

    console.log("Product questions table created/updated");
  } catch (error) {
    console.error("Product questions table error:", error.message);
  }
}

module.exports = createProductQuestionsTable;

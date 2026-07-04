const pool = require("../db");

async function createOrdersCountTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS orders_count (
        id INT AUTO_INCREMENT PRIMARY KEY,
        product_id INT NOT NULL,
        order_count INT DEFAULT 0,

        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

        CONSTRAINT fk_orders_count_product
          FOREIGN KEY (product_id)
          REFERENCES products(id)
          ON DELETE CASCADE
          ON UPDATE CASCADE
      );
    `);

    console.log("✅ orders_count table created successfully");
  } catch (error) {
    console.error("❌ Error creating orders_count table:", error);
  }
}

module.exports = createOrdersCountTable;
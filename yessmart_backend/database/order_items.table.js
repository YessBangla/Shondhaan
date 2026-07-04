const pool = require("../db");

async function createOrderItemsTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS order_items (
        id INT AUTO_INCREMENT PRIMARY KEY,

        order_id INT NOT NULL,

        product_id INT NULL,
        seller_id INT NULL,

        product_name VARCHAR(255) NOT NULL,
        product_image VARCHAR(500) NULL,

        quantity INT DEFAULT 1,

        unit_price DECIMAL(10,2) NOT NULL,
        total_price DECIMAL(10,2) NOT NULL,

        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY (order_id)
        REFERENCES orders(id)
        ON DELETE CASCADE
      )
    `);

    console.log("✅ Order Items table created");
    await pool.query("ALTER TABLE order_items MODIFY COLUMN product_id INT NULL");
  } catch (error) {
    console.error("❌ Order Items table error:", error);
  }
}

module.exports = createOrderItemsTable;

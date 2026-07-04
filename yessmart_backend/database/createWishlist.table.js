const pool = require("../db");

async function createWishlistTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS product_wishlists (
      id INT AUTO_INCREMENT PRIMARY KEY,

      user_id INT NOT NULL,
      product_id INT NOT NULL,

      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

      UNIQUE KEY unique_user_product (user_id, product_id),
      INDEX idx_wishlist_user_id (user_id),
      INDEX idx_wishlist_product_id (product_id),

      CONSTRAINT fk_wishlist_product
        FOREIGN KEY (product_id) REFERENCES products(id)
        ON DELETE CASCADE
    )
  `);

  console.log("Product wishlists table ready");
}

module.exports = createWishlistTable;
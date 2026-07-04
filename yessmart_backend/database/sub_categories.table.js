const pool = require("../db");

async function createSubCategoriesTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS sub_categories (
      id INT AUTO_INCREMENT PRIMARY KEY,
      category_id INT NOT NULL,
      name VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY unique_sub_category (category_id, name),
      FOREIGN KEY (category_id)
        REFERENCES categories(id)
        ON DELETE CASCADE
    )
  `);

  const categoryMap = {
    "Electronic devices": ["Smartphones", "Laptops"],
    "Electronics accessories": ["Mobile accessories", "Headphones & earbuds"],
    "TV and home appliances": ["Television", "Fans"],
    "Home & lifestyle": ["Furniture", "Bedding"],
  };

  for (const [categoryName, subCategories] of Object.entries(categoryMap)) {
    const [rows] = await pool.query("SELECT id FROM categories WHERE name = ?", [
      categoryName,
    ]);

    if (rows.length === 0) continue;

    const categoryId = rows[0].id;

    for (const subCategory of subCategories) {
      await pool.query(
        "INSERT IGNORE INTO sub_categories (category_id, name) VALUES (?, ?)",
        [categoryId, subCategory]
      );
    }
  }
}

module.exports = createSubCategoriesTable;

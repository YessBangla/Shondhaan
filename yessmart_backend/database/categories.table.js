const pool = require("../db");

async function createCategoriesTable() {
  // Create table if it doesn't exist (with all columns)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS categories (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      name_en VARCHAR(255) NULL,
      slug VARCHAR(255) NULL,
      image_url VARCHAR(500) NULL,
      icon_url VARCHAR(500) NULL,
      sort_order INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  // Add missing columns if table already exists (safe to run every time)
  const alterColumns = [
    "ALTER TABLE categories ADD COLUMN IF NOT EXISTS name_en VARCHAR(255) NULL",
    "ALTER TABLE categories ADD COLUMN IF NOT EXISTS slug VARCHAR(255) NULL",
    "ALTER TABLE categories ADD COLUMN IF NOT EXISTS image_url VARCHAR(500) NULL",
    "ALTER TABLE categories ADD COLUMN IF NOT EXISTS icon_url VARCHAR(500) NULL",
    "ALTER TABLE categories ADD COLUMN IF NOT EXISTS sort_order INT DEFAULT 0",
    "ALTER TABLE categories ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP",
  ];

  for (const sql of alterColumns) {
    try {
      await pool.query(sql);
    } catch (e) {
      // Ignore if column already exists on older MySQL versions
    }
  }

  // Seed default categories
  const categories = [
    { name: "Electronic devices",        name_en: "Electronic devices",        slug: "electronic-devices" },
    { name: "Electronics accessories",   name_en: "Electronics accessories",   slug: "electronics-accessories" },
    { name: "TV and home appliances",    name_en: "TV and home appliances",    slug: "tv-home-appliances" },
    { name: "Health and beauty",         name_en: "Health and beauty",         slug: "health-beauty" },
    { name: "Babies & toys",             name_en: "Babies & toys",             slug: "babies-toys" },
    { name: "Groceries & pets",          name_en: "Groceries & pets",          slug: "groceries-pets" },
    { name: "Home & lifestyle",          name_en: "Home & lifestyle",          slug: "home-lifestyle" },
    { name: "Womens fashion",            name_en: "Womens fashion",            slug: "womens-fashion" },
    { name: "Mens fashion",              name_en: "Mens fashion",              slug: "mens-fashion" },
    { name: "Watches, bags & jewellery", name_en: "Watches, bags & jewellery", slug: "watches-bags-jewellery" },
    { name: "Sports & outdoor",          name_en: "Sports & outdoor",          slug: "sports-outdoor" },
    { name: "Automotive & motorbike",    name_en: "Automotive & motorbike",    slug: "automotive-motorbike" },
  ];

  for (const cat of categories) {
    await pool.query(
      "INSERT IGNORE INTO categories (name, name_en, slug) VALUES (?, ?, ?)",
      [cat.name, cat.name_en, cat.slug]
    );
  }
}

module.exports = createCategoriesTable;
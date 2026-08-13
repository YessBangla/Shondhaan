const pool = require("../db");

async function createMartPackagesTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS mart_packages (
        id INT AUTO_INCREMENT PRIMARY KEY,

        name VARCHAR(120) NOT NULL,
        name_bn VARCHAR(120) NOT NULL,

        price DECIMAL(10,2) NOT NULL,
        product_limit INT DEFAULT NULL,
        duration_days INT DEFAULT NULL,

        description VARCHAR(255) DEFAULT NULL,
        description_bn VARCHAR(255) DEFAULT NULL,

        is_active TINYINT(1) DEFAULT 1,
        sort_order INT DEFAULT 0,

        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);

    console.log("✅ Mart packages table created");

    // Seed a few starter packages if the table is empty
    const [[{ count }]] = await pool.query(
      `SELECT COUNT(*) AS count FROM mart_packages`
    );

    if (count === 0) {
      await pool.query(
        `INSERT INTO mart_packages
          (name, name_bn, price, product_limit, duration_days, description, description_bn, sort_order)
         VALUES
          ('Starter',   'স্টার্টার',   299.00,  15,   30, '15 products for 30 days',        '৩০ দিনে ১৫টি পণ্য',        1),
          ('Growth',    'গ্রোথ',        699.00,  50,   30, '50 products for 30 days',        '৩০ দিনে ৫০টি পণ্য',        2),
          ('Unlimited', 'আনলিমিটেড',   1499.00, NULL, 30, 'Unlimited products for 30 days', '৩০ দিনে আনলিমিটেড পণ্য',   3)
        `
      );
      console.log("✅ Mart packages seeded");
    }
  } catch (error) {
    console.error(error);
  }
}

module.exports = createMartPackagesTable;
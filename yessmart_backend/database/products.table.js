const pool = require("../db");

async function createProductsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS products (
      id INT AUTO_INCREMENT PRIMARY KEY,

      seller_id INT NULL,
      category_id INT NULL,
      sub_category_id INT NULL,

      image VARCHAR(500) NULL,
      gallery_urls JSON NULL,
      name_bn VARCHAR(500) NOT NULL,
      name_en VARCHAR(500) NULL,
      slug VARCHAR(255) NULL,
      description TEXT NULL,

      unit_prices JSON NULL,

      status ENUM('active','inactive') NOT NULL DEFAULT 'active',

      unit VARCHAR(50) NULL,

      featured TINYINT(1) NOT NULL DEFAULT 0,

      sold_qty INT NOT NULL DEFAULT 0,

      discount DECIMAL(10,2) NOT NULL DEFAULT 0.00,

      is_freedelivery TINYINT(1) NOT NULL DEFAULT 0,
      wishlist TINYINT(1) NOT NULL DEFAULT 0,

      
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

      INDEX idx_products_seller_id (seller_id),
      INDEX idx_products_status (status),
      INDEX idx_products_featured (featured),
      INDEX idx_products_category_id (category_id),
      INDEX idx_products_sub_category_id (sub_category_id),

      CONSTRAINT fk_products_seller
        FOREIGN KEY (seller_id) REFERENCES sellers(id) ON DELETE SET NULL,

      CONSTRAINT fk_products_category
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,

      CONSTRAINT fk_products_sub_category
        FOREIGN KEY (sub_category_id) REFERENCES sub_categories(id) ON DELETE SET NULL
    )
  `);

  const [columns] = await pool.query("SHOW COLUMNS FROM products");
  const existingColumns = new Set(columns.map((c) => c.Field));

  const columnsToAdd = [
    ["seller_id",       "INT NULL"],
    ["category_id",     "INT NULL"],
    ["sub_category_id", "INT NULL"],
    ["image",           "VARCHAR(500) NULL"],
    ["gallery_urls",    "JSON NULL"],
    ["name_bn",         "VARCHAR(500) NOT NULL DEFAULT ''"],
    ["name_en",         "VARCHAR(500) NULL"],
    ["slug",            "VARCHAR(255) NULL"],
    ["description",     "TEXT NULL"],
    ["unit_prices",     "JSON NULL"],
    ["status",          "ENUM('active','inactive') NOT NULL DEFAULT 'active'"],
    ["unit",            "VARCHAR(50) NULL"],
    ["featured",        "TINYINT(1) NOT NULL DEFAULT 0"],
    ["sold_qty",        "INT NOT NULL DEFAULT 0"],
    ["discount",        "DECIMAL(10,2) NOT NULL DEFAULT 0.00"],
    ["is_freedelivery", "TINYINT(1) NOT NULL DEFAULT 0"],
    ["wishlist",        "TINYINT(1) NOT NULL DEFAULT 0"],
    
  ];

  for (const [columnName, definition] of columnsToAdd) {
    if (!existingColumns.has(columnName)) {
      await pool.query(
        `ALTER TABLE products ADD COLUMN ${columnName} ${definition}`
      );
      console.log(`Added column: ${columnName}`);
    }
  }

  // Migrate legacy product-level pricing and stock into the first variant.
  const [legacyColumns] = await pool.query("SHOW COLUMNS FROM products");
  const legacyColumnNames = new Set(legacyColumns.map((column) => column.Field));
  if (legacyColumnNames.has("sale_price") && legacyColumnNames.has("stock")) {
    const [legacyProducts] = await pool.query(
      "SELECT id, sale_price, original_price, stock, unit, unit_prices FROM products"
    );
    for (const product of legacyProducts) {
      let variants = [];
      try {
        variants = product.unit_prices ? JSON.parse(product.unit_prices) : [];
      } catch {
        variants = [];
      }
      if (Array.isArray(variants) && variants.length > 0) {
        const migratedVariants = variants.map((variant) => ({
          ...variant,
          stock: Number(variant.stock ?? product.stock ?? 0),
        }));
        await pool.query("UPDATE products SET unit_prices = ? WHERE id = ?", [
          JSON.stringify(migratedVariants),
          product.id,
        ]);
      } else {
        await pool.query("UPDATE products SET unit_prices = ? WHERE id = ?", [
          JSON.stringify([{
            unit: product.unit || "piece",
            sale_price: Number(product.sale_price || 0),
            original_price: product.original_price == null ? null : Number(product.original_price),
            stock: Number(product.stock || 0),
          }]),
          product.id,
        ]);
      }
    }
    await pool.query("ALTER TABLE products DROP COLUMN sale_price, DROP COLUMN original_price, DROP COLUMN stock");
    console.log("Migrated legacy product pricing and stock into unit_prices.");
  }

  const [freshColumns] = await pool.query("SHOW COLUMNS FROM products");
  const columnMap = new Map(freshColumns.map((c) => [c.Field, String(c.Type || "").toLowerCase()]));
  const columnsToModify = [
    ["name_bn", "VARCHAR(500) NOT NULL DEFAULT ''", "varchar(500)"],
    ["name_en", "VARCHAR(500) NULL", "varchar(500)"],
  ];

  for (const [columnName, definition, expectedType] of columnsToModify) {
    const currentType = columnMap.get(columnName);
    if (currentType && currentType !== expectedType) {
      await pool.query(`ALTER TABLE products MODIFY COLUMN ${columnName} ${definition}`);
      console.log(`Modified column: ${columnName}`);
    }
  }

  // Add foreign keys for sub_category_id if missing
  const [fkRows] = await pool.query(`
    SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'products'
      AND CONSTRAINT_NAME = 'fk_products_sub_category'
  `);

  if (fkRows.length === 0 && existingColumns.has("sub_category_id")) {
    try {
      await pool.query(`
        ALTER TABLE products
          ADD CONSTRAINT fk_products_sub_category
          FOREIGN KEY (sub_category_id) REFERENCES sub_categories(id) ON DELETE SET NULL
      `);
      console.log("Added FK: fk_products_sub_category");
    } catch (err) {
      console.warn("Could not add FK fk_products_sub_category:", err.message);
    }
  }

  // Add a UNIQUE index on slug once the column exists (allows multiple NULLs
  // in MySQL, so old rows without a slug yet won't violate uniqueness).
  const [slugIndexRows] = await pool.query(`
    SELECT INDEX_NAME FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'products'
      AND INDEX_NAME = 'uniq_products_slug'
  `);

  if (slugIndexRows.length === 0) {
    try {
      await pool.query(`
        ALTER TABLE products ADD UNIQUE INDEX uniq_products_slug (slug)
      `);
      console.log("Added unique index: uniq_products_slug");
    } catch (err) {
      console.warn("Could not add unique index uniq_products_slug:", err.message);
    }
  }

  console.log("Products table ready");
}

module.exports = createProductsTable;
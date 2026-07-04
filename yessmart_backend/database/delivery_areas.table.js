const pool = require("../db");

async function constraintExists(constraintName) {
  const [rows] = await pool.query(
    `SELECT CONSTRAINT_NAME
     FROM information_schema.KEY_COLUMN_USAGE
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'delivery_areas'
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

async function createDeliveryAreasTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS delivery_areas (
        id INT AUTO_INCREMENT PRIMARY KEY,

        user_id INT NOT NULL,
        district VARCHAR(100) NOT NULL,
        thana VARCHAR(150) NOT NULL,
        area VARCHAR(150) NOT NULL,

        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

        UNIQUE KEY uniq_delivery_area_user_district_thana (user_id, district, thana),
        INDEX idx_delivery_areas_user_id (user_id),
        INDEX idx_delivery_areas_district (district),
        INDEX idx_delivery_areas_thana (thana),
        INDEX idx_delivery_areas_area (area)
      )
    `);

    const [columns] = await pool.query("SHOW COLUMNS FROM delivery_areas");
    const existingColumns = new Set(columns.map((column) => column.Field));

    const columnsToAdd = [
      ["user_id", "INT NOT NULL AFTER id"],
      ["district", "VARCHAR(100) NOT NULL AFTER user_id"],
      ["thana", "VARCHAR(150) NULL AFTER district"],
      ["area", "VARCHAR(150) NOT NULL AFTER district"],
      ["created_at", "TIMESTAMP DEFAULT CURRENT_TIMESTAMP"],
      ["updated_at", "TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"],
    ];

    for (const [columnName, definition] of columnsToAdd) {
      if (!existingColumns.has(columnName)) {
        await pool.query(`ALTER TABLE delivery_areas ADD COLUMN ${columnName} ${definition}`);
      }
    }

    await pool.query(`
      UPDATE delivery_areas
      SET thana = area
      WHERE (thana IS NULL OR thana = '') AND area IS NOT NULL
    `);

    if ((await tableExists("users")) && !(await constraintExists("fk_delivery_areas_user"))) {
      await pool.query(`
        ALTER TABLE delivery_areas
          ADD CONSTRAINT fk_delivery_areas_user
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      `);
    }

    console.log("Delivery areas table created/updated");
  } catch (error) {
    console.error("Delivery areas table error:", error.message);
  }
}

module.exports = createDeliveryAreasTable;

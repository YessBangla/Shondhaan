const pool = require("../db");

async function createDeliveryRequestsTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS delivery_requests (
        id                  INT AUTO_INCREMENT PRIMARY KEY,
        order_id            INT NOT NULL,
        order_number        VARCHAR(50) NULL,
        seller_id           INT NOT NULL,
        deliveryman_user_id INT NOT NULL,
        status ENUM('pending','accepted','declined','cancelled','delivered') DEFAULT 'pending',
        customer_name       VARCHAR(255) NULL,
        customer_phone      VARCHAR(20) NULL,
        shipping_address    TEXT NULL,
        shipping_division   VARCHAR(100) NULL,
        shipping_district   VARCHAR(100) NULL,
        shipping_thana      VARCHAR(100) NULL,
        total               DECIMAL(10,2) DEFAULT 0.00,
        notes               TEXT NULL,
        created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Ensure all columns exist for older DBs
    const cols = [
      { name: "order_id",             def: "INT NOT NULL" },
      { name: "order_number",         def: "VARCHAR(50) NULL" },
      { name: "seller_id",            def: "INT NOT NULL" },
      { name: "deliveryman_user_id",  def: "INT NOT NULL" },
      { name: "status", def: "ENUM('pending','accepted','declined','cancelled','delivered') DEFAULT 'pending'" },
      { name: "customer_name",        def: "VARCHAR(255) NULL" },
      { name: "customer_phone",       def: "VARCHAR(20) NULL" },
      { name: "shipping_address",     def: "TEXT NULL" },
      { name: "shipping_division",    def: "VARCHAR(100) NULL" },
      { name: "shipping_district",    def: "VARCHAR(100) NULL" },
      { name: "shipping_thana",       def: "VARCHAR(100) NULL" },
      { name: "total",                def: "DECIMAL(10,2) DEFAULT 0.00" },
      { name: "notes",                def: "TEXT NULL" },
    ];

    for (const c of cols) {
      const [rows] = await pool.query(
        `SELECT COUNT(*) AS cnt
         FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME   = 'delivery_requests'
           AND COLUMN_NAME  = ?`,
        [c.name]
      );
      if (rows?.[0]?.cnt === 0) {
        await pool.query(
          `ALTER TABLE delivery_requests ADD COLUMN ${c.name} ${c.def}`
        );
        console.log(`  ➕ Added column: ${c.name}`);
      }
    }

    await pool.query(`
      ALTER TABLE delivery_requests
      MODIFY COLUMN status
      ENUM('pending','accepted','declined','cancelled','delivered')
      NOT NULL DEFAULT 'pending'
    `);

    console.log("✅ delivery_requests table ready");
  } catch (error) {
    console.error("❌ delivery_requests table error:", error.message);
  }
}

module.exports = createDeliveryRequestsTable;

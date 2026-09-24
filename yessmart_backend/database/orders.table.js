const pool = require("../db");

async function createOrdersTable() {
  try {
    // ── 1. Create orders table ───────────────────────────────────────────────
    await pool.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id                      INT AUTO_INCREMENT PRIMARY KEY,
        user_id                 VARCHAR(255) NOT NULL,
        order_number            VARCHAR(50)  NULL,
        subtotal                DECIMAL(10,2) DEFAULT 0.00,
        shipping_fee            DECIMAL(10,2) DEFAULT 0.00,
        courier_fee             DECIMAL(10,2) DEFAULT 0.00,
        cod_fee                 DECIMAL(10,2) DEFAULT 0.00,
        discount                DECIMAL(10,2) DEFAULT 0.00,
        total                   DECIMAL(10,2) DEFAULT 0.00,
        coupon_code             VARCHAR(100)  NULL,
        payment_method          VARCHAR(50)   DEFAULT 'cod',
        payment_status          ENUM('unpaid','paid','refund_pending','refunded') DEFAULT 'unpaid',
        order_status            ENUM('pending','processing','confirmed','shipped','delivered','cancelled','return_requested') DEFAULT 'pending',
        customer_name           VARCHAR(255)  NULL,
        customer_phone          VARCHAR(20)   NULL,
        shipping_address        TEXT          NULL,
        shipping_division       VARCHAR(100)  NULL,
        shipping_district       VARCHAR(100)  NULL,
        shipping_thana          VARCHAR(100)  NULL,
        notes                   TEXT          NULL,
        cancel_reason           TEXT          NULL,
        return_reason           TEXT          NULL,
        delivered_at            DATETIME      NULL,
        estimated_delivery_date DATE          NULL,
        created_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    console.log("✅ orders table ready");

    // ── 2. Create order_items table ──────────────────────────────────────────
    await pool.query(`
      CREATE TABLE IF NOT EXISTS order_items (
        id            INT AUTO_INCREMENT PRIMARY KEY,
        order_id      INT           NOT NULL,
        product_id    INT           NULL,
        seller_id     INT           NULL,
        product_name  VARCHAR(255)  NOT NULL,
        product_image VARCHAR(500)  NULL,
        quantity      INT           DEFAULT 1,
        unit_price    DECIMAL(10,2) DEFAULT 0.00,
        total_price   DECIMAL(10,2) DEFAULT 0.00,
        created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
      )
    `);

    console.log("✅ order_items table ready");

    // ── 3. Ensure all columns exist (handles older DBs) ──────────────────────
    const orderCols = [
      { name: "user_id",                 def: "VARCHAR(255) NOT NULL" },
      { name: "order_number",            def: "VARCHAR(50) NULL" },
      { name: "subtotal",                def: "DECIMAL(10,2) DEFAULT 0.00" },
      { name: "shipping_fee",            def: "DECIMAL(10,2) DEFAULT 0.00" },
      { name: "courier_fee",             def: "DECIMAL(10,2) DEFAULT 0.00" },
      { name: "cod_fee",                 def: "DECIMAL(10,2) DEFAULT 0.00" },
      { name: "discount",                def: "DECIMAL(10,2) DEFAULT 0.00" },
      { name: "total",                   def: "DECIMAL(10,2) DEFAULT 0.00" },
      { name: "coupon_code",             def: "VARCHAR(100) NULL" },
      { name: "payment_method",          def: "VARCHAR(50) DEFAULT 'cod'" },
      { name: "payment_status",          def: "ENUM('unpaid','paid','refund_pending','refunded') DEFAULT 'unpaid'" },
      { name: "order_status",            def: "ENUM('pending','processing','confirmed','shipped','delivered','cancelled','return_requested') DEFAULT 'pending'" },
      { name: "customer_name",           def: "VARCHAR(255) NULL" },
      { name: "customer_phone",          def: "VARCHAR(20) NULL" },
      { name: "shipping_address",        def: "TEXT NULL" },
      { name: "shipping_division",       def: "VARCHAR(100) NULL" },
      { name: "shipping_district",       def: "VARCHAR(100) NULL" },
      { name: "shipping_thana",          def: "VARCHAR(100) NULL" },
      { name: "notes",                   def: "TEXT NULL" },
      { name: "cancel_reason",           def: "TEXT NULL" },
      { name: "return_reason",           def: "TEXT NULL" },
      { name: "delivered_at",            def: "DATETIME NULL" },
      { name: "estimated_delivery_date", def: "DATE NULL" },
    ];

    for (const col of orderCols) {
      const [rows] = await pool.query(
        `SELECT COUNT(*) AS cnt
         FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME   = 'orders'
           AND COLUMN_NAME  = ?`,
        [col.name]
      );
      if (rows?.[0]?.cnt === 0) {
        await pool.query(
          `ALTER TABLE orders ADD COLUMN ${col.name} ${col.def}`
        );
        console.log(`  ➕ orders: added column '${col.name}'`);
      }
    }

    // ── 4. Ensure ENUM values are up to date ─────────────────────────────────
    // This handles cases where the table existed before new statuses were added
    await pool.query(`
      ALTER TABLE orders
        MODIFY COLUMN payment_status
        ENUM('unpaid','paid','refund_pending','refunded')
        NOT NULL DEFAULT 'unpaid'
    `);

    await pool.query(`
      ALTER TABLE orders
        MODIFY COLUMN order_status
        ENUM('pending','processing','confirmed','shipped','delivered','cancelled','return_requested')
        NOT NULL DEFAULT 'pending'
    `);

    console.log("✅ orders ENUMs up to date");

    // ── 5. Fix any NULL/empty statuses from before constraints ───────────────
    await pool.query(`
      UPDATE orders SET payment_status = 'unpaid'
      WHERE payment_status IS NULL OR payment_status = ''
    `);

    await pool.query(`
      UPDATE orders SET order_status = 'pending'
      WHERE order_status IS NULL OR order_status = ''
    `);

    // ── 6. Fix payment_status for existing non-COD orders that show unpaid ───
    // Non-COD orders that are confirmed/shipped/delivered should be paid
    await pool.query(`
      UPDATE orders
      SET payment_status = 'paid'
      WHERE payment_method != 'cod'
        AND payment_status  = 'unpaid'
        AND order_status IN ('confirmed', 'processing', 'shipped', 'delivered')
    `);

    console.log("✅ orders data integrity fixed");

    // ── 7. Ensure order_items columns exist ──────────────────────────────────
    const itemCols = [
      { name: "order_id",      def: "INT NOT NULL" },
      { name: "product_id",    def: "INT NULL" },
      { name: "seller_id",     def: "INT NULL" },
      { name: "product_name",  def: "VARCHAR(255) NOT NULL" },
      { name: "product_image", def: "VARCHAR(500) NULL" },
      { name: "quantity",      def: "INT DEFAULT 1" },
      { name: "unit_price",    def: "DECIMAL(10,2) DEFAULT 0.00" },
      { name: "total_price",   def: "DECIMAL(10,2) DEFAULT 0.00" },
    ];

    for (const col of itemCols) {
      const [rows] = await pool.query(
        `SELECT COUNT(*) AS cnt
         FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME   = 'order_items'
           AND COLUMN_NAME  = ?`,
        [col.name]
      );
      if (rows?.[0]?.cnt === 0) {
        await pool.query(
          `ALTER TABLE order_items ADD COLUMN ${col.name} ${col.def}`
        );
        console.log(`  ➕ order_items: added column '${col.name}'`);
      }
    }

    console.log("✅ order_items table ready");

  } catch (error) {
    console.error("❌ orders/order_items table error:", error.message);
  }
}

module.exports = createOrdersTable;

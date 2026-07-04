const pool = require("../db");

async function createTransactionTable() {
  try {
    // ── 1. Create transaction table ──────────────────────────────────────────
    await pool.query(`
      CREATE TABLE IF NOT EXISTS \`transaction\` (
        id INT AUTO_INCREMENT PRIMARY KEY,

        order_id     INT          NULL,
        order_number VARCHAR(50)  NULL,
        user_id      VARCHAR(255) NULL,

        gateway        VARCHAR(50)  DEFAULT 'sslcommerz',
        payment_method VARCHAR(50)  DEFAULT 'sslcommerz',
        transaction_id VARCHAR(120) NOT NULL,

        -- SSLCommerz specific
        bank_transaction_id VARCHAR(120)  NULL,
        validation_id       VARCHAR(255)  NULL,
        card_type           VARCHAR(60)   NULL,
        card_no             VARCHAR(30)   NULL,
        store_amount        DECIMAL(12,2) NULL,
        tran_date           VARCHAR(30)   NULL,
        risk_level          TINYINT       NULL,
        risk_title          VARCHAR(30)   NULL,
        verify_sign         VARCHAR(100)  NULL,
        verify_sign_sha2    VARCHAR(100)  NULL,

        -- bKash specific
        bkash_trx_id        VARCHAR(120) NULL,
        bkash_payment_id    VARCHAR(255) NULL,
        bkash_intent        VARCHAR(50)  NULL,

        amount         DECIMAL(12,2) DEFAULT 0.00,
        currency       VARCHAR(10)   DEFAULT 'BDT',
        gateway_status VARCHAR(60)   DEFAULT 'initiated',
        payment_status VARCHAR(60)   DEFAULT 'unpaid',

        gateway_url        TEXT     NULL,
        init_payload       LONGTEXT NULL,
        init_response      LONGTEXT NULL,
        return_payload     LONGTEXT NULL,
        validation_payload LONGTEXT NULL,

        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

        UNIQUE KEY uniq_transaction_id (transaction_id),
        KEY idx_transaction_order_id       (order_id),
        KEY idx_transaction_user_id        (user_id),
        KEY idx_transaction_gateway_status (gateway_status),
        KEY idx_transaction_bkash_trx_id   (bkash_trx_id),

        CONSTRAINT fk_transaction_order
          FOREIGN KEY (order_id) REFERENCES orders(id)
          ON DELETE SET NULL
      )
    `);

    console.log("✅ transaction table ready");

    // ── 2. Ensure all columns exist (handles older DBs) ──────────────────────
    const cols = [
      { name: "order_id",             def: "INT NULL" },
      { name: "order_number",         def: "VARCHAR(50) NULL" },
      { name: "user_id",              def: "VARCHAR(255) NULL" },
      { name: "gateway",              def: "VARCHAR(50) DEFAULT 'sslcommerz'" },
      { name: "payment_method",       def: "VARCHAR(50) DEFAULT 'sslcommerz'" },
      { name: "transaction_id",       def: "VARCHAR(120) NOT NULL" },
      { name: "bank_transaction_id",  def: "VARCHAR(120) NULL" },
      { name: "validation_id",        def: "VARCHAR(255) NULL" },
      { name: "card_type",            def: "VARCHAR(60) NULL" },
      { name: "card_no",              def: "VARCHAR(30) NULL" },
      { name: "store_amount",         def: "DECIMAL(12,2) NULL" },
      { name: "tran_date",            def: "VARCHAR(30) NULL" },
      // { name: "risk_level",           def: "TINYINT NULL" },
      // { name: "risk_title",           def: "VARCHAR(30) NULL" },
      // { name: "verify_sign",          def: "VARCHAR(100) NULL" },
      // { name: "verify_sign_sha2",     def: "VARCHAR(100) NULL" },
      { name: "bkash_trx_id",         def: "VARCHAR(120) NULL" },
      { name: "bkash_payment_id",     def: "VARCHAR(255) NULL" },
      { name: "bkash_intent",         def: "VARCHAR(50) NULL" },
      { name: "amount",               def: "DECIMAL(12,2) DEFAULT 0.00" },
      { name: "currency",             def: "VARCHAR(10) DEFAULT 'BDT'" },
      { name: "gateway_status",       def: "VARCHAR(60) DEFAULT 'initiated'" },
      { name: "payment_status",       def: "VARCHAR(60) DEFAULT 'unpaid'" },
      // { name: "gateway_url",          def: "TEXT NULL" },
      // { name: "init_payload",         def: "LONGTEXT NULL" },
      // { name: "init_response",        def: "LONGTEXT NULL" },
      // { name: "return_payload",       def: "LONGTEXT NULL" },
      // { name: "validation_payload",   def: "LONGTEXT NULL" },
    ];

    for (const col of cols) {
      const [rows] = await pool.query(
        `SELECT COUNT(*) AS cnt
         FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME   = 'transaction'
           AND COLUMN_NAME  = ?`,
        [col.name]
      );
      if (rows?.[0]?.cnt === 0) {
        await pool.query(
          `ALTER TABLE \`transaction\` ADD COLUMN ${col.name} ${col.def}`
        );
        console.log(`  ➕ transaction: added column '${col.name}'`);
      }
    }

    // ── 3. Ensure bKash index exists ─────────────────────────────────────────
    const [indexes] = await pool.query(
      `SELECT INDEX_NAME
       FROM INFORMATION_SCHEMA.STATISTICS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME   = 'transaction'
         AND INDEX_NAME   = 'idx_transaction_bkash_trx_id'`
    );

    if (indexes.length === 0) {
      await pool.query(
        `ALTER TABLE \`transaction\`
         ADD INDEX idx_transaction_bkash_trx_id (bkash_trx_id)`
      );
      console.log("  ➕ transaction: added index 'idx_transaction_bkash_trx_id'");
    }

    console.log("✅ transaction table fully ready");
  } catch (error) {
    console.error("❌ transaction table error:", error.message);
  }
}

module.exports = createTransactionTable;

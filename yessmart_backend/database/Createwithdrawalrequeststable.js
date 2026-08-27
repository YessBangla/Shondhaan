const pool = require("../db");

async function createWithdrawalRequestsTable() {
  try {
    // ── 1. Create withdrawal_requests table ──────────────────────────────────
    await pool.query(`
      CREATE TABLE IF NOT EXISTS withdrawal_requests (
        id              INT AUTO_INCREMENT PRIMARY KEY,
        seller_id       INT NOT NULL,
        amount          DECIMAL(10,2) NOT NULL,
        method          ENUM('bank','mobile_banking') NOT NULL DEFAULT 'bank',
        account_number  VARCHAR(100)  NOT NULL,
        account_name    VARCHAR(255)  NULL,
        notes           TEXT          NULL,
        status          ENUM('pending','approved','rejected','paid') NOT NULL DEFAULT 'pending',
        admin_note      TEXT          NULL,
        reviewed_by     VARCHAR(255)  NULL,
        reviewed_at     TIMESTAMP     NULL,
        created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_withdrawal_seller (seller_id),
        INDEX idx_withdrawal_status (status)
      )
    `);

    console.log("✅ withdrawal_requests table ready");

    // ── 2. Ensure all columns exist (handles older DBs) ──────────────────────
    const cols = [
      { name: "seller_id",      def: "INT NOT NULL" },
      { name: "amount",         def: "DECIMAL(10,2) NOT NULL" },
      { name: "method",         def: "ENUM('bank','mobile_banking') NOT NULL DEFAULT 'bank'" },
      { name: "account_number", def: "VARCHAR(100) NOT NULL" },
      { name: "account_name",   def: "VARCHAR(255) NULL" },
      { name: "notes",          def: "TEXT NULL" },
      { name: "status",         def: "ENUM('pending','approved','rejected','paid') NOT NULL DEFAULT 'pending'" },
      { name: "admin_note",     def: "TEXT NULL" },
      { name: "reviewed_by",    def: "VARCHAR(255) NULL" },
      { name: "reviewed_at",    def: "TIMESTAMP NULL" },
    ];

    for (const col of cols) {
      const [rows] = await pool.query(
        `SELECT COUNT(*) AS cnt
         FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME   = 'withdrawal_requests'
           AND COLUMN_NAME  = ?`,
        [col.name]
      );
      if (rows?.[0]?.cnt === 0) {
        await pool.query(
          `ALTER TABLE withdrawal_requests ADD COLUMN ${col.name} ${col.def}`
        );
        console.log(`  ➕ withdrawal_requests: added column '${col.name}'`);
      }
    }

    // ── 3. Keep ENUM values current ───────────────────────────────────────────
    await pool.query(`
      ALTER TABLE withdrawal_requests
        MODIFY COLUMN method
        ENUM('bank','mobile_banking')
        NOT NULL DEFAULT 'bank'
    `);

    await pool.query(`
      ALTER TABLE withdrawal_requests
        MODIFY COLUMN status
        ENUM('pending','approved','rejected','paid')
        NOT NULL DEFAULT 'pending'
    `);

    console.log("✅ withdrawal_requests ENUMs up to date");
  } catch (error) {
    console.error("❌ withdrawal_requests table error:", error.message);
  }
}

module.exports = createWithdrawalRequestsTable;
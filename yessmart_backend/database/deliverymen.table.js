const pool = require("../db");

const USERS_DB_NAME =
  process.env.USERS_DB_NAME ||
  process.env.MAIN_DB_NAME ||
  process.env.YSERVICE_DB_NAME ||
  "yess-service";

const quoteIdentifier = (value) => `\`${String(value).replace(/`/g, "``")}\``;
const usersTableRef = `${quoteIdentifier(USERS_DB_NAME)}.${quoteIdentifier("users")}`;

async function tableExists(tableName, schemaName = null) {
  const [rows] = await pool.query(
    `SELECT TABLE_NAME
     FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = COALESCE(?, DATABASE())
       AND TABLE_NAME = ?
     LIMIT 1`,
    [schemaName, tableName]
  );
  return rows.length > 0;
}

async function constraintExists(constraintName) {
  const [rows] = await pool.query(
    `SELECT CONSTRAINT_NAME
     FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'deliverymen'
       AND CONSTRAINT_NAME = ?
     LIMIT 1`,
    [constraintName]
  );
  return rows.length > 0;
}

async function createDeliverymenTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS deliverymen (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL UNIQUE,
        full_name VARCHAR(255) NULL,
        phone VARCHAR(30) NULL,
        email VARCHAR(255) NULL,
        date_of_birth DATE NULL,
        present_address TEXT NULL,
        permanent_address TEXT NULL,
        nid_number VARCHAR(50) NULL,
        emergency_contact_name VARCHAR(255) NULL,
        emergency_contact_phone VARCHAR(30) NULL,
        vehicle_type ENUM('bicycle','motorcycle','car','van','walking','other') DEFAULT 'motorcycle',
        vehicle_registration_number VARCHAR(100) NULL,
        driving_license_number VARCHAR(100) NULL,
        service_district VARCHAR(100) NULL,
        service_thana VARCHAR(100) NULL,
        payout_method ENUM('bank','bkash','nagad','rocket','cash','other') DEFAULT 'bkash',
        payout_account_name VARCHAR(255) NULL,
        payout_account_number VARCHAR(100) NULL,
        bank_name VARCHAR(255) NULL,
        bank_branch VARCHAR(255) NULL,
        routing_number VARCHAR(100) NULL,
        nid_front_url VARCHAR(500) NULL,
        nid_back_url VARCHAR(500) NULL,
        selfie_url VARCHAR(500) NULL,
        driving_license_url VARCHAR(500) NULL,
        vehicle_registration_url VARCHAR(500) NULL,
        kyc_status ENUM('draft','submitted','approved','rejected') DEFAULT 'draft',
        verified TINYINT(1) DEFAULT 0,
        kyc_admin_message TEXT NULL,
        submitted_at DATETIME NULL,
        reviewed_at DATETIME NULL,
        reviewed_by INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_deliverymen_user_id (user_id),
        INDEX idx_deliverymen_kyc_status (kyc_status),
        INDEX idx_deliverymen_verified (verified)
      )
    `);

    const [columns] = await pool.query("SHOW COLUMNS FROM deliverymen");
    const existingColumns = new Set(columns.map((column) => column.Field));
    const columnsToAdd = [
      ["full_name", "VARCHAR(255) NULL AFTER user_id"],
      ["phone", "VARCHAR(30) NULL AFTER full_name"],
      ["email", "VARCHAR(255) NULL AFTER phone"],
      ["date_of_birth", "DATE NULL AFTER email"],
      ["present_address", "TEXT NULL AFTER date_of_birth"],
      ["permanent_address", "TEXT NULL AFTER present_address"],
      ["nid_number", "VARCHAR(50) NULL AFTER permanent_address"],
      ["emergency_contact_name", "VARCHAR(255) NULL AFTER nid_number"],
      ["emergency_contact_phone", "VARCHAR(30) NULL AFTER emergency_contact_name"],
      ["vehicle_type", "ENUM('bicycle','motorcycle','car','van','walking','other') DEFAULT 'motorcycle' AFTER emergency_contact_phone"],
      ["vehicle_registration_number", "VARCHAR(100) NULL AFTER vehicle_type"],
      ["driving_license_number", "VARCHAR(100) NULL AFTER vehicle_registration_number"],
      ["service_district", "VARCHAR(100) NULL AFTER driving_license_number"],
      ["service_thana", "VARCHAR(100) NULL AFTER service_district"],
      ["payout_method", "ENUM('bank','bkash','nagad','rocket','cash','other') DEFAULT 'bkash' AFTER service_thana"],
      ["payout_account_name", "VARCHAR(255) NULL AFTER payout_method"],
      ["payout_account_number", "VARCHAR(100) NULL AFTER payout_account_name"],
      ["bank_name", "VARCHAR(255) NULL AFTER payout_account_number"],
      ["bank_branch", "VARCHAR(255) NULL AFTER bank_name"],
      ["routing_number", "VARCHAR(100) NULL AFTER bank_branch"],
      ["nid_front_url", "VARCHAR(500) NULL AFTER routing_number"],
      ["nid_back_url", "VARCHAR(500) NULL AFTER nid_front_url"],
      ["selfie_url", "VARCHAR(500) NULL AFTER nid_back_url"],
      ["driving_license_url", "VARCHAR(500) NULL AFTER selfie_url"],
      ["vehicle_registration_url", "VARCHAR(500) NULL AFTER driving_license_url"],
      ["kyc_status", "ENUM('draft','submitted','approved','rejected') DEFAULT 'draft' AFTER vehicle_registration_url"],
      ["verified", "TINYINT(1) DEFAULT 0 AFTER kyc_status"],
      ["kyc_admin_message", "TEXT NULL AFTER verified"],
      ["submitted_at", "DATETIME NULL AFTER kyc_admin_message"],
      ["reviewed_at", "DATETIME NULL AFTER submitted_at"],
      ["reviewed_by", "INT NULL AFTER reviewed_at"],
      ["created_at", "TIMESTAMP DEFAULT CURRENT_TIMESTAMP"],
      ["updated_at", "TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"],
    ];

    for (const [columnName, definition] of columnsToAdd) {
      if (!existingColumns.has(columnName)) {
        await pool.query(`ALTER TABLE deliverymen ADD COLUMN ${columnName} ${definition}`);
      }
    }

    await pool.query(`
      ALTER TABLE deliverymen
      MODIFY COLUMN kyc_status ENUM('draft','submitted','approved','rejected') DEFAULT 'draft'
    `);

    if ((await tableExists("users", USERS_DB_NAME)) && !(await constraintExists("fk_deliverymen_user"))) {
      try {
        await pool.query(`
          ALTER TABLE deliverymen
            ADD CONSTRAINT fk_deliverymen_user
            FOREIGN KEY (user_id) REFERENCES ${usersTableRef}(id)
            ON DELETE CASCADE
        `);
      } catch (error) {
        console.warn("Deliverymen user FK skipped:", error.message);
      }
    }

    console.log("Deliverymen table created");
  } catch (error) {
    console.error("Deliverymen table error:", error.message);
  }
}

module.exports = createDeliverymenTable;

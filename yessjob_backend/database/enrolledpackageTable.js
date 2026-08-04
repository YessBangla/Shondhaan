// database/createEnrolledPackagesTable.js
//
// IMPORTANT: this table has FOREIGN KEYs on `package_id` referencing
// packages(id) and on `payment_transaction_id` referencing
// payment_transactions(id). Both of those tables MUST exist before this
// function runs, or the CREATE TABLE will fail with "Cannot add foreign
// key constraint" (errno 150). In your server startup file:
//
//   const createPackagesTable = require('./database/createPackagesTable');
//   const createPaymentTransactionsTable = require('./database/createPaymentTransactionsTable');
//   const createEnrolledPackagesTable = require('./database/createEnrolledPackagesTable');
//   const alterJobsTableForEnrolledPackages = require('./database/alterJobsTableForEnrolledPackages');
//
//   await createPackagesTable();
//   await createPaymentTransactionsTable();
//   await createEnrolledPackagesTable();          // needs both tables above
//   await alterJobsTableForEnrolledPackages();     // needs jobs + this table
//
// NOTE ON SCOPE: one row here = one employer's purchase (or grant) of a
// package. Everything that determines what the employer is entitled to
// (price, visibility_level, duration_days, max_applications,
// max_jobs_per_year) is SNAPSHOTTED from the `packages` row at insert
// time, on purpose — if an admin edits a package later, employers who
// already enrolled keep the terms they actually paid for. jobs_used /
// applications_used are the running counters against that snapshot.
// See routes/enrolledPackages.js for the enroll/consume logic that writes
// to this table, and alterJobsTableForEnrolledPackages.js for how a job
// row links back here.

const mysql = require('mysql2');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'yessjob_backend',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
}).promise();

async function createEnrolledPackagesTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS enrolled_packages (
        id INT AUTO_INCREMENT PRIMARY KEY,

        -- employer accounts live in Shondhaan central auth, same as
        -- jobs.user_id elsewhere in this codebase -- not a local FK.
        employer_user_id INT NOT NULL,

        package_id INT NOT NULL,
        payment_transaction_id INT DEFAULT NULL,
        order_id VARCHAR(255) DEFAULT NULL,

        -- snapshot of the package at purchase/grant time
        package_name VARCHAR(255) NOT NULL,
        price DECIMAL(10,2) NOT NULL,
        visibility_level ENUM('basic','standard','premium','premium_plus','hot') NOT NULL,
        duration_days INT NOT NULL DEFAULT 30,
        max_applications INT DEFAULT NULL,
        max_jobs_per_year INT DEFAULT NULL,

        -- usage counters against the snapshot above
        jobs_used INT NOT NULL DEFAULT 0,
        applications_used INT NOT NULL DEFAULT 0,

        starts_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME NOT NULL,
        status ENUM('active','expired','cancelled') NOT NULL DEFAULT 'active',

        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

        INDEX idx_enrolled_packages_employer (employer_user_id, status),
        INDEX idx_enrolled_packages_expiry (status, expires_at),
        INDEX idx_enrolled_packages_package_id (package_id),

        CONSTRAINT fk_enrolled_packages_package_id
          FOREIGN KEY (package_id) REFERENCES packages(id)
          ON DELETE RESTRICT,

        CONSTRAINT fk_enrolled_packages_payment_transaction_id
          FOREIGN KEY (payment_transaction_id) REFERENCES payment_transactions(id)
          ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    console.log("✅ enrolled_packages table created (package_id FK -> packages.id, payment_transaction_id FK -> payment_transactions.id)");

  } catch (error) {
    console.error(error);
  }
}

module.exports = createEnrolledPackagesTable;
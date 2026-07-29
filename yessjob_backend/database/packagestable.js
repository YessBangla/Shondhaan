// database/createPackagesTable.js
//
// This table is standalone (no FKs of its own), but `jobs.package_id`
// will reference it once a job is posted against a chosen package. That
// means this table MUST be created BEFORE addPackageIdToJobsTable() runs,
// otherwise that migration's ALTER TABLE ... ADD FOREIGN KEY will fail
// with "Cannot add foreign key constraint" (errno 150). In your server
// startup file:
//
//   const createJobCategoriesTable = require('./database/createJobCategoriesTable');
//   const createJobsTable = require('./database/createJobsTable');
//   const createPackagesTable = require('./database/createPackagesTable');
//   const addPackageIdToJobsTable = require('./database/addPackageIdToJobsTable');
//   const seedPackages = require('./database/seedPackages');
//
//   await createJobCategoriesTable();
//   await createJobsTable();
//   await createPackagesTable();         // must come before the next line
//   await addPackageIdToJobsTable();     // adds jobs.package_id FK -> packages.id
//   await seedPackages();                // safe to re-run; inserts only if empty
//
// NOTE ON SCOPE: this table only owns pricing/plan definitions shown on
// the "প্যাকেজ/প্ল্যান" tab and the pre-post package-selection modal in
// EmployerPanel.tsx. It does NOT track which employer bought what or
// payment/transaction history — that would live in a separate
// `package_purchases` (or `job_package_orders`) table with FKs into both
// `packages` and `jobs`/`users`, which isn't built yet.

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

async function createPackagesTable() {
  
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS packages (
        id INT AUTO_INCREMENT PRIMARY KEY,

        name VARCHAR(100) NOT NULL,
        price DECIMAL(10,2) NOT NULL DEFAULT 0,
        duration_days INT NOT NULL DEFAULT 30,

        -- Drives icon + card styling in EmployerPanel.tsx (getPackageIcon)
        visibility_level ENUM('basic','standard','premium','premium_plus','hot')
          NOT NULL DEFAULT 'basic',

        max_applications INT DEFAULT NULL,     -- NULL = unlimited
        max_jobs_per_year INT DEFAULT NULL,     -- NULL = no cap

        -- Rendered as a bullet list on the package card. Stored as a
        -- JSON array of strings, e.g. ["৩০ দিন ভিজিবিলিটি", "..."]
        features JSON NOT NULL,

        is_featured TINYINT(1) NOT NULL DEFAULT 0,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        sort_order INT NOT NULL DEFAULT 0,

        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

        INDEX idx_packages_is_active (is_active),
        INDEX idx_packages_visibility_level (visibility_level),
        INDEX idx_packages_sort_order (sort_order)

      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    console.log("✅ packages table created (standalone; jobs.package_id FK added separately)");

  } catch (error) {
    console.error(error);
  }
}

module.exports = createPackagesTable;
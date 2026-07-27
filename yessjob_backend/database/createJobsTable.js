// database/createJobsTable.js
//
// IMPORTANT: this table has a FOREIGN KEY on `category_id` referencing
// job_categories(id). That means createJobCategoriesTable() MUST run
// and finish BEFORE this function runs, or the CREATE TABLE will fail
// with "Cannot add foreign key constraint" (errno 150) because the
// referenced table doesn't exist yet. In your server startup file:
//
//   const { createJobCategoriesTable } = require('./database/createJobCategoriesTable');
//   const createJobsTable = require('./database/createJobsTable');
//   const createJobCandidateRequirementsTable = require('./database/createJobCandidateRequirementsTable');
//   const createJobMatchingCriteriaTable = require('./database/createJobMatchingCriteriaTable');
//   const createJobBillingContactsTable = require('./database/createJobBillingContactsTable');
//
//   await createJobCategoriesTable();            // must come first
//   await createJobsTable();                     // then this
//   await createJobCandidateRequirementsTable();  // then these three,
//   await createJobMatchingCriteriaTable();       // in any order relative
//   await createJobBillingContactsTable();        // to each other
//
// NOTE ON SCOPE: this table now only owns Step 1 ("Job Information") data
// from JobPostForm.tsx — basic info, description, salary, workplace,
// location and contact. Step 2/3/4 data (candidate requirements, matching
// criteria, billing & HR contacts) lives in three separate 1:1 satellite
// tables, each carrying a `job_id` FK back to this table. Previously
// education_required / gender_preference / age_min / age_max /
// experience_min / experience_max lived here — they've moved to
// job_candidate_requirements. Don't re-add them here. education_subject
// also lives in job_candidate_requirements — see createJobCandidateRequirementsTable.js.

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

async function createJobsTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS jobs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,

        title VARCHAR(255) NOT NULL,
        company_name VARCHAR(255) NOT NULL,
        company_logo_url VARCHAR(500) DEFAULT NULL,
        description TEXT NOT NULL,
        requirements TEXT DEFAULT NULL,
        benefits TEXT DEFAULT NULL,
        application_instruction TEXT DEFAULT NULL,

        job_type VARCHAR(50) NOT NULL DEFAULT 'full-time',

        -- category_id is a real FK into job_categories.id (the surrogate
        -- key), not the value slug. Defaults to 1 because job_categories.sql
        -- seeds 'general' as its first row (id 1).
        category_id INT NOT NULL DEFAULT 1,

        company_type VARCHAR(50) NOT NULL DEFAULT 'private',

        salary_min DECIMAL(12,2) DEFAULT NULL,
        salary_max DECIMAL(12,2) DEFAULT NULL,
        salary_negotiable TINYINT(1) NOT NULL DEFAULT 0,
        salary_hidden TINYINT(1) NOT NULL DEFAULT 0,

        work_from_office TINYINT(1) NOT NULL DEFAULT 1,
        work_from_home TINYINT(1) NOT NULL DEFAULT 0,

        division VARCHAR(100) DEFAULT NULL,
        district VARCHAR(100) DEFAULT NULL,
        thana VARCHAR(100) DEFAULT NULL,
        address TEXT DEFAULT NULL,

        vacancy_count INT NOT NULL DEFAULT 1,
        deadline DATE DEFAULT NULL,

        contact_phone VARCHAR(20) DEFAULT NULL,
        contact_email VARCHAR(255) DEFAULT NULL,

        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        is_featured TINYINT(1) NOT NULL DEFAULT 0,
        is_closed TINYINT(1) NOT NULL DEFAULT 0,
        closed_at DATETIME DEFAULT NULL,
        closure_reason VARCHAR(255) DEFAULT NULL,
        hired_count INT NOT NULL DEFAULT 0,
        views_count INT NOT NULL DEFAULT 0,

        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

        INDEX idx_jobs_user_id (user_id),
        INDEX idx_jobs_status (status),
        INDEX idx_jobs_category_id (category_id),
        INDEX idx_jobs_job_type (job_type),
        INDEX idx_jobs_district (district),
        INDEX idx_jobs_deadline (deadline),
        INDEX idx_jobs_featured (is_featured),

        CONSTRAINT fk_jobs_category_id
          FOREIGN KEY (category_id) REFERENCES job_categories(id)
          ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    console.log("✅ jobs table created (Step 1 fields only; category_id FK -> job_categories.id)");

  } catch (error) {
    console.error(error);
  }
}

module.exports = createJobsTable;
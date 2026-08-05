
const mysql = require('mysql2');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME ,
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

      // Add missing columns if they don't exist
    await pool.query(`
      ALTER TABLE jobs
      ADD COLUMN IF NOT EXISTS visibility_level
      ENUM('basic','standard','premium','premium_plus','hot')
      DEFAULT 'basic'
    `);

    await pool.query(`
      ALTER TABLE jobs
      ADD COLUMN IF NOT EXISTS visibility_expires_at
      DATETIME DEFAULT NULL
    `);

    console.log("✅ visibility columns checked");

  } catch (error) {
    console.error(error);
  }
}

module.exports = createJobsTable;
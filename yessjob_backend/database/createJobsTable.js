// database/createJobsTable.js
const mysql = require('mysql2');

// MySQL connection pool (inline — no separate db.js file)
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
        category VARCHAR(100) NOT NULL DEFAULT 'general',
        company_type VARCHAR(50) NOT NULL DEFAULT 'private',

        education_required VARCHAR(100) DEFAULT NULL,
        gender_preference VARCHAR(20) DEFAULT 'any',
        age_min INT DEFAULT NULL,
        age_max INT DEFAULT NULL,
        experience_min INT NOT NULL DEFAULT 0,
        experience_max INT DEFAULT NULL,

        salary_min DECIMAL(12,2) DEFAULT NULL,
        salary_max DECIMAL(12,2) DEFAULT NULL,
        salary_negotiable TINYINT(1) NOT NULL DEFAULT 0,

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
        INDEX idx_jobs_category (category),
        INDEX idx_jobs_job_type (job_type),
        INDEX idx_jobs_district (district),
        INDEX idx_jobs_deadline (deadline),
        INDEX idx_jobs_featured (is_featured)
      )
    `);

    console.log("✅ jobs table created");

  } catch (error) {
    console.error(error);
  }
}

module.exports = createJobsTable;
// database/createJobCandidateRequirementsTable.js
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

async function createJobCandidateRequirementsTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS job_candidate_requirements (
        id INT AUTO_INCREMENT PRIMARY KEY,
        job_id INT NOT NULL,

        education_required VARCHAR(50) DEFAULT NULL,
        education_subject VARCHAR(150) DEFAULT NULL,
        preferred_institution VARCHAR(255) DEFAULT NULL,
        certifications VARCHAR(255) DEFAULT NULL,

        gender_preference VARCHAR(20) DEFAULT 'any',
        gender_restrict TINYINT(1) NOT NULL DEFAULT 0,

        age_min INT DEFAULT NULL,
        age_max INT DEFAULT NULL,
        age_restrict TINYINT(1) NOT NULL DEFAULT 0,

        experience_required TINYINT(1) NOT NULL DEFAULT 0,
        experience_min INT DEFAULT NULL,
        experience_max INT DEFAULT NULL,

        prefer_video_resume TINYINT(1) NOT NULL DEFAULT 0,
        additional_requirements TEXT DEFAULT NULL,

        UNIQUE KEY uq_job_candidate_requirements_job_id (job_id),
        CONSTRAINT fk_jcr_job_id
          FOREIGN KEY (job_id) REFERENCES jobs(id)
          ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    console.log("✅ job_candidate_requirements table created");
  } catch (error) {
    console.error(error);
  }
}

module.exports = createJobCandidateRequirementsTable;
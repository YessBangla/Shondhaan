
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

async function createApplicationsTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS job_applications (
        id INT AUTO_INCREMENT PRIMARY KEY,

        job_id INT NOT NULL,
        jobseeker_id INT NOT NULL,

        -- Snapshot fields, frozen at time of application.
        age_at_application INT DEFAULT NULL,
        expected_salary DECIMAL(12, 2) DEFAULT NULL,

        cover_letter TEXT DEFAULT NULL,

        status ENUM('pending', 'shortlisted', 'rejected', 'hired') NOT NULL DEFAULT 'pending',

        -- Fine-grained hiring pipeline, driven by the employer panel.
        hiring_stage ENUM(
          'applied', 'shortlisted', 'interview_scheduled',
          'interviewed', 'scored', 'hired', 'rejected'
        ) NOT NULL DEFAULT 'applied',
        score TINYINT UNSIGNED DEFAULT NULL,
        interviewer_notes TEXT DEFAULT NULL,
        attendance ENUM('present', 'absent', 'no_show') DEFAULT NULL,

        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

        UNIQUE KEY uq_job_applications_job_jobseeker (job_id, jobseeker_id),
        INDEX idx_job_applications_job_id (job_id),
        INDEX idx_job_applications_jobseeker_id (jobseeker_id),
        INDEX idx_job_applications_status (status),
        INDEX idx_job_applications_hiring_stage (hiring_stage),

        CONSTRAINT fk_job_applications_job_id
          FOREIGN KEY (job_id) REFERENCES jobs(id)
          ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    console.log("✅ job_applications table created (job_id FK -> jobs.id, jobseeker_id no FK)");

  } catch (error) {
    console.error(error);
  }
}

module.exports = createApplicationsTable;


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

async function createInterviewsTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS interviews (
        id INT AUTO_INCREMENT PRIMARY KEY,

        application_id INT NOT NULL,
        job_id INT NOT NULL,
        employer_id INT NOT NULL,
        jobseeker_id INT NOT NULL,

        interview_type ENUM('in-person', 'online', 'phone') NOT NULL DEFAULT 'in-person',
        scheduled_at DATETIME NOT NULL,
        duration_minutes INT NOT NULL DEFAULT 30,
        location VARCHAR(500) DEFAULT NULL,
        meeting_link VARCHAR(500) DEFAULT NULL,
        notes TEXT DEFAULT NULL,

        -- scheduled -> completed / cancelled ; candidate can also decline
        status ENUM('scheduled', 'completed', 'cancelled', 'declined') NOT NULL DEFAULT 'scheduled',

        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

        UNIQUE KEY uq_interviews_application_id (application_id),
        INDEX idx_interviews_job_id (job_id),
        INDEX idx_interviews_employer_id (employer_id, scheduled_at),
        INDEX idx_interviews_jobseeker_id (jobseeker_id, scheduled_at),

        CONSTRAINT fk_interviews_application_id
          FOREIGN KEY (application_id) REFERENCES job_applications(id)
          ON DELETE CASCADE,
        CONSTRAINT fk_interviews_job_id
          FOREIGN KEY (job_id) REFERENCES jobs(id)
          ON DELETE CASCADE
          ALTER TABLE job_applications
  MODIFY COLUMN status ENUM('pending', 'shortlisted', 'rejected', 'hired', 'withdrawn')
  NOT NULL DEFAULT 'pending';6
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    console.log("✅ interviews table created (application_id/job_id FK -> job_applications/jobs, employer_id/jobseeker_id no FK)");

  } catch (error) {
    console.error(error);
  }
}

module.exports = createInterviewsTable;
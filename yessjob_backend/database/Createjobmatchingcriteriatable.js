// database/createJobMatchingCriteriaTable.js
//
// Holds the part of Step 3 ("Matching & Restrictions") that ISN'T just a
// duplicate of Step 2's age/gender fields: industry experience and skills.
// (The age/gender restriction toggles from this step live in
// job_candidate_requirements — see that file's header comment.)
//
// One row per job (job_id is UNIQUE). Must run after createJobsTable().

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

async function createJobMatchingCriteriaTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS job_matching_criteria (
        id INT AUTO_INCREMENT PRIMARY KEY,
        job_id INT NOT NULL,

        industry_experience VARCHAR(255) DEFAULT NULL,
        skills VARCHAR(500) DEFAULT NULL,

        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

        UNIQUE KEY uq_job_matching_criteria_job_id (job_id),

        CONSTRAINT fk_jmc_job_id
          FOREIGN KEY (job_id) REFERENCES jobs(id)
          ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    console.log("✅ job_matching_criteria table created (job_id FK -> jobs.id)");

  } catch (error) {
    console.error(error);
  }
}

module.exports = createJobMatchingCriteriaTable;
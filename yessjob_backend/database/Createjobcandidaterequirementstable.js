// database/createJobCandidateRequirementsTable.js
//
// Holds Step 2 ("Candidate Requirements") from JobPostForm.tsx, PLUS the
// age/gender restriction toggles from Step 3 ("Applicant Restriction").
// Those two sections edit the exact same age_min/age_max/gender_preference
// state in the frontend, just with different on/off switches
// (hideGenderAgeSection vs ageRestrict/genderRestrict) — so they're one
// row here instead of being duplicated across two tables.
//
// One row per job (job_id is UNIQUE), created alongside the job in
// routes/jobs.js and upserted on PATCH. Must run after createJobsTable().

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

        education_required VARCHAR(100) DEFAULT NULL,
        preferred_institution VARCHAR(255) DEFAULT NULL,
        certifications VARCHAR(255) DEFAULT NULL,

        gender_preference VARCHAR(20) NOT NULL DEFAULT 'any',
        gender_restrict TINYINT(1) NOT NULL DEFAULT 0,

        age_min INT DEFAULT NULL,
        age_max INT DEFAULT NULL,
        age_restrict TINYINT(1) NOT NULL DEFAULT 0,

        experience_required TINYINT(1) NOT NULL DEFAULT 0,
        experience_min INT NOT NULL DEFAULT 0,
        experience_max INT DEFAULT NULL,

        prefer_video_resume TINYINT(1) NOT NULL DEFAULT 0,
        additional_requirements TEXT DEFAULT NULL,

        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

        UNIQUE KEY uq_job_candidate_requirements_job_id (job_id),

        CONSTRAINT fk_jcr_job_id
          FOREIGN KEY (job_id) REFERENCES jobs(id)
          ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    console.log("✅ job_candidate_requirements table created (job_id FK -> jobs.id)");

  } catch (error) {
    console.error(error);
  }
}

module.exports = createJobCandidateRequirementsTable;
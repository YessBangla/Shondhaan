// database/createApplicationsTable.js
//
// IMPORTANT: this table has a FOREIGN KEY on `job_id` referencing jobs(id).
// createJobsTable() MUST run and finish BEFORE this function runs, or the
// CREATE TABLE will fail with "Cannot add foreign key constraint" (errno 150)
// because the referenced table doesn't exist yet. In your server startup file:
//
//   await createJobCategoriesTable();
//   await createJobsTable();
//   await createJobCandidateRequirementsTable();
//   await createJobMatchingCriteriaTable();
//   await createJobBillingContactsTable();
//   await createJobseekerProfilesTable();
//   await createApplicationsTable();          // must come after jobs
//
// NOTE ON jobseeker_id: no FK here, same reasoning as jobs.user_id and
// jobseeker_profiles.user_id — the users table lives on the separate
// Shondhaan server, so a cross-server FK isn't possible in MySQL.
// Integrity is enforced at the application layer: jobseeker_id is only
// ever written from req.shondhaanUser.id after verifyShondhaanUser() has
// validated the caller's token (see routes/applications.js).
//
// NOTE ON age_at_application: this is a SNAPSHOT, not a live value. It's
// computed server-side from jobseeker_profiles.date_of_birth at the moment
// the application is created (see routes/applications.js), and then frozen.
// We deliberately don't recompute it on read — an employer reviewing
// applications six months from now should see how old the candidate was
// when they applied, not their current age.
//
// NOTE ON status vs hiring_stage: `status` is the original coarse field
// (pending/shortlisted/rejected/hired), kept as-is so nothing that still
// reads it breaks. `hiring_stage` is the finer-grained pipeline field the
// employer panel actually drives (applied -> shortlisted ->
// interview_scheduled -> interviewed -> scored -> hired/rejected), updated
// via PATCH /api/jobseeker/applications/:id/stage in routes/applications.js.
// If you already have this table deployed without these columns, run
// database/migrate-add-hiring-stage.js instead of dropping/recreating it.

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
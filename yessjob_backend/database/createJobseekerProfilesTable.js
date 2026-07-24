// database/createJobseekerProfilesTable.js
//
// Jobseeker profile — one row per user. user_id has NO foreign key
// because the users table lives in a separate Shondhaan MySQL server —
// cross-server FKs aren't possible in MySQL. Same pattern as jobs.user_id
// in yessjob_backend/routes/jobs.js.
//
// Integrity is enforced at the application layer instead: every route
// that writes user_id gets it from req.shondhaanUser.id, which only
// exists after verifyShondhaanUser() has successfully validated the
// caller's token against Shondhaan's /api/users/me/profile endpoint
// (see routes/jobSeekerProfile.js). So by the time a row is written,
// Shondhaan has already confirmed that user_id is real.

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

async function createJobseekerProfilesTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS jobseeker_profiles (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,

        full_name VARCHAR(255) NOT NULL,
        phone VARCHAR(50) DEFAULT NULL,
        email VARCHAR(255) DEFAULT NULL,
        address TEXT DEFAULT NULL,
        date_of_birth DATE DEFAULT NULL,
        gender ENUM('male', 'female', 'other', 'any') DEFAULT 'any',
        marital_status ENUM('single', 'married') DEFAULT 'single',

        about_me TEXT DEFAULT NULL,
        career_objective TEXT DEFAULT NULL,
        present_salary DECIMAL(12, 2) DEFAULT NULL,
        expected_salary DECIMAL(12, 2) DEFAULT NULL,

        skills JSON DEFAULT NULL,
        education JSON DEFAULT NULL,
        experience JSON DEFAULT NULL,
        training JSON DEFAULT NULL,
        languages JSON DEFAULT NULL,
        reference_persons JSON DEFAULT NULL,
        preferred_job_categories JSON DEFAULT NULL,
        preferred_districts JSON DEFAULT NULL,

        photo_url VARCHAR(500) DEFAULT NULL,
        video_cv_url VARCHAR(500) DEFAULT NULL,

        is_available TINYINT(1) DEFAULT 1,
        profile_completeness INT DEFAULT 0,

        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

        UNIQUE KEY uq_jobseeker_profiles_user_id (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    console.log("✅ jobseeker_profiles table created (user_id UNIQUE, no cross-server FK)");

  } catch (error) {
    console.error(error);
  }
}

module.exports = createJobseekerProfilesTable;
const pool = require("../database/db");

async function createEmployerProfilesTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS employer_profiles (
        id INT AUTO_INCREMENT PRIMARY KEY,

        user_id INT NOT NULL UNIQUE,

        company_name VARCHAR(255) NOT NULL,
        company_type VARCHAR(50) NOT NULL DEFAULT 'private',
        employee_count VARCHAR(20) NOT NULL DEFAULT '1-25',

        is_verified TINYINT(1) NOT NULL DEFAULT 0,
        is_active TINYINT(1) NOT NULL DEFAULT 1,

        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

        INDEX idx_employer_verified (is_verified)
      )
    `);

    console.log("✅ employer_profiles table created");

    const columns = [
      ["company_name_bn", "VARCHAR(255) DEFAULT NULL AFTER company_name"],
      ["company_logo_url", "VARCHAR(500) DEFAULT NULL AFTER company_name_bn"],
      ["industry_type", "VARCHAR(255) DEFAULT NULL AFTER company_type"],
      ["establishment_year", "INT DEFAULT NULL AFTER industry_type"],
      ["website_url", "VARCHAR(500) DEFAULT NULL AFTER employee_count"],
      ["description", "TEXT DEFAULT NULL AFTER website_url"],
      ["division", "VARCHAR(100) DEFAULT NULL AFTER description"],
      ["district", "VARCHAR(100) DEFAULT NULL AFTER division"],
      ["thana", "VARCHAR(100) DEFAULT NULL AFTER district"],
      ["address", "TEXT DEFAULT NULL AFTER thana"],
      ["contact_person", "VARCHAR(255) DEFAULT NULL AFTER address"],
      ["contact_phone", "VARCHAR(20) DEFAULT NULL AFTER contact_person"],
      ["contact_email", "VARCHAR(255) DEFAULT NULL AFTER contact_phone"],
      ["trade_license_url", "VARCHAR(500) DEFAULT NULL AFTER contact_email"],
      ["total_jobs_posted", "INT NOT NULL DEFAULT 0 AFTER is_active"],
      ["total_hires", "INT NOT NULL DEFAULT 0 AFTER total_jobs_posted"],
    ];

    for (const [name, definition] of columns) {
      try {
        await pool.query(`ALTER TABLE employer_profiles ADD COLUMN ${name} ${definition}`);
      } catch (error) {
        if (error.code !== "ER_DUP_FIELDNAME") throw error;
      }
    }

    // Helpful indexes for search/filtering (safe to re-run)
    const indexes = [
      ["idx_employer_industry_type", "industry_type"],
      ["idx_employer_district", "district"],
    ];

    for (const [indexName, column] of indexes) {
      try {
        await pool.query(`ALTER TABLE employer_profiles ADD INDEX ${indexName} (${column})`);
      } catch (error) {
        if (error.code !== "ER_DUP_KEYNAME") throw error;
      }
    }

    // Note: no FK on user_id — the real `users` table lives in a different
    // database (Shondhaan/backend), so we can't enforce this at the DB level.
    // user_id is verified over HTTP instead, in routes/employerProfile.js,
    // by calling Shondhaan's GET /api/users/me/profile with the caller's token.

  } catch (error) {
    console.error(error);
  }
}

module.exports = createEmployerProfilesTable;
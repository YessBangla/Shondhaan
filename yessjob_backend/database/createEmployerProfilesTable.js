// database/createEmployerProfilesTable.js
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

async function createEmployerProfilesTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS employer_profiles (
        id INT AUTO_INCREMENT PRIMARY KEY,

        user_id INT NOT NULL UNIQUE,

        company_name VARCHAR(255) NOT NULL,
        company_name_bn VARCHAR(255) DEFAULT NULL,
        company_logo_url VARCHAR(500) DEFAULT NULL,
        company_type VARCHAR(50) NOT NULL DEFAULT 'private',
        industry_type VARCHAR(255) DEFAULT NULL,
        establishment_year INT DEFAULT NULL,
        employee_count VARCHAR(20) NOT NULL DEFAULT '1-25',
        website_url VARCHAR(500) DEFAULT NULL,
        description TEXT DEFAULT NULL,

        division VARCHAR(100) DEFAULT NULL,
        district VARCHAR(100) DEFAULT NULL,
        thana VARCHAR(100) DEFAULT NULL,
        address TEXT DEFAULT NULL,

        contact_person VARCHAR(255) DEFAULT NULL,
        contact_phone VARCHAR(20) DEFAULT NULL,
        contact_email VARCHAR(255) DEFAULT NULL,
        trade_license_url VARCHAR(500) DEFAULT NULL,

        is_verified TINYINT(1) NOT NULL DEFAULT 0,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        total_jobs_posted INT NOT NULL DEFAULT 0,
        total_hires INT NOT NULL DEFAULT 0,

        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

        INDEX idx_employer_verified (is_verified),
        INDEX idx_employer_industry_type (industry_type),
        INDEX idx_employer_district (district)
      )
    `);

    console.log("✅ employer_profiles table created");

  } catch (error) {
    console.error(error);
  }
}

module.exports = createEmployerProfilesTable;
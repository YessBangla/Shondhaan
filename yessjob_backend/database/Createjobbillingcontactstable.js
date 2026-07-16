// database/createJobBillingContactsTable.js
//
// Holds Step 4 ("Billing & Contact") from JobPostForm.tsx — the billing
// contact person and the HR/recruitment contact person for a job posting.
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

async function createJobBillingContactsTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS job_billing_contacts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        job_id INT NOT NULL,

        billing_contact_name VARCHAR(255) DEFAULT NULL,
        billing_designation VARCHAR(255) DEFAULT NULL,
        billing_email VARCHAR(255) DEFAULT NULL,
        billing_mobile VARCHAR(20) DEFAULT NULL,

        hr_contact_name VARCHAR(255) DEFAULT NULL,
        hr_designation VARCHAR(255) DEFAULT NULL,
        hr_email VARCHAR(255) DEFAULT NULL,
        hr_mobile VARCHAR(20) DEFAULT NULL,

        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

        UNIQUE KEY uq_job_billing_contacts_job_id (job_id),

        CONSTRAINT fk_jbc_job_id
          FOREIGN KEY (job_id) REFERENCES jobs(id)
          ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    console.log("✅ job_billing_contacts table created (job_id FK -> jobs.id)");

  } catch (error) {
    console.error(error);
  }
}

module.exports = createJobBillingContactsTable;
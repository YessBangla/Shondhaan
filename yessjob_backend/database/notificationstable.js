// database/createNotificationsTable.js
//
// No FOREIGN KEYs on this table at all, so it can run at any point in
// startup relative to jobs/job_applications/interviews — order doesn't
// matter the way it does for createInterviewsTable().
//
// NOTE ON recipient_id: no FK, same reasoning as jobs.user_id and
// job_applications.jobseeker_id — the users table lives on the separate
// Shondhaan server. recipient_id can hold either an employer's or a
// jobseeker's id depending on `type`; integrity is enforced at the
// application layer by whichever route inserts the row (see
// routes/interviews.js, which writes here whenever it schedules,
// reschedules, or cancels an interview).
//
// NOTE ON reference_id: intentionally untyped/unconstrained (just an INT)
// because it points at different tables depending on `type`
// (interviews.id today, possibly job_applications.id or jobs.id for
// other notification types later). Resolve it against the right table
// in the route that reads notifications, based on `type`.

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

async function createNotificationsTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id INT AUTO_INCREMENT PRIMARY KEY,

        recipient_id INT NOT NULL,
        type VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        message VARCHAR(500) NOT NULL,
        reference_id INT DEFAULT NULL,

        is_read TINYINT(1) NOT NULL DEFAULT 0,

        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

        INDEX idx_notifications_recipient (recipient_id, is_read, created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    console.log("✅ notifications table created (recipient_id no FK, cross-server user id)");

  } catch (error) {
    console.error(error);
  }
}

module.exports = createNotificationsTable;
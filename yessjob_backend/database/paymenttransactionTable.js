// database/createPaymentTransactionsTable.js
//
// No FOREIGN KEYs on this table either, same reasoning as notifications.js:
//
// NOTE ON employer_user_id: no FK — the users table lives on the separate
// Shondhaan server, so integrity is enforced at the application layer,
// not by MySQL. This is set from req.user.id in whichever route creates
// the payment (see routes/payments.js -> POST /shurjopay/initiate).
//
// NOTE ON package_id: no FK to a packages table by design — packages may
// live in a different table (or even be seeded/static data) depending on
// how routes/packages.js is implemented. We just store whatever id was
// passed in at initiation time so the transaction row is self-contained
// even if the package is later renamed, repriced, or removed.
//
// NOTE ON order_id vs sp_order_id: order_id is OUR internally generated
// id (sent to ShurjoPay as `order_id` in the initiate call — see
// utils/shurjopay.js). sp_order_id is whatever ShurjoPay's own gateway
// returns/uses internally, captured separately in case the two ever
// diverge (useful when reconciling against ShurjoPay's dashboard/support).
//
// NOTE ON raw_response: stores the full JSON response from ShurjoPay's
// get_token/secret-pay/verification calls, mainly for debugging failed
// or ambiguous transactions without needing to reproduce the API call.

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

async function createPaymentTransactionsTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS payment_transactions (
        id INT AUTO_INCREMENT PRIMARY KEY,

        employer_user_id INT NOT NULL,
        package_id INT NOT NULL,
        amount DECIMAL(10,2) NOT NULL,

        order_id VARCHAR(64) NOT NULL UNIQUE,
        sp_order_id VARCHAR(64) DEFAULT NULL,

        status ENUM('initiated','pending','success','failed','cancelled') NOT NULL DEFAULT 'initiated',
        raw_response JSON DEFAULT NULL,

        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

        INDEX idx_payment_transactions_employer (employer_user_id, status, created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    console.log("✅ payment_transactions table created (employer_user_id/package_id no FK, cross-server/decoupled ids)");

  } catch (error) {
    console.error(error);
  }
}

module.exports = createPaymentTransactionsTable;
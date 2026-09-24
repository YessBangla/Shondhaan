const pool = require("../db");

async function createMartRefundTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS mart_refund_policies (
      vendor_user_id VARCHAR(255) NOT NULL PRIMARY KEY,
      refund_window_days INT NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT chk_mart_refund_window_days CHECK (refund_window_days BETWEEN 0 AND 365)
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS mart_refund_requests (
      id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      order_id INT NOT NULL,
      customer_user_id VARCHAR(255) NOT NULL,
      vendor_user_id VARCHAR(255) NOT NULL,
      reason TEXT NOT NULL,
      status ENUM('requested', 'approved', 'rejected', 'refunded', 'cancelled') NOT NULL DEFAULT 'requested',
      requested_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      reviewed_at TIMESTAMP NULL,
      vendor_note TEXT NULL,
      UNIQUE KEY uq_mart_refund_request_order (order_id),
      KEY idx_mart_refund_requests_vendor_status (vendor_user_id, status),
      KEY idx_mart_refund_requests_customer (customer_user_id)
    )
  `);
}

module.exports = createMartRefundTables;

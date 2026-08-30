import { pool } from "./pool.js";

// ─── Payment Gateways table ─────────────────────────────────────────
// One row per gateway (bKash, Nagad, Rocket, ShurjoPay, SSLCommerz,
// UddoktaPay, Cash on Delivery). Credentials for every gateway live in
// the same flat set of columns — only the columns relevant to a given
// gateway are filled in, the rest stay NULL.
export async function ensurePaymentGatewaysTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS payment_gateways (
      id INT AUTO_INCREMENT PRIMARY KEY,
      gateway_name VARCHAR(50) NOT NULL UNIQUE,
      display_name VARCHAR(100) NOT NULL,
      is_enabled TINYINT(1) NOT NULL DEFAULT 0,

      -- General
      environment ENUM('SANDBOX', 'LIVE') NOT NULL DEFAULT 'SANDBOX',
      currency VARCHAR(10) NOT NULL DEFAULT 'BDT',

      -- Merchant / Account information
      merchant_id VARCHAR(255) NULL,
      merchant_name VARCHAR(255) NULL,
      merchant_email VARCHAR(255) NULL,
      merchant_phone VARCHAR(30) NULL,

      -- API Credentials
      username VARCHAR(255) NULL,
      password VARCHAR(255) NULL,
      api_key VARCHAR(500) NULL,
      api_secret VARCHAR(500) NULL,
      client_id VARCHAR(255) NULL,
      client_secret VARCHAR(500) NULL,

      -- Gateway-specific credentials
      store_id VARCHAR(255) NULL,
      store_password VARCHAR(500) NULL,
      app_key VARCHAR(500) NULL,
      app_secret VARCHAR(500) NULL,

      -- URLs / Endpoints
      base_url VARCHAR(500) NULL,
      api_url VARCHAR(500) NULL,
      checkout_url VARCHAR(500) NULL,
      token_url VARCHAR(500) NULL,

      -- Callback / Transaction URLs
      success_url VARCHAR(500) NULL,
      fail_url VARCHAR(500) NULL,
      cancel_url VARCHAR(500) NULL,
      ipn_url VARCHAR(500) NULL,
      callback_url VARCHAR(500) NULL,

      -- Webhook
      webhook_url VARCHAR(500) NULL,
      webhook_secret VARCHAR(500) NULL,

      -- Additional configuration
      merchant_prefix VARCHAR(100) NULL,
      terminal_id VARCHAR(255) NULL,
      account_number VARCHAR(50) NULL,

      -- Extra configuration for gateway-specific data
      extra_config JSON NULL,

      -- Display / processing
      sort_order INT NOT NULL DEFAULT 0,

      -- Audit
      created_by INT NULL,
      updated_by INT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    INSERT INTO payment_gateways (gateway_name, display_name, sort_order)
    VALUES
      ('bkash',       'bKash',            1),
      ('nagad',       'Nagad',            2),
      ('rocket',      'Rocket',           3),
      ('shurjopay',   'ShurjoPay',        4),
      ('sslcommerz',  'SSLCommerz',       5),
      ('uddoktapay',  'UddoktaPay',       6),
      ('cod',         'Cash on Delivery', 7)
    ON DUPLICATE KEY UPDATE gateway_name = gateway_name
  `);

  console.log("payment_gateways table created/verified and seeded");
}

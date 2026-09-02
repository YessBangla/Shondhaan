import { pool } from "./pool.js";

// ─── Password Resets table ──────────────────────────────────────────
// One row per reset request. A token is generated and emailed to the
// user; when they submit a new password we look the token up here,
// confirm it hasn't expired or been used, then mark it used.
export async function ensurePasswordResetsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS password_resets (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      token VARCHAR(64) NOT NULL UNIQUE,
      expires_at DATETIME NOT NULL,
      used TINYINT(1) NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

      INDEX idx_token (token),
      INDEX idx_user_id (user_id),

      CONSTRAINT fk_password_resets_user
        FOREIGN KEY (user_id) REFERENCES users (id)
        ON DELETE CASCADE
    )
  `);

  console.log("password_resets table created/verified");
}
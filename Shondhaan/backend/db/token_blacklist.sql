-- Create table to support real logout (JWT blacklist)
-- Stores token `jti` until token expiry.

CREATE TABLE IF NOT EXISTS token_blacklist (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  jti VARCHAR(64) NOT NULL,
  user_id BIGINT UNSIGNED NULL,
  token_expires_at DATETIME NOT NULL,
  blacklisted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_jti (jti),
  KEY idx_user_id (user_id),
  KEY idx_token_expires_at (token_expires_at)
);

-- Optional cleanup event (requires MySQL event scheduler)
-- SET GLOBAL event_scheduler = ON;
-- CREATE EVENT IF NOT EXISTS ev_token_blacklist_cleanup
--   ON SCHEDULE EVERY 1 DAY
--   DO
--     DELETE FROM token_blacklist WHERE token_expires_at < NOW();


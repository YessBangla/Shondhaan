-- ============================================
-- employer_profiles table
-- Matches EmployerProfile interface / formData
-- used in EmployerPanel.tsx
-- ============================================

CREATE TABLE IF NOT EXISTS employer_profiles (
  id                  INT AUTO_INCREMENT PRIMARY KEY,

  -- Link to the logged-in user. Change type to match your `users` table's PK
  -- (e.g. VARCHAR(36) if you use UUIDs instead of auto-increment ints).
  user_id             INT NOT NULL UNIQUE,

  -- Company Info
  company_name        VARCHAR(255) NOT NULL,
  company_name_bn     VARCHAR(255) DEFAULT NULL,
  company_logo_url    VARCHAR(500) DEFAULT NULL,
  company_type        VARCHAR(50)  NOT NULL DEFAULT 'private',
  industry_type       VARCHAR(255) DEFAULT NULL,
  establishment_year  INT DEFAULT NULL,
  employee_count      VARCHAR(20)  NOT NULL DEFAULT '1-25',
  website_url         VARCHAR(500) DEFAULT NULL,
  description         TEXT DEFAULT NULL,

  -- Address
  division            VARCHAR(100) DEFAULT NULL,
  district             VARCHAR(100) DEFAULT NULL,
  thana                VARCHAR(100) DEFAULT NULL,
  address              TEXT DEFAULT NULL,

  -- Contact
  contact_person      VARCHAR(255) DEFAULT NULL,
  contact_phone       VARCHAR(20)  DEFAULT NULL,
  contact_email       VARCHAR(255) DEFAULT NULL,

  -- Verification / status
  trade_license_url   VARCHAR(500) DEFAULT NULL,
  is_verified         TINYINT(1) NOT NULL DEFAULT 0,
  is_active           TINYINT(1) NOT NULL DEFAULT 1,

  -- Stats (updated by other parts of the app, not the setup form)
  total_jobs_posted   INT NOT NULL DEFAULT 0,
  total_hires         INT NOT NULL DEFAULT 0,

  created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                       ON UPDATE CURRENT_TIMESTAMP,

  -- Uncomment if you have a `users` table with an `id` column:
  -- CONSTRAINT fk_employer_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,

  INDEX idx_industry_type (industry_type),
  INDEX idx_district (district),
  INDEX idx_is_verified (is_verified)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

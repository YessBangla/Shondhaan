import mysql from "mysql2/promise";
import { DB_NAME } from "../config/env.js";
import { pool, setPool } from "./pool.js";
import { ensurePaymentGatewaysTable } from "./paymentGateways.js";
import { hashPassword } from "../utils/crypto.js";
import { normalizeEmail, normalizeMobile } from "../utils/normalize.js";
import { ensurePasswordResetsTable } from "./password_resets.js";
// ✅ UPDATED: Added 'mart_admin', 'deal_admin', 'job_admin'
const USER_TYPE_ENUM =
  "ENUM('super_admin', 'admin','mart_admin', 'job_admin', 'deal_admin', 'service_admin', 'moderator', 'supervisor', 'finance', 'call_center', 'provider', 'representative', 'mart_vendor', 'mart_delivery', 'mart_cs', 'yessdeal_seller', 'employer', 'user') NOT NULL DEFAULT 'user'";

export async function ensureTableColumn(table, column, alterSql) {
  const [existing] = await pool.query(
    "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?",
    [DB_NAME, table, column],
  );
  if (!existing.length) {
    await pool.query(alterSql);
  }
}

export async function seedDefaultSuperAdmin() {
  const email = normalizeEmail(process.env.SUPER_ADMIN_EMAIL || "");
  const password = String(process.env.SUPER_ADMIN_PASSWORD || "").trim();
  if (!email || !password) {
    return;
  }

  const [existingSuperAdmins] = await pool.query(
    "SELECT id FROM users WHERE type = 'super_admin' LIMIT 1",
  );
  if (existingSuperAdmins.length) {
    // Update password if env is set
    const passwordHash = await hashPassword(password);
    await pool.query(
      "UPDATE users SET password = ? WHERE id = ?",
      [passwordHash, existingSuperAdmins[0].id],
    );
    console.log("Updated existing super_admin password");
    return;
  }

  const name = String(process.env.SUPER_ADMIN_NAME || "Super Admin").trim() || "Super Admin";
  const mobile = normalizeMobile(process.env.SUPER_ADMIN_MOBILE || "").trim();
  const fallbackMobile = `sadmin${Date.now().toString().slice(-10)}`;
  const [existingUsers] = await pool.query(
    "SELECT * FROM users WHERE email = ? OR mobile = ? LIMIT 1",
    [email, mobile || email],
  );

  const passwordHash = await hashPassword(password);
  if (existingUsers.length) {
    const user = existingUsers[0];
    await pool.query(
      "UPDATE users SET name = ?, mobile = ?, type = 'super_admin', email_verified = 1, password = ? WHERE id = ?",
      [name, mobile || user.mobile || fallbackMobile, passwordHash, user.id],
    );
    console.log("Updated existing user to super_admin:", email);
  } else {
    await pool.query(
      "INSERT INTO users (name, mobile, address, email, password, type, email_verified) VALUES (?, ?, NULL, ?, ?, 'super_admin', 1)",
      [name, mobile || fallbackMobile, email, passwordHash],
    );
    console.log("Created default super_admin:", email);
  }
}

export async function initDatabase() {
  // ─── Create database if not exists ────────────────────────────────
  const bootstrap = await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
  });

  await bootstrap.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\``);
  await bootstrap.end();

  // ─── Create pool ──────────────────────────────────────────────────
  const newPool = mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: DB_NAME,
    waitForConnections: true,
    connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 10),
  });
  setPool(newPool);

  // ─── Users table ──────────────────────────────────────────────────
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      shondhaan_id VARCHAR(11) NULL,
      name VARCHAR(100) NOT NULL,
      mobile VARCHAR(20) NOT NULL UNIQUE,
      address VARCHAR(300) NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      shop_name VARCHAR(255) NULL,
      shop_type VARCHAR(50) NULL,
      type ${USER_TYPE_ENUM},
      email_verified TINYINT(1) NOT NULL DEFAULT 0,
      otp_hash VARCHAR(64) NULL,
      otp_expires_at DATETIME NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_users_email (email),
      INDEX idx_users_mobile (mobile)
    )
  `);

  // User profile details are optional and stored separately from accounts.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_profiles (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL UNIQUE,
      profile_image VARCHAR(500) NULL,
      bio TEXT NULL,
      gender VARCHAR(50) NULL,
      date_of_birth DATE NULL,
      nid_front VARCHAR(500) NULL,
      nid_back VARCHAR(500) NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_user_profiles_user_id (user_id)
    )
  `);

  // ─── Categories table ─────────────────────────────────────────────
  await pool.query(`
    CREATE TABLE IF NOT EXISTS categories (
      id VARCHAR(100) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      name_en VARCHAR(255),
      icon VARCHAR(255),
      color_key VARCHAR(50),
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  // ─── Category Services table ──────────────────────────────────────
  await pool.query(`
    CREATE TABLE IF NOT EXISTS category_services (
      category_id VARCHAR(100),
      service_slug VARCHAR(100),
      PRIMARY KEY (category_id, service_slug)
    )
  `);

  // ─── CMS Categories table ─────────────────────────────────────────
  await pool.query(`
    CREATE TABLE IF NOT EXISTS cms_categories (
      id VARCHAR(100) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      name_en VARCHAR(255) NULL,
      icon_url TEXT NULL,
      color_gradient VARCHAR(255) NULL DEFAULT 'from-blue-600 to-blue-800',
      color_overlay VARCHAR(255) NULL DEFAULT 'from-blue-900/80 to-blue-700/40',
      color_chip_bg VARCHAR(255) NULL DEFAULT 'bg-blue-500/15',
      color_chip_text VARCHAR(255) NULL DEFAULT 'text-blue-700',
      color_accent VARCHAR(50) NULL DEFAULT '#2563eb',
      sort_order INT NOT NULL DEFAULT 0,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  // ─── CMS Services table ───────────────────────────────────────────
  await pool.query(`
    CREATE TABLE IF NOT EXISTS cms_services (
      id VARCHAR(100) PRIMARY KEY,
      slug VARCHAR(160) NOT NULL UNIQUE,
      title VARCHAR(255) NOT NULL,
      title_en VARCHAR(255) NULL,
      image_url TEXT NULL,
      description TEXT NULL,
      rating DECIMAL(3,2) NOT NULL DEFAULT 0,
      total_reviews INT NOT NULL DEFAULT 0,
      total_orders INT NOT NULL DEFAULT 0,
      features JSON NULL,
      available_cities JSON NULL,
      category_id VARCHAR(100) NULL,
      commission_percent DECIMAL(5,2) NULL DEFAULT 10,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      sort_order INT NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_cms_services_category_id (category_id)
    )
  `);

  // ─── CMS Service Packages table ───────────────────────────────────
  await pool.query(`
    CREATE TABLE IF NOT EXISTS cms_service_packages (
      id VARCHAR(100) PRIMARY KEY,
      service_id VARCHAR(100) NOT NULL,
      name VARCHAR(255) NOT NULL,
      price DECIMAL(10,2) NOT NULL DEFAULT 0,
      original_price DECIMAL(10,2) NULL,
      features JSON NULL,
      sort_order INT NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_cms_packages_service_id (service_id)
    )
  `);

  // ─── CMS Special Offers table ─────────────────────────────────────
  await pool.query(`
    CREATE TABLE IF NOT EXISTS cms_special_offers (
      id VARCHAR(100) PRIMARY KEY,
      title_bn VARCHAR(255) NOT NULL,
      title_en VARCHAR(255) NULL,
      discount_bn VARCHAR(255) NOT NULL,
      discount_en VARCHAR(255) NULL,
      description_bn TEXT NULL,
      description_en TEXT NULL,
      service_slug VARCHAR(160) NULL,
      badge VARCHAR(50) NULL,
      gradient VARCHAR(255) NULL,
      border_color VARCHAR(255) NULL,
      accent_color VARCHAR(255) NULL,
      bg_accent VARCHAR(255) NULL,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      expires_at DATETIME NULL,
      sort_order INT NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // ─── CMS Hero Banners table ───────────────────────────────────────
  await pool.query(`
    CREATE TABLE IF NOT EXISTS cms_hero_banners (
      id VARCHAR(100) PRIMARY KEY,
      title_bn VARCHAR(255) NOT NULL,
      title_en VARCHAR(255) NULL,
      subtitle_bn TEXT NULL,
      subtitle_en TEXT NULL,
      image_url TEXT NULL,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      sort_order INT NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // ─── CMS Homepage Sections table ──────────────────────────────────
  await pool.query(`
    CREATE TABLE IF NOT EXISTS cms_homepage_sections (
      id VARCHAR(100) PRIMARY KEY,
      section_key VARCHAR(160) NOT NULL UNIQUE,
      title_bn VARCHAR(255) NOT NULL,
      title_en VARCHAR(255) NULL,
      service_slugs JSON NULL,
      sort_order INT NOT NULL DEFAULT 0,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // ─── User Wallets table ───────────────────────────────────────────
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_wallets (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(255) NOT NULL UNIQUE,
      cash_balance DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      coin_balance DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_user_wallets_user_id (user_id)
    )
  `);

  // ─── Wallet Transactions table ────────────────────────────────────
  await pool.query(`
    CREATE TABLE IF NOT EXISTS wallet_transactions (
      id VARCHAR(64) PRIMARY KEY,
      user_id VARCHAR(255) NOT NULL,
      type ENUM('CREDIT','DEBIT') NOT NULL,
      currency_type ENUM('CASH','COIN') NOT NULL,
      amount DECIMAL(10,2) NOT NULL,
      module VARCHAR(50) NOT NULL,
      reference_id VARCHAR(100) NULL,
      status ENUM('PENDING','COMPLETED','FAILED') NOT NULL DEFAULT 'COMPLETED',
      description TEXT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_wallet_transactions_user_id (user_id),
      INDEX idx_wallet_transactions_reference (reference_id),
      INDEX idx_wallet_transactions_module (module)
    )
  `);

  // ─── Referral Settings table ──────────────────────────────────────
  await pool.query(`
    CREATE TABLE IF NOT EXISTS referral_settings (
      id TINYINT PRIMARY KEY DEFAULT 1,
      is_enabled TINYINT(1) NOT NULL DEFAULT 1,
      max_uses INT NOT NULL DEFAULT 50,
      code_valid_days INT NOT NULL DEFAULT 90,
      qualification_window_days INT NOT NULL DEFAULT 30,
      reward_valid_days INT NOT NULL DEFAULT 60,
      referrer_reward_currency ENUM('CASH','COIN') NOT NULL DEFAULT 'CASH',
      referrer_reward_amount DECIMAL(10,2) NOT NULL DEFAULT 50.00,
      referred_reward_currency ENUM('CASH','COIN') NOT NULL DEFAULT 'CASH',
      referred_reward_amount DECIMAL(10,2) NOT NULL DEFAULT 20.00,
      min_order_amount DECIMAL(10,2) NULL,
      updated_by INT NULL,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    INSERT INTO referral_settings (id)
    VALUES (1)
    ON DUPLICATE KEY UPDATE id = id
  `);

  // ─── Referral Codes table ─────────────────────────────────────────
  await pool.query(`
    CREATE TABLE IF NOT EXISTS referral_codes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      code VARCHAR(16) NOT NULL UNIQUE,
      max_uses INT NOT NULL DEFAULT 50,
      used_count INT NOT NULL DEFAULT 0,
      reward_currency ENUM('CASH','COIN') NOT NULL DEFAULT 'CASH',
      reward_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      referred_reward_type VARCHAR(32) NOT NULL DEFAULT 'WALLET_CASH',
      referred_reward_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      min_order_amount DECIMAL(10,2) NULL,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      expires_at TIMESTAMP NULL DEFAULT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_referral_codes_user_id (user_id),
      INDEX idx_referral_codes_active (is_active)
    )
  `);

  // ─── Referrals table ──────────────────────────────────────────────
  await pool.query(`
    CREATE TABLE IF NOT EXISTS referrals (
      id INT AUTO_INCREMENT PRIMARY KEY,
      referral_code_id INT NOT NULL,
      referrer_user_id INT NOT NULL,
      referred_user_id INT NOT NULL,
      status ENUM('pending','qualified','rewarded','expired') NOT NULL DEFAULT 'pending',
      qualified_at TIMESTAMP NULL DEFAULT NULL,
      rewarded_at TIMESTAMP NULL DEFAULT NULL,
      expires_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uk_referrals_code_referred (referral_code_id, referred_user_id),
      KEY idx_referrals_referrer (referrer_user_id),
      KEY idx_referrals_referred (referred_user_id),
      KEY idx_referrals_status (status)
    )
  `);

  // ─── Referral Rewards table ───────────────────────────────────────
  await pool.query(`
    CREATE TABLE IF NOT EXISTS referral_rewards (
      id INT AUTO_INCREMENT PRIMARY KEY,
      referral_id INT NOT NULL,
      user_id INT NOT NULL,
      role ENUM('referrer','referred') NOT NULL,
      reward_currency ENUM('CASH','COIN') NOT NULL DEFAULT 'CASH',
      reward_amount DECIMAL(10,2) NOT NULL,
      status ENUM('pending','available','claimed','expired') NOT NULL DEFAULT 'pending',
      order_id VARCHAR(100) DEFAULT NULL,
      claimed_at TIMESTAMP NULL DEFAULT NULL,
      expires_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      KEY idx_referral_rewards_user_id (user_id),
      KEY idx_referral_rewards_status (status),
      KEY idx_referral_rewards_referral_id (referral_id)
    )
  `);

  // ─── Ensure additional columns exist ──────────────────────────────
  await ensureTableColumn("referral_codes", "min_order_amount", "ALTER TABLE referral_codes ADD COLUMN min_order_amount DECIMAL(10,2) NULL AFTER referred_reward_amount");
  await ensureTableColumn("referral_settings", "updated_by", "ALTER TABLE referral_settings ADD COLUMN updated_by INT NULL AFTER min_order_amount");

  const columns = [
    ["shondhaan_id", "ALTER TABLE users ADD COLUMN shondhaan_id VARCHAR(11) NULL AFTER id"],
    ["shop_name", "ALTER TABLE users ADD COLUMN shop_name VARCHAR(255) NULL"],
    ["shop_type", "ALTER TABLE users ADD COLUMN shop_type VARCHAR(50) NULL AFTER shop_name"],
    ["type", `ALTER TABLE users ADD COLUMN type ${USER_TYPE_ENUM}`],
    ["email_verified", "ALTER TABLE users ADD COLUMN email_verified TINYINT(1) NOT NULL DEFAULT 0"],
    ["otp_hash", "ALTER TABLE users ADD COLUMN otp_hash VARCHAR(64) NULL"],
    ["otp_expires_at", "ALTER TABLE users ADD COLUMN otp_expires_at DATETIME NULL"],
    ["created_at", "ALTER TABLE users ADD COLUMN created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP"],
    ["updated_at", "ALTER TABLE users ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"],
  ];

  for (const [column, alterSql] of columns) {
    await ensureTableColumn("users", column, alterSql);
  }

  // ─── Update ENUM type ─────────────────────────────────────────────
  await pool.query(`ALTER TABLE users MODIFY COLUMN type ${USER_TYPE_ENUM}`);

  // ─── Ensure indexes exist ─────────────────────────────────────────
  const [emailIndexExists] = await pool.query(
    "SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND INDEX_NAME = 'idx_users_email'",
    [DB_NAME],
  );
  if (!emailIndexExists.length) {
    await pool.query("CREATE INDEX idx_users_email ON users (email)");
  }

  const [mobileIndexExists] = await pool.query(
    "SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND INDEX_NAME = 'idx_users_mobile'",
    [DB_NAME],
  );
  if (!mobileIndexExists.length) {
    await pool.query("CREATE INDEX idx_users_mobile ON users (mobile)");
  }

  // ─── Drop legacy role column if exists ────────────────────────────
  const [roleColumn] = await pool.query(
    "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'role'",
    [DB_NAME],
  );
  if (roleColumn.length) {
    await pool.query("ALTER TABLE users DROP COLUMN role");
  }

  // ─── Ensure shondhaan_id column exists ────────────────────────────
  await ensureTableColumn(
    "users",
    "shondhaan_id",
    "ALTER TABLE users ADD COLUMN shondhaan_id VARCHAR(11) NULL AFTER id"
  );

  // ─── Drop trigger if exists (to avoid conflicts) ──────────────────
  try {
    await pool.query("DROP TRIGGER IF EXISTS before_users_insert");
    console.log("Dropped existing trigger (if any)");
  } catch (e) {
    // Ignore errors
  }

  // ─── Create trigger for auto-generating shondhaan_id ──────────────
  await pool.query(`
    CREATE TRIGGER before_users_insert
    BEFORE INSERT ON users
    FOR EACH ROW
    BEGIN
      DECLARE next_id INT;
      SELECT IFNULL(MAX(CAST(SUBSTRING(shondhaan_id, 3) AS UNSIGNED)), 0) + 1
      INTO next_id
      FROM users;
      SET NEW.shondhaan_id = CONCAT('SD', LPAD(next_id, 9, '0'));
    END
  `);

  console.log("Created users shondhaan_id trigger");

  // ─── Payment gateways ───────────────────────────────────────────
  await ensurePaymentGatewaysTable();
//-------------------------forget password -------------------------------------------
await ensurePasswordResetsTable();
  // ─── Seed default super admin ─────────────────────────────────────
  await seedDefaultSuperAdmin();

  console.log("Database initialization complete!");
}

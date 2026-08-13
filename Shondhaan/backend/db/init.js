import mysql from "mysql2/promise";
import { DB_NAME } from "../config/env.js";
import { pool, setPool } from "./pool.js";
import { hashPassword } from "../utils/crypto.js";
import { normalizeEmail, normalizeMobile } from "../utils/normalize.js";

// ✅ UPDATED: Added 'mart_admin', 'deal_admin', 'job_admin'
const USER_TYPE_ENUM =
  "ENUM('super_admin', 'admin', 'service_admin', 'mart_admin', 'deal_admin', 'job_admin', 'moderator', 'supervisor', 'finance', 'call_center', 'provider', 'representative', 'mart_vendor', 'mart_delivery', 'mart_cs', 'yessdeal_seller', 'employer', 'user') NOT NULL DEFAULT 'user'";

export async function ensureTableColumn(table, column, alterSql) {
  const [existing] = await pool.execute(
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

  const [existingSuperAdmins] = await pool.execute(
    "SELECT id FROM users WHERE type = 'super_admin' LIMIT 1",
  );
  if (existingSuperAdmins.length) {
    // Update password if env is set
    const passwordHash = await hashPassword(password);
    await pool.execute(
      "UPDATE users SET password = ? WHERE id = ?",
      [passwordHash, existingSuperAdmins[0].id],
    );
    console.log("Updated existing super_admin password");
    return;
  }

  const name = String(process.env.SUPER_ADMIN_NAME || "Super Admin").trim() || "Super Admin";
  const mobile = normalizeMobile(process.env.SUPER_ADMIN_MOBILE || "").trim();
  const fallbackMobile = `sadmin${Date.now().toString().slice(-10)}`;
  const [existingUsers] = await pool.execute(
    "SELECT * FROM users WHERE email = ? OR mobile = ? LIMIT 1",
    [email, mobile || email],
  );

  const passwordHash = await hashPassword(password);
  if (existingUsers.length) {
    const user = existingUsers[0];
    await pool.execute(
      "UPDATE users SET name = ?, mobile = ?, type = 'super_admin', email_verified = 1, password = ? WHERE id = ?",
      [name, mobile || user.mobile || fallbackMobile, passwordHash, user.id],
    );
    console.log("Updated existing user to super_admin:", email);
  } else {
    await pool.execute(
      "INSERT INTO users (name, mobile, address, email, password, type, email_verified) VALUES (?, ?, NULL, ?, ?, 'super_admin', 1)",
      [name, mobile || fallbackMobile, email, passwordHash],
    );
    console.log("Created default super_admin:", email);
  }
}

export async function initDatabase() {
  const bootstrap = await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
  });

  await bootstrap.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\``);
  await bootstrap.end();

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

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
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

  await pool.query(`
    CREATE TABLE IF NOT EXISTS category_services (
      category_id VARCHAR(100),
      service_slug VARCHAR(100),
      PRIMARY KEY (category_id, service_slug)
    )
  `);

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

  const columns = [
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

  // This line applies the new ENUM values to your existing table
  await pool.query(`ALTER TABLE users MODIFY COLUMN type ${USER_TYPE_ENUM}`);

  const [emailIndexExists] = await pool.execute(
    "SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND INDEX_NAME = 'idx_users_email'",
    [DB_NAME],
  );
  if (!emailIndexExists.length) {
    await pool.query("CREATE INDEX idx_users_email ON users (email)");
  }

  const [mobileIndexExists] = await pool.execute(
    "SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND INDEX_NAME = 'idx_users_mobile'",
    [DB_NAME],
  );
  if (!mobileIndexExists.length) {
    await pool.query("CREATE INDEX idx_users_mobile ON users (mobile)");
  }

  // Drop legacy role column if exists
  const [roleColumn] = await pool.execute(
    "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'role'",
    [DB_NAME],
  );
  if (roleColumn.length) {
    await pool.query("ALTER TABLE users DROP COLUMN role");
  }

  await seedDefaultSuperAdmin();
}
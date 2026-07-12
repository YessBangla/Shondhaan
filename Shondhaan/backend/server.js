import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import mysql from "mysql2/promise";
import nodemailer from "nodemailer";
import { getBackendBaseUrl } from "./utils/baseUrl.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, ".env") });
dotenv.config({ path: path.join(__dirname, "../Frontend/.env") });
dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 5000);
const DB_NAME = process.env.DB_NAME || "shondhaan_db";
const MART_DB_NAME = process.env.MART_DB_NAME || process.env.YSERVICE_DB_NAME || "yservice_mart";
const OTP_EXPIRY_MINUTES = Number(process.env.OTP_EXPIRY_MINUTES || 10);
const TOKEN_SECRET = process.env.AUTH_TOKEN_SECRET || "change-this-secret-in-env";

const scrypt = promisify(crypto.scrypt);

const ALLOWED_ROLES = new Set([
  "super_admin",
  "admin",
  "moderator",
  "supervisor",
  "finance",
  "call_center",
  "provider",
  "representative",
  "mart_vendor",
  "mart_delivery",
  "mart_cs",
  "yessdeal_seller",
  "employer",
  "user",
]);

const CMS_TABLES = {
  cms_categories: {
    orderBy: "sort_order",
    jsonColumns: new Set(),
    booleanColumns: new Set(["is_active"]),
    columns: [
      "id",
      "name",
      "name_en",
      "icon_url",
      "color_gradient",
      "color_overlay",
      "color_chip_bg",
      "color_chip_text",
      "color_accent",
      "sort_order",
      "is_active",
    ],
  },
  cms_services: {
    orderBy: "sort_order",
    jsonColumns: new Set(["features", "available_cities"]),
    booleanColumns: new Set(["is_active"]),
    columns: [
      "id",
      "slug",
      "title",
      "title_en",
      "image_url",
      "description",
      "rating",
      "total_reviews",
      "total_orders",
      "features",
      "available_cities",
      "category_id",
      "commission_percent",
      "is_active",
      "sort_order",
    ],
  },
  cms_service_packages: {
    orderBy: "sort_order",
    jsonColumns: new Set(["features"]),
    booleanColumns: new Set(),
    columns: [
      "id",
      "service_id",
      "name",
      "price",
      "original_price",
      "features",
      "sort_order",
    ],
  },
  cms_special_offers: {
    orderBy: "sort_order",
    jsonColumns: new Set(),
    booleanColumns: new Set(["is_active"]),
    columns: [
      "id",
      "title_bn",
      "title_en",
      "discount_bn",
      "discount_en",
      "description_bn",
      "description_en",
      "service_slug",
      "badge",
      "gradient",
      "border_color",
      "accent_color",
      "bg_accent",
      "is_active",
      "expires_at",
      "sort_order",
    ],
  },
  cms_hero_banners: {
    orderBy: "sort_order",
    jsonColumns: new Set(),
    booleanColumns: new Set(["is_active"]),
    columns: [
      "id",
      "title_bn",
      "title_en",
      "subtitle_bn",
      "subtitle_en",
      "image_url",
      "is_active",
      "sort_order",
    ],
  },
  cms_homepage_sections: {
    orderBy: "sort_order",
    jsonColumns: new Set(["service_slugs"]),
    booleanColumns: new Set(["is_active"]),
    columns: [
      "id",
      "section_key",
      "title_bn",
      "title_en",
      "service_slugs",
      "sort_order",
      "is_active",
    ],
  },
};

const defaultCorsOrigins = [
  "http://localhost:8080",
  "http://127.0.0.1:8080",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "https://shondhaan.yessbd.top",
  "https://www.shondhaan.yessbd.top",
];

const corsOrigins = [
  ...new Set([
    ...defaultCorsOrigins,
    ...(process.env.CORS_ORIGIN || "")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
  ]),
];

const isAllowedCorsOrigin = (origin) => {
  if (!origin) return true;

  const normalizedOrigin = origin.trim();
  if (corsOrigins.includes(normalizedOrigin)) return true;

  try {
    const { hostname, protocol } = new URL(normalizedOrigin);
    return protocol === "https:" && hostname.endsWith(".yessbd.top");
  } catch {
    return false;
  }
};

app.use((req, res, next) => {
  const origin = req.headers.origin;

  if (isAllowedCorsOrigin(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin || "*");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET,POST,PUT,PATCH,DELETE,OPTIONS"
    );
    res.setHeader(
      "Access-Control-Allow-Headers",
      req.headers["access-control-request-headers"] || "Content-Type,Authorization"
    );
    res.setHeader("Vary", "Origin");
  }

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
});

app.use(
  cors({
    origin(origin, callback) {
      callback(null, isAllowedCorsOrigin(origin));
    },
    credentials: true,
    optionsSuccessStatus: 204,
  }),
);
app.use(express.json());

let pool;
let martPool;

const normalizeEmail = (email = "") => email.trim().toLowerCase();
const normalizeMobile = (mobile = "") => mobile.trim();
const createSlug = (value = "") =>
  String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u0980-\u09FF]+/g, "-")
    .replace(/(^-|-$)/g, "");

const hashValue = (value) =>
  crypto.createHash("sha256").update(String(value)).digest("hex");

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = await scrypt(password, salt, 64);
  return `${salt}:${derivedKey.toString("hex")}`;
}

async function verifyPassword(password, storedHash) {
  const [salt, key] = String(storedHash || "").split(":");
  if (!salt || !key) return false;
  const derivedKey = await scrypt(password, salt, 64);
  const storedBuffer = Buffer.from(key, "hex");
  if (storedBuffer.length !== derivedKey.length) return false;
  return crypto.timingSafeEqual(storedBuffer, derivedKey);
}

const passwordPolicyMessage =
  "Password must be at least 8 characters and include uppercase, lowercase, a number, and a special character.";

function validatePasswordPolicy(password) {
  const value = String(password || "");
  return (
    value.length >= 8 &&
    /[A-Z]/.test(value) &&
    /[a-z]/.test(value) &&
    /\d/.test(value) &&
    /[^A-Za-z0-9]/.test(value)
  );
}

function createToken(user) {
  const payload = Buffer.from(
    JSON.stringify({
      id: user.id,
      email: user.email,
      type: user.type,
      exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
    }),
  ).toString("base64url");
  const signature = crypto
    .createHmac("sha256", TOKEN_SECRET)
    .update(payload)
    .digest("base64url");
  return `${payload}.${signature}`;
}

function verifyToken(token = "") {
  const [payload, signature] = String(token).split(".");
  if (!payload || !signature) return null;

  const expected = crypto
    .createHmac("sha256", TOKEN_SECRET)
    .update(payload)
    .digest("base64url");

  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!data.exp || data.exp < Date.now()) return null;
    return data;
  } catch {
    return null;
  }
}

function safeUser(row) {
  const type = ALLOWED_ROLES.has(row.type) ? row.type : "user";
  return {
    id: row.id,
    name: row.name,
    mobile: row.mobile,
    address: row.address,
    email: row.email,
    type,
    role: type,
    shop_name: row.shop_name || null,
    shop_type: row.shop_type || null,
  };
}

function safeAdminUser(row) {
  const type = ALLOWED_ROLES.has(row.type) ? row.type : "user";
  return {
    id: row.id,
    name: row.name,
    mobile: row.mobile,
    address: row.address,
    email: row.email,
    type,
    shop_name: row.shop_name || null,
    shop_type: row.shop_type || null,
    email_verified: Boolean(row.email_verified),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

async function ensureTableColumn(table, column, alterSql) {
  const [existing] = await pool.execute(
    "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?",
    [DB_NAME, table, column],
  );
  if (!existing.length) {
    await pool.query(alterSql);
  }
}

async function ensureMartSellerTable() {
  if (!martPool) return;

  await martPool.query(`
    CREATE TABLE IF NOT EXISTS sellers (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NULL UNIQUE,
      slug VARCHAR(255) NULL UNIQUE,
      shop_name VARCHAR(255) NULL,
      shop_type VARCHAR(50) NULL,
      seller_name VARCHAR(255) DEFAULT 'Yess Mart Seller',
      seller_email VARCHAR(255) NULL,
      seller_mobile VARCHAR(20) NULL,
      seller_address VARCHAR(300) NULL,
      seller_total_products INT DEFAULT 0,
      seller_verified TINYINT(1) DEFAULT 1,
      banner_url VARCHAR(500) NULL,
      profile_image_url VARCHAR(500) NULL,
      bank_name VARCHAR(255) NULL,
      bank_account_name VARCHAR(255) NULL,
      bank_account_number VARCHAR(100) NULL,
      bank_branch VARCHAR(255) NULL,
      routing_number VARCHAR(100) NULL,
      mobile_banking_provider VARCHAR(50) NULL,
      mobile_banking_number VARCHAR(20) NULL,
      nid_front_url VARCHAR(500) NULL,
      nid_back_url VARCHAR(500) NULL,
      trade_license_url VARCHAR(500) NULL,
      tin_certificate_url VARCHAR(500) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  const [columns] = await martPool.query("SHOW COLUMNS FROM sellers");
  const existingColumns = new Set(columns.map((column) => column.Field));
  const columnsToAdd = [
    ["user_id", "INT NULL UNIQUE AFTER id"],
    ["slug", "VARCHAR(255) NULL UNIQUE AFTER user_id"],
    ["shop_name", "VARCHAR(255) NULL AFTER user_id"],
    ["shop_type", "VARCHAR(50) NULL AFTER shop_name"],
    ["seller_email", "VARCHAR(255) NULL AFTER seller_name"],
    ["seller_mobile", "VARCHAR(20) NULL AFTER seller_email"],
    ["seller_address", "VARCHAR(300) NULL AFTER seller_mobile"],
    ["banner_url", "VARCHAR(500) NULL AFTER seller_address"],
    ["profile_image_url", "VARCHAR(500) NULL AFTER banner_url"],
    ["bank_name", "VARCHAR(255) NULL AFTER profile_image_url"],
    ["bank_account_name", "VARCHAR(255) NULL AFTER bank_name"],
    ["bank_account_number", "VARCHAR(100) NULL AFTER bank_account_name"],
    ["bank_branch", "VARCHAR(255) NULL AFTER bank_account_number"],
    ["routing_number", "VARCHAR(100) NULL AFTER bank_branch"],
    ["mobile_banking_provider", "VARCHAR(50) NULL AFTER routing_number"],
    ["mobile_banking_number", "VARCHAR(20) NULL AFTER mobile_banking_provider"],
    ["nid_front_url", "VARCHAR(500) NULL AFTER mobile_banking_number"],
    ["nid_back_url", "VARCHAR(500) NULL AFTER nid_front_url"],
    ["trade_license_url", "VARCHAR(500) NULL AFTER nid_back_url"],
    ["tin_certificate_url", "VARCHAR(500) NULL AFTER trade_license_url"],
    ["seller_total_products", "INT DEFAULT 0"],
    ["seller_verified", "TINYINT(1) DEFAULT 1"],
    ["created_at", "TIMESTAMP DEFAULT CURRENT_TIMESTAMP"],
    ["updated_at", "TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"],
  ];

  for (const [columnName, definition] of columnsToAdd) {
    if (!existingColumns.has(columnName)) {
      await martPool.query(`ALTER TABLE sellers ADD COLUMN ${columnName} ${definition}`);
    }
  }
}

async function ensureMartReviewTable() {
  if (!martPool) return;

  await martPool.query(`
    CREATE TABLE IF NOT EXISTS reviews (
      id INT AUTO_INCREMENT PRIMARY KEY,
      product_id INT NOT NULL,
      user_id INT NOT NULL,
      text_review TEXT NULL,
      star_review INT NOT NULL DEFAULT 5,
      seller_reply TEXT NULL,
      seller_reply_by INT NULL,
      seller_reply_at TIMESTAMP NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY unique_product_user_review (product_id, user_id),
      INDEX idx_reviews_product_id (product_id),
      INDEX idx_reviews_user_id (user_id)
    )
  `);

  const [columns] = await martPool.query("SHOW COLUMNS FROM reviews");
  const existingColumns = new Set(columns.map((column) => column.Field));
  const columnsToAdd = [
    ["seller_reply", "TEXT NULL AFTER star_review"],
    ["seller_reply_by", "INT NULL AFTER seller_reply"],
    ["seller_reply_at", "TIMESTAMP NULL AFTER seller_reply_by"],
    ["updated_at", "TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"],
  ];

  for (const [columnName, definition] of columnsToAdd) {
    if (!existingColumns.has(columnName)) {
      await martPool.query(`ALTER TABLE reviews ADD COLUMN ${columnName} ${definition}`);
    }
  }
}

async function syncYServiceMartSeller(user) {
  if (!martPool || user.type !== "mart_vendor") return;

  const shopName = user.shop_name || user.name || "Yess Mart Seller";
  const slugBase = createSlug(shopName) || "seller";
  const slug = `${slugBase}-${user.id}`;
  await martPool.execute(
    `
      INSERT INTO sellers (user_id, slug, shop_name, shop_type, seller_name, seller_email, seller_mobile, seller_address, seller_verified)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
      ON DUPLICATE KEY UPDATE
        slug = VALUES(slug),
        shop_name = VALUES(shop_name),
        shop_type = VALUES(shop_type),
        seller_name = VALUES(seller_name),
        seller_email = VALUES(seller_email),
        seller_mobile = VALUES(seller_mobile),
        seller_address = VALUES(seller_address),
        seller_verified = 1
    `,
    [
      user.id,
      slug,
      shopName,
      user.shop_type || null,
      shopName,
      user.email,
      user.mobile,
      user.address || null,
    ],
  );
}

function normalizeCmsRow(table, row) {
  const config = CMS_TABLES[table];
  const normalized = { ...row };
  for (const column of config.booleanColumns) {
    if (column in normalized) {
      normalized[column] = Boolean(normalized[column]);
    }
  }
  for (const column of config.jsonColumns) {
    if (typeof normalized[column] === "string") {
      try {
        normalized[column] = JSON.parse(normalized[column]);
      } catch {
        normalized[column] = [];
      }
    }
    if (normalized[column] == null) {
      normalized[column] = [];
    }
  }
  return normalized;
}

function serializeCmsValue(table, column, value) {
  const config = CMS_TABLES[table];
  if (value === undefined) return undefined;
  if (config.booleanColumns.has(column)) return value ? 1 : 0;
  if (config.jsonColumns.has(column)) return JSON.stringify(Array.isArray(value) ? value : []);
  if (value === "") return null;
  return value;
}

function getCmsConfig(table) {
  const config = CMS_TABLES[table];
  if (!config) {
    const error = new Error("Unknown CMS table");
    error.status = 404;
    throw error;
  }
  return config;
}

function requireSuperAdmin(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  const auth = verifyToken(token);
  if (!auth || auth.type !== "super_admin") {
    return res.status(403).json({ message: "Super admin access is required" });
  }
  req.auth = auth;
  next();
}

function requireCmsAdmin(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  const auth = verifyToken(token);
  if (!auth || !["admin", "super_admin"].includes(auth.type)) {
    return res.status(403).json({ message: "Admin access is required" });
  }
  req.auth = auth;
  next();
}

function requireLoggedIn(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  const auth = verifyToken(token);
  if (!auth || !auth.id) {
    return res.status(401).json({ message: "Login is required" });
  }
  req.auth = auth;
  next();
}

async function seedDefaultSuperAdmin() {
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

function createTransporter() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    const error = new Error("Email service is not configured. Please set SMTP_HOST, SMTP_USER and SMTP_PASS in Backend/.env.");
    error.code = "SMTP_CONFIG_MISSING";
    throw error;
  }

  return nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE || "false") === "true",
    auth: { user, pass },
  });
}

async function fetchSupabaseRows(table, query) {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return [];
  }

  const baseUrl = supabaseUrl.replace(/\/$/, "");
  const response = await fetch(`${baseUrl}/rest/v1/${table}?${query}`, {
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Supabase ${table} fetch failed: ${response.status} ${await response.text()}`);
  }

  return response.json();
}

function legacyColorKey(category) {
  const gradient = String(category.color_gradient || "");
  const accent = String(category.color_accent || "");
  const colorNames = [
    "blue",
    "emerald",
    "orange",
    "pink",
    "violet",
    "amber",
    "red",
    "teal",
    "indigo",
    "lime",
    "cyan",
    "sky",
    "slate",
    "rose",
    "stone",
    "fuchsia",
    "zinc",
    "yellow",
  ];
  return colorNames.find((color) => gradient.includes(color)) || accent.slice(0, 50) || null;
}

async function syncLegacyCategoriesFromSupabase() {
  const categories = await fetchSupabaseRows(
    "cms_categories",
    "select=id,name,name_en,icon_url,color_accent,color_gradient,is_active,sort_order&order=sort_order.asc&limit=1000",
  );

  if (!Array.isArray(categories) || categories.length === 0) {
    console.log("No Supabase cms_categories rows found; keeping existing legacy categories tables");
    return;
  }

  const services = await fetchSupabaseRows(
    "cms_services",
    "select=slug,category_id,is_active,sort_order&order=sort_order.asc&limit=5000",
  );

  const categoryIds = new Set(categories.map((category) => category.id));
  const serviceLinks = Array.isArray(services)
    ? services.filter((service) => service.category_id && service.slug && categoryIds.has(service.category_id))
    : [];

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query("DELETE FROM category_services");
    await connection.query("DELETE FROM categories");

    for (const category of categories) {
      await connection.execute(
        "INSERT INTO categories (id, name, name_en, icon, color_key, is_active) VALUES (?, ?, ?, ?, ?, ?)",
        [
          category.id,
          category.name,
          category.name_en || null,
          category.icon_url || null,
          legacyColorKey(category),
          category.is_active === false ? 0 : 1,
        ],
      );
    }

    for (const service of serviceLinks) {
      await connection.execute(
        "INSERT INTO category_services (category_id, service_slug) VALUES (?, ?)",
        [service.category_id, service.slug],
      );
    }

    await connection.commit();
    console.log(
      `Synced legacy categories from Supabase: ${categories.length} categories, ${serviceLinks.length} service links`,
    );
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function sendOtpEmail(email, otp) {
  const transporter = createTransporter();
  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: email,
    subject: "Your Shondhaan signup OTP",
    text: `Your Shondhaan OTP is ${otp}. It will expire in ${OTP_EXPIRY_MINUTES} minutes.`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.5">
        <h2>Shondhaan signup OTP</h2>
        <p>Your OTP code is:</p>
        <p style="font-size:28px;font-weight:700;letter-spacing:4px">${otp}</p>
        <p>This code will expire in ${OTP_EXPIRY_MINUTES} minutes.</p>
      </div>
    `,
  });
}

async function initDatabase() {
  const bootstrap = await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
  });

  await bootstrap.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\``);
  await bootstrap.query(`CREATE DATABASE IF NOT EXISTS \`${MART_DB_NAME}\``);
  await bootstrap.end();

  pool = mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: DB_NAME,
    waitForConnections: true,
    connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 10),
  });

  martPool = mysql.createPool({
    host: process.env.MART_DB_HOST || process.env.DB_HOST || "localhost",
    port: Number(process.env.MART_DB_PORT || process.env.DB_PORT || 3306),
    user: process.env.MART_DB_USER || process.env.DB_USER || "root",
    password: process.env.MART_DB_PASSWORD || process.env.DB_PASSWORD || "",
    database: MART_DB_NAME,
    waitForConnections: true,
    connectionLimit: Number(process.env.MART_DB_CONNECTION_LIMIT || process.env.DB_CONNECTION_LIMIT || 10),
  });

  await ensureMartSellerTable();
  await ensureMartReviewTable();

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
      type ENUM('super_admin', 'admin', 'moderator', 'supervisor', 'finance', 'call_center', 'provider', 'representative', 'mart_vendor', 'mart_delivery', 'mart_cs', 'yessdeal_seller', 'employer', 'user') NOT NULL DEFAULT 'user',
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
    CREATE TABLE IF NOT EXISTS sellers (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NULL UNIQUE,
      slug VARCHAR(255) NULL UNIQUE,
      shop_name VARCHAR(255) NULL,
      shop_type VARCHAR(50) NULL,
      seller_name VARCHAR(255) DEFAULT 'Yess Mart Seller',
      seller_email VARCHAR(255) NULL,
      seller_mobile VARCHAR(20) NULL,
      seller_address VARCHAR(300) NULL,
      seller_total_products INT DEFAULT 0,
      seller_verified TINYINT(1) DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_sellers_user_id (user_id)
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
    ["type", "ALTER TABLE users ADD COLUMN type ENUM('super_admin', 'admin', 'moderator', 'supervisor', 'finance', 'call_center', 'provider', 'representative', 'mart_vendor', 'mart_delivery', 'mart_cs', 'yessdeal_seller', 'employer', 'user') NOT NULL DEFAULT 'user'"],
    ["email_verified", "ALTER TABLE users ADD COLUMN email_verified TINYINT(1) NOT NULL DEFAULT 0"],
    ["otp_hash", "ALTER TABLE users ADD COLUMN otp_hash VARCHAR(64) NULL"],
    ["otp_expires_at", "ALTER TABLE users ADD COLUMN otp_expires_at DATETIME NULL"],
    ["created_at", "ALTER TABLE users ADD COLUMN created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP"],
    ["updated_at", "ALTER TABLE users ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"],
  ];

  for (const [column, alterSql] of columns) {
    await ensureTableColumn("users", column, alterSql);
  }

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

  const sellerColumns = [
    ["user_id", "ALTER TABLE sellers ADD COLUMN user_id INT NULL UNIQUE AFTER id"],
    ["slug", "ALTER TABLE sellers ADD COLUMN slug VARCHAR(255) NULL UNIQUE AFTER user_id"],
    ["shop_name", "ALTER TABLE sellers ADD COLUMN shop_name VARCHAR(255) NULL AFTER slug"],
    ["shop_type", "ALTER TABLE sellers ADD COLUMN shop_type VARCHAR(50) NULL AFTER shop_name"],
    ["seller_email", "ALTER TABLE sellers ADD COLUMN seller_email VARCHAR(255) NULL AFTER seller_name"],
    ["seller_mobile", "ALTER TABLE sellers ADD COLUMN seller_mobile VARCHAR(20) NULL AFTER seller_email"],
    ["seller_address", "ALTER TABLE sellers ADD COLUMN seller_address VARCHAR(300) NULL AFTER seller_mobile"],
    ["seller_total_products", "ALTER TABLE sellers ADD COLUMN seller_total_products INT DEFAULT 0"],
    ["seller_verified", "ALTER TABLE sellers ADD COLUMN seller_verified TINYINT(1) DEFAULT 1"],
    ["created_at", "ALTER TABLE sellers ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP"],
    ["updated_at", "ALTER TABLE sellers ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"],
  ];

  for (const [column, alterSql] of sellerColumns) {
    await ensureTableColumn("sellers", column, alterSql);
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
  try {
    await syncLegacyCategoriesFromSupabase();
  } catch (error) {
    console.warn("Could not sync legacy categories from Supabase:", error.message);
  }
  return;
  // Clear old data first (optional)
await pool.query(`DELETE FROM category_services`);
await pool.query(`DELETE FROM categories`);

// ============================================
// INSERT INTO categories
// ============================================

await pool.query(`
  INSERT INTO categories (id, name, name_en, icon, color_key) VALUES
  ('ac-service', 'এসি সার্ভিস', 'AC Service', 'cat-ac.png', 'blue'),
  ('home-repair', 'ইলেকট্রিক ও প্লাম্বিং', 'Electric & Plumbing', 'cat-electrical.png', 'amber'),
  ('appliance-repair', 'অ্যাপ্লায়েন্স রিপেয়ার', 'Appliance Repair', 'cat-appliance.png', 'teal'),
  ('cleaning', 'ক্লিনিং সল্যুশন', 'Cleaning Solution', 'cat-cleaning.png', 'emerald'),
  ('beauty', 'বিউটি ও ওয়েলনেস', 'Beauty & Wellness', 'cat-beauty.png', 'pink'),
  ('mens-care', 'মেনস কেয়ার ও সেলুন', 'Men''s Care & Salon', 'cat-mens.png', 'indigo'),
  ('shifting', 'শিফটিং', 'Shifting', 'cat-shifting.png', 'orange'),
  ('health', 'হেলথ ও কেয়ার', 'Health & Care', 'cat-health.png', 'red'),
  ('pest-control', 'পেস্ট কন্ট্রোল', 'Pest Control', 'cat-pest.png', 'lime'),
  ('electronics', 'ইলেকট্রনিক্স রিপেয়ার', 'Electronics Repair', 'cat-electronics.png', 'cyan'),
  ('car-care', 'কার ও বাইক কেয়ার', 'Car & Bike Care', 'cat-car.png', 'sky'),
  ('driver', 'ড্রাইভার সার্ভিস', 'Driver Service', 'cat-driver.png', 'slate'),
  ('painting', 'পেইন্টিং ও রেনোভেশন', 'Painting & Renovation', 'cat-painting.png', 'violet'),
  ('home-service', 'গৃহকর্মী ও হোম সার্ভিস', 'Home Service', 'cat-home-service.png', 'rose'),
  ('vehicle-rental', 'গাড়ি ভাড়া ও ট্রান্সপোর্ট', 'Vehicle Rental', 'cat-vehicle.png', 'stone'),
  ('it-web', 'আইটি ও ওয়েব সার্ভিস', 'IT & Web Service', 'cat-it.png', 'indigo'),
  ('event-management', 'ইভেন্ট ম্যানেজমেন্ট', 'Event Management', 'cat-event.png', 'fuchsia'),
  ('media-production', 'মিডিয়া প্রোডাকশন', 'Media Production', 'cat-media.png', 'zinc'),
  ('education', 'শিক্ষা ও টিউশন', 'Education & Tutoring', 'cat-education.png', 'blue'),
  ('employment', 'চাকরি ও শ্রমিক', 'Employment', 'cat-employment.png', 'amber'),
  ('legal', 'আইনি সেবা ও ডকুমেন্ট', 'Legal & Documents', 'cat-legal.png', 'slate'),
  ('security', 'সিকিউরিটি ও ফায়ার সেফটি', 'Security & Fire Safety', 'cat-security.png', 'zinc'),
  ('construction', 'কনস্ট্রাকশন ও লিফট', 'Construction & Lift', 'cat-construction.png', 'orange'),
  ('solar', 'সোলার এনার্জি', 'Solar Energy', 'cat-solar.png', 'yellow'),
  ('agriculture', 'কৃষি ও গার্ডেনিং', 'Agriculture & Garden', 'cat-agriculture.png', 'emerald'),
  ('travel', 'ট্রাভেল ও ট্যুরিজম', 'Travel & Tourism', 'cat-travel.png', 'sky'),
  ('tailoring', 'টেইলারিং', 'Tailoring', 'cat-tailoring.png', 'pink'),
  ('courier', 'কুরিয়ার ও ডেলিভারি', 'Courier & Delivery', 'cat-courier.png', 'cyan'),
  ('bill-pay', 'বিল পে ও রিচার্জ', 'Bill Pay & Recharge', 'cat-billpay.png', 'teal'),
  ('yes-mart', 'ইয়েস মার্ট', 'Yess Mart', 'cat-mart.png', 'emerald'),
  ('yes-deal', 'ইয়েস ডিল', 'Yess Deal', 'cat-yessdeal.png', 'amber'),
  ('gift-flower', 'গিফট ও ফ্লাওয়ার', 'Gift & Flower', 'cat-event.png', 'rose')
`);

}

app.get("/", (req, res) => {
  res.send("Backend is running");
});

app.get("/api/test", (req, res) => {
  res.json({ message: "API working" });
});

app.get("/api/reviews", async (req, res) => {
  try {
    const productId = Number(req.query.product_id);
    if (!Number.isInteger(productId) || productId <= 0) {
      return res.status(400).json({ success: false, message: "Valid product_id is required" });
    }

    const [rows] = await martPool.execute(
      `
        SELECT
          r.id,
          r.product_id,
          r.user_id,
          CONCAT('User ', r.user_id) AS reviewer_name,
          r.star_review AS rating,
          r.text_review AS comment,
          r.seller_reply,
          r.seller_reply_by,
          r.seller_reply_at,
          r.created_at,
          r.updated_at
        FROM reviews r
        WHERE r.product_id = ?
        ORDER BY r.created_at DESC
      `,
      [productId],
    );

    res.json({ success: true, data: rows });
  } catch (error) {
    console.error("List mart reviews error:", error);
    res.status(500).json({ success: false, message: "Failed to load reviews" });
  }
});

app.post("/api/reviews", async (req, res) => {
  try {
    const userId = Number(req.body.user_id);
    const productId = Number(req.body.product_id);
    const rating = Number(req.body.star_review ?? req.body.rating ?? 5);
    const comment = String(req.body.text_review ?? req.body.comment ?? "").trim() || null;

    if (!Number.isInteger(userId) || userId <= 0 || !Number.isInteger(productId) || productId <= 0) {
      return res.status(400).json({ success: false, message: "Valid user_id and product_id are required" });
    }
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: "Rating must be between 1 and 5" });
    }

    await martPool.execute(
      `
        INSERT INTO reviews (product_id, user_id, text_review, star_review)
        VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          text_review = VALUES(text_review),
          star_review = VALUES(star_review),
          updated_at = CURRENT_TIMESTAMP
      `,
      [productId, userId, comment, rating],
    );

    const [rows] = await martPool.execute(
      `
        SELECT
          r.id,
          r.product_id,
          r.user_id,
          CONCAT('User ', r.user_id) AS reviewer_name,
          r.star_review AS rating,
          r.text_review AS comment,
          r.seller_reply,
          r.seller_reply_by,
          r.seller_reply_at,
          r.created_at,
          r.updated_at
        FROM reviews r
        WHERE r.product_id = ? AND r.user_id = ?
        LIMIT 1
      `,
      [productId, userId],
    );

    res.status(201).json({ success: true, data: rows[0] });
  } catch (error) {
    console.error("Save mart review error:", error);
    res.status(500).json({ success: false, message: "Failed to save review" });
  }
});

app.put("/api/reviews/:id/reply", async (req, res) => {
  try {
    const reviewId = Number(req.params.id);
    const userId = Number(req.body.user_id);
    const reply = String(req.body.seller_reply ?? req.body.reply ?? "").trim();

    if (!Number.isInteger(reviewId) || reviewId <= 0 || !Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({ success: false, message: "Valid review id and user_id are required" });
    }
    if (!reply) {
      return res.status(400).json({ success: false, message: "Seller reply is required" });
    }

    const [reviewRows] = await martPool.execute(
      `
        SELECT r.id, r.product_id, p.seller_id, s.user_id AS seller_user_id
        FROM reviews r
        JOIN products p ON p.id = r.product_id
        JOIN sellers s ON s.id = p.seller_id
        WHERE r.id = ?
        LIMIT 1
      `,
      [reviewId],
    );

    const review = reviewRows[0];
    if (!review) {
      return res.status(404).json({ success: false, message: "Review not found" });
    }
    if (Number(review.seller_user_id) !== userId) {
      return res.status(403).json({ success: false, message: "Only the product seller can reply to this review" });
    }

    await martPool.execute(
      `
        UPDATE reviews
        SET seller_reply = ?, seller_reply_by = ?, seller_reply_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      [reply, userId, reviewId],
    );

    const [rows] = await martPool.execute(
      `
        SELECT
          r.id,
          r.product_id,
          r.user_id,
          CONCAT('User ', r.user_id) AS reviewer_name,
          r.star_review AS rating,
          r.text_review AS comment,
          r.seller_reply,
          r.seller_reply_by,
          r.seller_reply_at,
          r.created_at,
          r.updated_at
        FROM reviews r
        WHERE r.id = ?
        LIMIT 1
      `,
      [reviewId],
    );

    res.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error("Save seller review reply error:", error);
    res.status(500).json({ success: false, message: "Failed to save seller reply" });
  }
});

app.delete("/api/reviews/:id", async (req, res) => {
  try {
    const reviewId = Number(req.params.id);
    const userId = Number(req.body.user_id);

    if (!Number.isInteger(reviewId) || reviewId <= 0 || !Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({ success: false, message: "Valid review id and user_id are required" });
    }

    const [result] = await martPool.execute("DELETE FROM reviews WHERE id = ? AND user_id = ?", [reviewId, userId]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Review not found" });
    }

    res.json({ success: true, message: "Review deleted" });
  } catch (error) {
    console.error("Delete mart review error:", error);
    res.status(500).json({ success: false, message: "Failed to delete review" });
  }
});

app.post("/api/admin/sync-legacy-categories", requireSuperAdmin, async (req, res) => {
  try {
    await syncLegacyCategoriesFromSupabase();
    res.json({ message: "Legacy categories synced from Supabase" });
  } catch (error) {
    console.error("Manual legacy category sync error:", error);
    res.status(500).json({ message: error.message || "Could not sync legacy categories" });
  }
});

app.get("/api/cms/:table", async (req, res) => {
  try {
    const table = req.params.table;
    const config = getCmsConfig(table);
    const orderBy = config.columns.includes(req.query.orderBy) ? req.query.orderBy : config.orderBy;
    const direction = String(req.query.direction || "asc").toLowerCase() === "desc" ? "DESC" : "ASC";
    const where = [];
    const values = [];

    if (table === "cms_service_packages" && req.query.service_id) {
      where.push("service_id = ?");
      values.push(String(req.query.service_id));
    }

    const sql = `
      SELECT * FROM \`${table}\`
      ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
      ORDER BY \`${orderBy}\` ${direction}
    `;
    const [rows] = await pool.execute(sql, values);
    res.json({ data: rows.map((row) => normalizeCmsRow(table, row)) });
  } catch (error) {
    console.error("List CMS data error:", error);
    res.status(error.status || 500).json({ message: error.message || "Could not load CMS data" });
  }
});

app.post("/api/cms/:table", requireCmsAdmin, async (req, res) => {
  try {
    const table = req.params.table;
    const config = getCmsConfig(table);
    const payload = req.body && typeof req.body === "object" ? req.body : {};
    const id = String(payload.id || crypto.randomUUID());
    const columns = config.columns.filter((column) => column === "id" || payload[column] !== undefined);

    if (!columns.includes("id")) {
      columns.unshift("id");
    }

    const values = columns.map((column) => (
      column === "id" ? id : serializeCmsValue(table, column, payload[column])
    ));
    const updateColumns = columns.filter((column) => column !== "id");
    const placeholders = columns.map(() => "?").join(", ");
    const updateSql = updateColumns.map((column) => `\`${column}\` = VALUES(\`${column}\`)`).join(", ");

    await pool.execute(
      `
        INSERT INTO \`${table}\` (${columns.map((column) => `\`${column}\``).join(", ")})
        VALUES (${placeholders})
        ${updateSql ? `ON DUPLICATE KEY UPDATE ${updateSql}` : ""}
      `,
      values,
    );

    const [rows] = await pool.execute(`SELECT * FROM \`${table}\` WHERE id = ? LIMIT 1`, [id]);
    res.status(payload.id ? 200 : 201).json({ data: normalizeCmsRow(table, rows[0]) });
  } catch (error) {
    console.error("Upsert CMS data error:", error);
    res.status(error.status || 500).json({ message: error.message || "Could not save CMS data" });
  }
});

app.delete("/api/cms/:table/:id", requireCmsAdmin, async (req, res) => {
  try {
    const table = req.params.table;
    getCmsConfig(table);
    const [result] = await pool.execute(`DELETE FROM \`${table}\` WHERE id = ?`, [req.params.id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "CMS item not found" });
    }
    res.json({ message: "CMS item deleted" });
  } catch (error) {
    console.error("Delete CMS data error:", error);
    res.status(error.status || 500).json({ message: error.message || "Could not delete CMS data" });
  }
});

app.post("/api/admin/bootstrap-super-admin", async (req, res) => {
  try {
    const bootstrapKey = String(req.body.bootstrap_key || "").trim();
    const expectedKey = String(process.env.SUPER_ADMIN_BOOTSTRAP_KEY || "").trim();
    if (!expectedKey || bootstrapKey !== expectedKey) {
      return res.status(403).json({ message: "Bootstrap authorization failed" });
    }

    const email = normalizeEmail(req.body.email || "");
    const password = String(req.body.password || "");
    const name = String(req.body.name || process.env.SUPER_ADMIN_NAME || "Super Admin").trim() || "Super Admin";
    const mobile = normalizeMobile(req.body.mobile || process.env.SUPER_ADMIN_MOBILE || "").trim();

    if (!email || !password || password.length < 6) {
      return res.status(400).json({ message: "Email and 6+ character password are required" });
    }

    const [existingSuperAdmins] = await pool.execute(
      "SELECT id FROM users WHERE type = 'super_admin' LIMIT 1",
    );
    if (existingSuperAdmins.length) {
      return res.status(409).json({ message: "A super_admin already exists" });
    }

    const [existingUsers] = await pool.execute(
      "SELECT * FROM users WHERE email = ? OR mobile = ? LIMIT 1",
      [email, mobile || email],
    );

    const passwordHash = await hashPassword(password);
    if (existingUsers.length) {
      const user = existingUsers[0];
      await pool.execute(
        "UPDATE users SET name = ?, mobile = ?, type = 'super_admin', email_verified = 1, password = ? WHERE id = ?",
        [name, mobile || user.mobile || email, passwordHash, user.id],
      );
      return res.status(200).json({ message: "Existing user promoted to super_admin" });
    }

    await pool.execute(
      "INSERT INTO users (name, mobile, address, email, password, type, email_verified) VALUES (?, ?, NULL, ?, ?, 'super_admin', 1)",
      [name, mobile || email, email, passwordHash],
    );

    res.status(201).json({ message: "Bootstrap super_admin created" });
  } catch (error) {
    console.error("Bootstrap super_admin error:", error);
    res.status(500).json({ message: "Could not bootstrap super_admin" });
  }
});

app.post("/api/admin/promote-super-admin", async (req, res) => {
  try {
    const bootstrapKey = String(req.body.bootstrap_key || "").trim();
    const expectedKey = String(process.env.SUPER_ADMIN_BOOTSTRAP_KEY || "").trim();
    if (!expectedKey || bootstrapKey !== expectedKey) {
      return res.status(403).json({ message: "Bootstrap authorization failed" });
    }

    const email = normalizeEmail(req.body.email || "");
    const mobile = normalizeMobile(req.body.mobile || "");
    if (!email && !mobile) {
      return res.status(400).json({ message: "Email or mobile is required" });
    }

    const identifier = email || mobile;
    const [rows] = await pool.execute(
      "SELECT id, type FROM users WHERE email = ? OR mobile = ? LIMIT 1",
      [identifier, identifier],
    );
    if (!rows.length) {
      return res.status(404).json({ message: "User not found" });
    }

    const user = rows[0];
    if (user.type === "super_admin") {
      return res.status(200).json({ message: "User is already super_admin" });
    }

    await pool.execute(
      "UPDATE users SET type = 'super_admin', email_verified = 1 WHERE id = ?",
      [user.id],
    );
    res.status(200).json({ message: "User promoted to super_admin" });
  } catch (error) {
    console.error("Promote super_admin error:", error);
    res.status(500).json({ message: "Could not promote user to super_admin" });
  }
});

app.post("/api/admin/users", requireSuperAdmin, async (req, res) => {
  try {
    console.log("Create user request:", { name: req.body.name, email: req.body.email, type: req.body.type, auth: req.auth?.type });
    const name = String(req.body.name || "").trim();
    const email = normalizeEmail(req.body.email || "");
    const mobile = normalizeMobile(req.body.mobile || "");
    const password = String(req.body.password || "");
    const type = String(req.body.type || "user").trim();

    if (!name || !email || !mobile || password.length < 6) {
      return res.status(400).json({ message: "Name, mobile, email and 6+ character password are required" });
    }
    if (!ALLOWED_ROLES.has(type)) {
      return res.status(400).json({ message: `Valid type is required. Got: ${type}. Allowed: ${Array.from(ALLOWED_ROLES).join(", ")}` });
    }

    const [existing] = await pool.execute(
      "SELECT id FROM users WHERE email = ? OR mobile = ? LIMIT 1",
      [email, mobile],
    );
    if (existing.length) {
      return res.status(409).json({ message: "A user already exists with this email or mobile" });
    }

    const passwordHash = await hashPassword(password);
    console.log("Inserting user:", { name, mobile, email, type });
    await pool.execute(
      "INSERT INTO users (name, mobile, address, email, password, type, email_verified) VALUES (?, ?, NULL, ?, ?, ?, 1)",
      [name, mobile, email, passwordHash, type],
    );

    const [rows] = await pool.execute(
      "SELECT id, name, mobile, address, email, type, email_verified, created_at, updated_at FROM users WHERE email = ? LIMIT 1",
      [email],
    );
    console.log("User created successfully:", rows[0]);
    res.status(201).json({ user: safeAdminUser(rows[0]) });
  } catch (error) {
    console.error("Create user error:", error);
    res.status(500).json({ message: "Could not create user: " + (error.message || "Unknown error") });
  }
});

app.get("/api/admin/users", requireSuperAdmin, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      "SELECT id, name, mobile, address, email, type, email_verified, created_at, updated_at FROM users ORDER BY created_at DESC",
    );
    res.json({ users: rows.map(safeAdminUser) });
  } catch (error) {
    console.error("List users error:", error);
    res.status(500).json({ message: "Could not load users" });
  }
});

app.get("/api/admin/types", requireSuperAdmin, (req, res) => {
  res.json({ types: Array.from(ALLOWED_ROLES) });
});

app.get("/api/users/me/profile", requireLoggedIn, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      "SELECT id, name, mobile, address, email, type, shop_name, shop_type FROM users WHERE id = ? LIMIT 1",
      [req.auth.id],
    );

    if (!rows.length) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(safeUser(rows[0]));
  } catch (error) {
    console.error("Get current user profile error:", error);
    res.status(500).json({ message: "Could not load user profile" });
  }
});

app.patch("/api/admin/users/:id/type", requireSuperAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const type = String(req.body.type || "").trim();
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: "Valid user id is required" });
    }
    if (!ALLOWED_ROLES.has(type)) {
      return res.status(400).json({ message: "Valid type is required" });
    }

    const [result] = await pool.execute("UPDATE users SET type = ? WHERE id = ?", [type, id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const [rows] = await pool.execute(
      "SELECT id, name, mobile, address, email, type, email_verified, created_at, updated_at FROM users WHERE id = ? LIMIT 1",
      [id],
    );
    res.json({ user: safeAdminUser(rows[0]) });
  } catch (error) {
    console.error("Update user type error:", error);
    res.status(500).json({ message: "Could not update user type" });
  }
});

app.post("/api/auth/signup/request-otp", async (req, res) => {
  try {
    const name = String(req.body.name || "").trim();
    const mobile = normalizeMobile(req.body.mobile);
    const address = String(req.body.address || "").trim();
    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password || "");
    const type = String(req.body.type || "user").trim();
    const shopName = String(req.body.shop_name || "").trim();
    const shopType = String(req.body.shop_type || "").trim();
    const allowedShopTypes = new Set(["grocery", "electronics", "fashion", "pharmacy", "others"]);

    if (!name || !email || !mobile) {
      return res.status(400).json({ message: "Name, mobile and email are required" });
    }
    if (!validatePasswordPolicy(password)) {
      return res.status(400).json({ message: passwordPolicyMessage });
    }
    if (!ALLOWED_ROLES.has(type)) {
      return res.status(400).json({ message: "Valid account type is required" });
    }
    if (type === "mart_vendor" && !shopName) {
      return res.status(400).json({ message: "Shop name is required for mart vendor signup" });
    }
    if (type === "mart_vendor" && !allowedShopTypes.has(shopType)) {
      return res.status(400).json({ message: "Valid shop type is required for mart vendor signup" });
    }

    const passwordHash = await hashPassword(password);
    const otp = String(crypto.randomInt(100000, 999999));
    const otpHash = hashValue(otp);
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    const [existing] = await pool.execute("SELECT id, email_verified FROM users WHERE email = ? OR mobile = ? LIMIT 1", [
      email,
      mobile,
    ]);

    if (existing.length && existing[0].email_verified) {
      return res.status(409).json({ message: "An account already exists with this email or mobile" });
    }

    if (existing.length) {
      await pool.execute(
        "UPDATE users SET name = ?, mobile = ?, address = ?, email = ?, password = ?, shop_name = ?, shop_type = ?, type = ?, otp_hash = ?, otp_expires_at = ? WHERE id = ?",
        [name, mobile, address || null, email, passwordHash, shopName || null, type === "mart_vendor" ? shopType : null, type, otpHash, expiresAt, existing[0].id],
      );
    } else {
      await pool.execute(
        "INSERT INTO users (name, mobile, address, email, password, shop_name, shop_type, type, otp_hash, otp_expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [name, mobile, address || null, email, passwordHash, shopName || null, type === "mart_vendor" ? shopType : null, type, otpHash, expiresAt],
      );
    }

    await sendOtpEmail(email, otp);
    res.json({ message: "OTP sent to your email" });
  } catch (error) {
    console.error("Signup OTP error:", error);
    const message =
      error.code === "SMTP_CONFIG_MISSING"
        ? error.message
        : "Could not send OTP email. Please check SMTP settings.";
    res.status(500).json({ message });
  }
});

app.post("/api/auth/signup/verify-otp", async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const otp = String(req.body.otp || "").trim();

    if (!email || !/^\d{6}$/.test(otp)) {
      return res.status(400).json({ message: "Valid email and 6-digit OTP are required" });
    }

    const [rows] = await pool.execute("SELECT * FROM users WHERE email = ? LIMIT 1", [email]);
    const user = rows[0];

    if (!user || user.otp_hash !== hashValue(otp)) {
      return res.status(400).json({ message: "Invalid OTP code" });
    }

    if (!user.otp_expires_at || new Date(user.otp_expires_at).getTime() < Date.now()) {
      return res.status(400).json({ message: "OTP has expired" });
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      await connection.execute(
        "UPDATE users SET email_verified = 1, otp_hash = NULL, otp_expires_at = NULL WHERE id = ?",
        [user.id],
      );

      if (user.type === "mart_vendor") {
        const shopName = user.shop_name || user.name || "Yess Mart Seller";
        const shopSlugBase = createSlug(shopName) || "seller";
        const shopSlug = `${shopSlugBase}-${user.id}`;
        await connection.execute(
          `
            INSERT INTO sellers (user_id, slug, shop_name, shop_type, seller_name, seller_email, seller_mobile, seller_address, seller_verified)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
            ON DUPLICATE KEY UPDATE
              slug = VALUES(slug),
              shop_name = VALUES(shop_name),
              shop_type = VALUES(shop_type),
              seller_name = VALUES(seller_name),
              seller_email = VALUES(seller_email),
              seller_mobile = VALUES(seller_mobile),
              seller_address = VALUES(seller_address),
              seller_verified = 1
          `,
          [
            user.id,
            shopSlug,
            shopName,
            user.shop_type || null,
            shopName,
            user.email,
            user.mobile,
            user.address || null,
          ],
        );
        await syncYServiceMartSeller(user);
      }

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    const verifiedUser = safeUser({ ...user, email_verified: 1, type: user.type || user.role || "user" });
    res.json({ message: "Account verified", user: verifiedUser, token: createToken(verifiedUser) });
  } catch (error) {
    console.error("Verify OTP error:", error);
    res.status(500).json({ message: "Could not verify OTP" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const identifier = String(req.body.identifier || "").trim();
    const password = String(req.body.password || "");

    if (!identifier || !password) {
      return res.status(400).json({ message: "Email/mobile and password are required" });
    }

    const isEmailLogin = identifier.includes("@");
    const normalizedIdentifier = isEmailLogin ? normalizeEmail(identifier) : normalizeMobile(identifier);
    const [rows] = await pool.execute(
      isEmailLogin
        ? "SELECT * FROM users WHERE email = ? LIMIT 1"
        : "SELECT * FROM users WHERE mobile = ? LIMIT 1",
      [normalizedIdentifier],
    );
    const user = rows[0];

    if (!user || !(await verifyPassword(password, user.password))) {
      return res.status(401).json({ message: "Invalid login details" });
    }

    if (!user.email_verified) {
      return res.status(403).json({ message: "Please verify your email OTP before login" });
    }

    const authUser = safeUser(user);
    res.json({ message: "Login successful", user: authUser, token: createToken(authUser) });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Login failed" });
  }
});

initDatabase()
  .then(() => {
    app.listen(PORT, () => {
      const backendBaseUrl = getBackendBaseUrl();
      console.log(`Server running on ${backendBaseUrl}`);
    });
  })
  .catch((error) => {
    console.error("Failed to start backend:", error);
    process.exit(1);
  });

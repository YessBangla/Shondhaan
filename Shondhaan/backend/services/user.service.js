import { pool } from "../config/db.js";

export const ALLOWED_USER_TYPES = new Set([
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

export function normalizeEmail(email = "") {
  return String(email).trim().toLowerCase();
}

export function normalizeMobile(mobile = "") {
  return String(mobile).trim();
}

export function normalizeUserType(type = "user") {
  const value = String(type || "user").trim().toLowerCase().replace(/[\s-]+/g, "_");
  return value;
}

export function safeUser(row = {}) {
  const normalizedType = normalizeUserType(row.type);
  const type = ALLOWED_USER_TYPES.has(normalizedType) ? normalizedType : "user";

  return {
    id: row.id,
    name: row.name,
    mobile: row.mobile,
    address: row.address ?? null,
    email: row.email,
    type,
    role: type,
    shop_name: row.shop_name ?? null,
    shop_type: row.shop_type ?? null,
    email_verified: Boolean(row.email_verified),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function findUserByEmail(email) {
  const [rows] = await pool.execute("SELECT * FROM users WHERE email = ? LIMIT 1", [
    normalizeEmail(email),
  ]);
  return rows[0] || null;
}

export async function findUserByIdentifier(identifier) {
  const value = String(identifier || "").includes("@")
    ? normalizeEmail(identifier)
    : normalizeMobile(identifier);

  const [rows] = await pool.execute(
    "SELECT * FROM users WHERE email = ? OR mobile = ? LIMIT 1",
    [value, value]
  );

  return rows[0] || null;
}

export async function findUserById(id) {
  const [rows] = await pool.execute("SELECT * FROM users WHERE id = ? LIMIT 1", [id]);
  return rows[0] || null;
}

export async function listUsers() {
  const [rows] = await pool.execute(
    "SELECT id, name, mobile, address, email, type, shop_name, shop_type, email_verified, created_at, updated_at FROM users ORDER BY created_at DESC"
  );
  return rows.map(safeUser);
}

export async function updateUserTypeById(id, type) {
  const normalizedType = normalizeUserType(type);

  if (!ALLOWED_USER_TYPES.has(normalizedType)) {
    const error = new Error("Invalid user type");
    error.statusCode = 400;
    throw error;
  }

  const [result] = await pool.execute("UPDATE users SET type = ? WHERE id = ?", [
    normalizedType,
    id,
  ]);

  if (result.affectedRows === 0) return null;
  return findUserById(id);
}
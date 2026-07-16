import { pool } from "../config/db.js";

// Keep user.type values consistent across backend
export const ALLOWED_USER_TYPES = new Set([
  "user",
  "provider",
  "mart_vendor",
  "admin",
  "super_admin",
]);

export const normalizeUserType = (type) => {
  if (!type) return "";
  return String(type).trim();
};

export const safeUser = (user) => {
  if (!user) return null;

  // Remove sensitive fields if present
  const { password, refresh_token, reset_token, ...rest } = user;
  return rest;
};

export const findUserById = async (id) => {
  if (!id) return null;

  const [rows] = await pool.query(
    "SELECT id, name, email, phone, address, avatar_url, created_at, role, type FROM users WHERE id = ? LIMIT 1",
    [id]
  );

  return rows?.[0] || null;
};

export const listUsers = async () => {
  const [rows] = await pool.query(
    "SELECT id, name, email, phone, address, avatar_url, created_at, role, type FROM users ORDER BY created_at DESC"
  );
  return rows;
};

export const updateUserTypeById = async (id, normalizedType) => {
  if (!id) return null;

  const mappedRole = normalizedType === "super_admin" ? "super_admin" : normalizedType;

  const [result] = await pool.query(
    "UPDATE users SET type = ?, role = ? WHERE id = ?",
    [normalizedType, mappedRole, id]
  );

  const affected = result?.affectedRows ?? 0;
  if (affected === 0) return null;

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

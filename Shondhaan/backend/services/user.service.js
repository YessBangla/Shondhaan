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

export const normalizeEmail = (email = "") => String(email).trim().toLowerCase();
export const normalizeMobile = (mobile = "") => String(mobile).trim();

export const normalizeUserType = (type) => {
  const normalized = String(type || "").trim();
  return ALLOWED_USER_TYPES.has(normalized) ? normalized : "";
};

export const safeUser = (user) => {
  if (!user) return null;

  const { password, refresh_token, reset_token, otp_hash, otp_expires_at, ...rest } = user;
  const type = normalizeUserType(rest.type || rest.role) || "user";

  return {
    ...rest,
    type,
    role: type,
  };
};

const USER_PROFILE_SELECT = `
  SELECT
    u.id,
    u.name,
    u.mobile,
    u.address,
    u.email,
    u.type,
    u.shop_name,
    u.shop_type,
    u.email_verified,
    u.created_at,
    u.updated_at,
    up.profile_image,
    up.bio,
    up.gender,
    up.date_of_birth,
    up.nid_front,
    up.nid_back,
    up.created_at AS profile_created_at,
    up.updated_at AS profile_updated_at
  FROM users u
  LEFT JOIN user_profiles up ON up.user_id = u.id
`;

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
  if (!id) return null;

  const [rows] = await pool.execute(`${USER_PROFILE_SELECT} WHERE u.id = ? LIMIT 1`, [id]);
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

  if (!normalizedType) {
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

export async function updateCurrentUserProfile(userId, payload = {}) {
  const userFields = [];
  const userValues = [];

  if (Object.prototype.hasOwnProperty.call(payload, "name")) {
    userFields.push("name = ?");
    userValues.push(String(payload.name || "").trim());
  }
  if (Object.prototype.hasOwnProperty.call(payload, "mobile")) {
    userFields.push("mobile = ?");
    userValues.push(normalizeMobile(payload.mobile || ""));
  }
  if (Object.prototype.hasOwnProperty.call(payload, "address")) {
    userFields.push("address = ?");
    const address = String(payload.address || "").trim();
    userValues.push(address || null);
  }

  if (userFields.length) {
    const [result] = await pool.execute(
      `UPDATE users SET ${userFields.join(", ")} WHERE id = ?`,
      [...userValues, userId]
    );
    if (result.affectedRows === 0) return null;
  }

  const profilePayload = {
    profile_image: payload.profile_image ?? payload.avatar_url,
    bio: payload.bio,
    gender: payload.gender,
    date_of_birth: payload.date_of_birth,
    nid_front: payload.nid_front,
    nid_back: payload.nid_back,
  };
  const profileEntries = Object.entries(profilePayload).filter(([, value]) => value !== undefined);

  if (profileEntries.length) {
    const values = profileEntries.map(([, value]) => {
      if (value === null) return null;
      const normalized = String(value).trim();
      return normalized || null;
    });

    const [existingProfiles] = await pool.execute(
      "SELECT id FROM user_profiles WHERE user_id = ? LIMIT 1",
      [userId]
    );

    if (existingProfiles.length) {
      await pool.execute(
        `UPDATE user_profiles SET ${profileEntries.map(([key]) => `${key} = ?`).join(", ")} WHERE id = ?`,
        [...values, existingProfiles[0].id]
      );
    } else {
      const columns = ["user_id", ...profileEntries.map(([key]) => key)];
      await pool.execute(
        `INSERT INTO user_profiles (${columns.join(", ")}) VALUES (${columns.map(() => "?").join(", ")})`,
        [userId, ...values]
      );
    }
  }

  return findUserById(userId);
}

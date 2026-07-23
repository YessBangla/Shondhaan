import { ALLOWED_ROLES } from "../config/constants.js";

export function safeUser(row) {
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

export function safeAdminUser(row) {
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
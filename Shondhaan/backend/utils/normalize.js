export const normalizeEmail = (email = "") => email.trim().toLowerCase();
export const normalizeMobile = (mobile = "") => mobile.trim();
export const createSlug = (value = "") =>
  String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u0980-\u09FF]+/g, "-")
    .replace(/(^-|-$)/g, "");
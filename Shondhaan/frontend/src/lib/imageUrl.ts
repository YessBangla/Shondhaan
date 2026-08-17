const MART_API_BASE = import.meta.env.VITE_MART_API_BASE_URL || "http://localhost:8081";

export const getFullImageUrl = (path?: string | null): string => {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  const base = MART_API_BASE.replace(/\/+$/, "");
  return `${base}${path.startsWith("/") ? path : "/" + path}`;
};
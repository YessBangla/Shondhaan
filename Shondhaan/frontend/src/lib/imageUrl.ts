const MART_API_BASE = import.meta.env.VITE_MART_API_BASE_URL || "";

export const getFullImageUrl = (path?: string | null): string => {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  const base = MART_API_BASE.replace(/\/+$/, "");
  return `${base}${path.startsWith("/") ? path : "/" + path}`;
};

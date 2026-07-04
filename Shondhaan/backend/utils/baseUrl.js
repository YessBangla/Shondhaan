const normalizeBaseUrl = (value = "") => String(value || "").trim().replace(/\/$/, "");

const getBackendBaseUrl = () => {
  const configured = process.env.BACKEND_URL || process.env.API_BASE || process.env.BASE_URL;
  if (configured) return normalizeBaseUrl(configured);

  const port = process.env.PORT || 5000;
  return `http://localhost:${port}`;
};

export { normalizeBaseUrl, getBackendBaseUrl };
export default getBackendBaseUrl;

export const CENTRAL_API_BASE_URL =
  import.meta.env.VITE_CENTRAL_API_BASE_URL || import.meta.env.VITE_API_BASE_URL || "";

export const INDIVIDUAL_API_BASE_URL =
  import.meta.env.VITE_SERVICE_API_BASE_URL || "";

export const YESSJOB_API_BASE_URL =
  import.meta.env.VITE_YESSJOB_API_URL || "";

export const MART_API_BASE_URL = import.meta.env.VITE_MART_API_BASE_URL || "";
export const DEAL_API_BASE_URL = import.meta.env.VITE_DEAL_API_BASE_URL || "";

export const trimApiBaseUrl = (value: string) => value.replace(/\/+$/, "");

export const requireApiBaseUrl = (value: string, name: string) => {
  if (!value) throw new Error(`${name} is not configured`);
  return trimApiBaseUrl(value);
};

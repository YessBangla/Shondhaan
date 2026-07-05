import { ROLES, type RoleKey } from "@/config/roles";
import { CENTRAL_API_BASE_URL } from "@/lib/api";

export interface MySqlAuthUser {
  id: number;
  name: string;
  mobile: string;
  address: string | null;
  email: string;
  type: RoleKey;
  role?: RoleKey;
  shop_name?: string | null;
  shop_type?: string | null;
}

interface AuthResponse {
  message: string;
  user: MySqlAuthUser;
  token: string;
}

const API_BASE_URL = CENTRAL_API_BASE_URL.replace(/\/+$/, "");
const STORAGE_KEY = "yess_mysql_auth";
const VALID_ROLES = new Set(ROLES.map((role) => role.key));

const normalizeRoleKey = (value?: string | null) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_") as RoleKey;

async function request<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail =
      data.error && data.error !== data.message ? ` (${data.error})` : "";
    const error = new Error(`${data.message || "Request failed"}${detail}`);
    (error as Error & { status?: number }).status = response.status;
    throw error;
  }
  return data as T;
}

export async function requestSignupOtp(payload: {
  name: string;
  mobile: string;
  address: string;
  email: string;
  password: string;
  type?: RoleKey | string;
  shop_name?: string;
  shop_type?: string;
}) {
  return request<{ message: string }>("/api/auth/signup/request-otp", payload);
}

export async function verifySignupOtp(payload: { email: string; otp: string }) {
  const data = await request<AuthResponse>("/api/auth/signup/verify-otp", payload);
  saveMySqlAuth(data);
  return data;
}

export async function loginWithMySql(payload: { identifier: string; password: string }) {
  const data = await request<AuthResponse>("/api/auth/login", payload);
  saveMySqlAuth(data);
  return data;
}

export async function listMySqlUsers() {
  const auth = getMySqlAuth();
  if (!auth?.token) throw new Error("Login is required");
  const response = await fetch(`${API_BASE_URL}/api/admin/users`, {
    headers: { Authorization: `Bearer ${auth.token}` },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Could not load users");
  return data as {
    users: Array<{
      id: number;
      name: string;
      mobile: string;
      address: string | null;
      email: string;
      type: RoleKey;
      email_verified: boolean;
      created_at: string;
      updated_at: string;
    }>;
  };
}

export async function createMySqlUser(payload: {
  name: string;
  mobile: string;
  address?: string | null;
  email: string;
  password: string;
  type: RoleKey;
}) {
  const auth = getMySqlAuth();
  console.log("createMySqlUser: auth =", auth);
  if (!auth?.token) throw new Error("Login is required");
  console.log("createMySqlUser: sending request to", `${API_BASE_URL}/api/admin/users`, "with token", auth.token.substring(0, 20) + "...");
  const response = await fetch(`${API_BASE_URL}/api/admin/users`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${auth.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  console.log("createMySqlUser: response status", response.status);
  const data = await response.json().catch(() => ({}));
  console.log("createMySqlUser: response data", data);
  if (!response.ok) throw new Error(data.message || "Could not create user");
  return data as {
    user: {
      id: number;
      name: string;
      mobile: string;
      address: string | null;
      email: string;
      type: RoleKey;
      email_verified: boolean;
      created_at: string;
      updated_at: string;
    };
  };
}

export async function bootstrapMySqlSuperAdmin(payload: {
  bootstrap_key: string;
  email: string;
  password: string;
  name?: string;
  mobile?: string;
}) {
  const response = await fetch(`${API_BASE_URL}/api/admin/bootstrap-super-admin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Could not bootstrap super admin");
  return data as { message: string };
}

export async function updateMySqlUserType(userId: number, type: RoleKey) {
  const auth = getMySqlAuth();
  if (!auth?.token) throw new Error("Login is required");
  const response = await fetch(`${API_BASE_URL}/api/admin/users/${userId}/type`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${auth.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ type }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Could not update user type");
  return data as {
    user: {
      id: number;
      name: string;
      mobile: string;
      address: string | null;
      email: string;
      type: RoleKey;
      email_verified: boolean;
      created_at: string;
      updated_at: string;
    };
  };
}

export function saveMySqlAuth(data: AuthResponse) {
  data.user.type = normalizeRoleKey(data.user.type || data.user.role || "user");
  data.user.role = data.user.type;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  window.dispatchEvent(new Event("yess-mysql-auth-changed"));
}

export function getMySqlAuth(): AuthResponse | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as AuthResponse;
    if (!data?.token || !data?.user) return null;

    const type = normalizeRoleKey(data.user.type || data.user.role);
    if (!type || !VALID_ROLES.has(type)) return null;

    data.user.type = type;
    data.user.role = type;
    return data;
  } catch {
    return null;
  }
}

export function clearMySqlAuth() {
  localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new Event("yess-mysql-auth-changed"));
}

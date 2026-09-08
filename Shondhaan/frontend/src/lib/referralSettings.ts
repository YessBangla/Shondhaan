import { getMySqlAuth } from "@/lib/mysqlAuth";

const API_BASE = import.meta.env.VITE_CENTRAL_API_BASE_URL || "";

export async function fetchReferralSettings() {
  const mysqlAuth = getMySqlAuth();

  const res = await fetch(`${API_BASE}/api/referral/config`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(mysqlAuth?.token ? { Authorization: `Bearer ${mysqlAuth.token}` } : {}),
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch referral settings: ${res.status}`);
  }

  const json = await res.json();
  return json.data ?? json;
}
const API_BASE = import.meta.env.VITE_CENTRAL_API_BASE_URL || "";

export async function fetchReferralSettings(token?: string) {
  const res = await fetch(`${API_BASE}/api/referral/config`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch referral settings: ${res.status}`);
  }

  const json = await res.json();
  return json.data ?? json;
}
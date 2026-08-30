import Cookies from "js-cookie";

const REFERRAL_COOKIE_KEY = "shondhaan_ref_code";
const REFERRAL_COOKIE_DAYS = 30; // matches your qualification_window_days default; adjust if needed

export function captureReferralCodeFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const refCode = params.get("ref");

  if (refCode && refCode.trim()) {
    // Don't overwrite an existing stored code with a new visit's code,
    // unless you WANT the latest link clicked to always win — see note below
    Cookies.set(REFERRAL_COOKIE_KEY, refCode.trim().toUpperCase(), {
      expires: REFERRAL_COOKIE_DAYS,
      sameSite: "Lax",
    });
  }
}

export function getStoredReferralCode(): string | null {
  return Cookies.get(REFERRAL_COOKIE_KEY) || null;
}

export function clearStoredReferralCode() {
  Cookies.remove(REFERRAL_COOKIE_KEY);
}


export async function applyReferralIfPresent(apiBase: string, token: string) {
  const code = getStoredReferralCode();
  if (!code) return null;

  try {
    const res = await fetch(`${apiBase}/api/referral/apply`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ code }),
    });
    const data = await res.json().catch(() => ({}));

    // ALREADY_REFERRED / SELF_REFERRAL / etc. are expected outcomes, not errors —
    // don't throw, just report back so the caller can decide what to do
    if (data.success) {
      clearStoredReferralCode(); // referral is now linked, no need to keep the cookie
    }
    return data;
  } catch (err) {
    console.error("applyReferralIfPresent error:", err);
    return null;
  }
}
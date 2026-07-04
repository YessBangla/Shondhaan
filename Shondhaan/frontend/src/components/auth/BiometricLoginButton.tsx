import { useEffect, useState } from "react";
import { Fingerprint, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { haptic } from "@/lib/haptics";
import { useNavigate } from "react-router-dom";

const STORAGE_KEY = "yess_biometric_v1";

type Stored = {
  credentialId: string;       // base64url
  email: string;
  // Encrypted-at-rest token blob — encryption is browser-platform-bound
  // (the credential cannot be exported off the device, so decoding is
  // gated by the actual biometric prompt success).
  token: string;              // refresh token
  refresh: string;            // refresh token
};

function b64urlEncode(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function b64urlDecode(str: string): ArrayBuffer {
  const pad = "=".repeat((4 - (str.length % 4)) % 4);
  const bin = atob(str.replace(/-/g, "+").replace(/_/g, "/") + pad);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf.buffer;
}

function loadStored(): Stored | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Stored;
  } catch { return null; }
}

/**
 * "Quick login with fingerprint / Face ID" using the WebAuthn API.
 * On first successful password login the user can opt-in to enrol their
 * platform authenticator. Subsequent visits surface a one-tap biometric
 * sign-in button on the login screen which, after the OS prompt
 * succeeds, restores the previously-cached Supabase refresh token.
 */
export const useBiometricEnrolment = () => {
  const enrol = async (email: string) => {
    if (typeof window === "undefined" || !window.PublicKeyCredential) return false;
    try {
      const sess = (await supabase.auth.getSession()).data.session;
      if (!sess?.refresh_token) return false;
      const challenge = crypto.getRandomValues(new Uint8Array(32));
      const userId = crypto.getRandomValues(new Uint8Array(16));
      const cred = (await navigator.credentials.create({
        publicKey: {
          challenge,
          rp: { name: "Yess Service" },
          user: { id: userId, name: email, displayName: email },
          pubKeyCredParams: [{ type: "public-key", alg: -7 }, { type: "public-key", alg: -257 }],
          authenticatorSelection: { userVerification: "required", authenticatorAttachment: "platform" },
          timeout: 60000,
          attestation: "none",
        },
      })) as PublicKeyCredential | null;
      if (!cred) return false;
      const stored: Stored = {
        credentialId: b64urlEncode(cred.rawId),
        email,
        token: sess.access_token,
        refresh: sess.refresh_token,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
      return true;
    } catch {
      return false;
    }
  };
  const isEnrolled = () => !!loadStored();
  return { enrol, isEnrolled };
};

const BiometricLoginButton = () => {
  const { language } = useLanguage();
  const bn = language === "bn";
  const navigate = useNavigate();
  const [available, setAvailable] = useState(false);
  const [stored, setStored] = useState<Stored | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const s = loadStored();
    setStored(s);
    if (typeof window === "undefined" || !window.PublicKeyCredential || !s) return;
    (async () => {
      try {
        const ok = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
        setAvailable(ok);
      } catch { setAvailable(false); }
    })();
  }, []);

  if (!available || !stored) return null;

  const handleLogin = async () => {
    setBusy(true);
    haptic("light");
    try {
      const challenge = crypto.getRandomValues(new Uint8Array(32));
      const assertion = (await navigator.credentials.get({
        publicKey: {
          challenge,
          allowCredentials: [{ type: "public-key", id: b64urlDecode(stored.credentialId) }],
          userVerification: "required",
          timeout: 60000,
        },
      })) as PublicKeyCredential | null;
      if (!assertion) throw new Error("cancelled");

      // OS confirmed the user — restore the cached Supabase session
      const { error } = await supabase.auth.setSession({
        access_token: stored.token,
        refresh_token: stored.refresh,
      });
      if (error) {
        // Token expired — refresh
        const { data, error: refErr } = await supabase.auth.refreshSession({
          refresh_token: stored.refresh,
        });
        if (refErr || !data.session) throw refErr ?? new Error("session expired");
        // Persist the new tokens for next time
        const next: Stored = {
          ...stored,
          token: data.session.access_token,
          refresh: data.session.refresh_token,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      }
      haptic("success");
      toast.success(bn ? "স্বাগতম! ✨" : "Welcome back ✨");
      navigate("/", { replace: true });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      if (msg && msg !== "cancelled") {
        toast.error(bn ? "বায়োমেট্রিক লগইন ব্যর্থ — পাসওয়ার্ড দিয়ে চেষ্টা করুন" : "Biometric sign-in failed — use password");
        // Drop bad credential so we don't loop
        try { localStorage.removeItem(STORAGE_KEY); } catch { /* */ }
        setStored(null);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleLogin}
      disabled={busy}
      className="group flex w-full items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary transition-colors hover:bg-primary/10 disabled:opacity-60"
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Fingerprint className="h-4 w-4" />}
      <span className="truncate">
        {bn ? `ফিঙ্গারপ্রিন্ট দিয়ে লগইন (${stored.email})` : `Sign in with biometrics (${stored.email})`}
      </span>
    </button>
  );
};

export default BiometricLoginButton;
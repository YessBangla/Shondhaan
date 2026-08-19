// src/contexts/ReferralContext.tsx

import { createContext, useContext, useEffect, useState, useCallback, useRef, type ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { haptic } from "@/lib/haptics";
import { toast } from "sonner";

/* ───────── Types ───────── */

interface ReferralCode {
  code: string;
  link: string;
  used_count: number;
  max_uses: number;
  remaining: number;
  created_at: string;
  expires_at: string | null;
}

interface ReferralEntry {
  status: string;
  created_at: string;
  qualified_at: string | null;
  rewarded_at: string | null;
  referred_name: string;
  referred_avatar: string | null;
}

interface RewardEntry {
  id: number;
  role: string;
  reward_currency: string;
  reward_amount: number;
  status: string;
  created_at: string;
  claimed_at: string | null;
  expires_at: string;
}

interface ReferralSummary {
  total_referred: number;
  pending: number;
  qualified: number;
  rewarded: number;
  total_earned: number;
  pending_rewards: number;
}

interface ReferralStats {
  code: ReferralCode | null;
  referrals: ReferralEntry[];
  rewards: RewardEntry[];
  summary: ReferralSummary;
}

interface ValidatedCode {
  valid: true;
  referrer_name: string;
  referrer_avatar: string | null;
  referred_reward_type: string;
  referred_reward_amount: number;
  remaining_uses: number;
}

interface ReferralContextValue {
  stats: ReferralStats | null;
  loading: boolean;
  pendingCode: string | null;
  validatedCode: ValidatedCode | null;
  applied: boolean;
  generateCode: (opts?: { max_uses?: number }) => Promise<string | null>;
  applyCode: (code: string) => Promise<boolean>;
  claimReward: (rewardId: number) => Promise<boolean>;
  qualifyReferral: (referralId: number, orderId?: string) => Promise<boolean>;
  validateCode: (code: string) => Promise<ValidatedCode | null>;
  clearPending: () => void;
  refreshStats: () => Promise<void>;
}

/* ───────── Context ───────── */

const ReferralContext = createContext<ReferralContextValue | null>(null);

const API = "/api/referral";

function getInitialCode(): string | null {
  const pathMatch = window.location.pathname.match(/^\/ref\/([A-Z2-9]{6,12})$/i);
  const code = pathMatch?.[1]?.toUpperCase()
    || new URLSearchParams(window.location.search).get("ref")?.toUpperCase()
    || null;
  if (code) {
    sessionStorage.setItem("pending_referral_code", code);
    return code;
  }
  return sessionStorage.getItem("pending_referral_code");
}

export function ReferralProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const isAuth = user !== null; // matches your auth pattern

  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [pendingCode, setPendingCode] = useState<string | null>(getInitialCode);
  const [validatedCode, setValidatedCode] = useState<ValidatedCode | null>(null);
  const [applied, setApplied] = useState(false);
  const applyingRef = useRef(false);

  // Validate pending code
  useEffect(() => {
    if (!pendingCode) {
      setValidatedCode(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API}/validate/${pendingCode}`);
        const data = await res.json();
        if (!cancelled) setValidatedCode(data.valid ? data : null);
      } catch {
        if (!cancelled) setValidatedCode(null);
      }
    })();
    return () => { cancelled = true; };
  }, [pendingCode]);

  // ─── AUTO-APPLY when user becomes authenticated ───
  useEffect(() => {
    if (!isAuth || !pendingCode || applied || applyingRef.current) return;
    applyingRef.current = true;

    (async () => {
      try {
        const res = await fetch(`${API}/apply`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ code: pendingCode }),
        });
        const data = await res.json();

        if (data.success) {
          setApplied(true);
          haptic("success");
          sessionStorage.removeItem("pending_referral_code");
          setPendingCode(null);
          setValidatedCode(null);
          toast.success(
            data.your_reward
              ? `🎉 Referral applied! You got ৳${data.your_reward.value} reward!`
              : "🎉 Referral applied successfully!"
          );
          refreshStats();
        } else {
          // Failed — clear so it doesn't keep retrying
          sessionStorage.removeItem("pending_referral_code");
          setPendingCode(null);
          setValidatedCode(null);
          if (data.reason !== "ALREADY_REFERRED") {
            console.warn("Referral apply failed:", data.reason);
          }
        }
      } catch {
        // Network error — don't clear, will retry when auth re-checks
      } finally {
        applyingRef.current = false;
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuth]);

  const refreshStats = useCallback(async () => {
    if (!isAuth) {
      setStats(null);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API}/stats`, { credentials: "include" });
      if (res.ok) setStats(await res.json());
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [isAuth]);

  useEffect(() => {
    refreshStats();
  }, [refreshStats]);

  const clearPending = useCallback(() => {
    sessionStorage.removeItem("pending_referral_code");
    setPendingCode(null);
    setValidatedCode(null);
  }, []);

  const generateCode = useCallback(async (opts?: { max_uses?: number }) => {
    try {
      const res = await fetch(`${API}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(opts),
      });
      const data = await res.json();
      if (data.success) {
        haptic("medium");
        await refreshStats();
        return data.link as string;
      }
      toast.error(data.error || "Failed to generate code");
      return null;
    } catch {
      toast.error("Network error");
      return null;
    }
  }, [refreshStats]);

  const applyCode = useCallback(async (code: string) => {
    try {
      const res = await fetch(`${API}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (data.success) {
        haptic("success");
        clearPending();
        setApplied(true);
        await refreshStats();
        return true;
      }
      toast.error(data.reason || "Failed to apply referral");
      return false;
    } catch {
      toast.error("Network error");
      return false;
    }
  }, [refreshStats, clearPending]);

  const claimReward = useCallback(async (rewardId: number) => {
    try {
      const res = await fetch(`${API}/claim/${rewardId}`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (data.success) {
        haptic("success");
        toast.success("Reward claimed!");
        await refreshStats();
        return true;
      }
      toast.error(data.reason || "Failed to claim");
      return false;
    } catch {
      return false;
    }
  }, [refreshStats]);

  const qualifyReferral = useCallback(async (referralId: number, orderId?: string) => {
    try {
      const res = await fetch(`${API}/qualify/${referralId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ order_id: orderId }),
      });
      const data = await res.json();
      if (data.success) {
        haptic("success");
        await refreshStats();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, [refreshStats]);

  const validateCode = useCallback(async (code: string) => {
    try {
      const res = await fetch(`${API}/validate/${code}`);
      const data = await res.json();
      return data.valid ? (data as ValidatedCode) : null;
    } catch {
      return null;
    }
  }, []);

  return (
    <ReferralContext.Provider
      value={{
        stats,
        loading,
        pendingCode,
        validatedCode,
        applied,
        generateCode,
        applyCode,
        claimReward,
        qualifyReferral,
        validateCode,
        clearPending,
        refreshStats,
      }}
    >
      {children}
    </ReferralContext.Provider>
  );
}

export function useReferral() {
  const ctx = useContext(ReferralContext);
  if (!ctx) throw new Error("useReferral must be used within ReferralProvider");
  return ctx;
}
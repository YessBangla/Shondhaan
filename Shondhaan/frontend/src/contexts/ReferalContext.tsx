// src/contexts/ReferralContext.tsx

import { 
  createContext, useContext, useEffect, useState, useCallback, useRef, 
  type ReactNode 
} from "react";
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

type ReferralStatus = "pending" | "qualified" | "rewarded" | "expired";
type RewardStatus = "pending" | "available" | "claimed" | "expired";
type CurrencyType = "CASH" | "COIN";

interface ReferralEntry {
  id: number;
  status: ReferralStatus;
  created_at: string;
  qualified_at: string | null;
  rewarded_at: string | null;
  referred_name: string;
}

interface RewardEntry {
  id: number;
  role: "referrer" | "referred";
  reward_currency: CurrencyType;
  reward_amount: number;
  status: RewardStatus;
  order_id: string | null;
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
  code: string;
  referrer_name: string;
  referred_reward_type: string;
  referred_reward_amount: number;
  min_order_amount: number | null;
  remaining_uses: number;
}

interface YourReward {
  type: string;
  value: number;
}

interface ApplyResponse {
  success: boolean;
  reason?: string;
  message?: string;
  referral_id?: number;
  your_reward?: YourReward;
}

interface ClaimResponse {
  success: boolean;
  reason?: string;
  reward?: { type: CurrencyType; value: number };
}

interface ReferralContextValue {
  stats: ReferralStats | null;
  loading: boolean;
  claimingId: number | null;
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

/* ───────── Config ───────── */

const CENTRAL_API_BASE = 
  import.meta.env.VITE_CENTRAL_API_BASE_URL || 
  import.meta.env.VITE_API_BASE_URL || 
  "http://localhost:5000";

const API = `${CENTRAL_API_BASE}/api/referral`;
const MAX_APPLY_RETRIES = 3;

const REWARD_CURRENCY_SYMBOLS: Record<string, string> = {
  WALLET_CASH: "৳",
  WALLET_COIN: "🪙",
  CASH: "৳",
  COIN: "🪙",
};

/* ───────── Helpers ───────── */

function formatReward(reward: YourReward): string {
  const symbol = REWARD_CURRENCY_SYMBOLS[reward.type] || "৳";
  return `${symbol}${reward.value}`;
}

// ✅ Simple headers - NO Authorization header, rely on cookie
function getHeaders(): HeadersInit {
  return {
    "Content-Type": "application/json",
  };
}

function getInitialCode(): string | null {
  if (typeof window === "undefined") return null;

  try {
    const pathMatch = window.location.pathname.match(/^\/ref\/([A-Z2-9]{6,12})$/i);
    const code = pathMatch?.[1]?.toUpperCase()
      || new URLSearchParams(window.location.search).get("ref")?.toUpperCase()
      || null;

    if (code) {
      sessionStorage.setItem("pending_referral_code", code);
      return code;
    }

    return sessionStorage.getItem("pending_referral_code");
  } catch {
    return null;
  }
}

function safeSessionStorage() {
  try {
    return sessionStorage;
  } catch {
    return {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
    };
  }
}

/* ───────── Context ───────── */

const ReferralContext = createContext<ReferralContextValue | null>(null);

export function ReferralProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const isAuth = user !== null;

  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [claimingId, setClaimingId] = useState<number | null>(null);
  const [pendingCode, setPendingCode] = useState<string | null>(getInitialCode);
  const [validatedCode, setValidatedCode] = useState<ValidatedCode | null>(null);
  const [applied, setApplied] = useState(false);

  // Refs for stable access in effects
  const applyingRef = useRef(false);
  const retryCountRef = useRef(0);
  const pendingStatsRequestRef = useRef<AbortController | null>(null);
  const refreshStatsRef = useRef<() => Promise<void>>(() => Promise.resolve());

  // Reset state on logout
  useEffect(() => {
    if (!isAuth) {
      setApplied(false);
      setStats(null);
      setLoading(false);
      setClaimingId(null);
      retryCountRef.current = 0;
    }
  }, [isAuth]);

  // ─── Validate pending code ───
  useEffect(() => {
    if (!pendingCode) {
      setValidatedCode(null);
      return;
    }

    const controller = new AbortController();

    (async () => {
      try {
        const res = await fetch(`${API}/validate/${pendingCode}`, {
          signal: controller.signal,
        });
        const data = await res.json();
        
        if (!controller.signal.aborted) {
          setValidatedCode(data.valid ? data : null);
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        if (!controller.signal.aborted) {
          setValidatedCode(null);
        }
      }
    })();

    return () => controller.abort();
  }, [pendingCode]);

  // ─── Refresh stats ───
  const refreshStats = useCallback(async () => {
    if (!isAuth) {
      setStats(null);
      return;
    }

    pendingStatsRequestRef.current?.abort();
    const controller = new AbortController();
    pendingStatsRequestRef.current = controller;

    setLoading(true);

    try {
      const res = await fetch(`${API}/stats`, {
        headers: getHeaders(),
        credentials: "include",
        signal: controller.signal,
      });

      if (controller.signal.aborted) return;

      if (res.ok) {
        setStats(await res.json());
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      if (import.meta.env.DEV) {
        console.warn("Failed to fetch referral stats:", err);
      }
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, [isAuth]);

  // Keep ref updated
  useEffect(() => {
    refreshStatsRef.current = refreshStats;
  }, [refreshStats]);

  // Fetch stats on auth change
  useEffect(() => {
    if (isAuth) {
      refreshStats();
    }
  }, [isAuth, refreshStats]);

  // ─── Auto-apply when authenticated ───
  useEffect(() => {
    if (!isAuth || !pendingCode || applied || applyingRef.current) return;

    applyingRef.current = true;

    (async () => {
      try {
        const res = await fetch(`${API}/apply`, {
          method: "POST",
          headers: getHeaders(),
          credentials: "include",
          body: JSON.stringify({ code: pendingCode }),
        });
        
        const data: ApplyResponse = await res.json();

        if (data.success) {
          setApplied(true);
          haptic("success");
          safeSessionStorage().removeItem("pending_referral_code");
          setPendingCode(null);
          setValidatedCode(null);
          retryCountRef.current = 0;

          toast.success(
            data.your_reward
              ? `🎉 Referral applied! You got ${formatReward(data.your_reward)} reward!`
              : "🎉 Referral applied successfully!"
          );

          refreshStatsRef.current();
        } else {
          safeSessionStorage().removeItem("pending_referral_code");
          setPendingCode(null);
          setValidatedCode(null);
          retryCountRef.current = 0;

          if (data.reason !== "ALREADY_REFERRED") {
            if (import.meta.env.DEV) {
              console.warn("Referral apply failed:", data.reason || data.message);
            }
          }
        }
      } catch {
        retryCountRef.current += 1;
        if (retryCountRef.current >= MAX_APPLY_RETRIES) {
          safeSessionStorage().removeItem("pending_referral_code");
          setPendingCode(null);
          setValidatedCode(null);
        }
      } finally {
        applyingRef.current = false;
      }
    })();
  }, [isAuth, pendingCode, applied]);

  // ─── Actions ───

  const clearPending = useCallback(() => {
    safeSessionStorage().removeItem("pending_referral_code");
    setPendingCode(null);
    setValidatedCode(null);
  }, []);

  const generateCode = useCallback(async (opts?: { max_uses?: number }) => {
    try {
      const res = await fetch(`${API}/generate`, {
        method: "POST",
        headers: getHeaders(),
        credentials: "include",
        body: JSON.stringify(opts),
      });
      const data = await res.json();

      if (data.success) {
        haptic("medium");
        await refreshStatsRef.current();
        return data.link as string;
      }

      toast.error(data.error || "Failed to generate code");
      return null;
    } catch {
      toast.error("Network error");
      return null;
    }
  }, []);

  const applyCode = useCallback(async (code: string) => {
    if (!code?.trim()) {
      toast.error("Please enter a referral code");
      return false;
    }

    try {
      const res = await fetch(`${API}/apply`, {
        method: "POST",
        headers: getHeaders(),
        credentials: "include",
        body: JSON.stringify({ code: code.trim().toUpperCase() }),
      });
      const data: ApplyResponse = await res.json();

      if (data.success) {
        haptic("success");
        clearPending();
        setApplied(true);
        await refreshStatsRef.current();
        return true;
      }

      const errorMessages: Record<string, string> = {
        INVALID_CODE: "Invalid referral code format",
        CODE_NOT_FOUND: "Referral code not found or expired",
        SELF_REFERRAL: "You cannot use your own referral code",
        ALREADY_REFERRED: "You have already used a referral code",
        MAX_USES_REACHED: "This referral code has reached its usage limit",
        REFERRALS_DISABLED: "Referrals are currently disabled",
        MIN_ORDER_NOT_MET: "Minimum order amount not met",
      };

      toast.error(errorMessages[data.reason || ""] || data.message || "Failed to apply referral");
      return false;
    } catch {
      toast.error("Network error");
      return false;
    }
  }, [clearPending]);

  const claimReward = useCallback(async (rewardId: number) => {
    if (claimingId === rewardId) return false;

    setClaimingId(rewardId);

    try {
      const res = await fetch(`${API}/claim/${rewardId}`, {
        method: "POST",
        headers: getHeaders(),
        credentials: "include",
      });
      const data: ClaimResponse = await res.json();

      if (data.success) {
        haptic("success");
        toast.success(
          data.reward
            ? `Reward claimed! ${formatReward(data.reward as YourReward)} added to your wallet`
            : "Reward claimed!"
        );
        await refreshStatsRef.current();
        return true;
      }

      toast.error(data.reason || "Failed to claim reward");
      return false;
    } catch {
      toast.error("Network error");
      return false;
    } finally {
      setClaimingId(null);
    }
  }, [claimingId]);

  const qualifyReferral = useCallback(async (referralId: number, orderId?: string) => {
    try {
      const res = await fetch(`${API}/qualify/${referralId}`, {
        method: "POST",
        headers: getHeaders(),
        credentials: "include",
        body: JSON.stringify({ order_id: orderId }),
      });
      const data = await res.json();

      if (data.success) {
        haptic("success");
        await refreshStatsRef.current();
        return true;
      }

      if (import.meta.env.DEV) {
        console.warn("Qualify referral failed:", data.reason || data.message);
      }
      return false;
    } catch {
      if (import.meta.env.DEV) {
        console.warn("Qualify referral network error");
      }
      return false;
    }
  }, []);

  const validateCode = useCallback(async (code: string) => {
    if (!code?.trim()) return null;

    try {
      const res = await fetch(`${API}/validate/${code.trim().toUpperCase()}`);
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
        claimingId,
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
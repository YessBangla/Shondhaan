import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

const KEY = "yess_loyalty_wallet_v1";

export interface LoyaltyState {
  points: number;
  tier: "bronze" | "silver" | "gold" | "platinum";
  streakDays: number;
  lastActiveDate: string; // YYYY-MM-DD
  history: Array<{ id: string; delta: number; reason: string; ts: number }>;
}

const initial: LoyaltyState = {
  points: 0,
  tier: "bronze",
  streakDays: 0,
  lastActiveDate: "",
  history: [],
};

const tierFor = (pts: number): LoyaltyState["tier"] =>
  pts >= 5000 ? "platinum" : pts >= 2000 ? "gold" : pts >= 500 ? "silver" : "bronze";

const today = () => new Date().toISOString().slice(0, 10);

function read(): LoyaltyState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return initial;
    return { ...initial, ...JSON.parse(raw) };
  } catch {
    return initial;
  }
}

function write(s: LoyaltyState) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {}
}

/** Tiny gamified wallet — fully on-device. Pair with backend later if needed. */
export function useLoyaltyWallet() {
  const [state, setState] = useState<LoyaltyState>(() => read());

  // Daily login streak — auto-runs once per mount per day.
  useEffect(() => {
    const t = today();
    if (state.lastActiveDate === t) return;
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const continued = state.lastActiveDate === yesterday;
    const streak = continued ? state.streakDays + 1 : 1;
    const bonus = 5 + Math.min(streak, 7) * 2;
    const next: LoyaltyState = {
      ...state,
      points: state.points + bonus,
      tier: tierFor(state.points + bonus),
      streakDays: streak,
      lastActiveDate: t,
      history: [
        { id: `s-${Date.now()}`, delta: bonus, reason: `Daily streak (Day ${streak})`, ts: Date.now() },
        ...state.history,
      ].slice(0, 50),
    };
    setState(next);
    write(next);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const award = useCallback((delta: number, reason: string, silent = false) => {
    setState((s) => {
      const points = Math.max(0, s.points + delta);
      const next: LoyaltyState = {
        ...s,
        points,
        tier: tierFor(points),
        history: [
          { id: `a-${Date.now()}`, delta, reason, ts: Date.now() },
          ...s.history,
        ].slice(0, 50),
      };
      write(next);
      if (!silent && delta > 0) toast.success(`+${delta} pts • ${reason}`);
      return next;
    });
  }, []);

  const reset = useCallback(() => { write(initial); setState(initial); }, []);

  return { ...state, award, reset };
}
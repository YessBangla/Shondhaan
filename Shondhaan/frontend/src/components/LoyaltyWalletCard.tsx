import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Trophy, Flame, X, Gift } from "lucide-react";
import { useLoyaltyWallet } from "@/hooks/useLoyaltyWallet";
import { useLanguage } from "@/contexts/LanguageContext";
import { getMobileFloatingBottom } from "@/lib/mobileBottomOffsets";

const TIER_COLORS: Record<string, string> = {
  bronze: "from-amber-500/20 to-orange-500/10 border-amber-500/30",
  silver: "from-slate-300/30 to-slate-500/10 border-slate-400/40",
  gold: "from-yellow-400/30 to-amber-500/10 border-yellow-500/40",
  platinum: "from-violet-400/30 to-fuchsia-500/10 border-violet-500/40",
};

/** Floating loyalty-wallet badge → tap to expand into a glass card. */
const LoyaltyWalletCard = () => {
  const { language } = useLanguage();
  const bn = language === "bn";
  const { points, tier, streakDays, history } = useLoyaltyWallet();
  const [open, setOpen] = useState(false);

  // Hide on auth, splash, and admin/staff routes
  if (typeof window !== "undefined") {
    const p = window.location.pathname;
    if (p === "/auth" || p.startsWith("/admin") || p.startsWith("/super-admin")) return null;
  }

  return (
    <>
      <motion.button
        onClick={() => setOpen(true)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        // Mobile: anchor to the LEFT edge so it never collides with the right-side
        // FAB hub stack. Desktop: keep on the right rail.
        className={`fixed left-3 right-auto z-40 flex items-center gap-1.5 rounded-full border bg-gradient-to-br ${TIER_COLORS[tier]} px-2.5 py-1 text-[11px] font-bold text-foreground shadow-lg backdrop-blur-md md:!bottom-[356px] md:left-auto md:right-4 md:px-3 md:py-1.5 md:text-xs`}
        style={{ bottom: getMobileFloatingBottom(8) }}
        aria-label={bn ? "লয়ালটি ওয়ালেট" : "Loyalty wallet"}
      >
        <Sparkles className="h-3.5 w-3.5" />
        {points}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 backdrop-blur-sm md:items-center"
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ y: 60, scale: 0.95 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: 60 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm overflow-hidden rounded-t-3xl border border-border/60 bg-card shadow-2xl md:rounded-3xl"
            >
              <div className={`relative bg-gradient-to-br ${TIER_COLORS[tier]} px-5 py-6`}>
                <button
                  onClick={() => setOpen(false)}
                  className="absolute right-3 top-3 rounded-full bg-card/60 p-1.5 text-foreground hover:bg-card"
                  aria-label="Close"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-foreground/70">
                  <Trophy className="h-3.5 w-3.5" />
                  {tier}
                </div>
                <div className="mt-1 text-4xl font-black text-foreground">
                  {points} <span className="text-base font-medium text-foreground/60">pts</span>
                </div>
                <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-foreground/80">
                  <Flame className="h-3.5 w-3.5 text-orange-500" />
                  {bn ? `${streakDays} দিনের স্ট্রিক` : `${streakDays}-day streak`}
                </div>
              </div>

              <div className="space-y-3 p-5">
                <div className="flex items-start gap-2 rounded-xl bg-primary/5 p-3 text-xs text-foreground">
                  <Gift className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <p>
                    {bn
                      ? "প্রতিদিন এসে পয়েন্ট জমান। ৫০০ পয়েন্টে সিলভার, ২০০০-এ গোল্ড আনলক হবে। ভবিষ্যতে অর্ডারে রিডিম করতে পারবেন।"
                      : "Earn points daily. Unlock Silver at 500, Gold at 2000. Redeem on future orders."}
                  </p>
                </div>

                <div>
                  <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {bn ? "সাম্প্রতিক কার্যকলাপ" : "Recent activity"}
                  </div>
                  <div className="max-h-44 space-y-1.5 overflow-y-auto">
                    {history.length === 0 ? (
                      <p className="text-xs text-muted-foreground">{bn ? "এখনো কোনো কার্যকলাপ নেই" : "No activity yet"}</p>
                    ) : (
                      history.map((h) => (
                        <div key={h.id} className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/30 px-3 py-1.5 text-xs">
                          <span className="truncate text-foreground">{h.reason}</span>
                          <span className={`shrink-0 font-bold ${h.delta >= 0 ? "text-emerald-600" : "text-destructive"}`}>
                            {h.delta >= 0 ? "+" : ""}{h.delta}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default LoyaltyWalletCard;
import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Star, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { haptic } from "@/lib/haptics";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import { getMobileFloatingBottom } from "@/lib/mobileBottomOffsets";

const VISIT_KEY = "yess_visit_count";
const PROMPTED_KEY = "yess_rating_prompted_at";
const DISMISSED_KEY = "yess_rating_dismissed_count";
const TRIGGER_VISITS = 6;     // show after 6 page navigations
const COOLDOWN_DAYS = 30;

/**
 * Soft in-app rating prompt — shows after the user has navigated enough
 * that they're likely engaged. Asks for a star rating; 4-5 stars opens
 * the deployed app review URL, lower scores route to the contact page
 * (close-the-loop pattern). Re-prompts at most every 30 days.
 */
const InAppRatingPrompt = () => {
  const location = useLocation();
  const { language } = useLanguage();
  const bn = language === "bn";
  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState(0);

  // Increment visit count on each route change
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const n = parseInt(localStorage.getItem(VISIT_KEY) || "0", 10) + 1;
      localStorage.setItem(VISIT_KEY, String(n));
      const last = parseInt(localStorage.getItem(PROMPTED_KEY) || "0", 10) || 0;
      const cooldown = COOLDOWN_DAYS * 24 * 60 * 60 * 1000;
      if (n >= TRIGGER_VISITS && Date.now() - last > cooldown && !open) {
        const t = window.setTimeout(() => setOpen(true), 1500);
        return () => window.clearTimeout(t);
      }
    } catch { /* */ }
  }, [location.pathname]);

  const remember = () => {
    try { localStorage.setItem(PROMPTED_KEY, String(Date.now())); } catch { /* */ }
  };

  const handleRate = (stars: number) => {
    haptic(stars >= 4 ? "success" : "light");
    remember();
    setOpen(false);
    if (stars >= 4) {
      toast.success(bn ? "ধন্যবাদ! 🌟" : "Thanks for the love!");
      // Hook for app-store URL when published native; web users get a thank-you
    } else {
      toast(bn ? "আমরা শুনছি — কীভাবে উন্নতি করব?" : "We're listening — how can we improve?", {
        action: { label: bn ? "ফিডব্যাক দিন" : "Send feedback", onClick: () => { window.location.href = "/contact"; } },
      });
    }
  };

  const handleDismiss = () => { remember(); setOpen(false); };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[78] bg-black/40"
            onClick={handleDismiss}
          />
          <motion.div
            initial={{ y: 60, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 60, opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", damping: 22, stiffness: 280 }}
            className="fixed left-0 right-0 z-[79] mx-auto w-[calc(100%-2rem)] max-w-sm rounded-2xl border border-border/50 bg-card p-5 shadow-2xl md:top-1/2 md:-translate-y-1/2"
            style={{ bottom: getMobileFloatingBottom(12) }}
          >
            <button onClick={handleDismiss} className="absolute right-3 top-3 text-muted-foreground hover:text-foreground" aria-label="Close">
              <X className="h-4 w-4" />
            </button>
            <div className="text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900/30">
                <Star className="h-6 w-6 text-yellow-500 fill-yellow-500" />
              </div>
              <h3 className="text-base font-bold text-foreground">
                {bn ? "Yess Service কেমন লাগছে?" : "Enjoying Yess Service?"}
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                {bn ? "আপনার মতামত আমাদের আরও ভালো করতে সাহায্য করবে" : "Your rating helps us improve"}
              </p>
              <div className="mt-4 flex justify-center gap-1.5" onMouseLeave={() => setHover(0)}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    onMouseEnter={() => setHover(n)}
                    onClick={() => handleRate(n)}
                    className="p-1.5 transition-transform active:scale-90"
                    aria-label={`${n} stars`}
                  >
                    <Star
                      className={`h-7 w-7 transition-colors ${
                        n <= hover ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground/30"
                      }`}
                    />
                  </button>
                ))}
              </div>
              <button
                onClick={handleDismiss}
                className="mt-4 text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                {bn ? "পরে" : "Maybe later"}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default InAppRatingPrompt;
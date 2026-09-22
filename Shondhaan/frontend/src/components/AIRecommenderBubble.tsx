import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X } from "lucide-react";
import { useRecentlyViewed } from "@/hooks/useRecentlyViewed";
import { haptic } from "@/lib/haptics";
import { getMobileFloatingBottom } from "@/lib/mobileBottomOffsets";

const DISMISS_KEY = "yess_ai_rec_dismissed";
const DISMISS_TTL = 60 * 60_000; // 1 hour

/**
 * Floating AI recommender that surfaces a "you might also like" suggestion
 * based on the most recently viewed service. Appears after 12s on home/mart.
 */
export default function AIRecommenderBubble() {
  const { items } = useRecentlyViewed();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const validRoutes = ["/", "/all-services", "/mart"];
    if (!validRoutes.includes(location.pathname)) {
      setOpen(false);
      return;
    }
    if (items.length < 2) return;
    try {
      const last = Number(localStorage.getItem(DISMISS_KEY) || 0);
      if (Date.now() - last < DISMISS_TTL) return;
    } catch {}

    const t = window.setTimeout(() => setOpen(true), 12_000);
    return () => window.clearTimeout(t);
  }, [location.pathname, items.length]);

  const dismiss = () => {
    setOpen(false);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {}
  };

  if (items.length < 2) return null;
  const suggestion = items[1]; // 2nd most recent — what they viewed before current
  const bn = (localStorage.getItem("yess_lang") || "bn") === "bn";

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.9 }}
          transition={{ type: "spring", stiffness: 300, damping: 24 }}
          className="fixed left-4 z-40 max-w-[280px] md:bottom-6 md:left-6"
          style={{ bottom: getMobileFloatingBottom(8) }}
        >
          <div className="relative border border-primary rounded-2xl bg-accent-foreground p-3 pr-8 text-white shadow backdrop-blur">
            <button
              onClick={dismiss}
              className="absolute right-2 top-2 rounded-full p-1 text-primary hover:bg-primary hover:text-white transition-colors"
              aria-label="dismiss"
            >
              <X className="h-3.5 w-3.5" />
            </button>
            <div className="flex items-start gap-2">
              <Sparkles className="h-5 w-5 shrink-0 text-accent" />
              <div className="space-y-1.5">
                <p className="text-xs opacity-90 text-accent">
                  {bn ? "সন্ধান সাজেশন" : "Shondhaan Help Desk"}
                </p>
                <p className="text-sm font-semibold text-accent leading-snug">
                  {bn ? "আপনি কি " : "Want to revisit "}
                  {bn ? `${suggestion.title} আবার দেখতে চান?` : `${suggestion.titleEn || suggestion.title}?`}
                </p>
                <button
                  onClick={() => {
                    haptic("medium");
                    dismiss(); 
                    navigate(`/service/${suggestion.slug}`);
                  }}
                  className="mt-1 rounded-full bg-primary px-3 py-1 text-xs text-white font-semibold transition-colors"
                >
                  {bn ? "এখনই দেখুন →" : "View now →"}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import ServiceMatchmakerQuiz from "./ServiceMatchmakerQuiz";
import { haptic } from "@/lib/haptics";
import { getMobileFloatingBottom } from "@/lib/mobileBottomOffsets";

const SHOWN_KEY = "yess_matchmaker_dismissed";
const TTL = 24 * 60 * 60_000; // 1 day

/**
 * Floating Matchmaker FAB on the home page. Auto-hides after dismissal for 24h.
 */
export default function ServiceMatchmakerLauncher() {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    if (location.pathname !== "/") {
      setHidden(true);
      return;
    }
    try {
      const last = Number(localStorage.getItem(SHOWN_KEY) || 0);
      if (Date.now() - last < TTL) {
        setHidden(true);
        return;
      }
    } catch {}
    const t = window.setTimeout(() => setHidden(false), 6000);
    return () => window.clearTimeout(t);
  }, [location.pathname]);

  // External trigger from the mobile FAB hub.
  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener("yess:open-matchmaker", handler as EventListener);
    return () => window.removeEventListener("yess:open-matchmaker", handler as EventListener);
  }, []);

  if (hidden) return null;
  const bn = (localStorage.getItem("yess_lang") || "bn") === "bn";

  return (
    <>
      <motion.button
        initial={{ opacity: 0, x: 30 }}
        animate={{ opacity: 1, x: 0 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => {
          haptic("medium");
          setOpen(true);
          try { localStorage.setItem(SHOWN_KEY, String(Date.now())); } catch {}
        }}
        className="fixed right-3 z-[10] hidden md:inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-primary to-green-500 px-3 py-2 text-[11px] font-semibold text-white shadow-xl md:!bottom-[95px] md:right-4 md:text-xs"
        style={{ bottom: getMobileFloatingBottom(20) }}
        aria-label="open matchmaker"
      >
        <Sparkles className="h-3.5 w-3.5" />
        {bn ? "সঠিক সার্ভিস খুঁজুন" : "Find my service"}
      </motion.button>
      <ServiceMatchmakerQuiz open={open} onClose={() => setOpen(false)} />
    </>
  );
}

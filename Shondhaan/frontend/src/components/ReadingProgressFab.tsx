import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUp } from "lucide-react";
import { haptic } from "@/lib/haptics";
import { getMobileFloatingBottom } from "@/lib/mobileBottomOffsets";

/**
 * Floating circular progress button that tracks scroll depth and scrolls
 * back to the top on tap. Only visible after 30% scroll.
 */
export default function ReadingProgressFab() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const update = () => {
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      setProgress(max > 0 ? Math.min(100, (h.scrollTop / max) * 100) : 0);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  const visible = progress > 30;
  const r = 18;
  const c = 2 * Math.PI * r;
  const dash = c - (progress / 100) * c;

  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 20 }}
          whileTap={{ scale: 0.92 }}
          onClick={() => {
            haptic("light");
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          aria-label="back to top"
          className="fixed left-3 z-30 grid h-12 w-12 place-items-center rounded-full bg-card shadow-lg ring-1 ring-border md:bottom-4 md:left-auto md:right-4"
          style={{ bottom: getMobileFloatingBottom(8) }}
        >
          <svg className="absolute inset-0 -rotate-90" viewBox="0 0 44 44">
            <circle cx="22" cy="22" r={r} className="fill-none stroke-muted" strokeWidth="3" />
            <circle
              cx="22"
              cy="22"
              r={r}
              className="fill-none stroke-primary transition-[stroke-dashoffset]"
              strokeWidth="3"
              strokeDasharray={c}
              strokeDashoffset={dash}
              strokeLinecap="round"
            />
          </svg>
          <ArrowUp className="relative h-4 w-4 text-foreground" />
        </motion.button>
      )}
    </AnimatePresence>
  );
}

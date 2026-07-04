import { useState, useEffect } from "react";
import { ArrowUp, ArrowDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getMobileFloatingBottom } from "@/lib/mobileBottomOffsets";

const ScrollButtons = () => {
  const [showUp, setShowUp] = useState(false);
  const [atBottom, setAtBottom] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setShowUp(window.scrollY > 300);
      const nearBottom = window.innerHeight + window.scrollY >= document.body.scrollHeight - 100;
      setAtBottom(nearBottom);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollUp = () => window.scrollTo({ top: 0, behavior: "smooth" });
  const scrollDown = () => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });

  return (
    <div
      className="fixed right-3 md:right-4 z-40 flex flex-col gap-2 md:!bottom-6"
      style={{ bottom: getMobileFloatingBottom(8) }}
    >
      <AnimatePresence>
        {showUp && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={scrollUp}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-colors hover:bg-primary/90"
            aria-label="Scroll to top"
          >
            <ArrowUp className="h-5 w-5" />
          </motion.button>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {!atBottom && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={scrollDown}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground shadow-lg transition-colors hover:bg-muted/80"
            aria-label="Scroll to bottom"
          >
            <ArrowDown className="h-5 w-5" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ScrollButtons;

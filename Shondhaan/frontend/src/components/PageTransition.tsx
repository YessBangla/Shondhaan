import { AnimatePresence, motion } from "framer-motion";
import { ReactNode, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useStatusBarTheme } from "@/hooks/useStatusBarTheme";

/**
 * Native-app-style page transition.
 *
 * - Mobile (<md): horizontal slide-in from the right (iOS push) for forward
 *   navigation, gentle fade for replace/back.
 * - Desktop: subtle fade + lift (less distracting on large screens).
 * - Always scrolls the new page to the top on route change.
 */
const PageTransition = ({ children }: { children: ReactNode }) => {
  const location = useLocation();
  const prevPath = useRef<string>(location.pathname);
  useStatusBarTheme();

  useEffect(() => {
    if (prevPath.current !== location.pathname) {
      // Smooth top scroll on every route change
      try {
        window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
      } catch {
        window.scrollTo(0, 0);
      }
      prevPath.current = location.pathname;
    }
  }, [location.pathname]);

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
        style={{ willChange: "opacity" }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};

export default PageTransition;
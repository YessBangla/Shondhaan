import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { WifiOff, Wifi } from "lucide-react";

const NetworkStatusBanner = () => {
  const bn =
    typeof document !== "undefined" &&
    (document.documentElement.lang || "bn").toLowerCase().startsWith("bn");
  const [online, setOnline] = useState<boolean>(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [showRestored, setShowRestored] = useState(false);

  useEffect(() => {
    const goOnline = () => {
      setOnline(true);
      setShowRestored(true);
      setTimeout(() => setShowRestored(false), 2000);
    };
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  const visible = !online || showRestored;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -40, opacity: 0 }}
          transition={{ type: "spring", damping: 22, stiffness: 280 }}
          className="fixed top-0 left-0 right-0 z-[100] flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium text-white shadow-md"
          style={{
            paddingTop: `calc(0.5rem + env(safe-area-inset-top))`,
            background: online
              ? "hsl(var(--primary))"
              : "hsl(var(--destructive))",
          }}
          role="status"
          aria-live="polite"
        >
          {online ? (
            <>
              <Wifi className="h-3.5 w-3.5" />
              <span>{bn ? "ইন্টারনেট সংযোগ ফিরে এসেছে" : "Back online"}</span>
            </>
          ) : (
            <>
              <WifiOff className="h-3.5 w-3.5" />
              <span>{bn ? "ইন্টারনেট সংযোগ নেই" : "No internet connection"}</span>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default NetworkStatusBanner;
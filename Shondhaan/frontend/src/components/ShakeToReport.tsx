import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { haptic } from "@/lib/haptics";
import { useLanguage } from "@/contexts/LanguageContext";

const SHAKE_THRESHOLD = 22;       // m/s² — sum of axes delta
const SHAKE_INTERVAL_MS = 800;    // min ms between successful shakes
const STORAGE_KEY = "yess_shake_enabled";

/**
 * Listens to devicemotion. When user shakes the phone vigorously, opens a
 * "Report a problem" prompt that links to the contact page. Toggleable via
 * localStorage key — defaults ON. Silently no-ops on desktop / when API
 * permission is denied (iOS 13+).
 */
const ShakeToReport = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const bn = language === "bn";
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (typeof DeviceMotionEvent === "undefined") return;
    let enabled = true;
    try { enabled = localStorage.getItem(STORAGE_KEY) !== "0"; } catch { /* */ }
    if (!enabled) return;

    let lastX = 0, lastY = 0, lastZ = 0;
    let lastShake = 0;
    let primed = false;

    const onMotion = (e: DeviceMotionEvent) => {
      const a = e.accelerationIncludingGravity;
      if (!a || a.x == null || a.y == null || a.z == null) return;
      if (!primed) {
        lastX = a.x; lastY = a.y; lastZ = a.z;
        primed = true;
        return;
      }
      const delta = Math.abs(a.x - lastX) + Math.abs(a.y - lastY) + Math.abs(a.z - lastZ);
      lastX = a.x; lastY = a.y; lastZ = a.z;
      if (delta > SHAKE_THRESHOLD) {
        const now = Date.now();
        if (now - lastShake > SHAKE_INTERVAL_MS) {
          lastShake = now;
          haptic("warning");
          setOpen(true);
        }
      }
    };

    // iOS 13+ requires explicit permission — request lazily on first user tap
    const maybeRequest = async () => {
      const anyEvt = DeviceMotionEvent as unknown as { requestPermission?: () => Promise<string> };
      if (typeof anyEvt.requestPermission === "function") {
        try {
          const res = await anyEvt.requestPermission();
          if (res !== "granted") return;
        } catch { return; }
      }
      window.addEventListener("devicemotion", onMotion);
    };
    maybeRequest();
    return () => window.removeEventListener("devicemotion", onMotion);
  }, []);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] bg-black/50 md:hidden"
            onClick={() => setOpen(false)}
          />
          <motion.div
            initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}
            transition={{ type: "spring", damping: 24, stiffness: 280 }}
            className="fixed bottom-24 left-4 right-4 z-[81] rounded-2xl border border-border/50 bg-card shadow-2xl md:hidden"
          >
            <div className="flex items-start gap-3 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">
                  {bn ? "শেক ডিটেক্ট হয়েছে!" : "Shake detected!"}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {bn ? "কোনো সমস্যা রিপোর্ট করতে চান?" : "Want to report a problem?"}
                </p>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => { setOpen(false); navigate("/contact"); }}
                    className="flex-1 rounded-lg bg-destructive px-3 py-2 text-xs font-semibold text-destructive-foreground active:scale-95 transition-transform"
                  >
                    {bn ? "রিপোর্ট করুন" : "Report"}
                  </button>
                  <button
                    onClick={() => setOpen(false)}
                    className="rounded-lg border border-border px-3 py-2 text-xs font-medium text-muted-foreground"
                  >
                    {bn ? "বাতিল" : "Dismiss"}
                  </button>
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ShakeToReport;
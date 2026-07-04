import { useEffect, useState } from "react";
import { Bell, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { haptic } from "@/lib/haptics";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";

const STORAGE_KEY = "yess_push_prompted_at";
const COOLDOWN_DAYS = 14;
const FIRST_DELAY_MS = 12000; // wait 12s after load before prompting

/**
 * Soft pre-prompt for browser push notifications. Shows a tasteful in-app
 * card before triggering the native permission dialog (best-practice for
 * higher accept rates). Re-prompts at most once every 14 days.
 */
const PushNotificationPrompt = () => {
  const { language } = useLanguage();
  const bn = language === "bn";
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window)) return;
    if (Notification.permission !== "default") return;

    let last = 0;
    try {
      last = parseInt(localStorage.getItem(STORAGE_KEY) || "0", 10) || 0;
    } catch { /* */ }
    const cooldown = COOLDOWN_DAYS * 24 * 60 * 60 * 1000;
    if (Date.now() - last < cooldown) return;

    const t = window.setTimeout(() => setOpen(true), FIRST_DELAY_MS);
    return () => window.clearTimeout(t);
  }, []);

  const remember = () => {
    try { localStorage.setItem(STORAGE_KEY, String(Date.now())); } catch { /* */ }
  };

  const handleEnable = async () => {
    haptic("light");
    remember();
    setOpen(false);
    try {
      const res = await Notification.requestPermission();
      if (res === "granted") {
        toast.success(bn ? "নোটিফিকেশন চালু হয়েছে!" : "Notifications enabled!");
      }
    } catch { /* */ }
  };

  const handleDismiss = () => {
    remember();
    setOpen(false);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ y: -80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -80, opacity: 0 }}
          transition={{ type: "spring", damping: 22, stiffness: 260 }}
          className="fixed left-3 right-3 top-3 z-[75] rounded-2xl border border-border/40 bg-card/95 shadow-2xl backdrop-blur-xl md:left-auto md:right-4 md:top-20 md:max-w-sm"
        >
          <div className="flex items-start gap-3 p-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Bell className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">
                {bn ? "নোটিফিকেশন চালু করুন" : "Stay in the loop"}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                {bn
                  ? "অর্ডার আপডেট, অফার এবং চ্যাটের তাৎক্ষণিক আপডেট পান।"
                  : "Get instant updates on orders, offers and chats."}
              </p>
              <div className="mt-2.5 flex gap-2">
                <button
                  onClick={handleEnable}
                  className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground active:scale-95 transition-transform"
                >
                  {bn ? "চালু করুন" : "Enable"}
                </button>
                <button
                  onClick={handleDismiss}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground"
                >
                  {bn ? "পরে" : "Later"}
                </button>
              </div>
            </div>
            <button onClick={handleDismiss} className="text-muted-foreground hover:text-foreground" aria-label="Close">
              <X className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PushNotificationPrompt;
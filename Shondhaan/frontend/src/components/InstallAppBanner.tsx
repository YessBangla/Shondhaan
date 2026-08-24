import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { haptic } from "@/lib/haptics";

interface BIPEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/**
 * Native "Add to Home Screen" prompt — fires on Android Chrome / Edge when the
 * PWA criteria are met. iOS users get manual instructions in a separate flow.
 * Auto-hides for 14 days after dismissal.
 */
const InstallAppBanner = () => {
  const { language } = useLanguage();
  const bn = language === "bn";
  const [event, setEvent] = useState<BIPEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const dismissedAt = Number(localStorage.getItem("yess_a2hs_dismissed") || 0);
    if (Date.now() - dismissedAt < 14 * 24 * 60 * 60 * 1000) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setEvent(e as BIPEvent);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!visible || !event) return null;

  const dismiss = () => {
    localStorage.setItem("yess_a2hs_dismissed", String(Date.now()));
    setVisible(false);
  };

  const install = async () => {
    haptic("medium");
    try {
      await event.prompt();
      await event.userChoice;
    } finally {
      setVisible(false);
    }
  };

  return (
    <div
      className="fixed hidden left-3 right-3 z-[55] rounded-2xl border border-border bg-card/95 p-3 shadow-2xl backdrop-blur-xl md:hidden animate-in slide-in-from-bottom-5"
      style={{ bottom: `calc(140px + env(safe-area-inset-bottom))` }}
      role="dialog"
      aria-label="Install app"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-white">
          <Download className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">
            {bn ? "অ্যাপটি ইনস্টল করুন" : "Install the app"}
          </p>
          <p className="text-[11px] text-muted-foreground line-clamp-1">
            {bn ? "হোমস্ক্রিনে যোগ করুন — দ্রুত ও অফলাইনে চলবে" : "Faster, offline-ready, like a native app"}
          </p>
        </div>
        <button
          onClick={install}
          className="shrink-0 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-white active:scale-95"
        >
          {bn ? "ইনস্টল" : "Install"}
        </button>
        <button
          onClick={dismiss}
          className="shrink-0 rounded-lg p-2 text-muted-foreground hover:bg-secondary"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default InstallAppBanner;
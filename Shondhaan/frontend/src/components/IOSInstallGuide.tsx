import { useEffect, useState } from "react";
import { Share, Plus, X } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

/**
 * iOS-only Add-to-Home-Screen instruction sheet. Shows the native Share-icon
 * → "Add to Home Screen" walkthrough that Safari can't auto-trigger.
 * Auto-hides for 30 days after dismissal & once installed (display-mode: standalone).
 */
const IOSInstallGuide = () => {
  const { language } = useLanguage();
  const bn = language === "bn";
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const ua = window.navigator.userAgent;
    const isIOS = /iPhone|iPad|iPod/i.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // @ts-ignore Safari-only
      window.navigator.standalone === true;
    if (!isIOS || isStandalone) return;
    const dismissed = Number(localStorage.getItem("yess_ios_a2hs_dismissed") || 0);
    if (Date.now() - dismissed < 30 * 24 * 60 * 60 * 1000) return;
    const t = window.setTimeout(() => setVisible(true), 3500);
    return () => window.clearTimeout(t);
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    localStorage.setItem("yess_ios_a2hs_dismissed", String(Date.now()));
    setVisible(false);
  };

  return (
    <div
      className="fixed left-3 right-3 z-[55] rounded-2xl border border-border bg-card/95 p-4 shadow-2xl backdrop-blur-xl md:hidden animate-in slide-in-from-bottom-5"
      style={{ bottom: `calc(140px + env(safe-area-inset-bottom))` }}
      role="dialog"
      aria-label="Install on iOS"
    >
      <button
        onClick={dismiss}
        className="absolute right-2 top-2 rounded-lg p-1.5 text-muted-foreground hover:bg-secondary"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
      <p className="text-sm font-bold text-foreground pr-6">
        {bn ? "📱 হোমস্ক্রিনে যোগ করুন" : "📱 Install on your iPhone"}
      </p>
      <p className="mt-1 text-[11px] text-muted-foreground">
        {bn ? "নেটিভ অ্যাপের মতো অভিজ্ঞতা পেতে:" : "For a native-app experience:"}
      </p>
      <div className="mt-2.5 space-y-1.5 text-[11px] text-foreground">
        <div className="flex items-center gap-2">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[10px] font-bold text-primary">1</span>
          <span className="flex items-center gap-1">
            {bn ? "Safari-তে শেয়ার বাটনে ট্যাপ করুন" : "Tap the Share button"}
            <Share className="h-3.5 w-3.5 text-blue-500" strokeWidth={2.5} />
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[10px] font-bold text-primary">2</span>
          <span className="flex items-center gap-1">
            {bn ? "স্ক্রল করে" : "Scroll to"}
            <span className="inline-flex items-center gap-1 rounded border border-border px-1.5 py-0.5 font-medium">
              <Plus className="h-3 w-3" />
              {bn ? "Add to Home Screen" : "Add to Home Screen"}
            </span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[10px] font-bold text-primary">3</span>
          <span>{bn ? "\"Add\" ট্যাপ করুন — হয়ে গেল! 🎉" : "Tap \"Add\" — done! 🎉"}</span>
        </div>
      </div>
    </div>
  );
};

export default IOSInstallGuide;

import { WifiOff, RefreshCw } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

/**
 * Full-screen offline fallback overlay. Shown when navigator goes offline so
 * users get a clear native-app-style state instead of broken pages.
 */
const OfflineFallback = () => {
  const { language } = useLanguage();
  const bn = language === "bn";
  const [offline, setOffline] = useState(
    typeof navigator !== "undefined" ? !navigator.onLine : false
  );

  useEffect(() => {
    const on = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  if (!offline) return null;

  return (
    <div
      className="fixed inset-0 z-[90] flex flex-col items-center justify-center bg-background/95 px-6 backdrop-blur-md md:hidden animate-in fade-in"
      role="alertdialog"
      aria-label="Offline"
    >
      <div className="relative">
        <div className="absolute inset-0 animate-ping rounded-full bg-destructive/20" />
        <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10">
          <WifiOff className="h-9 w-9 text-destructive" strokeWidth={2.2} />
        </div>
      </div>
      <h2 className="mt-6 text-xl font-bold text-foreground">
        {bn ? "ইন্টারনেট সংযোগ নেই" : "You're offline"}
      </h2>
      <p className="mt-2 max-w-xs text-center text-sm text-muted-foreground">
        {bn
          ? "ইন্টারনেট ফিরে এলে অ্যাপটি স্বয়ংক্রিয়ভাবে কাজ করবে। সংযোগ চেক করে আবার চেষ্টা করুন।"
          : "We'll automatically reconnect once you're back online. Check your network and try again."}
      </p>
      <Button
        onClick={() => window.location.reload()}
        className="mt-6 gap-2 rounded-full px-6 font-semibold active:scale-95"
      >
        <RefreshCw className="h-4 w-4" />
        {bn ? "আবার চেষ্টা করুন" : "Try again"}
      </Button>
      <p className="mt-3 text-[11px] text-muted-foreground">
        {bn ? "ডেটা/ওয়াই-ফাই চালু আছে কিনা দেখুন" : "Tip: check your Wi-Fi or mobile data"}
      </p>
    </div>
  );
};

export default OfflineFallback;

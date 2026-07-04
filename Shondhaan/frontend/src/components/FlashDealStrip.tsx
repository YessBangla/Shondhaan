import { useEffect, useState } from "react";
import { Flame, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { haptic } from "@/lib/haptics";

function formatBangla(num: number, bn: boolean) {
  const s = String(num).padStart(2, "0");
  if (!bn) return s;
  const d: Record<string, string> = { "0":"০","1":"১","2":"২","3":"৩","4":"৪","5":"৫","6":"৬","7":"৭","8":"৮","9":"৯" };
  return s.split("").map((c) => d[c] ?? c).join("");
}

/**
 * Mobile-only Daraz-style "Flash Deal" countdown strip.
 * Resets each day at midnight local time so it always shows urgency.
 */
const FlashDealStrip = () => {
  const { language } = useLanguage();
  const bn = language === "bn";
  const navigate = useNavigate();

  const [remaining, setRemaining] = useState<{ h: number; m: number; s: number }>({ h: 0, m: 0, s: 0 });

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const end = new Date(now);
      end.setHours(23, 59, 59, 999);
      const diff = Math.max(0, end.getTime() - now.getTime());
      setRemaining({
        h: Math.floor(diff / 3_600_000),
        m: Math.floor((diff % 3_600_000) / 60_000),
        s: Math.floor((diff % 60_000) / 1000),
      });
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  const Box = ({ v }: { v: number }) => (
    <span className="inline-flex h-6 min-w-[26px] items-center justify-center rounded-md bg-foreground/90 px-1.5 text-[11px] font-bold tabular-nums text-background">
      {formatBangla(v, bn)}
    </span>
  );

  return (
    <button
      onClick={() => { haptic("light"); navigate("/all-services?filter=offers"); }}
      className="md:hidden mt-3 mx-4 flex w-[calc(100%-2rem)] items-center justify-between rounded-2xl border border-orange-200 bg-gradient-to-r from-orange-50 via-amber-50 to-rose-50 px-3 py-2.5 active:scale-[0.99] transition-transform"
    >
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-orange-500 text-white">
          <Flame className="h-4 w-4" />
        </span>
        <div className="text-left">
          <p className="text-[13px] font-bold leading-tight text-foreground">
            {bn ? "ফ্ল্যাশ ডিল" : "Flash Deal"}
          </p>
          <p className="text-[10px] leading-tight text-muted-foreground">
            {bn ? "সীমিত সময়ের অফার" : "Limited time offers"}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <Box v={remaining.h} />
        <span className="text-[11px] font-bold text-foreground/70">:</span>
        <Box v={remaining.m} />
        <span className="text-[11px] font-bold text-foreground/70">:</span>
        <Box v={remaining.s} />
        <ChevronRight className="ml-1 h-4 w-4 text-foreground/60" />
      </div>
    </button>
  );
};

export default FlashDealStrip;
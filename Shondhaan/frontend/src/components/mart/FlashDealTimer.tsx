import { useState, useEffect } from "react";
import { Flame } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface Props {
  endTime?: Date;
}

const FlashDealTimer = ({ endTime }: Props) => {
  const { language } = useLanguage();
  const bn = language === "bn";
  
  const getEnd = () => endTime || new Date(new Date().setHours(23, 59, 59, 999));
  
  const calcTimeLeft = () => {
    const diff = getEnd().getTime() - Date.now();
    if (diff <= 0) return { hours: 0, minutes: 0, seconds: 0 };
    return {
      hours: Math.floor(diff / (1000 * 60 * 60)),
      minutes: Math.floor((diff / (1000 * 60)) % 60),
      seconds: Math.floor((diff / 1000) % 60),
    };
  };

  const [time, setTime] = useState(calcTimeLeft());

  useEffect(() => {
    const timer = setInterval(() => setTime(calcTimeLeft()), 1000);
    return () => clearInterval(timer);
  }, []);

  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <div className="flex items-center gap-2">
      <Flame className="h-5 w-5 text-orange-500 animate-pulse" />
      <span className="text-sm font-bold">{bn ? "শেষ হবে" : "Ends in"}:</span>
      <div className="flex gap-1">
        {[
          { val: time.hours, label: bn ? "ঘণ্টা" : "h" },
          { val: time.minutes, label: bn ? "মিনিট" : "m" },
          { val: time.seconds, label: bn ? "সেকেন্ড" : "s" },
        ].map((t, i) => (
          <div key={i} className="flex items-center gap-0.5">
            <span className="bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded min-w-[28px] text-center">
              {pad(t.val)}
            </span>
            {i < 2 && <span className="text-red-500 font-bold">:</span>}
          </div>
        ))}
      </div>
    </div>
  );
};

export default FlashDealTimer;

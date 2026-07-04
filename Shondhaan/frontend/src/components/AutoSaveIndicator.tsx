import { Cloud, CloudOff, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

interface Props {
  savedAt: number | null;
  className?: string;
}

const AutoSaveIndicator = ({ savedAt, className = "" }: Props) => {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((v) => v + 1), 15000);
    return () => clearInterval(t);
  }, []);

  if (!savedAt) {
    return (
      <span className={`inline-flex items-center gap-1 text-xs text-muted-foreground ${className}`}>
        <CloudOff className="w-3 h-3" /> ড্রাফট সংরক্ষণ হবে
      </span>
    );
  }
  const sec = Math.floor((Date.now() - savedAt) / 1000);
  const label =
    sec < 5 ? "এখনই সংরক্ষণ হলো" : sec < 60 ? `${sec} সেকেন্ড আগে` : `${Math.floor(sec / 60)} মিনিট আগে`;
  void tick;
  return (
    <span className={`inline-flex items-center gap-1 text-xs text-primary ${className}`}>
      {sec < 2 ? <Loader2 className="w-3 h-3 animate-spin" /> : <Cloud className="w-3 h-3" />}
      ড্রাফট • {label}
    </span>
  );
};

export default AutoSaveIndicator;
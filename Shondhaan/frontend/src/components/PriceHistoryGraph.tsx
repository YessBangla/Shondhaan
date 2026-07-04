import { useMemo } from "react";
import { cn } from "@/lib/utils";

interface Point { date: string; price: number }
interface Props { data: Point[]; currency?: string; className?: string }

export default function PriceHistoryGraph({ data, currency = "৳", className }: Props) {
  const { path, area, min, max, current } = useMemo(() => {
    if (!data.length) return { path: "", area: "", min: 0, max: 0, current: 0 };
    const w = 300, h = 100, p = 6;
    const prices = data.map((d) => d.price);
    const min = Math.min(...prices), max = Math.max(...prices);
    const range = max - min || 1;
    const stepX = (w - p * 2) / Math.max(1, data.length - 1);
    const pts = data.map((d, i) => {
      const x = p + i * stepX;
      const y = p + (1 - (d.price - min) / range) * (h - p * 2);
      return [x, y] as const;
    });
    const path = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x},${y}`).join(" ");
    const area = `${path} L${pts[pts.length - 1][0]},${h} L${pts[0][0]},${h} Z`;
    return { path, area, min, max, current: prices[prices.length - 1] };
  }, [data]);

  const trend = data.length > 1 ? data[data.length - 1].price - data[0].price : 0;
  const trendPct = data.length > 1 ? ((trend / data[0].price) * 100).toFixed(1) : "0";
  const up = trend > 0;

  return (
    <div className={cn("rounded-2xl border border-border bg-card p-4", className)}>
      <div className="mb-2 flex items-end justify-between">
        <div>
          <p className="text-xs text-muted-foreground">বর্তমান দাম</p>
          <p className="text-xl font-bold">{currency}{current.toLocaleString("bn-BD")}</p>
        </div>
        <div className={cn("text-xs font-semibold", up ? "text-destructive" : "text-emerald-600")}>
          {up ? "▲" : "▼"} {Math.abs(Number(trendPct))}%
        </div>
      </div>
      <svg viewBox="0 0 300 100" className="h-24 w-full">
        <defs>
          <linearGradient id="phg" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.3" />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#phg)" />
        <path d={path} fill="none" stroke="hsl(var(--primary))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
        <span>সর্বনিম্ন {currency}{min.toLocaleString("bn-BD")}</span>
        <span>সর্বোচ্চ {currency}{max.toLocaleString("bn-BD")}</span>
      </div>
    </div>
  );
}

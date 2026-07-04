import { cn } from "@/lib/utils";
import { CalendarRange } from "lucide-react";

export type DateRange = "today" | "7d" | "30d";

const labels: Record<DateRange, string> = {
  today: "আজ",
  "7d": "৭ দিন",
  "30d": "৩০ দিন",
};

/** Compact pill toggle for KPI date range. */
const DateRangeToggle = ({
  value, onChange, className,
}: {
  value: DateRange;
  onChange: (r: DateRange) => void;
  className?: string;
}) => (
  <div className={cn(
    "inline-flex items-center gap-1 rounded-xl border border-border/60 bg-card p-1 shadow-sm",
    className
  )} role="tablist" aria-label="Date range">
    <CalendarRange className="h-3.5 w-3.5 text-muted-foreground ml-1.5 mr-0.5" />
    {(Object.keys(labels) as DateRange[]).map((k) => (
      <button
        key={k}
        role="tab"
        aria-selected={value === k}
        onClick={() => onChange(k)}
        className={cn(
          "px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all",
          value === k
            ? "bg-gradient-to-r from-primary to-emerald-600 text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground hover:bg-secondary"
        )}
      >
        {labels[k]}
      </button>
    ))}
  </div>
);

export default DateRangeToggle;
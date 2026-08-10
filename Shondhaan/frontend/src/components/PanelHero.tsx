import { motion } from "framer-motion";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PanelHeroStat {
  label: string;
  value: string | number;
  icon?: ReactNode;
}

interface PanelHeroProps {
  badge?: { icon?: ReactNode; label: string };
  title: string;
  subtitle?: string;
  gradient?: string; // tailwind gradient classes
  rightIcon?: ReactNode;
  stats?: PanelHeroStat[];
  liveStatus?: string;
  className?: string;
}

/**
 * Premium gradient hero for every backend panel — Linear/Stripe-class header
 * with badge, title, subtitle, optional live status dot, and inline KPI stats.
 */
const PanelHero = ({
  badge,
  title,
  subtitle,
  gradient = "from-primary via-emerald-600 to-teal-700",
  rightIcon,
  stats,
  // liveStatus = "সব স্বাভাবিক",
  className,
}: PanelHeroProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className={cn(
        "relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br text-white p-5 md:p-6 shadow-lg",
        gradient,
        className
      )}
    >
      <div
        aria-hidden
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 0%, rgba(255,255,255,.35) 0, transparent 40%), radial-gradient(circle at 80% 100%, rgba(0,0,0,.25) 0, transparent 40%)",
        }}
      />
      <div className="relative flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0 flex-1">
          {badge && (
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur px-2.5 py-1 text-[10px] font-semibold mb-2.5 ring-1 ring-white/25">
              {badge.icon}
              {badge.label}
            </div>
          )}
          <h2 className="text-xl md:text-2xl font-heading font-bold leading-tight">{title}</h2>
          {subtitle && (
            <p className="text-[13px] text-white/85 mt-1.5 max-w-xl">{subtitle}</p>
          )}
          {/* <div className="flex items-center gap-1.5 mt-3 text-[11px] text-white/85">
            <span className="inline-flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 animate-pulse" />
              লাইভ
            </span>
            <span className="opacity-60">•</span>
            <span>{liveStatus}</span>
          </div> */}
        </div>
        {rightIcon && (
          <div className="hidden md:flex h-16 w-16 rounded-2xl bg-white/15 backdrop-blur items-center justify-center ring-1 ring-white/25 shrink-0 [&>*]:h-7 [&>*]:w-7">
            {rightIcon}
          </div>
        )}
      </div>

      {stats && stats.length > 0 && (
        <div className="relative mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {stats.map((s, i) => (
            <div
              key={i}
              className="rounded-xl bg-white/10 backdrop-blur ring-1 ring-white/20 px-3 py-2.5"
            >
              <div className="flex items-center gap-1.5 text-[10px] font-semibold text-white/80 uppercase tracking-wide">
                {s.icon}
                {s.label}
              </div>
              <p className="text-lg md:text-xl font-bold tabular-nums leading-tight mt-0.5">{s.value}</p>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
};

export default PanelHero;
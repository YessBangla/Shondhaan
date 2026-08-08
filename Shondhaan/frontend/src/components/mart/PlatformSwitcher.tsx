import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Wrench, Tag, Briefcase, ArrowRight, ShoppingBag } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { haptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";

export type PlatformKey = "service" | "mart" | "deal" | "jobs";

interface Platform {
  key: PlatformKey;
  path: string;
  icon: typeof Wrench;
  titleBn: string;
  titleEn: string;
  subtitleBn: string;
  subtitleEn: string;
  gradient: string;
  glow: string;
  ring: string;
}

const PLATFORMS: Platform[] = [
  {
    key: "service",
    path: "/",
    icon: Wrench,
    titleBn: "সন্ধান",
    titleEn: "Shondhaan",
    subtitleBn: "১৮৬+ সার্ভিস",
    subtitleEn: "186+ Services",
    gradient: "from-blue-500 via-indigo-500 to-violet-600",
    glow: "shadow-[0_8px_32px_-8px_rgba(99,102,241,0.6)]",
    ring: "ring-indigo-400/40",
  },
  {
    key: "mart",
    path: "/mart",
    icon: ShoppingBag,
    titleBn: "মার্ট",
    titleEn: "Mart",
    subtitleBn: "অনলাইন শপ",
    subtitleEn: "Online Shop",
    gradient: "from-amber-500 via-orange-500 to-red-500",
    glow: "shadow-[0_8px_32px_-8px_rgba(249,115,22,0.6)]",
    ring: "ring-orange-400/40",
  },
  {
    key: "deal",
    path: "/deals",
    icon: Tag,
    titleBn: "ডিল",
    titleEn: "Deal",
    subtitleBn: "কেনা-বেচা",
    subtitleEn: "Buy & Sell",
    gradient: "from-rose-500 via-pink-500 to-fuchsia-600",
    glow: "shadow-[0_8px_32px_-8px_rgba(236,72,153,0.6)]",
    ring: "ring-pink-400/40",
  },
  {
    key: "jobs",
    path: "/jobs",
    icon: Briefcase,
    titleBn: "জবস",
    titleEn: "Jobs",
    subtitleBn: "চাকরি খুঁজুন",
    subtitleEn: "Find Jobs",
    gradient: "from-emerald-500 via-teal-500 to-cyan-600",
    glow: "shadow-[0_8px_32px_-8px_rgba(20,184,166,0.6)]",
    ring: "ring-teal-400/40",
  },
];

export default function PlatformSwitcher({
  className,
  exclude = ["mart"],
}: {
  className?: string;
  exclude?: PlatformKey[];
}) {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const bn = language === "bn";
  const items = PLATFORMS.filter((p) => !exclude.includes(p.key));

  const go = (path: string) => {
    haptic("medium");
    try { sessionStorage.setItem("yess:nav-transition", "1"); } catch { /* ignore */ }
    navigate(path);
  };

  return (
    <section
      className={cn(
        "relative border-b border-border/40 bg-gradient-to-b from-muted/40 via-background to-background",
        className
      )}
    >
      {/* Decorative glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 left-1/4 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-24 right-1/4 h-48 w-48 rounded-full bg-accent/10 blur-3xl" />
      </div>

      <div className="container relative mx-auto px-3 py-4 md:px-6 md:py-6">
        <div className="mb-3 flex items-center justify-between md:mb-4">
          <div className="flex items-center gap-2">
            <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground md:text-sm">
              {bn ? "সন্ধান ইকোসিস্টেম" : "Shondhaan Ecosystem"}
            </h2>
          </div>
          <span className="hidden text-xs text-muted-foreground md:inline">
            {bn ? "এক প্ল্যাটফর্মে সব কিছু" : "Everything in one platform"}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2.5 md:gap-4">
          {items.map((p, i) => {
            const Icon = p.icon;
            return (
              <motion.button
                key={p.key}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08, duration: 0.4, ease: "easeOut" }}
                whileHover={{ y: -3, scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => go(p.path)}
                className={cn(
                  "group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br p-3 text-left text-white",
                  "transition-shadow duration-300 md:p-5",
                  p.gradient,
                  p.glow,
                  "hover:ring-4",
                  p.ring
                )}
              >
                {/* Shine sweep */}
                <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-full" />

                {/* Decorative dotted texture */}
                <span
                  className="pointer-events-none absolute inset-0 opacity-20"
                  style={{
                    backgroundImage:
                      "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.4) 1px, transparent 0)",
                    backgroundSize: "12px 12px",
                  }}
                />

                <div className="relative flex flex-col gap-2 md:gap-3">
                  <div className="flex items-center justify-between">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm ring-1 ring-white/30 md:h-11 md:w-11">
                      <Icon className="h-4.5 w-4.5 md:h-5 md:w-5" strokeWidth={2.5} />
                    </div>
                    <ArrowRight className="h-4 w-4 opacity-60 transition-all duration-300 group-hover:translate-x-1 group-hover:opacity-100 md:h-5 md:w-5" />
                  </div>
                  <div>
                    <div className="text-[13px] font-bold leading-tight md:text-base">
                      {bn ? p.titleBn : p.titleEn}
                    </div>
                    <div className="mt-0.5 text-[10px] font-medium opacity-85 md:text-xs">
                      {bn ? p.subtitleBn : p.subtitleEn}
                    </div>
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

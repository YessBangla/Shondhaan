import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { haptic } from "@/lib/haptics";

export interface Story {
  id: string;
  title: string;
  subtitle?: string;
  image?: string;
  gradient?: string;
  ctaLabel?: string;
  ctaHref?: string;
}

interface Props {
  stories: Story[];
  className?: string;
}

/**
 * Instagram-style swipeable stories. Tap a thumbnail to open full-screen viewer
 * with auto-advance (5s) and tap-zones for prev/next navigation.
 */
export default function SwipeableStories({ stories, className }: Props) {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const progressRef = useRef<HTMLDivElement | null>(null);

  const open = (i: number) => {
    haptic("light");
    setActiveIdx(i);
  };
  const close = () => setActiveIdx(null);
  const next = () => {
    if (activeIdx === null) return;
    if (activeIdx + 1 >= stories.length) return close();
    haptic("light");
    setActiveIdx(activeIdx + 1);
  };
  const prev = () => {
    if (activeIdx === null || activeIdx === 0) return;
    haptic("light");
    setActiveIdx(activeIdx - 1);
  };

  if (stories.length === 0) return null;

  const active = activeIdx !== null ? stories[activeIdx] : null;

  return (
    <>
      <div className={`flex gap-3 overflow-x-auto pb-2 scrollbar-hide ${className || ""}`}>
        {stories.map((s, i) => (
          <button
            key={s.id}
            onClick={() => open(i)}
            className="group relative shrink-0"
            aria-label={s.title}
          >
            <div className="rounded-full bg-gradient-to-tr from-primary via-pink-500 to-yellow-400 p-[2px]">
              <div className="h-16 w-16 overflow-hidden rounded-full border-2 border-background bg-muted">
                {s.image ? (
                  <img
                    src={s.image}
                    alt={s.title}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform group-hover:scale-110"
                  />
                ) : (
                  <div
                    className="h-full w-full"
                    style={{ background: s.gradient || "hsl(var(--primary))" }}
                  />
                )}
              </div>
            </div>
            <p className="mt-1 line-clamp-1 max-w-[64px] text-center text-[10px] font-medium text-foreground">
              {s.title}
            </p>
          </button>
        ))}
      </div>

      <AnimatePresence>
        {active && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95"
            onClick={close}
          >
            {/* progress bar */}
            <div className="absolute left-3 right-3 top-3 flex gap-1">
              {stories.map((_, i) => (
                <div key={i} className="h-1 flex-1 overflow-hidden rounded-full bg-white/20">
                  <motion.div
                    ref={i === activeIdx ? progressRef : undefined}
                    initial={{ width: i < activeIdx! ? "100%" : "0%" }}
                    animate={{ width: i === activeIdx ? "100%" : i < activeIdx! ? "100%" : "0%" }}
                    transition={i === activeIdx ? { duration: 5, ease: "linear" } : { duration: 0 }}
                    onAnimationComplete={() => i === activeIdx && next()}
                    className="h-full bg-white"
                  />
                </div>
              ))}
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                close();
              }}
              className="absolute right-3 top-8 rounded-full bg-white/10 p-2 text-white"
              aria-label="close"
            >
              <X className="h-5 w-5" />
            </button>

            {/* tap zones */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                prev();
              }}
              className="absolute left-0 top-0 h-full w-1/3 text-white/0"
              aria-label="previous"
            >
              <ChevronLeft className="ml-2 h-6 w-6 opacity-30" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                next();
              }}
              className="absolute right-0 top-0 h-full w-1/3 text-white/0"
              aria-label="next"
            >
              <ChevronRight className="ml-auto mr-2 h-6 w-6 opacity-30" />
            </button>

            <motion.div
              key={active.id}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="relative mx-4 w-full max-w-sm overflow-hidden rounded-2xl shadow-2xl"
              style={{
                background:
                  active.gradient || "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))",
                aspectRatio: "9/16",
              }}
            >
              {active.image && (
                <img
                  src={active.image}
                  alt={active.title}
                  className="absolute inset-0 h-full w-full object-cover opacity-70"
                />
              )}
              <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/80 via-black/30 to-transparent p-6 text-white">
                <h3 className="text-2xl font-bold leading-tight">{active.title}</h3>
                {active.subtitle && (
                  <p className="mt-2 text-sm opacity-90">{active.subtitle}</p>
                )}
                {active.ctaLabel && active.ctaHref && (
                  <a
                    href={active.ctaHref}
                    className="mt-4 inline-block w-fit rounded-full bg-white px-5 py-2 text-sm font-semibold text-black"
                  >
                    {active.ctaLabel}
                  </a>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

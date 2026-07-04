import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface Section { id: string; label: string }
interface Props { sections: Section[]; className?: string }

export default function ScrollSectionIndicator({ sections, className }: Props) {
  const [active, setActive] = useState(sections[0]?.id);

  useEffect(() => {
    const onScroll = () => {
      for (const s of sections) {
        const el = document.getElementById(s.id);
        if (!el) continue;
        const r = el.getBoundingClientRect();
        if (r.top <= 120 && r.bottom >= 120) { setActive(s.id); break; }
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [sections]);

  return (
    <div className={cn("fixed right-3 top-1/2 z-30 hidden -translate-y-1/2 flex-col gap-2 md:flex", className)}>
      {sections.map((s) => (
        <button
          key={s.id}
          onClick={() => document.getElementById(s.id)?.scrollIntoView({ behavior: "smooth", block: "start" })}
          aria-label={s.label}
          className={cn(
            "group relative h-2.5 w-2.5 rounded-full border border-border transition-all",
            active === s.id ? "scale-125 bg-primary" : "bg-muted hover:bg-primary/60"
          )}
        >
          <span className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-md bg-popover px-2 py-1 text-xs text-popover-foreground opacity-0 shadow-md transition-opacity group-hover:opacity-100">
            {s.label}
          </span>
        </button>
      ))}
    </div>
  );
}

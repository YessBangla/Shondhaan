import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell } from "lucide-react";

export interface IslandActivity {
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  duration?: number;
}

export function pushIslandActivity(a: IslandActivity) {
  window.dispatchEvent(new CustomEvent("yess:island", { detail: a }));
}

const DynamicIslandActivity = () => {
  const [act, setAct] = useState<IslandActivity | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const a = (e as CustomEvent<IslandActivity>).detail;
      setAct(a);
      const dur = a.duration ?? 4000;
      const t = setTimeout(() => setAct(null), dur);
      return () => clearTimeout(t);
    };
    window.addEventListener("yess:island", handler);
    return () => window.removeEventListener("yess:island", handler);
  }, []);

  return (
    <div className="fixed top-2 left-1/2 -translate-x-1/2 z-[100] pointer-events-none">
      <AnimatePresence>
        {act && (
          <motion.div
            initial={{ width: 120, height: 28, opacity: 0, y: -10 }}
            animate={{ width: "auto", height: 44, opacity: 1, y: 0 }}
            exit={{ width: 120, height: 28, opacity: 0, y: -10 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="bg-foreground text-background rounded-full px-4 flex items-center gap-3 shadow-2xl pointer-events-auto max-w-[90vw]"
          >
            <div className="flex-shrink-0 text-primary-foreground/90">
              {act.icon ?? <Bell className="w-4 h-4" />}
            </div>
            <div className="flex flex-col leading-tight overflow-hidden">
              <span className="text-xs font-semibold truncate">{act.title}</span>
              {act.subtitle && (
                <span className="text-[10px] opacity-70 truncate">{act.subtitle}</span>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DynamicIslandActivity;
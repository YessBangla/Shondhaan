import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X } from "lucide-react";
import { haptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";
import { getMobileFloatingBottom } from "@/lib/mobileBottomOffsets";

interface Action {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  color?: string;
}
interface Props { actions: Action[]; className?: string }

export default function SpeedDialFab({ actions, className }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className={cn("fixed right-4 z-30 flex flex-col items-end gap-3 md:!bottom-[92px]", className)}
      style={{ bottom: getMobileFloatingBottom(100) }}
    >
      <AnimatePresence>
        {open &&
          actions.map((a, i) => (
            <motion.button
              key={a.label}
              initial={{ opacity: 0, y: 20, scale: 0.6 }}
              animate={{ opacity: 1, y: 0, scale: 1, transition: { delay: i * 0.05 } }}
              exit={{ opacity: 0, y: 20, scale: 0.6 }}
              onClick={() => { haptic("light"); a.onClick(); setOpen(false); }}
              className="flex items-center gap-2"
            >
              <span className="rounded-md bg-popover px-2 py-1 text-xs font-medium text-popover-foreground shadow">
                {a.label}
              </span>
              <span
                className={cn(
                  "flex h-11 w-11 items-center justify-center rounded-full text-white shadow-lg",
                  a.color ?? "bg-primary"
                )}
              >
                {a.icon}
              </span>
            </motion.button>
          ))}
      </AnimatePresence>
      <motion.button
        whileTap={{ scale: 0.92 }}
        onClick={() => { haptic("medium"); setOpen((v) => !v); }}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-xl"
        aria-label="Quick actions"
      >
        <motion.span animate={{ rotate: open ? 45 : 0 }} transition={{ type: "spring", stiffness: 300 }}>
          {open ? <X className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
        </motion.span>
      </motion.button>
    </div>
  );
}

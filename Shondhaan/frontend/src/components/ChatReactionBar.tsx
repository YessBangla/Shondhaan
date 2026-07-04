import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { haptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";

const REACTIONS = ["❤️", "👍", "😂", "😮", "😢", "🔥"] as const;

interface Props {
  onReact: (emoji: string) => void;
  selected?: string | null;
  className?: string;
}

export default function ChatReactionBar({ onReact, selected, className }: Props) {
  const [open, setOpen] = useState(false);

  const pick = (e: string) => {
    haptic("light");
    onReact(e);
    setOpen(false);
  };

  return (
    <div className={cn("relative inline-flex", className)}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="rounded-full bg-muted px-2 py-0.5 text-xs hover:bg-muted/80"
      >
        {selected ?? "+"}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.9 }}
            className="absolute bottom-full left-1/2 z-30 mb-2 flex -translate-x-1/2 gap-1 rounded-full border border-border bg-popover px-2 py-1.5 shadow-lg"
          >
            {REACTIONS.map((e, i) => (
              <motion.button
                key={e}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: i * 0.03 }}
                whileHover={{ scale: 1.3 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => pick(e)}
                className="text-lg leading-none"
              >
                {e}
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

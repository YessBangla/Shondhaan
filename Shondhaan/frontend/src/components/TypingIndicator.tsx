import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface Props { name?: string; className?: string }

export default function TypingIndicator({ name, className }: Props) {
  return (
    <div className={cn("inline-flex items-center gap-2 rounded-2xl bg-muted px-3 py-2", className)}>
      {name && <span className="text-xs text-muted-foreground">{name}</span>}
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-muted-foreground"
            animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }}
          />
        ))}
      </div>
    </div>
  );
}

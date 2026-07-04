import { motion } from "framer-motion";
import { BadgeCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props { label?: string; className?: string; size?: "sm" | "md" }

export default function VerifiedBadge({ label = "ভেরিফাইড", className, size = "sm" }: Props) {
  const dim = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";
  return (
    <motion.span
      initial={{ scale: 0, rotate: -90 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ type: "spring", stiffness: 320, damping: 18 }}
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary",
        className
      )}
    >
      <motion.span
        animate={{ scale: [1, 1.15, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="inline-flex"
      >
        <BadgeCheck className={cn(dim)} />
      </motion.span>
      {label}
    </motion.span>
  );
}

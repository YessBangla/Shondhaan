import { motion } from "framer-motion";
import { Sparkles, Camera } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  onClick?: () => void;
  className?: string;
  variant?: "badge" | "button";
}

/**
 * Animated "AR Try-On" indicator — shows on product cards/detail to surface
 * AR preview availability. Pulses softly to attract attention.
 */
export default function ARTryOnBadge({ onClick, className, variant = "badge" }: Props) {
  const bn = (typeof window !== "undefined" && (localStorage.getItem("yess_lang") || "bn") === "bn");
  const label = bn ? "AR প্রিভিউ" : "AR Preview";

  if (variant === "button") {
    return (
      <motion.button
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        onClick={onClick}
        className={cn(
          "inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-primary to-pink-500 px-4 py-2 text-sm font-semibold text-primary-foreground shadow-md",
          className
        )}
      >
        <Camera className="h-4 w-4" />
        {label}
        <Sparkles className="h-3.5 w-3.5" />
      </motion.button>
    );
  }

  return (
    <button
      onClick={onClick}
      className={cn(
        "group relative inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary backdrop-blur",
        className
      )}
    >
      <span className="absolute inset-0 animate-pulse rounded-full bg-primary/20" />
      <Sparkles className="relative h-3 w-3" />
      <span className="relative">{label}</span>
    </button>
  );
}

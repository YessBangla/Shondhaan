import { Flame } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface Props {
  stock?: number | null;
  threshold?: number;
  className?: string;
}

/**
 * Urgency badge for low/out-of-stock products. Renders nothing when stock is healthy.
 */
export default function LowStockBadge({ stock, threshold = 10, className }: Props) {
  if (stock == null) return null;
  const bn = (typeof window !== "undefined" && (localStorage.getItem("yess_lang") || "bn") === "bn");

  if (stock <= 0) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground",
          className
        )}
      >
        {bn ? "স্টক শেষ" : "Out of stock"}
      </span>
    );
  }

  if (stock > threshold) return null;

  return (
    <motion.span
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-bold text-destructive",
        className
      )}
    >
      <Flame className="h-3 w-3 animate-pulse" />
      {bn ? `মাত্র ${stock}টি বাকি` : `Only ${stock} left`}
    </motion.span>
  );
}

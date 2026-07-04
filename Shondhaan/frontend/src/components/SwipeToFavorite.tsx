import { motion, useMotionValue, useTransform, type PanInfo } from "framer-motion";
import { Heart } from "lucide-react";
import { type ReactNode, useRef } from "react";
import { haptic } from "@/lib/haptics";

interface Props {
  children: ReactNode;
  onFavorite: () => void;
  isFavorite?: boolean;
  className?: string;
}

/**
 * Swipe a card right to toggle favorite (mobile gesture). Visual feedback
 * includes a heart icon revealing behind the card and haptic on commit.
 */
export default function SwipeToFavorite({ children, onFavorite, isFavorite, className }: Props) {
  const x = useMotionValue(0);
  const heartOpacity = useTransform(x, [0, 60, 120], [0, 0.7, 1]);
  const heartScale = useTransform(x, [0, 60, 120], [0.6, 0.9, 1.2]);
  const committed = useRef(false);

  const onEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x > 100 && !committed.current) {
      committed.current = true;
      haptic("success");
      onFavorite();
      setTimeout(() => (committed.current = false), 500);
    }
    x.set(0);
  };

  return (
    <div className={`relative overflow-hidden ${className || ""}`}>
      <motion.div
        style={{ opacity: heartOpacity, scale: heartScale }}
        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2"
      >
        <Heart
          className={`h-7 w-7 ${isFavorite ? "fill-pink-500 text-pink-500" : "fill-pink-500/30 text-pink-500"}`}
        />
      </motion.div>
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 160 }}
        dragElastic={0.2}
        style={{ x }}
        onDragEnd={onEnd}
        className="touch-pan-y"
      >
        {children}
      </motion.div>
    </div>
  );
}

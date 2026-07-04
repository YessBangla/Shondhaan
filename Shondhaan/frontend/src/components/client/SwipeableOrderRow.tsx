import { ReactNode } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { Trash2, RotateCcw } from "lucide-react";
import { haptic } from "@/lib/haptics";

interface Props {
  children: ReactNode;
  canCancel: boolean;
  onCancel: () => void;
  onReorder: () => void;
  cancelLabel: string;
  reorderLabel: string;
}

const TRIGGER = 110;

/**
 * Mobile swipe row used by Mart order cards. Left swipe → Cancel
 * (only enabled when the order is still cancellable). Right swipe →
 * Reorder. Both gestures are haptic-confirmed and snap back if the
 * trigger threshold is not reached.
 */
const SwipeableOrderRow = ({ children, canCancel, onCancel, onReorder, cancelLabel, reorderLabel }: Props) => {
  const x = useMotionValue(0);
  const cancelOpacity = useTransform(x, [-TRIGGER, -40, 0], [1, 0.45, 0]);
  const reorderOpacity = useTransform(x, [0, 40, TRIGGER], [0, 0.45, 1]);
  const cancelScale = useTransform(x, [-TRIGGER, -60], [1, 0.85]);
  const reorderScale = useTransform(x, [TRIGGER, 60], [1, 0.85]);

  const reset = () => animate(x, 0, { type: "spring", stiffness: 320, damping: 26 });

  return (
    <div className="relative">
      <motion.div
        style={{ opacity: cancelOpacity }}
        className="pointer-events-none absolute inset-0 flex items-center justify-end rounded-xl bg-destructive/90 pr-5 text-destructive-foreground md:hidden"
      >
        <motion.div style={{ scale: cancelScale }} className="flex flex-col items-center gap-1">
          <Trash2 className="h-5 w-5" />
          <span className="text-[10px] font-bold tracking-wide">{cancelLabel}</span>
        </motion.div>
      </motion.div>
      <motion.div
        style={{ opacity: reorderOpacity }}
        className="pointer-events-none absolute inset-0 flex items-center justify-start rounded-xl bg-primary/90 pl-5 text-primary-foreground md:hidden"
      >
        <motion.div style={{ scale: reorderScale }} className="flex flex-col items-center gap-1">
          <RotateCcw className="h-5 w-5" />
          <span className="text-[10px] font-bold tracking-wide">{reorderLabel}</span>
        </motion.div>
      </motion.div>
      <motion.div
        drag="x"
        dragDirectionLock
        dragConstraints={{ left: canCancel ? -160 : 0, right: 160 }}
        dragElastic={0.15}
        style={{ x }}
        onDragEnd={(_, info) => {
          if (info.offset.x < -TRIGGER && canCancel) {
            haptic("warning");
            reset();
            onCancel();
          } else if (info.offset.x > TRIGGER) {
            haptic("medium");
            reset();
            onReorder();
          } else {
            reset();
          }
        }}
        className="relative touch-pan-y"
      >
        {children}
      </motion.div>
    </div>
  );
};

export default SwipeableOrderRow;

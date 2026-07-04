import { ReactNode } from "react";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { X } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  maxWidthClass?: string;
}

/**
 * iOS-style bottom sheet with grab handle + swipe-down to dismiss.
 * Drag the sheet > 100px or fast-flick to close.
 */
const SwipeDownSheet = ({ open, onClose, title, children, maxWidthClass = "max-w-md" }: Props) => {
  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > 100 || info.velocity.y > 600) onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-[150] flex items-end justify-center bg-black/50 backdrop-blur-sm md:items-center"
        >
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.5 }}
            onDragEnd={handleDragEnd}
            onClick={(e) => e.stopPropagation()}
            className={`w-full ${maxWidthClass} overflow-hidden rounded-t-3xl border border-border/60 bg-card shadow-2xl md:rounded-3xl`}
          >
            <div className="flex justify-center pt-2.5 pb-1">
              <div className="h-1.5 w-10 rounded-full bg-muted-foreground/30" />
            </div>
            {title && (
              <div className="flex items-center justify-between px-5 pb-3">
                <h3 className="text-base font-bold text-foreground">{title}</h3>
                <button onClick={onClose} className="rounded-full p-1.5 text-muted-foreground hover:bg-muted">
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
            <div className="max-h-[80vh] overflow-y-auto px-5 pb-6">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SwipeDownSheet;
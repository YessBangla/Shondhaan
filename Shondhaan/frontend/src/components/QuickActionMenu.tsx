import { motion, AnimatePresence } from "framer-motion";
import { Heart, Share2, ShoppingCart, Eye, X } from "lucide-react";
import { haptic } from "@/lib/haptics";

export interface QuickAction {
  id: string;
  label: string;
  icon?: "heart" | "share" | "cart" | "view" | "custom";
  customIcon?: React.ReactNode;
  onClick: () => void;
  destructive?: boolean;
}

interface Props {
  open: boolean;
  onClose: () => void;
  title?: string;
  actions: QuickAction[];
}

const iconMap = {
  heart: Heart,
  share: Share2,
  cart: ShoppingCart,
  view: Eye,
};

/**
 * iOS-style radial/contextual quick action menu, typically triggered by
 * a long-press on a card. Uses backdrop blur and a slide-up sheet on mobile.
 */
export default function QuickActionMenu({ open, onClose, title, actions }: Props) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-[90] flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center"
        >
          <motion.div
            initial={{ y: 40, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 40, opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-t-3xl bg-popover p-4 pb-6 shadow-2xl sm:rounded-3xl"
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-muted sm:hidden" />
            <div className="mb-2 flex items-center justify-between">
              {title && (
                <p className="line-clamp-1 text-sm font-semibold text-foreground">{title}</p>
              )}
              <button
                onClick={onClose}
                className="ml-auto rounded-full p-1 text-muted-foreground hover:bg-accent"
                aria-label="close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <ul className="grid gap-1">
              {actions.map((a) => {
                const Icon = a.icon && a.icon !== "custom" ? iconMap[a.icon] : null;
                return (
                  <li key={a.id}>
                    <button
                      onClick={() => {
                        haptic("light");
                        a.onClick();
                        onClose();
                      }}
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium transition hover:bg-accent ${
                        a.destructive ? "text-destructive" : "text-foreground"
                      }`}
                    >
                      <span className="grid h-9 w-9 place-items-center rounded-full bg-muted">
                        {Icon ? <Icon className="h-4 w-4" /> : a.customIcon}
                      </span>
                      {a.label}
                    </button>
                  </li>
                );
              })}
            </ul>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

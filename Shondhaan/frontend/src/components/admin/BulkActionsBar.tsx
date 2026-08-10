import { motion, AnimatePresence } from "framer-motion";
import { CheckSquare, Lock, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { disabledTooltip } from "@/lib/permissionCopy";
import { ReactNode } from "react";

const toBn = (n: number | string) => String(n).replace(/[0-9]/g, (d) => "০১২৩৪৫৬৭৮৯"[Number(d)]);

export interface BulkAction {
  key: string;
  label: string;
  icon?: ReactNode;
  onClick: () => void | Promise<void>;
  variant?: "default" | "primary" | "destructive";
  confirm?: string;
  /** When true, button is rendered but click is blocked and styled as disabled. */
  disabled?: boolean;
  /** Tooltip text shown when hovering a disabled action (e.g. permission reason). */
  disabledReason?: string;
}

/**
 * Sticky-bottom bar that appears when 1+ rows are selected.
 * Provide a list of actions; bar handles confirmation prompts.
 */
const BulkActionsBar = ({
  count, onClear, actions,
}: {
  count: number;
  onClear: () => void;
  actions: BulkAction[];
}) => {
  const handleClick = async (a: BulkAction) => {
    if (a.disabled) return;
    if (a.confirm && !window.confirm(a.confirm)) return;
    await a.onClick();
  };

  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: "spring", damping: 22, stiffness: 260 }}
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[80] w-[min(94vw,640px)]"
        >
          <div
            role="region"
            aria-label={`${toBn(count)}টি আইটেম নির্বাচিত — গণ অ্যাকশন বার`}
            className="rounded-2xl border border-border/60 bg-card/95 backdrop-blur-xl shadow-2xl ring-1 ring-primary/20 px-3 py-2.5 flex items-center gap-2"
          >
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-primary to-emerald-600 text-white flex items-center justify-center shrink-0">
                <CheckSquare className="h-4 w-4" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="text-[12.5px] font-bold text-foreground leading-tight" aria-live="polite">
                  {toBn(count)}টি নির্বাচিত
                </p>
                <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">
                  একটি একশন বেছে নিন
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
              {actions.map((a) => (
                <button
                  key={a.key}
                  type="button"
                  onClick={() => handleClick(a)}
                  disabled={a.disabled}
                  aria-disabled={a.disabled}
                  title={a.disabled ? disabledTooltip(a.disabledReason) : a.label}
                  aria-label={a.disabled ? disabledTooltip(a.disabledReason) : undefined}
                  className={cn(
                    "inline-flex items-center gap-1.5 h-8 px-2.5 rounded-xl text-[11.5px] font-semibold whitespace-nowrap transition-all",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-1",
                    a.disabled
                      ? "bg-muted text-muted-foreground cursor-not-allowed opacity-60"
                      : a.variant === "destructive"
                        ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        : a.variant === "primary"
                          ? "bg-gradient-to-r from-primary to-emerald-600 text-white shadow-sm hover:shadow-md"
                          : "bg-secondary text-foreground hover:bg-secondary/80"
                  )}
                >
                  {a.disabled ? <Lock className="h-3.5 w-3.5" aria-hidden="true" /> : a.icon}
                  <span>{a.label}</span>
                </button>
              ))}
              <button
                type="button"
                onClick={onClear}
                aria-label="নির্বাচন বাতিল করুন"
                className="h-8 w-8 rounded-xl text-muted-foreground hover:bg-secondary hover:text-foreground flex items-center justify-center shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-1"
                title="বাতিল"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default BulkActionsBar;
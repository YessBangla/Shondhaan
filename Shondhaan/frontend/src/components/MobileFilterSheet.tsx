import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { haptic } from "@/lib/haptics";

export interface FilterOption {
  id: string;
  label: string;
  count?: number;
}

export interface FilterGroup {
  id: string;
  title: string;
  options: FilterOption[];
  multiple?: boolean;
}

interface MobileFilterSheetProps {
  open: boolean;
  onClose: () => void;
  groups: FilterGroup[];
  /** Map of groupId -> selected option ids */
  selected: Record<string, string[]>;
  onSelectedChange: (next: Record<string, string[]>) => void;
  onApply?: () => void;
  onClear?: () => void;
  title?: string;
}

/**
 * International-grade mobile filter bottom sheet.
 * - Backdrop tap closes
 * - Drag-down handle
 * - Multi/single select per group
 * - Sticky footer with Clear + Apply
 * - safe-area-inset bottom support
 */
const MobileFilterSheet = ({
  open,
  onClose,
  groups,
  selected,
  onSelectedChange,
  onApply,
  onClear,
  title,
}: MobileFilterSheetProps) => {
  const { language } = useLanguage();
  const bn = language === "bn";

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const toggle = (groupId: string, optionId: string, multiple = true) => {
    haptic("selection");
    const cur = selected[groupId] || [];
    let next: string[];
    if (multiple) {
      next = cur.includes(optionId) ? cur.filter((x) => x !== optionId) : [...cur, optionId];
    } else {
      next = cur.includes(optionId) ? [] : [optionId];
    }
    onSelectedChange({ ...selected, [groupId]: next });
  };

  const totalSelected = Object.values(selected).reduce((sum, arr) => sum + arr.length, 0);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[200] bg-foreground/40 backdrop-blur-sm md:hidden"
            aria-hidden="true"
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.4 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 120 || info.velocity.y > 600) onClose();
            }}
            className="fixed bottom-0 left-0 right-0 z-[201] flex max-h-[85vh] flex-col rounded-t-2xl border-t border-border bg-background shadow-2xl md:hidden"
            style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
            role="dialog"
            aria-modal="true"
            aria-label={title || (bn ? "ফিল্টার" : "Filters")}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-2.5 pb-1">
              <span className="h-1 w-10 rounded-full bg-muted-foreground/30" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-border">
              <h3 className="font-heading text-base font-bold text-foreground">
                {title || (bn ? "ফিল্টার" : "Filters")}
                {totalSelected > 0 && (
                  <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-white">
                    {totalSelected}
                  </span>
                )}
              </h3>
              <button
                type="button"
                onClick={onClose}
                aria-label={bn ? "বন্ধ" : "Close"}
                className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Scrollable groups */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-5">
              {groups.map((group) => {
                const selSet = new Set(selected[group.id] || []);
                return (
                  <div key={group.id}>
                    <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                      {group.title}
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {group.options.map((opt) => {
                        const active = selSet.has(opt.id);
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => toggle(group.id, opt.id, group.multiple !== false)}
                            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all active:scale-95 ${
                              active
                                ? "border-primary bg-primary text-white"
                                : "border-border bg-background text-foreground"
                            }`}
                            aria-pressed={active}
                          >
                            {active && <Check className="h-3 w-3" />}
                            {opt.label}
                            {typeof opt.count === "number" && (
                              <span className={`text-[10px] ${active ? "opacity-80" : "text-muted-foreground"}`}>
                                ({opt.count})
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Sticky footer */}
            <div className="flex items-center gap-2 border-t border-border bg-background/95 px-4 py-3 backdrop-blur">
              <button
                type="button"
                onClick={() => {
                  haptic("light");
                  onSelectedChange({});
                  onClear?.();
                }}
                className="flex-1 rounded-full border border-border py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-secondary"
              >
                {bn ? "মুছে ফেলুন" : "Clear"}
              </button>
              <button
                type="button"
                onClick={() => {
                  haptic("medium");
                  onApply?.();
                  onClose();
                }}
                className="flex-[2] rounded-full bg-primary py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
              >
                {bn ? "প্রয়োগ করুন" : "Apply"}
                {totalSelected > 0 ? ` (${totalSelected})` : ""}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default MobileFilterSheet;

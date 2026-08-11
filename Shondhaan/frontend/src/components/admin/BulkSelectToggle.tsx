import { cn } from "@/lib/utils";
import { useEffect, useRef } from "react";

const toBn = (n: number | string) =>
  String(n).replace(/[0-9]/g, (d) => "০১২৩৪৫৬৭৮৯"[Number(d)]);

/**
 * Unified "Select all" toggle for every admin table header.
 * Pairs with useBulkSelection + BulkActionsBar.
 *
 * Visual: subtle pill with a real checkbox (supports indeterminate),
 * a count badge, and label that flips between "সব নির্বাচন" / "সব আনসিলেক্ট".
 */
export interface BulkSelectToggleProps {
  allSelected: boolean;
  someSelected: boolean;
  selectedCount: number;
  totalCount: number;
  onToggle: () => void;
  /** Override the unselected label (default: "সব নির্বাচন") */
  label?: string;
  /** Override the selected label (default: "সব আনসিলেক্ট") */
  selectedLabel?: string;
  className?: string;
  /** Override the screen-reader description (default auto-generated). */
  ariaLabel?: string;
}

const BulkSelectToggle = ({
  allSelected,
  someSelected,
  selectedCount,
  totalCount,
  onToggle,
  label = "সব নির্বাচন",
  selectedLabel = "সব আনসিলেক্ট",
  className,
  ariaLabel,
}: BulkSelectToggleProps) => {
  const active = allSelected || someSelected;
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (inputRef.current) inputRef.current.indeterminate = someSelected;
  }, [someSelected]);

  const computedAria = ariaLabel ||
    (allSelected
      ? `সব ${totalCount}টি আইটেম নির্বাচিত — আনসিলেক্ট করতে চাপুন`
      : someSelected
        ? `${selectedCount}টি আইটেম নির্বাচিত (${totalCount}টির মধ্যে) — সব নির্বাচন করতে চাপুন`
        : `সব ${totalCount}টি আইটেম নির্বাচন করুন`);

  return (
    <label
      className={cn(
        "inline-flex items-center gap-1.5 cursor-pointer select-none rounded-xl border px-2.5 h-8 text-[11.5px] font-medium transition-colors",
        "focus-within:ring-2 focus-within:ring-primary/50 focus-within:ring-offset-1",
        active
          ? "border-primary/40 bg-primary/5 text-primary hover:bg-primary/10"
          : "border-border bg-background text-muted-foreground hover:text-foreground hover:border-primary/40",
        className
      )}
    >
      <input
        ref={inputRef}
        type="checkbox"
        checked={allSelected}
        onChange={onToggle}
        onKeyDown={(e) => {
          // Space already toggles natively; Enter should also toggle for parity.
          if (e.key === "Enter") {
            e.preventDefault();
            onToggle();
          }
        }}
        aria-label={computedAria}
        aria-checked={someSelected ? "mixed" : allSelected}
        className="h-3.5 w-3.5 accent-primary cursor-pointer focus:outline-none"
      />
      <span aria-hidden="true">{active ? selectedLabel : label}</span>
      {selectedCount > 0 && (
        <span
          className="ml-0.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-white text-[10px] font-bold leading-none"
          aria-hidden="true"
        >
          {toBn(selectedCount)}
          {totalCount > 0 && totalCount !== selectedCount && (
            <span className="opacity-70 ml-0.5">/{toBn(totalCount)}</span>
          )}
        </span>
      )}
      <span className="sr-only">{computedAria}</span>
    </label>
  );
};

export default BulkSelectToggle;
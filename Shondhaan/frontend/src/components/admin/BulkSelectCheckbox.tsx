import { cn } from "@/lib/utils";
import { useEffect, useRef } from "react";

/**
 * Unified row-level checkbox for every admin table.
 * Same size (h-4 w-4), border, focus ring, accent color, and
 * supports indeterminate state via prop.
 */
export interface BulkSelectCheckboxProps {
  checked: boolean;
  indeterminate?: boolean;
  onChange: () => void;
  className?: string;
  ariaLabel?: string;
}

const BulkSelectCheckbox = ({
  checked,
  indeterminate = false,
  onChange,
  className,
  ariaLabel = "নির্বাচন",
}: BulkSelectCheckboxProps) => {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);

  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      onChange={onChange}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          onChange();
        }
      }}
      aria-label={ariaLabel}
      aria-checked={indeterminate ? "mixed" : checked}
      className={cn(
        "h-4 w-4 rounded border border-border accent-primary cursor-pointer shrink-0",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-1",
        "transition-colors",
        className
      )}
    />
  );
};

export default BulkSelectCheckbox;
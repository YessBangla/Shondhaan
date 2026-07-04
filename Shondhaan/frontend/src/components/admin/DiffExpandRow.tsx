import { Plus, Minus, Pencil, Undo2 } from "lucide-react";
import { useId } from "react";

/**
 * Presentational diff row used in import-preview UIs. Encapsulates the
 * Enter/Space + aria-controls/aria-expanded contract so it can be unit-tested
 * once and reused across modules. The styling mirrors the inline row inside
 * `AdminNotificationRules.tsx` — keep them in visual sync if you tweak tones.
 */
export type DiffKind = "added" | "removed" | "changed";

export interface DiffExpandRowProps {
  /** Stable field key — also used as the data attribute for focus targeting. */
  field: string;
  /** Bengali (or any) human label for the field. */
  label: string;
  /** Display string for the previous value (use empty string for "added"). */
  fromDisplay: string;
  /** Display string for the new value (use empty string for "removed"). */
  toDisplay: string;
  kind: DiffKind;
  /** Whether the row qualifies for an expand panel (long values / wide label). */
  isLong: boolean;
  isOpen: boolean;
  isReverted?: boolean;
  onToggle: () => void;
  onRevert?: () => void;
}

const TONES: Record<DiffKind, { row: string; badge: string; to: string; sr: string }> = {
  added: {
    row: "bg-emerald-50/60 dark:bg-emerald-950/20",
    badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
    to: "text-emerald-700 dark:text-emerald-300",
    sr: "যোগ",
  },
  removed: {
    row: "bg-rose-50/60 dark:bg-rose-950/20",
    badge: "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300",
    to: "text-rose-700 dark:text-rose-300",
    sr: "বাদ",
  },
  changed: {
    row: "bg-amber-50/40 dark:bg-amber-950/10",
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
    to: "text-amber-700 dark:text-amber-300",
    sr: "পরিবর্তন",
  },
};

export function DiffExpandRow({
  field, label, fromDisplay, toDisplay, kind, isLong, isOpen, isReverted, onToggle, onRevert,
}: DiffExpandRowProps) {
  const tone = TONES[kind];
  const KindIcon = kind === "added" ? Plus : kind === "removed" ? Minus : Pencil;
  const reactId = useId();
  const panelId = `diff-panel-${field}-${reactId}`;

  const onKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (!isLong) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onToggle();
    }
  };

  return (
    <div
      data-testid={`diff-row-${field}`}
      data-kind={kind}
      className={`relative text-[11.5px] ${tone.row} ${isReverted ? "opacity-60" : ""}`}
    >
      <span className="sr-only">{tone.sr}: </span>
      <button
        type="button"
        data-diff-field={field}
        onClick={isLong ? onToggle : undefined}
        onKeyDown={onKeyDown}
        aria-expanded={isLong ? isOpen : undefined}
        aria-controls={isLong ? panelId : undefined}
        aria-label={isLong ? `${label} — ${isOpen ? "বিস্তারিত বন্ধ করুন" : "বিস্তারিত দেখুন"}` : undefined}
        tabIndex={isLong ? 0 : -1}
        className={`w-full px-3 py-2 flex items-center gap-2 text-left rounded-md focus:outline-none ${isLong ? "hover:bg-muted/30 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-inset focus-visible:ring-offset-1" : "cursor-default"}`}
      >
        <span className={`shrink-0 rounded-md ${tone.badge} w-5 h-5 inline-flex items-center justify-center`} aria-hidden="true">
          <KindIcon className="h-3 w-3" strokeWidth={3} />
        </span>
        <span className={`font-medium flex-1 min-w-0 truncate ${isReverted ? "line-through" : ""}`}>{label}</span>
        <span className="rounded bg-muted px-1.5 py-0.5 text-muted-foreground line-through tabular-nums max-w-[110px] truncate">{fromDisplay}</span>
        <span className="text-muted-foreground">→</span>
        <span className={`rounded bg-card border border-border px-1.5 py-0.5 font-semibold tabular-nums max-w-[110px] truncate ${tone.to}`}>{toDisplay}</span>
        {isLong && (
          <span aria-hidden="true" className="text-muted-foreground text-[10px] shrink-0">{isOpen ? "▲" : "▼"}</span>
        )}
      </button>
      {isLong && isOpen && (
        <div id={panelId} role="region" aria-label={`${label} বিস্তারিত`} className="px-3 pb-2">
          <div className="rounded-md bg-muted/40 p-2">
            <div className="text-[10px] font-bold text-muted-foreground mb-0.5">আগের মান</div>
            <div className="text-[11.5px] line-through break-all">{fromDisplay}</div>
          </div>
          <div className="rounded-md bg-card border border-border p-2 mt-1.5">
            <div className="text-[10px] font-bold text-muted-foreground mb-0.5">নতুন মান</div>
            <div className={`text-[11.5px] font-semibold break-all ${tone.to}`}>{toDisplay}</div>
          </div>
          {onRevert && (
            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onRevert(); }}
                aria-pressed={!!isReverted}
                className="inline-flex items-center gap-1 rounded-lg px-2 h-6 text-[10.5px] font-semibold bg-card border border-border hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-1"
              >
                <Undo2 className="h-3 w-3" aria-hidden="true" />
                {isReverted ? "রিভার্ট সাফ" : "এই ফিল্ড রিভার্ট"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default DiffExpandRow;
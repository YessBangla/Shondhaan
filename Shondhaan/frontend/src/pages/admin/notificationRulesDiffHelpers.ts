/**
 * Pure helpers extracted from AdminNotificationRules so they can be unit tested
 * without rendering the full page. Logic mirrors the inline implementations
 * inside `AdminNotificationRules.tsx` 1:1 — keep them in sync.
 *
 * Anything that touches React state, DOM, or storage stays in the page file.
 */

// -------- mirrored shape --------
export type DiffKind = "added" | "removed" | "changed";

/**
 * Long-value detector. A diff row qualifies as "long" (and therefore gets
 * the expand/collapse affordance) if EITHER side's display string is long
 * OR the field label is wide. Mirrors the inline `isLong` formula.
 */
export function isLongRow(opts: {
  fromDisplay: string;
  toDisplay: string;
  label: string;
  /** Display-length threshold for from/to values. */
  valueThreshold?: number;
  /** Length threshold for the field label. */
  labelThreshold?: number;
}): boolean {
  const { fromDisplay, toDisplay, label, valueThreshold = 20, labelThreshold = 24 } = opts;
  return (
    (fromDisplay?.length ?? 0) > valueThreshold ||
    (toDisplay?.length ?? 0) > valueThreshold ||
    (label?.length ?? 0) > labelThreshold
  );
}

/**
 * Case- and diacritic-insensitive normalizer. NFKD decomposes accented Latin
 * characters; we strip combining marks and lowercase. Bengali characters are
 * untouched (no diacritic codepoints in the stripped range).
 */
export function normalizeForSearch(s: string): string {
  return String(s ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * Decide which slices of preview UI state should reset versus persist when
 * either the import preview opens/closes or the import mode toggles.
 *
 * UX contract:
 *  - opening/closing a preview = NEW SESSION → reset everything.
 *  - merge ⇄ overwrite toggle  = SAME SESSION → keep expand/search/excluded.
 */
export function shouldResetDiffSession(reason: "preview-change" | "mode-toggle"): {
  expandedDiff: boolean;
  search: boolean;
  excludedFields: boolean;
  lastRevert: boolean;
} {
  if (reason === "preview-change") {
    return { expandedDiff: true, search: true, excludedFields: true, lastRevert: true };
  }
  return { expandedDiff: false, search: false, excludedFields: false, lastRevert: false };
}

/**
 * Filter a list of diff rows by a search query against the field key OR
 * Bengali label, case- and diacritic-insensitive.
 */
export function filterDiffRows<T extends { field: string }>(
  rows: T[],
  query: string,
  labelOf: (field: string) => string,
): T[] {
  const q = normalizeForSearch(query);
  if (!q) return rows;
  return rows.filter((d) => {
    const key = normalizeForSearch(d.field);
    const label = normalizeForSearch(labelOf(d.field) || "");
    return key.includes(q) || label.includes(q);
  });
}
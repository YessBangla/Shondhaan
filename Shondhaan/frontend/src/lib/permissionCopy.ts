/**
 * Standardized copy convention for permission/disabled reasons across all admin
 * modules. Keeps prefix, punctuation, and whitespace identical so the user sees
 * the same voice everywhere.
 *
 * Convention:
 *  - Prefix:  "কারণ: " (single space after the colon)
 *  - Body:    trimmed reason text
 *  - Suffix:  ends with a Bengali full stop "।" (added if missing)
 *  - No trailing whitespace, no leading whitespace, no double spaces.
 */

/** Normalize a raw reason string: trim, collapse spaces, strip trailing punctuation duplicates. */
export function normalizeReason(raw?: string | null): string {
  if (!raw) return "";
  // collapse internal whitespace runs and trim ends
  const cleaned = String(raw).replace(/\s+/g, " ").trim();
  if (!cleaned) return "";
  // strip a single trailing "।" or "." so we can re-append a canonical one
  return cleaned.replace(/[।.]+$/u, "").trim();
}

/** Body of the reason (with trailing "।") — used inside callouts where "কারণ:" label is rendered separately. */
export function reasonBody(raw?: string | null): string {
  const n = normalizeReason(raw);
  return n ? `${n}।` : "";
}

/** Full single-line phrase: "কারণ: <reason>।" — used inline (tooltips, aria-labels). */
export function reasonInline(raw?: string | null): string {
  const n = normalizeReason(raw);
  return n ? `কারণ: ${n}।` : "";
}

/** Tooltip / aria text for a disabled bulk-action control. */
export function disabledTooltip(raw?: string | null, fallback = "এই অ্যাকশনের পারমিশন নেই"): string {
  const n = normalizeReason(raw);
  return n ? `অনুমতি নেই — কারণ: ${n}।` : `অনুমতি নেই — ${fallback}।`;
}
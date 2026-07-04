/**
 * Centralized locale-aware formatting helpers.
 *
 * Use these everywhere instead of `Number.toLocaleString()` /
 * `Date.toLocaleDateString()` so dates, times and numbers render with
 * Bengali digits in BN mode and Latin digits in EN mode automatically.
 *
 * Pair with `useFormat()` hook to get the current language injected.
 */

export type Lang = "bn" | "en";

const LATIN_TO_BN = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];

/** Convert any string with Latin digits 0-9 into Bengali digits. */
export const toBnDigits = (input: string | number): string =>
  String(input).replace(/[0-9]/g, (d) => LATIN_TO_BN[Number(d)]);

/** Convert Bengali digits back to Latin (useful for inputs / parsing). */
export const toEnDigits = (input: string): string =>
  input.replace(/[\u09E6-\u09EF]/g, (d) => String(d.charCodeAt(0) - 0x09E6));

/** Apply digit script based on language. */
export const localizeDigits = (input: string | number, lang: Lang): string =>
  lang === "bn" ? toBnDigits(input) : String(input);

const localeOf = (lang: Lang) => (lang === "bn" ? "bn-BD" : "en-US");

/** Format a number with thousand separators in the target script. */
export const formatNumber = (
  value: number | string | null | undefined,
  lang: Lang,
  options?: Intl.NumberFormatOptions,
): string => {
  if (value === null || value === undefined || value === "") return "";
  const num = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(num)) return "";
  // Intl with bn-BD already produces Bengali digits.
  return new Intl.NumberFormat(localeOf(lang), options).format(num);
};

/** Format Bangladeshi taka (৳) with proper digit script. */
export const formatCurrency = (
  value: number | string | null | undefined,
  lang: Lang,
  options?: Intl.NumberFormatOptions,
): string => {
  const num = formatNumber(value, lang, { maximumFractionDigits: 0, ...options });
  if (!num) return "";
  return `৳${num}`;
};

const toDate = (value: Date | string | number): Date | null => {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

/** Format a date (default: medium, e.g. "১২ মার্চ, ২০২৬"). */
export const formatDate = (
  value: Date | string | number | null | undefined,
  lang: Lang,
  options: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" },
): string => {
  if (value === null || value === undefined || value === "") return "";
  const d = toDate(value);
  if (!d) return "";
  return new Intl.DateTimeFormat(localeOf(lang), options).format(d);
};

/** Format a time (default: 12-hour with AM/PM in BN as পূর্বাহ্ণ/অপরাহ্ণ). */
export const formatTime = (
  value: Date | string | number | null | undefined,
  lang: Lang,
  options: Intl.DateTimeFormatOptions = { hour: "numeric", minute: "2-digit", hour12: true },
): string => {
  if (value === null || value === undefined || value === "") return "";
  const d = toDate(value);
  if (!d) return "";
  return new Intl.DateTimeFormat(localeOf(lang), options).format(d);
};

/** Format date + time together. */
export const formatDateTime = (
  value: Date | string | number | null | undefined,
  lang: Lang,
  options: Intl.DateTimeFormatOptions = {
    day: "numeric", month: "short", year: "numeric",
    hour: "numeric", minute: "2-digit", hour12: true,
  },
): string => formatDate(value, lang, options);

/** Relative time ("৫ মিনিট আগে" / "5 minutes ago"). */
export const timeAgo = (
  value: Date | string | number | null | undefined,
  lang: Lang,
): string => {
  const d = toDate(value as any);
  if (!d) return "";
  const diffSec = Math.round((d.getTime() - Date.now()) / 1000);
  const abs = Math.abs(diffSec);
  const rtf = new Intl.RelativeTimeFormat(localeOf(lang), { numeric: "auto" });
  if (abs < 60) return rtf.format(diffSec, "second");
  if (abs < 3600) return rtf.format(Math.round(diffSec / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diffSec / 3600), "hour");
  if (abs < 2592000) return rtf.format(Math.round(diffSec / 86400), "day");
  if (abs < 31536000) return rtf.format(Math.round(diffSec / 2592000), "month");
  return rtf.format(Math.round(diffSec / 31536000), "year");
};
/**
 * Lightweight haptic feedback helper.
 * Uses navigator.vibrate where available — silently no-ops elsewhere
 * (e.g. iOS Safari, desktop). Safe to call from any event handler.
 */

type Pattern = "light" | "medium" | "heavy" | "success" | "warning" | "error" | "selection";

const PATTERNS: Record<Pattern, number | number[]> = {
  light: 10,
  medium: 18,
  heavy: 28,
  selection: 8,
  success: [12, 40, 12],
  warning: [20, 60, 20],
  error: [40, 40, 40],
};

function canVibrate(): boolean {
  return typeof navigator !== "undefined" && typeof navigator.vibrate === "function";
}

export type HapticIntensity = "off" | "light" | "normal" | "strong";
const STORAGE_KEY = "yess_haptic_intensity";
const MULTIPLIER: Record<HapticIntensity, number> = {
  off: 0,
  light: 0.5,
  normal: 1,
  strong: 1.6,
};

export function getHapticIntensity(): HapticIntensity {
  if (typeof window === "undefined") return "normal";
  try {
    return (localStorage.getItem(STORAGE_KEY) as HapticIntensity) || "normal";
  } catch {
    return "normal";
  }
}

export function setHapticIntensity(value: HapticIntensity) {
  try {
    localStorage.setItem(STORAGE_KEY, value);
  } catch {
    /* ignore */
  }
}

function scale(pattern: number | number[], factor: number): number | number[] {
  if (factor === 1) return pattern;
  if (Array.isArray(pattern)) return pattern.map((n) => Math.max(1, Math.round(n * factor)));
  return Math.max(1, Math.round(pattern * factor));
}

export function haptic(kind: Pattern = "light") {
  if (!canVibrate()) return;
  const factor = MULTIPLIER[getHapticIntensity()];
  if (factor === 0) return;
  try {
    navigator.vibrate(scale(PATTERNS[kind], factor));
  } catch {
    /* ignore */
  }
}

/**
 * Wrap a click/touch handler so it triggers a haptic before running.
 */
export function withHaptic<T extends (...args: never[]) => unknown>(
  fn: T,
  kind: Pattern = "light",
): T {
  return ((...args: Parameters<T>) => {
    haptic(kind);
    return fn(...args);
  }) as T;
}
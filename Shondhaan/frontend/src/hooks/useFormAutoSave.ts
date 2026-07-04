import { useEffect, useRef, useState } from "react";

interface Options {
  key: string;
  delay?: number;
  enabled?: boolean;
}

export function useFormAutoSave<T>(value: T, { key, delay = 800, enabled = true }: Options) {
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      try {
        localStorage.setItem(`yess_draft_${key}`, JSON.stringify(value));
        setSavedAt(Date.now());
      } catch {}
    }, delay);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [value, key, delay, enabled]);

  return { savedAt };
}

export function loadFormDraft<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(`yess_draft_${key}`);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function clearFormDraft(key: string) {
  try {
    localStorage.removeItem(`yess_draft_${key}`);
  } catch {}
}
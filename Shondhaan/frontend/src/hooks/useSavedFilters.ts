import { useCallback, useEffect, useState } from "react";

export interface SavedFilter<T> {
  id: string;
  name: string;
  state: T;
  createdAt: string;
}

/**
 * Persists named filter presets per scope (e.g. "admin_bookings").
 * State is fully generic — caller decides shape.
 */
export function useSavedFilters<T>(scope: string) {
  const key = `saved_filters_${scope}`;
  const [filters, setFilters] = useState<SavedFilter<T>[]>(() => {
    try { return JSON.parse(localStorage.getItem(key) || "[]"); } catch { return []; }
  });

  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(filters)); } catch {}
  }, [key, filters]);

  const save = useCallback((name: string, state: T) => {
    if (!name.trim()) return;
    const f: SavedFilter<T> = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: name.trim(),
      state,
      createdAt: new Date().toISOString(),
    };
    setFilters((prev) => [f, ...prev].slice(0, 12));
    return f;
  }, []);

  const remove = useCallback((id: string) => {
    setFilters((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const clear = useCallback(() => setFilters([]), []);

  return { filters, save, remove, clear };
}
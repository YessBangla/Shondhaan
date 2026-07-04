import { useCallback, useEffect, useMemo, useState } from "react";

/**
 * Generic multi-select state for tables/lists.
 * Pairs with <BulkActionsBar /> to give every admin table the same UX.
 *
 * @param items   Visible/filtered items the toggle operates on.
 * @param resetDeps Optional array of values that should clear the selection
 *                  whenever they change (e.g. active tab, filter, search).
 */
export function useBulkSelection<T extends { id: string }>(
  items: T[],
  resetDeps: ReadonlyArray<unknown> = []
) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Auto-clear selection when external state (tab/filter/search) changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    setSelected(new Set());
  }, resetDeps);

  // Drop ids that no longer exist in the visible list (e.g. row deleted, page changed)
  useEffect(() => {
    setSelected((prev) => {
      if (prev.size === 0) return prev;
      const visible = new Set(items.map((i) => i.id));
      let changed = false;
      const next = new Set<string>();
      prev.forEach((id) => {
        if (visible.has(id)) next.add(id);
        else changed = true;
      });
      return changed ? next : prev;
    });
  }, [items]);

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    setSelected((prev) => {
      if (prev.size === items.length) return new Set();
      return new Set(items.map((i) => i.id));
    });
  }, [items]);

  const clear = useCallback(() => setSelected(new Set()), []);

  const isSelected = useCallback((id: string) => selected.has(id), [selected]);

  const allSelected = useMemo(
    () => items.length > 0 && selected.size === items.length,
    [items.length, selected.size]
  );
  const someSelected = useMemo(
    () => selected.size > 0 && selected.size < items.length,
    [items.length, selected.size]
  );

  const selectedItems = useMemo(
    () => items.filter((i) => selected.has(i.id)),
    [items, selected]
  );

  return {
    selected,
    selectedIds: Array.from(selected),
    selectedItems,
    selectedCount: selected.size,
    isSelected,
    toggle,
    toggleAll,
    clear,
    allSelected,
    someSelected,
  };
}
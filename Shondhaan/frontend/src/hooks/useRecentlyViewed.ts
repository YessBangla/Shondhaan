import { useState, useEffect, useCallback } from "react";

export interface RecentlyViewedItem {
  slug: string;
  title: string;
  titleEn?: string;
  image?: string;
  rating?: number;
  viewedAt: number;
}

const STORAGE_KEY = "recently-viewed-services";
const MAX_ITEMS = 10;

export function useRecentlyViewed() {
  const [items, setItems] = useState<RecentlyViewedItem[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setItems(JSON.parse(stored));
    } catch {}
  }, []);

  const addItem = useCallback((item: Omit<RecentlyViewedItem, "viewedAt">) => {
    setItems((prev) => {
      const filtered = prev.filter((i) => i.slug !== item.slug);
      const updated = [{ ...item, viewedAt: Date.now() }, ...filtered].slice(0, MAX_ITEMS);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const getItems = useCallback(
    (excludeSlug?: string) => items.filter((i) => i.slug !== excludeSlug),
    [items]
  );

  return { items, addItem, getItems };
}

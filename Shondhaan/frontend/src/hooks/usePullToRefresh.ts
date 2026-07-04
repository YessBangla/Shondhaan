import { useEffect, useRef, useState } from "react";
import { haptic } from "@/lib/haptics";

/**
 * Pull-to-refresh for mobile pages. Activates only when the user starts
 * dragging while scrolled to the very top, and only on touch devices.
 */
export function usePullToRefresh(onRefresh: () => void | Promise<void>, options?: {
  threshold?: number;
  enabled?: boolean;
}) {
  const threshold = options?.threshold ?? 70;
  const enabled = options?.enabled ?? true;

  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef<number | null>(null);
  const triggered = useRef(false);

  useEffect(() => {
    if (!enabled) return;
    if (typeof window === "undefined") return;

    const onTouchStart = (e: TouchEvent) => {
      if (window.scrollY > 0) { startY.current = null; return; }
      startY.current = e.touches[0].clientY;
      triggered.current = false;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (startY.current == null || refreshing) return;
      const dy = e.touches[0].clientY - startY.current;
      if (dy <= 0) { setPull(0); return; }
      // dampen the drag
      const dampened = Math.min(120, dy * 0.5);
      setPull(dampened);
      if (!triggered.current && dampened > threshold) {
        triggered.current = true;
        haptic("medium");
      }
    };
    const onTouchEnd = async () => {
      if (startY.current == null) return;
      const shouldRefresh = pull >= threshold;
      startY.current = null;
      if (shouldRefresh) {
        setRefreshing(true);
        try {
          await onRefresh();
        } finally {
          setTimeout(() => {
            setRefreshing(false);
            setPull(0);
          }, 350);
        }
      } else {
        setPull(0);
      }
    };

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [enabled, onRefresh, pull, refreshing, threshold]);

  return { pull, refreshing };
}
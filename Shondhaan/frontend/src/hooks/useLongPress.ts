import { useRef, useCallback } from "react";
import { haptic } from "@/lib/haptics";

/**
 * Native-style long-press detection (touch + mouse). Triggers `onLongPress`
 * after `delay` ms (default 500), suppresses ghost click, and fires haptic.
 */
export function useLongPress<T extends HTMLElement>(
  onLongPress: () => void,
  delay = 500
) {
  const timerRef = useRef<number | null>(null);
  const triggered = useRef(false);
  const startPos = useRef<{ x: number; y: number } | null>(null);

  const clear = useCallback(() => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const start = useCallback(
    (x: number, y: number) => {
      triggered.current = false;
      startPos.current = { x, y };
      clear();
      timerRef.current = window.setTimeout(() => {
        triggered.current = true;
        haptic("medium");
        onLongPress();
      }, delay);
    },
    [delay, onLongPress, clear]
  );

  const move = useCallback(
    (x: number, y: number) => {
      if (!startPos.current) return;
      const dx = Math.abs(x - startPos.current.x);
      const dy = Math.abs(y - startPos.current.y);
      if (dx > 8 || dy > 8) clear();
    },
    [clear]
  );

  const handlers = {
    onTouchStart: (e: React.TouchEvent<T>) =>
      start(e.touches[0].clientX, e.touches[0].clientY),
    onTouchMove: (e: React.TouchEvent<T>) =>
      move(e.touches[0].clientX, e.touches[0].clientY),
    onTouchEnd: clear,
    onTouchCancel: clear,
    onContextMenu: (e: React.MouseEvent<T>) => {
      // suppress browser's default long-press menu on mobile
      e.preventDefault();
    },
  };

  return handlers;
}

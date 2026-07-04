import { useEffect, useRef } from "react";
import { toast } from "sonner";

type UndoAction = { id: string; label: string; undo: () => void; ts: number };

const stack: UndoAction[] = [];
const TTL = 30_000; // actions older than 30s can't be undone

/** Push an undoable action. Call from anywhere (cart remove, swipe cancel, etc.) */
export function pushUndo(label: string, undo: () => void) {
  stack.push({ id: `u-${Date.now()}-${Math.random()}`, label, undo, ts: Date.now() });
  // Cap at 8
  while (stack.length > 8) stack.shift();
}

/** Undo the most recent action; returns true if something was undone. */
export function popUndo(): boolean {
  const now = Date.now();
  while (stack.length) {
    const a = stack.pop()!;
    if (now - a.ts <= TTL) {
      try { a.undo(); } catch {}
      toast.info(`Undone: ${a.label}`, { duration: 2400 });
      return true;
    }
  }
  return false;
}

/**
 * Listens for shake gestures via DeviceMotion. On a sufficiently strong
 * shake (and no input focused), pops the most recent undoable action.
 */
export function useShakeToUndo(bn: boolean) {
  const last = useRef(0);
  useEffect(() => {
    const onMotion = (e: DeviceMotionEvent) => {
      const a = e.accelerationIncludingGravity;
      if (!a) return;
      const mag = Math.hypot(a.x ?? 0, a.y ?? 0, a.z ?? 0);
      const now = Date.now();
      if (mag > 28 && now - last.current > 1500) {
        last.current = now;
        const t = document.activeElement?.tagName;
        if (t === "INPUT" || t === "TEXTAREA") return;
        const ok = popUndo();
        if (!ok) toast(bn ? "আনডু করার মতো কিছু নেই" : "Nothing to undo", { duration: 1600 });
      }
    };
    window.addEventListener("devicemotion", onMotion);
    return () => window.removeEventListener("devicemotion", onMotion);
  }, [bn]);
}
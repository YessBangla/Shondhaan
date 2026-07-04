import { useEffect, useRef, useState, useCallback } from "react";
import { toast } from "sonner";

const PREFIX = "yess_offline_draft_";
const QUEUE_KEY = "yess_offline_pending_orders";

export interface OfflinePendingOrder {
  id: string;
  kind: "mart_order" | "service_booking" | string;
  payload: Record<string, unknown>;
  createdAt: number;
}

/**
 * Generic offline-aware draft persistence. Auto-saves form data to
 * localStorage (IndexedDB-friendly fallback) and reports network status.
 * Pair with `enqueueOrder` when the user submits while offline — the
 * order will queue and sync on reconnect via `useOfflineSync`.
 */
export function useOfflineDraft<T extends Record<string, unknown>>(key: string, initial: T) {
  const storeKey = PREFIX + key;
  const [draft, setDraft] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(storeKey);
      return raw ? { ...initial, ...JSON.parse(raw) } : initial;
    } catch {
      return initial;
    }
  });
  const timer = useRef<number | null>(null);

  // Debounced auto-save
  useEffect(() => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      try { localStorage.setItem(storeKey, JSON.stringify(draft)); } catch {}
    }, 350);
    return () => { if (timer.current) window.clearTimeout(timer.current); };
  }, [draft, storeKey]);

  const update = useCallback((patch: Partial<T>) => setDraft((d) => ({ ...d, ...patch })), []);
  const clear = useCallback(() => {
    try { localStorage.removeItem(storeKey); } catch {}
    setDraft(initial);
  }, [storeKey, initial]);

  return { draft, update, setDraft, clear };
}

/** Add an order to the offline queue (for use when offline). */
export function enqueueOrder(order: Omit<OfflinePendingOrder, "id" | "createdAt">) {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    const queue: OfflinePendingOrder[] = raw ? JSON.parse(raw) : [];
    queue.push({
      ...order,
      id: `pending-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      createdAt: Date.now(),
    });
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    return true;
  } catch {
    return false;
  }
}

export function readQueue(): OfflinePendingOrder[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function removeFromQueue(id: string) {
  try {
    const queue = readQueue().filter((o) => o.id !== id);
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch {}
}

/**
 * Listens to navigator.online and surfaces queued drafts to the user
 * when connectivity returns. Wire one instance globally in App.tsx.
 */
export function useOfflineSync(bn: boolean) {
  const [online, setOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);

  useEffect(() => {
    const onOnline = () => {
      setOnline(true);
      const queue = readQueue();
      if (queue.length > 0) {
        toast.success(
          bn ? `${queue.length}টি অপেক্ষমাণ অর্ডার সিঙ্ক করার জন্য প্রস্তুত` : `${queue.length} pending order(s) ready to sync`,
          {
            description: bn ? "চেকআউট পেজে গিয়ে সাবমিট করুন" : "Open checkout to finalize",
            duration: 6000,
          },
        );
      }
    };
    const onOffline = () => {
      setOnline(false);
      toast.warning(bn ? "অফলাইন মোড — ড্রাফট স্বয়ংক্রিয়ভাবে সংরক্ষিত হবে" : "Offline — drafts will be saved automatically");
    };
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [bn]);

  return { online, queueLength: readQueue().length };
}
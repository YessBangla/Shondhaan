import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useMartWishlist } from "@/contexts/MartWishlistContext";
import { haptic } from "@/lib/haptics";

const SNAPSHOT_KEY = "yess_wishlist_price_snapshot";
const NOTIFIED_KEY = "yess_wishlist_price_notified";

type Snapshot = Record<string, number>;

/**
 * Watches wishlist items for price drops since the last visit. Surfaces a
 * toast for each newly-discounted product, max once per product per drop.
 */
export function usePriceDropAlerts() {
  const { items } = useMartWishlist();
  const ranRef = useRef(false);

  useEffect(() => {
    if (ranRef.current || items.length === 0) return;
    ranRef.current = true;

    let snapshot: Snapshot = {};
    let notified: Snapshot = {};
    try {
      snapshot = JSON.parse(localStorage.getItem(SNAPSHOT_KEY) || "{}");
      notified = JSON.parse(localStorage.getItem(NOTIFIED_KEY) || "{}");
    } catch {}

    const bn = (localStorage.getItem("yess_lang") || "bn") === "bn";
    const nextSnapshot: Snapshot = {};
    let drops = 0;

    items.forEach((p) => {
      nextSnapshot[p.id] = p.price;
      const prev = snapshot[p.id];
      if (prev && p.price < prev && notified[p.id] !== p.price) {
        drops += 1;
        const pct = Math.round(((prev - p.price) / prev) * 100);
        notified[p.id] = p.price;
        // stagger so multiple toasts don't collide
        setTimeout(() => {
          haptic("medium");
          toast.success(
          bn ? `দাম কমেছে — ${p.name} 🎉` : `Price drop — ${p.name_en || p.name} 🎉`,
            {
              description: bn
                ? `৳${prev} → ৳${p.price} (${pct}% ছাড়)`
                : `৳${prev} → ৳${p.price} (${pct}% off)`,
              duration: 7000,
            }
          );
        }, drops * 800);
      }
    });

    try {
      localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(nextSnapshot));
      localStorage.setItem(NOTIFIED_KEY, JSON.stringify(notified));
    } catch {}
  }, [items]);
}

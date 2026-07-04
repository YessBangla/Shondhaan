import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { toast } from "sonner";
import { useCart } from "@/contexts/CartContext";
import { haptic } from "@/lib/haptics";

const IDLE_MS = 60_000; // 1 minute
const COOLDOWN_MS = 10 * 60_000; // 10 min between nudges

export default function CartAbandonmentNudge() {
  const { items, totalItems, setIsOpen } = useCart();
  const location = useLocation();
  const timerRef = useRef<number | null>(null);
  const lastFiredRef = useRef<number>(0);

  useEffect(() => {
    // Skip if user is already on checkout/cart-related routes
    const skip = ["/checkout", "/mart/checkout", "/booking-confirmation"].some((p) =>
      location.pathname.startsWith(p)
    );
    if (timerRef.current) window.clearTimeout(timerRef.current);
    if (skip || totalItems === 0) return;

    timerRef.current = window.setTimeout(() => {
      const now = Date.now();
      if (now - lastFiredRef.current < COOLDOWN_MS) return;
      lastFiredRef.current = now;
      const bn = (localStorage.getItem("yess_lang") || "bn") === "bn";
      haptic("light");
      toast.info(bn ? "কার্টে কিছু রয়ে গেছে 🛒" : "You left items in your cart 🛒", {
        description: bn
          ? `${totalItems}টি সেবা চেকআউটের অপেক্ষায়`
          : `${totalItems} service${totalItems > 1 ? "s" : ""} waiting for checkout`,
        action: {
          label: bn ? "দেখুন" : "View",
          onClick: () => setIsOpen(true),
        },
        duration: 8000,
      });
    }, IDLE_MS);

    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [items, totalItems, location.pathname, setIsOpen]);

  return null;
}

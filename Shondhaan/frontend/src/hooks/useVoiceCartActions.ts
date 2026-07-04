import { useEffect, useRef } from "react";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";

/**
 * Listens for global custom events to control the cart hands-free.
 * Dispatch from voice flows: window.dispatchEvent(new CustomEvent("yess:voice-cart", { detail: { action: "open" }}))
 * Supported actions: open, close, clear, count
 */
export function useVoiceCartActions() {
  const { setIsOpen, clearCart, totalItems } = useCart();
  const ref = useRef({ setIsOpen, clearCart, totalItems });
  ref.current = { setIsOpen, clearCart, totalItems };

  useEffect(() => {
    const onAction = (e: Event) => {
      const detail = (e as CustomEvent).detail || {};
      const bn = (localStorage.getItem("yess_lang") || "bn") === "bn";
      const { action } = detail as { action: string };
      switch (action) {
        case "open":
          ref.current.setIsOpen(true);
          break;
        case "close":
          ref.current.setIsOpen(false);
          break;
        case "clear":
          ref.current.clearCart();
          toast.success(bn ? "কার্ট খালি করা হয়েছে" : "Cart cleared");
          break;
        case "count":
          toast.info(
            bn ? `কার্টে ${ref.current.totalItems}টি আইটেম` : `${ref.current.totalItems} items in cart`
          );
          break;
      }
    };
    window.addEventListener("yess:voice-cart", onAction);
    return () => window.removeEventListener("yess:voice-cart", onAction);
  }, []);
}

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { MartProduct } from "@/hooks/useMartData";
import { toast } from "sonner";
import { haptic } from "@/lib/haptics";
import { useAuth } from "@/contexts/AuthContext";

export interface MartCartItem {
  product: MartProduct;
  quantity: number;
}

interface MartCartContextType {
  items: MartCartItem[];
  addItem: (product: MartProduct, qty?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, qty: number) => void;
  clearCart: () => void;
  totalItems: number;
  subtotal: number;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const MartCartContext = createContext<MartCartContextType | undefined>(undefined);

export function MartCartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const storageKey = user?.id ? `mart-cart-${user.id}` : "mart-cart-guest";

  const [items, setItems] = useState<MartCartItem[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? (JSON.parse(raw) as MartCartItem[]) : [];
    } catch { return []; }
  });
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(storageKey);
      setItems(raw ? (JSON.parse(raw) as MartCartItem[]) : []);
    } catch { setItems([]); }
  }, [storageKey]);

  // Persist optimistically — survives refresh / app re-open like a native app.
  useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify(items)); } catch { /* quota */ }
  }, [items, storageKey]);

  const addItem = useCallback((product: MartProduct, qty = 1) => {
    haptic("success");
    setItems((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        return prev.map((i) =>
          i.product.id === product.id
            ? { ...i, quantity: Math.min(i.quantity + qty, product.stock || 99) }
            : i
        );
      }
      return [...prev, { product, quantity: qty }];
    });
    setIsOpen(true);
  }, []);

  const removeItem = useCallback((productId: string) => {
    haptic("warning");
    setItems((prev) => {
      const removed = prev.find((i) => i.product.id === productId);
      const next = prev.filter((i) => i.product.id !== productId);
      if (removed) {
        toast("পণ্য সরানো হয়েছে", {
          description: removed.product.name,
          action: {
            label: "Undo",
            onClick: () => setItems((cur) => (cur.find((c) => c.product.id === productId) ? cur : [...cur, removed])),
          },
        });
      }
      return next;
    });
  }, []);

  const updateQuantity = useCallback((productId: string, qty: number) => {
    if (qty <= 0) {
      setItems((prev) => prev.filter((i) => i.product.id !== productId));
    } else {
      setItems((prev) =>
        prev.map((i) => (i.product.id === productId ? { ...i, quantity: qty } : i))
      );
    }
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const totalItems = items.reduce((s, i) => s + i.quantity, 0);
  const subtotal = items.reduce((s, i) => s + i.product.price * i.quantity, 0);

  return (
    <MartCartContext.Provider
      value={{ items, addItem, removeItem, updateQuantity, clearCart, totalItems, subtotal, isOpen, setIsOpen }}
    >
      {children}
    </MartCartContext.Provider>
  );
}

export function useMartCart() {
  const ctx = useContext(MartCartContext);
  if (!ctx) throw new Error("useMartCart must be inside MartCartProvider");
  return ctx;
}

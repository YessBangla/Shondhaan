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
  removeItem: (productId: string, unit?: string | null) => void;
  updateQuantity: (productId: string, qty: number, unit?: string | null) => void;
  clearCart: () => void;
  totalItems: number;
  subtotal: number;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const getCartKey = (product: MartProduct) => `${product.id}:${product.unit || "default"}`;
const getItemKey = (productId: string, unit?: string | null) => `${productId}:${unit || "default"}`;

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
      const cartKey = getCartKey(product);
      const existing = prev.find((i) => getCartKey(i.product) === cartKey);
      if (existing) {
        return prev.map((i) =>
          getCartKey(i.product) === cartKey
            ? { ...i, quantity: Math.min(i.quantity + qty, product.stock || 99) }
            : i
        );
      }
      return [...prev, { product, quantity: qty }];
    });
    setIsOpen(true);
  }, []);

  const removeItem = useCallback((productId: string, unit?: string | null) => {
    haptic("warning");
    setItems((prev) => {
      const itemKey = getItemKey(productId, unit);
      const removed = prev.find((i) => getCartKey(i.product) === itemKey);
      const next = prev.filter((i) => getCartKey(i.product) !== itemKey);
      if (removed) {
        toast("পণ্য সরানো হয়েছে", {
          description: removed.product.name,
          action: {
            label: "Undo",
            onClick: () => setItems((cur) => (cur.find((c) => getCartKey(c.product) === itemKey) ? cur : [...cur, removed])),
          },
        });
      }
      return next;
    });
  }, []);

  const updateQuantity = useCallback((productId: string, qty: number, unit?: string | null) => {
    const itemKey = getItemKey(productId, unit);
    if (qty <= 0) {
      setItems((prev) => prev.filter((i) => getCartKey(i.product) !== itemKey));
    } else {
      setItems((prev) =>
        prev.map((i) => (getCartKey(i.product) === itemKey ? { ...i, quantity: qty } : i))
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

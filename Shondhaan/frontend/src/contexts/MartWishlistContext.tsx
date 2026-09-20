import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from "react";
import type { MartProduct } from "@/hooks/useMartData";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { getMySqlAuth } from "@/lib/mysqlAuth";
import { toPublicProduct } from "@/lib/martApi";

interface MartWishlistContextType {
  items: MartProduct[];
  toggleWishlist: (product: MartProduct) => Promise<void>;
  isInWishlist: (productId: string) => boolean;
  clearWishlist: () => void;
  count: number;
}

const MartWishlistContext = createContext<MartWishlistContextType | undefined>(undefined);

const API_BASE = (
  import.meta.env.VITE_MART_API_BASE_URL ??
  import.meta.env.VITE_API_BASE ??
    ""
).replace(/\/$/, "");

function normalizeProductId(product: unknown) {
  return String((product as { id?: unknown })?.id ?? "");
}

const GUEST_WISHLIST_KEY = "mart-wishlist-guest";

const readGuestWishlist = (): MartProduct[] => {
  try {
    const raw = localStorage.getItem(GUEST_WISHLIST_KEY);
    return raw ? (JSON.parse(raw) as MartProduct[]) : [];
  } catch {
    return [];
  }
};

export function MartWishlistProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [items, setItems] = useState<MartProduct[]>([]);

  const refreshFromBackend = useCallback(async () => {
    if (authLoading) return;

    const token = getMySqlAuth()?.token;
    if (!token && !user) {
      setItems(readGuestWishlist());
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/wishlist`, {
        credentials: "include",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const json = await res.json().catch(() => ({}));

      if (!res.ok || json.success === false) {
        throw new Error(json?.message ?? `Wishlist fetch failed (${res.status})`);
      }

      const wishlistRows = Array.isArray(json.data) ? json.data : [];
      const accountItems = wishlistRows.map((row) => toPublicProduct(row as any)) as MartProduct[];
      const guestItems = readGuestWishlist();
      const missingGuestItems = guestItems.filter(
        (guest) => !accountItems.some((item) => normalizeProductId(item) === normalizeProductId(guest))
      );

      // Move a guest wishlist into the account after sign-in/sign-up. Leave
      // the guest copy intact on an API failure so products are never lost.
      await Promise.all(missingGuestItems.map(async (product) => {
        const response = await fetch(`${API_BASE}/api/wishlist/${encodeURIComponent(normalizeProductId(product))}`, {
          method: "POST",
          credentials: "include",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!response.ok) throw new Error("Wishlist migration failed");
      }));
      try { localStorage.removeItem(GUEST_WISHLIST_KEY); } catch { /* storage unavailable */ }
      setItems([...accountItems, ...missingGuestItems]);
    } catch (error) {
      console.error("Wishlist refresh error:", error);
    }
  }, [authLoading, user]);

  useEffect(() => {
    refreshFromBackend();
  }, [refreshFromBackend]);

  useEffect(() => {
    const handleAuthChanged = () => {
      refreshFromBackend();
    };

    window.addEventListener("yess-mysql-auth-changed", handleAuthChanged);
    return () => window.removeEventListener("yess-mysql-auth-changed", handleAuthChanged);
  }, [refreshFromBackend]);

  const isInWishlist = useCallback(
    (productId: string) => items.some((product) => normalizeProductId(product) === String(productId)),
    [items]
  );

  const toggleWishlist = useCallback(
    async (product: MartProduct) => {
      if (authLoading) return;

      const token = getMySqlAuth()?.token;
      if (!token && !user) {
        const productId = String(product.id);
        const exists = isInWishlist(productId);
        const nextItems = exists
          ? items.filter((item) => normalizeProductId(item) !== productId)
          : [...items, { ...product, id: productId }];
        setItems(nextItems);
        try { localStorage.setItem(GUEST_WISHLIST_KEY, JSON.stringify(nextItems)); } catch { /* quota */ }
        toast[exists ? "info" : "success"](exists ? "Removed from wishlist" : "Added to wishlist");
        window.dispatchEvent(new Event("mart:wishlist-updated"));
        return;
      }

      const productId = String(product.id);
      const exists = isInWishlist(productId);
      const previousItems = items;

      setItems(
        exists
          ? previousItems.filter((item) => normalizeProductId(item) !== productId)
          : [...previousItems, { ...product, id: productId }]
      );
      toast[exists ? "info" : "success"](
        exists ? "Removed from wishlist" : "Added to wishlist"
      );

      try {
        const res = await fetch(`${API_BASE}/api/wishlist/${encodeURIComponent(productId)}`, {
          method: exists ? "DELETE" : "POST",
          credentials: "include",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const json = await res.json().catch(() => ({}));

        if (!res.ok || json.success === false) {
          throw new Error(json.message || `Failed to ${exists ? "remove" : "add"} wishlist`);
        }

        window.dispatchEvent(new Event("mart:wishlist-updated"));
      } catch (error) {
        setItems(previousItems);
        const message = error instanceof Error ? error.message : "Wishlist update failed";
        toast.error(message);
      }
    },
    [items, isInWishlist, authLoading, user]
  );

  const clearWishlist = useCallback(() => {
    setItems([]);
    if (!getMySqlAuth()?.token && !user) {
      try { localStorage.removeItem(GUEST_WISHLIST_KEY); } catch { /* storage unavailable */ }
    }
  }, [user]);

  return (
    <MartWishlistContext.Provider
      value={{ items, toggleWishlist, isInWishlist, clearWishlist, count: items.length }}
    >
      {children}
    </MartWishlistContext.Provider>
  );
}

export function useMartWishlist() {
  const context = useContext(MartWishlistContext);
  if (!context) throw new Error("useMartWishlist must be inside MartWishlistProvider");
  return context;
}

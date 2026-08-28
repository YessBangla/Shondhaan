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

export function MartWishlistProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [items, setItems] = useState<MartProduct[]>([]);

  const refreshFromBackend = useCallback(async () => {
    if (authLoading) return;

    const token = getMySqlAuth()?.token;
    if (!token && !user) {
      setItems([]);
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
      setItems(wishlistRows.map((row) => toPublicProduct(row as any)) as MartProduct[]);
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
        toast.info("Please login to use wishlist");
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

  const clearWishlist = useCallback(() => setItems([]), []);

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

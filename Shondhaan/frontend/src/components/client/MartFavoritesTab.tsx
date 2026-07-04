import { useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import MartProductCard from "@/components/mart/MartProductCard";
import { useMartWishlist } from "@/contexts/MartWishlistContext";

export default function MartFavoritesTab() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const { items } = useMartWishlist();
  const bn = language === "bn";

  const title = useMemo(() => (bn ? "মার্ট ফেভারিট" : "Mart Favorites"), [bn]);

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-base text-muted-foreground">{bn ? "লগইন করুন" : "Please login"}</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-base text-muted-foreground">{bn ? "কোনো ফেভারিট নেই" : "No favorites"}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <span className="text-primary">♥</span> {title}
        <span className="text-xs text-muted-foreground font-normal">({items.length})</span>
      </h2>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {items.map((p) => (
          <MartProductCard key={p.id} product={p} />
        ))}
      </div>
    </div>
  );
}

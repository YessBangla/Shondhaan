import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, ShoppingCart, Trash2, ArrowLeft, Sparkles, ShoppingBag, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/contexts/LanguageContext";
import { useMartWishlist } from "@/contexts/MartWishlistContext";
import { useMartCart } from "@/contexts/MartCartContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PullToRefreshIndicator from "@/components/PullToRefreshIndicator";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";

const MartWishlist = () => {
  
  const navigate = useNavigate();
  const { language } = useLanguage();
  const bn = language === "bn";
  const { items, toggleWishlist, clearWishlist } = useMartWishlist();
  const { addItem } = useMartCart();
  const { pull, refreshing } = usePullToRefresh(async () => {
    // wishlist is local-only; brief delay gives user the refreshed feel
    await new Promise((r) => setTimeout(r, 250));
  });

  const handleAddToCart = (product: any) => {
    addItem(product, 1);
  };

  return (
    <div className="min-h-screen bg-background">
      <PullToRefreshIndicator pull={pull} refreshing={refreshing} />
      <Navbar />
      <div className="pt-[44px] md:pt-[0px]" />

      {/* Header */}
      <div className="bg-gradient-to-r from-primary to-primary/80 text-white">
        <div className="app-container py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" className="text-white hover:bg-primary-foreground/10" onClick={() => navigate("/mart/home")}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold flex items-center gap-2">
                  <Heart className="h-5 w-5 fill-current" /> {bn ? "আমার উইশলিস্ট" : "My Wishlist"}
                </h1>
                <p className="text-xs text-white/70">
                  {items.length} {bn ? "টি পণ্য সেভ করা আছে" : "items saved"}
                </p>
              </div>
            </div>
            {items.length > 0 && (
              <Button variant="secondary" size="sm" onClick={clearWishlist} className="text-xs">
                <Trash2 className="h-3.5 w-3.5 mr-1" /> {bn ? "সব মুছুন" : "Clear"}
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="app-container py-0 pb-28 md:pb-8">
        {items.length > 0 ? (
          <AnimatePresence mode="popLayout">
            <div className="space-y-3">
              {items.map((p, i) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-card border border-border/50 rounded-xl overflow-hidden hover:shadow-md transition-shadow"
                >
                  <div className="flex gap-3 p-3">
                    {/* Product Image */}
                    <div
                      className="w-24 h-24 md:w-32 md:h-32 rounded-lg overflow-hidden bg-muted shrink-0 cursor-pointer"
                      onClick={() => navigate(`/mart/product/${p.slug}`)}
                    >
                      {p.image_url ? (
                        <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ShoppingBag className="h-8 w-8 text-muted-foreground/40" />
                        </div>
                      )}
                    </div>

                    {/* Product Info */}
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <h3
                          className="font-semibold text-foreground text-sm md:text-base line-clamp-2 cursor-pointer hover:text-primary transition-colors"
                          onClick={() => navigate(`/mart/product/${p.slug}`)}
                        >
                          {bn ? p.name : (p.name_en || p.name)}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          {p.rating > 0 && (
                            <div className="flex items-center gap-0.5">
                              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                              <span className="text-xs text-muted-foreground">{p.rating}</span>
                            </div>
                          )}
                          {p.total_sold > 0 && (
                            <span className="text-[10px] text-muted-foreground">
                              {p.total_sold} {bn ? "বিক্রি" : "sold"}
                            </span>
                          )}
                          {p.stock <= 0 && (
                            <Badge variant="destructive" className="text-[10px] px-1.5 py-0">{bn ? "স্টক আউট" : "Out of Stock"}</Badge>
                          )}
                        </div>
                      </div>

                      <div className="flex items-end justify-between mt-2">
                        <div>
                          <span className="text-lg font-bold text-primary">৳{p.price.toLocaleString("bn-BD")}</span>
                          {p.original_price && p.original_price > p.price && (
                            <span className="text-xs text-muted-foreground line-through ml-1.5">৳{p.original_price.toLocaleString("bn-BD")}</span>
                          )}
                          {p.original_price && p.original_price > p.price && (
                            <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 py-0 bg-destructive/10 text-destructive border-0">
                              -{Math.round((1 - p.price / p.original_price) * 100)}%
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-1.5 shrink-0 justify-between items-end">
                      <Button
                        variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10"
                        onClick={() => toggleWishlist(p)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm" className="text-xs h-8 rounded-full px-3"
                        onClick={() => handleAddToCart(p)}
                        disabled={p.stock <= 0}
                      >
                        <ShoppingCart className="h-3.5 w-3.5 mr-1" />
                        {bn ? "কার্ট" : "Cart"}
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Add All to Cart */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-6 flex justify-center">
              <Button
                size="lg" className="rounded-full px-8 font-bold"
                onClick={() => items.filter(p => p.stock > 0).forEach(p => addItem(p, 1))}
                disabled={items.filter(p => p.stock > 0).length === 0}
              >
                <ShoppingCart className="h-5 w-5 mr-2" />
                {bn ? `সব কার্টে যোগ করুন (${items.filter(p => p.stock > 0).length})` : `Add All to Cart (${items.filter(p => p.stock > 0).length})`}
              </Button>
            </motion.div>
          </AnimatePresence>
        ) : (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-5">
            <div className="w-24 h-24 mx-auto mb-5 rounded-full bg-muted/50 flex items-center justify-center">
              <Heart className="h-12 w-12 text-muted-foreground/30" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">{bn ? "উইশলিস্ট খালি" : "Wishlist is empty"}</h2>
            <p className="text-sm text-muted-foreground mb-5 max-w-xs mx-auto">
              {bn ? "পছন্দের পণ্যে ❤️ চাপুন, এখানে সেভ হবে!" : "Tap ❤️ on products you love to save them here!"}
            </p>
            <Button onClick={() => navigate("/mart/home")} className="rounded-full px-6">
              <Sparkles className="h-4 w-4 mr-2" /> {bn ? "শপিং শুরু করুন" : "Start Shopping"}
            </Button>
          </motion.div>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default MartWishlist;

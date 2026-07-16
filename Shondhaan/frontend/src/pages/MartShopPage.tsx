import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Store, MapPin, Phone, Star, ShoppingBag, CheckCircle2, Package } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MartProductCard from "@/components/mart/MartProductCard";
import { getMartSellerBySlug, listMartProducts, toPublicProduct } from "@/lib/martApi";

const MartShopPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const bn = language === "bn";

  const { data: shop, isLoading: shopLoading } = useQuery({
    queryKey: ["mart-shop", slug],
    queryFn: async () => {
      const seller = await getMartSellerBySlug(slug!);
      if (!seller) return null;
      return {
        id: seller.id,
        slug: seller.slug,
        // UI block uses: {bn ? shop.name : (shop.name_en || shop.name)}
        // So: bn -> sellers.shop_name, en -> sellers.seller_name
        name: seller.shop_name || seller.seller_name,
        name_en: seller.seller_name,
        description: seller.seller_address,
        phone: seller.seller_mobile,
        district: seller.seller_address,
        division: null,
        banner_url: null,
        logo_url: null,
        is_verified: Boolean(seller.seller_verified),
        total_products: seller.seller_total_products || 0,
        total_orders: 0,
        rating: 0,
      };
    },
    enabled: !!slug,
  });

  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ["mart-shop-products", shop?.id],
    queryFn: async () => {
      const data = await listMartProducts(Number(shop!.id));
      return data
        .filter((product) => product.status === "active")
        .map(toPublicProduct);
    },
    enabled: !!shop?.id,
  });

  if (shopLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
      <div className="pt-[44px] md:pt-[104px]" />
        <div className="pt-[44px] md:pt-[104px] flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </div>
    );
  }

  if (!shop) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
      <div className="pt-[44px] md:pt-[104px]" />
        <div className="pt-[44px] md:pt-[104px] flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
          <Store className="h-16 w-16 text-muted-foreground/30 mb-4" />
          <h1 className="text-xl font-bold text-foreground mb-2">{bn ? "শপ খুঁজে পাওয়া যায়নি" : "Shop not found"}</h1>
          <p className="text-muted-foreground mb-4">{bn ? "এই লিংকে কোনো শপ নেই" : "No shop exists at this URL"}</p>
          <button onClick={() => navigate("/mart/home")} className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">
            {bn ? "মার্টে ফিরুন" : "Go to Mart"}
          </button>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-[44px] md:pt-[104px]" />
      <div className="pt-[44px] md:pt-[104px]" />

      {/* Shop Banner */}
      <div className="relative">
        {shop.banner_url ? (
          <img src={shop.banner_url} alt="" className="w-full h-36 md:h-48 object-cover" />
        ) : (
          <div className="w-full h-36 md:h-48 bg-gradient-to-r from-primary/20 via-primary/10 to-primary/20" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
      </div>

      {/* Shop Info */}
      <div className="app-container -mt-12 relative z-10 mb-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-border bg-card p-5 shadow-sm"
        >
          <div className="flex items-start gap-4">
            {shop.logo_url ? (
              <img src={shop.logo_url} alt="" className="w-16 h-16 rounded-xl object-cover border-2 border-primary/20 shrink-0" />
            ) : (
              <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center border-2 border-primary/20 shrink-0">
                <Store className="h-8 w-8 text-primary" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-foreground truncate">{bn ? shop.name : (shop.name_en || shop.name)}</h1>
                {shop.is_verified && (
                  <CheckCircle2 className="h-5 w-5 text-blue-500 shrink-0" />
                )}
              </div>
              {shop.description && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{shop.description}</p>
              )}
              <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted-foreground">
                {(shop.division || shop.district) && (
                  <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {shop.district || shop.division}</span>
                )}
                {shop.phone && (
                  <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" /> {shop.phone}</span>
                )}
                <span className="flex items-center gap-1"><Package className="h-3.5 w-3.5" /> {shop.total_products} {bn ? "টি পণ্য" : "products"}</span>
                <span className="flex items-center gap-1"><ShoppingBag className="h-3.5 w-3.5" /> {shop.total_orders} {bn ? "টি অর্ডার" : "orders"}</span>
                {shop.rating > 0 && (
                  <span className="flex items-center gap-1"><Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" /> {shop.rating}</span>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Products */}
      <div className="app-container pb-20">
        <h2 className="text-lg font-bold text-foreground mb-4">{bn ? "সকল পণ্য" : "All Products"}</h2>
        {productsLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground">{bn ? "এই শপে এখনো কোনো পণ্য নেই" : "No products in this shop yet"}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {products.map((p: any) => (
              <MartProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </div>

      <Footer />
      <div className="h-16 md:hidden" />
    </div>
  );
};

export default MartShopPage;

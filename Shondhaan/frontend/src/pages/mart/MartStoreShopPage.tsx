import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ShoppingCart, ChevronRight, Store, Package, Filter, Shield, Star, Grid2X2 } from "lucide-react";

type StoreProduct = ReturnType<typeof toPublicProduct>;
import { useLanguage } from "@/contexts/LanguageContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MartProductCard from "@/components/mart/MartProductCard";
import { useMartCategories, useMartProducts } from "@/hooks/useMartData";
import { useMartCart } from "@/contexts/MartCartContext";
import MartSearchBox from "@/components/mart/MartSearchBox";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  getMartSellerBySlug,
  listMartProducts,
  toPublicProduct,
} from "@/lib/martApi";

const MartStoreShopPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const bn = language === "bn";

  const [sort, setSort] = useState("popular");
  const { totalItems, setIsOpen } = useMartCart();

  const { data: categories = [] } = useMartCategories();

  const { data: shop, isLoading: shopLoading } = useQuery({
    queryKey: ["mart-store", slug],
    queryFn: async () => {
      if (!slug) return null;
      const seller = await getMartSellerBySlug(slug);
      if (!seller) return null;

      return {
        id: seller.id,
        slug: seller.slug,
        // UI block
        name: seller.shop_name || seller.seller_name,
        name_en: seller.seller_name,
        description: seller.seller_address,
        phone: seller.seller_mobile,
        division: seller.seller_address,
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

  const { data: allProducts = [], isLoading: productsLoading } = useQuery({
    queryKey: ["mart-store-products", shop?.id],
    queryFn: async () => {
      if (!shop?.id) return [];
      const data = await listMartProducts(Number(shop.id));
      return (data || []).filter((p: any) => p.status === "active").map(toPublicProduct) as StoreProduct[];
    },
    enabled: !!shop?.id,
  });

  const currentTitle = shop ? (bn ? shop.name : (shop.name_en || shop.name)) : "";

  const products = useMemo(() => {
    const base = [...(allProducts as StoreProduct[])];
    switch (sort) {
      case "price-low":
return base.sort((a, b) => (Number((a as any).price) || 0) - (Number((b as any).price) || 0));
      case "price-high":
        return base.sort((a, b) => (b as any).price - (a as any).price);
      case "rating":
        return base.sort((a, b) => (((b as any).rating || 0) - ((a as any).rating || 0)));
      case "newest":
        return base.sort((a, b) => String((b as any).id).localeCompare(String((a as any).id)));
      case "popular":
      default:
        return base.sort((a, b) => (((b as any).total_sold || 0) - ((a as any).total_sold || 0)));
    }
  }, [allProducts, sort]);

  if (shopLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
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
        <div className="pt-[44px] md:pt-[104px] flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
          <Store className="h-16 w-16 text-muted-foreground/30 mb-4" />
          <h1 className="text-xl font-bold text-foreground mb-2">{bn ? "শপ খুঁজে পাওয়া যায়নি" : "Shop not found"}</h1>
          <p className="text-muted-foreground mb-4">{bn ? "এই লিংকে কোনো শপ নেই" : "No shop exists at this URL"}</p>
          <button
            onClick={() => navigate("/mart")}
            className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white"
          >
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

      {/* Banner */}
      <div className="relative">
        {shop.banner_url ? (
          <img src={shop.banner_url} alt="" className="w-full h-36 md:h-48 object-cover" />
        ) : (
          <div className="w-full h-36 md:h-48 bg-gradient-to-r from-primary/20 via-primary/10 to-primary/20" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
      </div>

      {/* Header */}
      <div className="app-container -mt-12 relative z-10 mb-6">
        <div className="rounded-2xl border border-border bg-card p-4 md:p-6 shadow-sm">
          <div className="flex items-start gap-4">
            {shop.logo_url ? (
              <img
                src={shop.logo_url}
                alt=""
                className="w-16 h-16 rounded-xl object-cover border-2 border-primary/20 shrink-0"
              />
            ) : (
              <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center border-2 border-primary/20 shrink-0">
                <Store className="h-8 w-8 text-primary" />
              </div>
            )}

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl md:text-2xl font-bold truncate">
                  {bn ? shop.name : (shop.name_en || shop.name)}
                </h1>
                {shop.is_verified && <Shield className="h-5 w-5 text-blue-500" />}
              </div>

              {shop.description && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{shop.description}</p>
              )}

              <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Package className="h-3.5 w-3.5" /> {shop.total_products} {bn ? "টি পণ্য" : "products"}
                </span>
                <span className="flex items-center gap-1">
                  <ShoppingCart className="h-3.5 w-3.5" /> {shop.total_orders} {bn ? "অর্ডার" : "orders"}
                </span>
                {shop.rating > 0 && (
                  <span className="flex items-center gap-1">
                    <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" /> {shop.rating}
                  </span>
                )}
              </div>

              <div className="mt-3 md:hidden">
                <Button variant="secondary" size="sm" className="relative" onClick={() => setIsOpen(true)}>
                  <ShoppingCart className="h-4 w-4" />
                  {totalItems > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                      {totalItems}
                    </span>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Layout */}
      <div className="app-container pb-20">
        <div className="flex gap-4">
          {/* Sidebar */}
          <aside className="hidden lg:block w-64 shrink-0">
            <div className="bg-card border border-border/50 rounded-xl p-3 sticky top-20">
              <div className="flex items-center gap-2 mb-2">
                <Grid2X2 className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-bold">{bn ? "ক্যাটাগরি" : "Categories"}</h2>
              </div>

              <div className="space-y-1 max-h-[520px] overflow-y-auto pr-1">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => navigate(`/mart/category/${cat.slug ?? cat.id}`)}
                    className="w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <span className="line-clamp-1 text-left">
                      {bn ? cat.name : (cat.name_en || cat.name)}
                    </span>
                    {cat.children && cat.children.length > 0 ? (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    ) : null}
                  </button>
                ))}
              </div>
            </div>
          </aside>

          {/* Main */}
          <main className="flex-1 min-w-0">
            {/* Breadcrumb */}
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-3 overflow-x-auto">
              <button onClick={() => navigate("/mart")} className="hover:text-primary shrink-0">{bn ? "সন্ধান মার্ট" : "Yess Mart"}</button>
              <ChevronRight className="h-3 w-3 shrink-0" />
              <span className="text-foreground truncate">{currentTitle}</span>
            </div>

            <div className="flex items-center gap-2 mb-4">
              <div className="flex-1">
                <MartSearchBox />
              </div>
              <Select value={sort} onValueChange={setSort}>
                <SelectTrigger className="w-[140px] h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="popular">{bn ? "জনপ্রিয়" : "Popular"}</SelectItem>
                  <SelectItem value="newest">{bn ? "নতুন" : "Newest"}</SelectItem>
                  <SelectItem value="price-low">{bn ? "কম দাম" : "Low Price"}</SelectItem>
                  <SelectItem value="price-high">{bn ? "বেশি দাম" : "High Price"}</SelectItem>
                  <SelectItem value="rating">{bn ? "রেটিং" : "Top Rated"}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Tabs defaultValue="all">
              <TabsList className="w-full justify-start">
                <TabsTrigger value="all">
                  <Filter className="h-3.5 w-3.5 mr-2" />
                  {bn ? "সব" : "All"}
                </TabsTrigger>
              </TabsList>
              <TabsContent value="all">
                {productsLoading ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {Array.from({ length: 10 }).map((_, i) => (
                      <div key={i} className="aspect-square rounded-xl bg-muted animate-pulse" />
                    ))}
                  </div>
                ) : products.length === 0 ? (
                  <div className="text-center py-16 text-muted-foreground">
                    <Package className="h-12 w-12 mx-auto mb-3 opacity-40" />
                    <p>{bn ? "এই শপে পণ্য নেই" : "No products in this shop"}</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {products.map((p) => (
                      <MartProductCard key={p.id} product={p} />
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </main>
        </div>
      </div>

      <Footer />
      <div className="h-16 md:hidden" />
    </div>
  );
};

export default MartStoreShopPage;


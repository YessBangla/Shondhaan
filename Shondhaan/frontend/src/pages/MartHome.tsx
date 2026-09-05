// MartHome.tsx
import { useState, useEffect, useMemo, useRef, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  ShoppingCart,
  ChevronRight,
  ChevronLeft,
  Truck,
  Shield,
  RotateCcw,
  Tag,
  Zap,
  Sparkles,
  TrendingUp,
  Package,
  Award,
  Flame,
  Store,
  MapPin,
  BadgePercent,
  Clock,
  ArrowRight,
  Search,
  X,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useMartWishlist } from "@/contexts/MartWishlistContext";
import {
  useMartProducts,
  useFeaturedProducts,
  useMartBanners,
} from "@/hooks/useMartData";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import MartProductCard from "@/components/mart/MartProductCard";
import FlashDealTimer from "@/components/mart/FlashDealTimer";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BackToHomeButton from "@/components/BackToHomeButton";
import PullToRefreshIndicator from "@/components/PullToRefreshIndicator";
import PlatformSwitcher from "@/components/mart/PlatformSwitcher";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { useSEO } from "@/hooks/useSEO";
import { toPublicProduct } from "@/lib/martApi";

const API_BASE =
  import.meta.env.VITE_MART_API_BASE_URL ||
  import.meta.env.VITE_API_BASE;

interface ActiveCoupon {
  id: number;
  seller_id: number | null;
  code: string;
  description: string | null;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  min_order_amount: number | null;
  max_discount_amount: number | null;
  usage_limit: number | null;
  used_count: number;
  expires_at: string | null;
  is_active: number;
  shop_name?: string | null;
  seller_name?: string | null;
}

const fetchActiveCoupons = async (limit = 12): Promise<ActiveCoupon[]> => {
  const resp = await fetch(`${API_BASE}/api/coupons?limit=${limit}`);
  const result = await resp.json();
  if (!result.success) return [];
  return result.data ?? [];
};

const normalizeProductId = (value: unknown) =>
  String(value ?? "").replace(/^mysql-product-/, "");

const normalizeCategoryId = (value: unknown) => {
  if (value === null || value === undefined || value === "") return null;
  return String(value);
};

const normalizeSearchValue = (value: unknown) =>
  String(value ?? "").toLowerCase().trim();

const isExternalUrl = (value: string) => /^https?:\/\//i.test(value);

const safeHexColor = (value: unknown, fallback: string) => {
  const color = String(value || "").trim();
  return /^#[0-9a-f]{6}$/i.test(color) ? color : fallback;
};

const sortForYouProducts = (items: any[], sort: string) =>
  [...items].sort((a: any, b: any) => {
    switch (sort) {
      case "price-low": return Number(a.price || 0) - Number(b.price || 0);
      case "price-high": return Number(b.price || 0) - Number(a.price || 0);
      case "rating": return Number(b.rating || 0) - Number(a.rating || 0);
      case "newest": return String(b.id).localeCompare(String(a.id));
      default: return Number(b.total_sold || 0) - Number(a.total_sold || 0);
    }
  });

const SectionHeader = ({
  icon,
  title,
  subtitle,
  onViewAll,
  viewAllLabel,
  accent,
}: {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  onViewAll?: () => void;
  viewAllLabel?: string;
  accent?: "default" | "red" | "amber" | "orange";
}) => {
  const accentClass =
    accent === "red"
      ? "text-red-500"
      : accent === "amber"
        ? "text-amber-500"
        : accent === "orange"
          ? "text-orange-500"
          : "text-primary";

  return (
    <div className="flex items-end justify-between mb-5">
      <div className="flex items-center gap-3">
        <div className={`${accentClass} shrink-0`}>{icon}</div>
        <div>
          <h2 className="text-[15px] md:text-[17px] font-bold text-foreground leading-tight">
            {title}
          </h2>
          {subtitle && (
            <p className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>
      {onViewAll && (
        <button
          onClick={onViewAll}
          className="flex items-center gap-1 text-[12px] font-semibold text-primary hover:underline underline-offset-2 transition-all shrink-0"
        >
          {viewAllLabel ?? "View All"}
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
};

const SectionDivider = () => <div className="h-px bg-border/60 my-8" />;

const getCategoryIcon = (name: string): string => {
  const n = (name || "").toLowerCase();
  if (n.includes("grocery") || n.includes("মুদি") || n.includes("food") || n.includes("খাবার")) return "🛒";
  if (n.includes("electronic") || n.includes("ইলেক") || n.includes("gadget")) return "📱";
  if (n.includes("fashion") || n.includes("cloth") || n.includes("পোশাক") || n.includes("dress")) return "👗";
  if (n.includes("beauty") || n.includes("cosmetic") || n.includes("প্রসাধ") || n.includes("makeup")) return "💄";
  if (n.includes("home") || n.includes("বাড়ি") || n.includes("furniture") || n.includes("আসবাব")) return "🏠";
  if (n.includes("toy") || n.includes("খেলনা") || n.includes("kid") || n.includes("bab")) return "🧸";
  if (n.includes("sport") || n.includes("খেলাধু") || n.includes("fitness") || n.includes("gym") || n.includes("outdoor")) return "🏃";
  if (n.includes("book") || n.includes("বই") || n.includes("stationer") || n.includes("office")) return "📚";
  if (n.includes("computer") || n.includes("laptop") || n.includes("কম্পিউটার")) return "💻";
  if (n.includes("health") || n.includes("স্বাস্থ") || n.includes("medicine") || n.includes("ওষুধ")) return "🧴";
  if (n.includes("organic") || n.includes("জৈব") || n.includes("natural") || n.includes("herb")) return "🌿";
  if (n.includes("vegetable") || n.includes("সবজি") || n.includes("fruit") || n.includes("ফল")) return "🥦";
  if (n.includes("meat") || n.includes("মাংস") || n.includes("fish") || n.includes("মাছ")) return "🍖";
  if (n.includes("dairy") || n.includes("দুধ") || n.includes("milk") || n.includes("egg")) return "🥛";
  if (n.includes("shoe") || n.includes("জুতা") || n.includes("footwear")) return "👟";
  if (n.includes("bag") || n.includes("ব্যাগ") || n.includes("purse") || n.includes("wallet")) return "👜";
  if (n.includes("watch") || n.includes("ঘড়ি") || n.includes("jewel") || n.includes("গহনা")) return "⌚";
  if (n.includes("kitchen") || n.includes("রান্নাঘর") || n.includes("cook") || n.includes("রান্না")) return "🍳";
  if (n.includes("pet") || n.includes("পোষা") || n.includes("animal") || n.includes("dog") || n.includes("cat")) return "🐾";
  if (n.includes("car") || n.includes("vehicle") || n.includes("auto") || n.includes("গাড়ি") || n.includes("motorbike") || n.includes("automotive")) return "🚗";
  if (n.includes("tool") || n.includes("hardware") || n.includes("যন্ত্রপাতি")) return "🔧";
  if (n.includes("game") || n.includes("gaming") || n.includes("গেম")) return "🎮";
  if (n.includes("music") || n.includes("instrument") || n.includes("সঙ্গীত")) return "🎵";
  if (n.includes("garden") || n.includes("plant") || n.includes("বাগান")) return "🌱";
  if (n.includes("stationery") || n.includes("pen") || n.includes("কলম")) return "✏️";
  if (n.includes("travel") || n.includes("luggage") || n.includes("ট্রাভেল")) return "🧳";
  if (n.includes("photo") || n.includes("camera") || n.includes("ক্যামেরা")) return "📷";
  if (n.includes("tv") || n.includes("appliance") || n.includes("television")) return "📺";
  if (n.includes("women") || n.includes("womens")) return "👗";
  if (n.includes("men") || n.includes("mens")) return "👔";
  return "📦";
};

const getCategoryColor = (name: string): string => {
  const n = (name || "").toLowerCase();
  if (n.includes("electronic") || n.includes("computer") || n.includes("phone") || n.includes("gadget") || n.includes("tv") || n.includes("appliance")) return "#eff6ff";
  if (n.includes("women") || n.includes("fashion") || n.includes("cloth") || n.includes("shoe") || n.includes("bag")) return "#fdf4ff";
  if (n.includes("beauty") || n.includes("health") || n.includes("cosmetic")) return "#fff1f2";
  if (n.includes("food") || n.includes("grocery") || n.includes("vegetable") || n.includes("fruit") || n.includes("pet")) return "#f0fdf4";
  if (n.includes("home") || n.includes("furniture") || n.includes("kitchen") || n.includes("lifestyle")) return "#fefce8";
  if (n.includes("toy") || n.includes("baby") || n.includes("kid")) return "#fdf4ff";
  if (n.includes("sport") || n.includes("fitness") || n.includes("outdoor")) return "#f0fdfa";
  if (n.includes("book") || n.includes("stationer") || n.includes("office")) return "#faf5ff";
  if (n.includes("watch") || n.includes("jewel") || n.includes("bag")) return "#fefce8";
  if (n.includes("men") || n.includes("auto") || n.includes("motorbike")) return "#f0f9ff";
  return "#fff7ed";
};

// ── Category Carousel — services style (circular illustrated avatars) ──
const CategoryCarousel = ({
  categories,
  bn,
  navigate,
}: {
  categories: any[];
  bn: boolean;
  navigate: (path: string) => void;
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: "left" | "right") => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: dir === "right" ? 280 : -280, behavior: "smooth" });
  };

  return (
    <div className="mb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 px-0.5">
        <h2 className="text-[15px] md:text-[16px] font-bold text-foreground">
          {bn ? "আমাদের ক্যাটাগরি" : "Our Categories"}
        </h2>
        <button
          onClick={() => navigate("/mart/category/all")}
          className="text-[12px] font-semibold text-primary hover:underline underline-offset-2 flex items-center gap-1"
        >
          {bn ? "সব দেখুন" : "View All"}
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Strip — plain background, circular avatars */}
      <div className="relative">
        {/* Left arrow */}
        <button
          onClick={() => scroll("left")}
          className="absolute -left-3 top-[38px] z-10 h-8 w-8 rounded-full bg-white dark:bg-card border border-border/50 shadow-md flex items-center justify-center hover:bg-muted transition-colors"
        >
          <ChevronLeft className="h-4 w-4 text-foreground" />
        </button>

        {/* Scrollable row */}
        <div
          ref={scrollRef}
          className="flex gap-6 overflow-x-auto px-6 py-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
        >
          {categories.map((cat: any) => {
            // Prefer image_url (full category illustration), then icon_url, then emoji fallback
            const imgSrc = cat.image_url || cat.icon_url || null;
            const isHttpImg = imgSrc && imgSrc.startsWith("http");
            const isEmojiIcon = imgSrc && !imgSrc.startsWith("http");
            const fallbackEmoji = getCategoryIcon(cat.name || "");

            return (
              <button
                key={cat.id}
                onClick={() => navigate(`/mart/category/${cat.slug ?? cat.id}`)}
                className="group shrink-0 w-[84px] flex flex-col items-center gap-2"
              >
                {/* Circular illustrated avatar */}
                <div
                  className="h-[76px] w-[76px] rounded-full flex items-center justify-center shrink-0 overflow-hidden shadow-sm group-hover:shadow-md group-hover:-translate-y-0.5 transition-all duration-200"
                  style={{ background: getCategoryColor(cat.name || "") }}
                >
                  {isHttpImg ? (
                    <img
                      src={imgSrc}
                      className="h-full w-full object-cover"
                      alt={cat.name}
                      onError={(e) => {
                        const el = e.currentTarget as HTMLImageElement;
                        el.style.display = "none";
                        const sibling = el.nextElementSibling as HTMLElement | null;
                        if (sibling) sibling.style.display = "flex";
                      }}
                    />
                  ) : null}
                  {/* emoji fallback — shown when no http image, or when image fails */}
                  <span
                    className="text-3xl leading-none items-center justify-center"
                    style={{ display: isHttpImg ? "none" : "flex" }}
                  >
                    {isEmojiIcon ? imgSrc : fallbackEmoji}
                  </span>
                </div>

                {/* Label */}
                <span className="text-[12px] font-medium text-foreground text-center leading-tight line-clamp-2 group-hover:text-primary transition-colors w-full">
                  {bn ? cat.name : cat.name_en || cat.name}
                </span>
              </button>
            );
          })}
        </div>

        {/* Right arrow */}
        <button
          onClick={() => scroll("right")}
          className="absolute -right-3 top-[38px] z-10 h-8 w-8 rounded-full bg-white dark:bg-card border border-border/50 shadow-md flex items-center justify-center hover:bg-muted transition-colors"
        >
          <ChevronRight className="h-4 w-4 text-foreground" />
        </button>
      </div>
    </div>
  );
};

const MartHome = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { user } = useAuth();
  const { items: wishlistItems } = useMartWishlist();
  const bn = language === "bn";

  const [homeSort, setHomeSort] = useState("popular");
  const [navTransition, setNavTransition] = useState(false);
  const [currentBanner, setCurrentBanner] = useState(0);
  const [homeSearch, setHomeSearch] = useState("");

  const queryClient = useQueryClient();
  const bannerInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const { pull, refreshing } = usePullToRefresh(async () => {
    await queryClient.invalidateQueries();
  });

  useEffect(() => {
    let flag: string | null = null;
    try { flag = sessionStorage.getItem("yess:nav-transition"); } catch {}
    if (flag) {
      setNavTransition(true);
      try { sessionStorage.removeItem("yess:nav-transition"); } catch {}
      const t = window.setTimeout(() => setNavTransition(false), 600);
      return () => window.clearTimeout(t);
    }
  }, []);

  useSEO({
    title: bn ? "সন্ধান মার্ট — অনলাইন শপিং" : "Yess Mart — Online Shopping",
    description: bn
      ? "সন্ধান মার্টে কেনাকাটা করুন — মুদি, ইলেকট্রনিক্স, পোশাক, প্রসাধনী ও আরও অনেক পণ্য। দ্রুত ডেলিভারি, ক্যাশ অন ডেলিভারি।"
      : "Shop on Yess Mart — groceries, electronics, fashion, beauty & more. Fast delivery, Cash on Delivery available.",
    canonical: "/mart/home",
    keywords: bn
      ? "অনলাইন শপিং বাংলাদেশ, সন্ধান মার্ট, ক্যাশ অন ডেলিভারি"
      : "online shopping bangladesh, yess mart, cash on delivery",
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["mart-categories"],
    queryFn: async () => {
      const [categoriesRes, subCategoriesRes] = await Promise.all([
        fetch(`${API_BASE}/api/categories`),
        fetch(`${API_BASE}/api/sub-categories`),
      ]);
      const [categoriesJson, subCategoriesJson] = await Promise.all([
        categoriesRes.json().catch(() => ({})),
        subCategoriesRes.json().catch(() => ({})),
      ]);
      const rawCategories = categoriesJson.success && Array.isArray(categoriesJson.data) ? categoriesJson.data : [];
      const rawSubCategories = subCategoriesJson.success && Array.isArray(subCategoriesJson.data) ? subCategoriesJson.data : [];

      return rawCategories.map((category: any) => ({
        ...category,
        children: rawSubCategories
          .filter((subCategory: any) => String(subCategory.category_id) === String(category.id))
          .map((subCategory: any) => ({
            id: `sub-${subCategory.id}`,
            parent_id: String(category.id),
            name: subCategory.name,
            name_en: null,
            slug: `sub-${subCategory.id}`,
          })),
      }));
    },
  });

  const { data: products = [] } = useMartProducts(undefined, undefined, 40);
  const { data: featured = [] } = useFeaturedProducts();
  const { data: banners = [] } = useMartBanners();

  const openBannerLink = (link: unknown) => {
    const target = String(link || "").trim();
    if (!target) return;

    if (isExternalUrl(target)) {
      window.open(target, "_blank", "noopener,noreferrer");
      return;
    }

    if (target.startsWith("/")) {
      navigate(target);
    }
  };

  const wishlistCategoryIds = useMemo(
    () => wishlistItems
      .map((product: any) => normalizeCategoryId(product.category_id))
      .filter(Boolean) as string[],
    [wishlistItems]
  );

  const { data: orderedCategoryIds = [] } = useQuery<string[]>({
    queryKey: ["mart-home-ordered-category-ids", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const ordersRes = await fetch(`${API_BASE}/api/orders?user_id=${encodeURIComponent(String(user?.id))}`);
      const ordersJson = await ordersRes.json().catch(() => ({}));
      if (!ordersRes.ok || ordersJson.success === false) return [];

      const orderedProductIds = new Set<string>();
      for (const order of Array.isArray(ordersJson.orders) ? ordersJson.orders : []) {
        for (const item of Array.isArray(order.items) ? order.items : []) {
          const productId = normalizeProductId(item.product_id);
          if (productId) orderedProductIds.add(productId);
        }
      }
      if (orderedProductIds.size === 0) return [];

      const productsRes = await fetch(`${API_BASE}/api/products?status=active`);
      const productsJson = await productsRes.json().catch(() => ({}));
      if (!productsRes.ok || productsJson.success === false) return [];

      const categoryIds = new Set<string>();
      for (const product of Array.isArray(productsJson.data) ? productsJson.data : []) {
        if (orderedProductIds.has(normalizeProductId(product.id))) {
          const categoryId = normalizeCategoryId(product.category_id);
          if (categoryId) categoryIds.add(categoryId);
        }
      }
      return Array.from(categoryIds);
    },
    staleTime: 60_000,
  });

  const personalizedCategoryIds = useMemo(
    () => Array.from(new Set([...wishlistCategoryIds, ...orderedCategoryIds])),
    [wishlistCategoryIds, orderedCategoryIds]
  );

  const personalizedCategoryKey = personalizedCategoryIds.join(",");
  const { data: personalizedProducts = [] } = useQuery({
    queryKey: ["mart-home-personalized-products", personalizedCategoryKey],
    enabled: personalizedCategoryIds.length > 0,
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/products?status=active&category_id=${encodeURIComponent(personalizedCategoryKey)}`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.success === false) return [];

      return (Array.isArray(json.data) ? json.data : [])
        .filter((product: any) => product.seller_verified === true || product.seller_verified === 1 || product.seller_verified === "1")
        .map((product: any) => toPublicProduct(product));
    },
    staleTime: 60_000,
  });

  const { data: popularShops = [] } = useQuery({
    queryKey: ["mart-popular-shops"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/sellers?popular=1`);
      const json = await res.json();
      return json.success ? json.data : [];
    },
  });

  const { data: activeCoupons = [] } = useQuery<ActiveCoupon[]>({
    queryKey: ["mart-active-coupons"],
    queryFn: () => fetchActiveCoupons(12),
    staleTime: 60_000,
  });

  useEffect(() => {
    if (banners.length <= 1) return;
    bannerInterval.current = setInterval(() => {
      setCurrentBanner((prev) => (prev + 1) % banners.length);
    }, 4000);
    return () => { if (bannerInterval.current) clearInterval(bannerInterval.current); };
  }, [banners.length]);

  const categoryProducts = categories
    .slice(0, 6)
    .map((cat: any) => {
      const catIds = [String(cat.id), ...(cat.children?.map((c: any) => String(c.id)) || [])];
      const prods = products.filter((p: any) => p.category_id && catIds.includes(String(p.category_id)));
      return { category: cat, products: prods };
    })
    .filter((cp: any) => cp.products.length > 0);

  const categoryLookup = useMemo(() => {
    const lookup = new Map<string, any>();
    const collect = (cat: any) => {
      const id = normalizeCategoryId(cat?.id);
      if (id) lookup.set(id, cat);
      if (Array.isArray(cat?.children)) cat.children.forEach(collect);
    };
    categories.forEach(collect);
    return lookup;
  }, [categories]);

  const searchQuery = normalizeSearchValue(homeSearch);
  const searchResults = useMemo(() => {
    if (!searchQuery) return [];
    const tokens = searchQuery.split(/\s+/).filter(Boolean);

    return products
      .filter((product: any) => {
        const category = categoryLookup.get(String(product.category_id ?? ""));
        const searchableText = [
          product.name,
          product.name_en,
          product.title,
          product.title_en,
          product.product_name,
          product.description,
          product.category_name,
          product.category_name_en,
          category?.name,
          category?.name_en,
          category?.slug,
          product.seller_name,
          product.shop_name,
        ]
          .map(normalizeSearchValue)
          .filter(Boolean)
          .join(" ");

        return tokens.every((token) => searchableText.includes(token));
      })
      .slice(0, 24);
  }, [categoryLookup, products, searchQuery]);

  const productSearchSuggestions = searchQuery ? searchResults.slice(0, 6) : [];
  const categorySearchSuggestions = useMemo(() => {
    if (!searchQuery) return [];
    const tokens = searchQuery.split(/\s+/).filter(Boolean);

    return Array.from(categoryLookup.values())
      .filter((category: any) => {
        const searchableText = [
          category.name,
          category.name_en,
          category.slug,
        ]
          .map(normalizeSearchValue)
          .filter(Boolean)
          .join(" ");

        return tokens.every((token) => searchableText.includes(token));
      })
      .slice(0, 4);
  }, [categoryLookup, searchQuery]);
  const hasSearchSuggestions =
    Boolean(searchQuery) &&
    (productSearchSuggestions.length > 0 || categorySearchSuggestions.length > 0);

  const hasPersonalizedForYou = personalizedProducts.length > 0;
  const forYouProducts = hasPersonalizedForYou ? personalizedProducts : products;
  const sortedForYou = sortForYouProducts(forYouProducts, homeSort).slice(0, 18);

  return (
    <div className="min-h-screen bg-[#f8f8f8] dark:bg-background">
      <PullToRefreshIndicator pull={pull} refreshing={refreshing} />

      {navTransition && (
        <div className="fixed inset-x-0 top-0 z-[100] h-0.5 overflow-hidden md:hidden">
          <div className="h-full w-full origin-left animate-[mart-nav-progress_0.55s_ease-out_forwards] bg-gradient-to-r from-orange-500 via-rose-500 to-pink-600" />
          <style>{`@keyframes mart-nav-progress { from { transform: scaleX(0.15); } to { transform: scaleX(1); } }`}</style>
        </div>
      )}

      <Navbar />
      <PlatformSwitcher className="hidden" />

      <header className="bg-white dark:bg-card border-b border-border/60 shadow-sm mt-[60px] md:mt-[30px]">
        <div className="border-t border-border/40 bg-gradient-to-r from-orange-50 via-white to-emerald-50 dark:from-orange-950/20 dark:via-card dark:to-emerald-950/20">
          <div className="app-container md:py-3">
            <div className="grid grid-cols-4 auto-cols-[100%] sm:auto-cols-[45%] md:grid-flow-row md:grid-cols-4 gap-3 overflow-x-auto md:overflow-visible scrollbar-none">
              {[
                {
                  icon: <Truck className="h-4.5 w-4.5" />,
                  label: bn ? "ফ্রি ডেলিভারি" : "Free Delivery",
                  sub: bn ? "নির্বাচিত অর্ডারে" : "On selected orders",
                  card: "from-orange-500/12 to-orange-50 dark:to-orange-950/20 border-orange-200/70",
                  iconBox: "bg-orange-500 text-white shadow-orange-500/25",
                },
                {
                  icon: <Shield className="h-4.5 w-4.5" />,
                  label: bn ? "নিরাপদ পেমেন্ট" : "Secure Payment",
                  sub: bn ? "বিশ্বস্ত ও সুরক্ষিত" : "Safe & trusted",
                  card: "from-emerald-500/12 to-emerald-50 dark:to-emerald-950/20 border-emerald-200/70",
                  iconBox: "bg-emerald-500 text-white shadow-emerald-500/25",
                },
                {
                  icon: <RotateCcw className="h-4.5 w-4.5" />,
                  label: bn ? "সহজ রিটার্ন" : "Easy Returns",
                  sub: bn ? "ঝামেলাহীন সাপোর্ট" : "Hassle-free support",
                  card: "from-sky-500/12 to-sky-50 dark:to-sky-950/20 border-sky-200/70",
                  iconBox: "bg-sky-500 text-white shadow-sky-500/25",
                },
                {
                  icon: <Tag className="h-4.5 w-4.5" />,
                  label: bn ? "সেরা দাম" : "Best Price",
                  sub: bn ? "প্রতিদিন নতুন অফার" : "Daily best offers",
                  card: "from-rose-500/12 to-rose-50 dark:to-rose-950/20 border-rose-200/70",
                  iconBox: "bg-rose-500 text-white shadow-rose-500/25",
                },
              ].map((b, i) => (
                <div
                  key={i}
                  className={`group relative overflow-hidden rounded-0 md:rounded-2xl md:border bg-transparent md:bg-gradient-to-br ${b.card} px-0 md:px-3.5 py-3 shadow-sm hover:-translate-y-0.5 transition-all duration-200 shrink-0`}
                  >
                  <div className="absolute -right-6 -top-6 h-16 w-16 rounded-full bg-white/45 dark:bg-white/5" />
                  <div className="relative flex flex-col md:flex-row items-center gap-3">
                    <div className={`h-9 w-9 rounded-xl ${b.iconBox} flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform`}>
                      {b.icon}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[12px] md:text-[13px] text-center font-extrabold text-foreground leading-tight">{b.label}</p>
                      <p className="hidden md:block text-[10px] md:text-[11px] text-center text-muted-foreground mt-0.5 line-clamp-1">{b.sub}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </header>

      <div className="app-container py-1 md:py-2">

        {/* Hero Banner Carousel */}
        <section className="mb-7">
          <form
            onSubmit={(e) => e.preventDefault()}
            className="relative z-30 mb-3"
            role="search"
          >
            <div className="relative flex items-center rounded-xl border border-primary bg-white dark:bg-card shadow-sm focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/15">
              <Search className="absolute left-4 h-5 w-5 text-muted-foreground" />
              <input
                value={homeSearch}
                onChange={(e) => setHomeSearch(e.target.value)}
                placeholder={bn ? "Search by product name or category" : "Search by product name or category"}
                className="h-12 w-full bg-transparent pl-12 pr-12 text-sm font-medium text-foreground outline-none placeholder:text-muted-foreground"
                aria-label="Search products by name or category"
              />
              {homeSearch && (
                <button
                  type="button"
                  onClick={() => setHomeSearch("")}
                  className="absolute right-3 flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            {hasSearchSuggestions && (
              <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-40 overflow-hidden rounded-2xl border border-border/70 bg-white dark:bg-card shadow-lg">
                {productSearchSuggestions.length > 0 && (
                  <div className="py-2">
                    <p className="px-4 pb-1 text-[11px] font-semibold uppercase text-muted-foreground">
                      Products
                    </p>
                    {productSearchSuggestions.map((product: any) => {
                      const productName = bn ? product.name : product.name_en || product.name;
                      const category = categoryLookup.get(String(product.category_id ?? ""));

                      return (
                        <button
                          key={product.id}
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => navigate(`/mart/product/${product.slug ?? normalizeProductId(product.id)}`)}
                          className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-muted/70 transition-colors"
                        >
                          <div className="h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-muted">
                            {product.image_url ? (
                              <img
                                src={product.image_url}
                                alt={productName}
                                className="h-full w-full object-cover"
                                loading="lazy"
                                decoding="async"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                                <Package className="h-5 w-5" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-foreground">{productName}</p>
                            <p className="truncate text-[11px] text-muted-foreground">
                              {category ? (bn ? category.name : category.name_en || category.name) : "Product"}
                            </p>
                          </div>
                          {product.price ? (
                            <span className="shrink-0 text-xs font-bold text-primary">
                              ৳{Number(product.price).toLocaleString("bn-BD")}
                            </span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                )}

                {categorySearchSuggestions.length > 0 && (
                  <div className="border-t border-border/60 py-2">
                    <p className="px-4 pb-1 text-[11px] font-semibold uppercase text-muted-foreground">
                      Categories
                    </p>
                    {categorySearchSuggestions.map((category: any) => (
                      <button
                        key={category.id}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => navigate(`/mart/category/${category.slug ?? category.id}`)}
                        className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-muted/70 transition-colors"
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <Tag className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-foreground">
                            {bn ? category.name : category.name_en || category.name}
                          </p>
                          <p className="text-[11px] text-muted-foreground">Category</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </form>

          <div className="relative rounded-2xl overflow-hidden h-[140px] sm:h-[170px] md:h-[220px] lg:h-[250px] bg-muted shadow-sm">
            {banners.length > 0 ? (
              banners.map((banner: any, i: number) => (
                <div
                  key={banner.id}
                  className={`absolute inset-0 transition-opacity duration-700 ${i === currentBanner ? "opacity-100 z-10" : "opacity-0 z-0"}`}
                  onClick={() => openBannerLink(banner.link_url)}
                  style={{ cursor: banner.link_url ? "pointer" : "default" }}
                >
                  {banner.image_url ? (
                    <img src={banner.image_url} alt={banner.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary/20 via-primary/10 to-accent/10" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent flex flex-col justify-end p-4 md:p-6">
                    <h2 className="text-base md:text-2xl font-extrabold text-white mb-1 drop-shadow-sm">
                      {bn ? banner.title : banner.title_en || banner.title}
                    </h2>
                    {(bn ? banner.subtitle : banner.subtitle_en || banner.subtitle) && (
                      <p className="text-xs md:text-sm text-white/80 drop-shadow-sm">
                        {bn ? banner.subtitle : banner.subtitle_en || banner.subtitle}
                      </p>
                    )}
                    {banner.link_url && (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          openBannerLink(banner.link_url);
                        }}
                        className="mt-3 inline-flex w-fit items-center gap-1.5 rounded-xl bg-white px-3.5 py-2 text-xs font-bold text-slate-950 shadow-sm transition-colors hover:bg-white/90 md:text-sm"
                        style={{
                          backgroundColor: safeHexColor(banner.button_bg_color, "#ffffff"),
                          color: safeHexColor(banner.button_text_color, "#0f172a"),
                        }}
                      >
                        {bn
                          ? banner.button_label || "à¦¦à§‡à¦–à§à¦¨"
                          : banner.button_label_en || banner.button_label || "View"}
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-primary/15 via-primary/5 to-accent/10 flex flex-col justify-center items-start p-5 md:p-8">
                <span className="text-[10px] font-bold text-primary uppercase tracking-widest mb-2 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" />
                  {bn ? "নতুন কালেকশন" : "New Collection"}
                </span>
                <h2 className="text-xl md:text-3xl font-extrabold text-foreground mb-3 leading-tight whitespace-pre-line">
                  {bn ? "সেরা পণ্য,\nসেরা দামে" : "Best Products,\nBest Prices"}
                </h2>
                <button
                  onClick={() => navigate("/mart/category/all")}
                  className="bg-primary text-white px-4 py-2 rounded-xl text-xs md:text-sm font-semibold flex items-center gap-1.5 hover:bg-primary/90 transition-colors"
                >
                  {bn ? "এখনই কিনুন" : "Shop Now"}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            )}
            {banners.length > 1 && (
              <div className="absolute bottom-3 right-4 flex gap-1.5 z-20">
                {banners.map((_: any, i: number) => (
                  <button
                    key={i}
                    onClick={(e) => { e.stopPropagation(); setCurrentBanner(i); }}
                    className={`h-1.5 rounded-full transition-all ${i === currentBanner ? "w-5 bg-white" : "w-1.5 bg-white/50"}`}
                  />
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Category Carousel — image_url / icon_url from backend */}
        {searchQuery && (
          <section className="mb-7">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-[15px] md:text-[17px] font-bold text-foreground">
                  {bn ? "Search Results" : "Search Results"}
                </h2>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {searchResults.length} {searchResults.length === 1 ? "item" : "items"} found for "{homeSearch.trim()}"
                </p>
              </div>
              <button
                type="button"
                onClick={() => setHomeSearch("")}
                className="text-[12px] font-semibold text-primary hover:underline underline-offset-2"
              >
                {bn ? "Clear" : "Clear"}
              </button>
            </div>
            {searchResults.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                {searchResults.map((p: any) => <MartProductCard key={p.id} product={p} />)}
              </div>
            ) : (
              <div className="rounded-2xl border border-border/60 bg-white dark:bg-card py-12 px-4 text-center shadow-sm">
                <Search className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
                <p className="text-sm font-semibold text-foreground">
                  {bn ? "No products found" : "No products found"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {bn ? "Try another product name or category." : "Try another product name or category."}
                </p>
              </div>
            )}
          </section>
        )}

        {categories.length > 0 && (
          <CategoryCarousel categories={categories} bn={bn} navigate={navigate} />
        )}

        {/* Flash Sale */}
        {featured.length > 0 && (
          <section className="mb-1">
            <div className="bg-white dark:bg-card border border-red-100 dark:border-red-900/30 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex flex-col md:flex-row items-start gap-3">
                  <div className="bg-red-500 text-white px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm">
                    <Zap className="h-3.5 w-3.5" />
                    <span className="font-bold text-[13px] text-nowrap">{bn ? "ফ্ল্যাশ সেল" : "Flash Sale"}</span>
                  </div>
                  <FlashDealTimer />
                </div>
                <button
                  onClick={() => navigate("/mart/category/all?featured=true")}
                  className="text-[12px] text-nowrap font-semibold text-red-500 hover:underline flex items-center gap-1"
                  >
                  {bn ? "সব দেখুন" : "View All"}
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {featured.slice(0, 6).map((p: any) => <MartProductCard key={p.id} product={p} />)}
              </div>
            </div>
          </section>
        )}

        <SectionDivider />

        {/* Top Selling */}
        {products.filter((p: any) => Number(p.total_sold || 0) > 0).length > 0 && (
          <section className="mb-1">
            <SectionHeader
              icon={<Award className="h-5 w-5" />}
              title={bn ? "সেরা বিক্রিত পণ্য" : "Top Selling"}
              subtitle={bn ? "সবচেয়ে বেশি বিক্রিত পণ্যগুলো" : "Most purchased by shoppers"}
              onViewAll={() => navigate("/mart/category/all?sort=top-selling")}
              viewAllLabel={bn ? "আরও দেখুন" : "View All"}
              accent="amber"
            />
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {[...products]
                .sort((a: any, b: any) => Number(b.total_sold || 0) - Number(a.total_sold || 0))
                .slice(0, 6)
                .map((p: any) => <MartProductCard key={p.id} product={p} />)}
            </div>
          </section>
        )}

        <SectionDivider />

        {/* Best Deals */}
        {products.filter((p: any) => p.original_price && Number(p.original_price) > Number(p.price)).length > 0 && (
          <section className="mb-1">
            <SectionHeader
              icon={<Flame className="h-5 w-5" />}
              title={bn ? "সেরা ডিসকাউন্ট" : "Best Deals"}
              subtitle={bn ? "সর্বোচ্চ ছাড়ের পণ্যগুলো" : "Highest discounts right now"}
              onViewAll={() => navigate("/mart/category/all?filter=deals")}
              viewAllLabel={bn ? "আরও দেখুন" : "View All"}
              accent="orange"
            />
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {[...products]
                .filter((p: any) => p.original_price && Number(p.original_price) > Number(p.price))
                .sort((a: any, b: any) => {
                  const discA = ((Number(a.original_price) - Number(a.price)) / Number(a.original_price)) * 100;
                  const discB = ((Number(b.original_price) - Number(b.price)) / Number(b.original_price)) * 100;
                  return discB - discA;
                })
                .slice(0, 6)
                .map((p: any) => <MartProductCard key={p.id} product={p} />)}
            </div>
          </section>
        )}

        {/* Coupons */}
        {activeCoupons.length > 0 && (
          <>
            <SectionDivider />
            <section className="mb-1">
              <SectionHeader
                icon={<BadgePercent className="h-5 w-5" />}
                title={bn ? "কুপন ও অফার" : "Coupons & Offers"}
                subtitle={bn ? "অর্ডারে কুপন কোড ব্যবহার করুন" : "Apply codes at checkout"}
              />
              <div className="flex gap-3 overflow-x-auto pb-3 scrollbar-none -mx-4 px-4">
                {activeCoupons.map((c) => {
                  const isPercent = c.discount_type === "percentage";
                  const discLabel = isPercent ? `${Number(c.discount_value)}% OFF` : `৳${Number(c.discount_value)} OFF`;
                  const daysLeft = c.expires_at
                    ? Math.ceil((new Date(c.expires_at).getTime() - Date.now()) / 86_400_000)
                    : null;
                  const isExpiringSoon = daysLeft !== null && daysLeft >= 0 && daysLeft <= 3;
                  const isExpired = daysLeft !== null && daysLeft < 0;
                  if (isExpired) return null;
                  return (
                    <div key={c.id} className="shrink-0 w-56 bg-white dark:bg-card border border-border/60 rounded-2xl overflow-hidden shadow-sm">
                      <div className="bg-primary px-4 py-3 flex items-center justify-between">
                        <span className="text-white font-extrabold text-[15px] tracking-wide">{discLabel}</span>
                        {isExpiringSoon && (
                          <span className="text-[10px] font-semibold bg-white/20 text-white px-2 py-0.5 rounded-full">
                            {daysLeft === 0 ? (bn ? "আজ শেষ" : "Today") : `${daysLeft}d`}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center px-3 py-2 gap-2">
                        <div className="h-px flex-1 border-t border-dashed border-border" />
                        <Tag className="h-3 w-3 text-muted-foreground" />
                        <div className="h-px flex-1 border-t border-dashed border-border" />
                      </div>
                      <div className="px-4 pb-3">
                        <p className="font-mono font-extrabold text-foreground text-[15px] tracking-widest mb-1.5 select-all">{c.code}</p>
                        {c.description && (
                          <p className="text-[11px] text-muted-foreground line-clamp-2 mb-2 leading-relaxed">{c.description}</p>
                        )}
                        <div className="flex flex-wrap gap-1 mb-2">
                          {c.min_order_amount ? (
                            <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-md font-medium">
                              {bn ? `ন্যূন্যতম ৳${Number(c.min_order_amount)}` : `Min ৳${Number(c.min_order_amount)}`}
                            </span>
                          ) : null}
                          {c.max_discount_amount ? (
                            <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-md font-medium">
                              {bn ? `সর্বোচ্চ ৳${Number(c.max_discount_amount)}` : `Max ৳${Number(c.max_discount_amount)}`}
                            </span>
                          ) : null}
                          {c.usage_limit && (
                            <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-md font-medium">
                              {c.used_count}/{c.usage_limit} {bn ? "ব্যবহৃত" : "used"}
                            </span>
                          )}
                        </div>
                        {(c.shop_name || c.seller_name) && (
                          <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Store className="h-3 w-3 shrink-0" />
                            <span className="truncate">{c.shop_name || c.seller_name}</span>
                          </p>
                        )}
                        {c.expires_at && (
                          <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                            <Clock className="h-2.5 w-2.5 shrink-0" />
                            {new Date(c.expires_at).toLocaleDateString(bn ? "bn-BD" : "en-BD", { day: "numeric", month: "short", year: "numeric" })}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </>
        )}

        {/* Popular Shops */}
        {popularShops.length > 0 && (
          <>
            <SectionDivider />
            <section className="mb-1">
              <SectionHeader
                icon={<Store className="h-5 w-5" />}
                title={bn ? "জনপ্রিয় শপ" : "Popular Shops"}
                subtitle={bn ? "বিশ্বস্ত বিক্রেতারা" : "Trusted sellers on Yess Mart"}
              />
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {popularShops.map((shop: any) => (
                  <button
                    key={shop.id}
                    onClick={() => {
                      if (shop.user_id) navigate(`/mart/store/${shop.user_id}`);
                      else if (shop.slug) navigate(`/mart/shop/${shop.slug}`);
                    }}
                    className="group bg-white dark:bg-card border border-border/60 rounded-2xl overflow-hidden hover:shadow-md hover:border-primary/40 transition-all text-left shadow-sm"
                  >
                    <div
                      className="h-14 relative overflow-hidden"
                      style={{ background: getCategoryColor(shop.shop_type || shop.shop_name || "") }}
                    >
                      {shop.banner_url && <img src={shop.banner_url} alt="" className="w-full h-full object-cover" />}
                    </div>
                    <div className="px-3 pb-3 -mt-5 relative">
                      <div
                        className="h-10 w-10 rounded-xl border-2 border-white dark:border-card shadow overflow-hidden flex items-center justify-center text-lg mb-2"
                        style={{ background: getCategoryColor(shop.shop_type || shop.shop_name || "") }}
                      >
                        {shop.profile_image_url ? (
                          <img src={shop.profile_image_url} alt={shop.shop_name || shop.seller_name} className="w-full h-full object-cover" />
                        ) : (
                          <span>{getCategoryIcon(shop.shop_type || shop.shop_name || "")}</span>
                        )}
                      </div>
                      <h3 className="text-[13px] font-semibold text-foreground line-clamp-1 group-hover:text-primary transition-colors mb-0.5">
                        {shop.shop_name || shop.seller_name}
                      </h3>
                      {shop.shop_type && <p className="text-[10px] text-muted-foreground mb-1.5 line-clamp-1">{shop.shop_type}</p>}
                      <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
                        {shop.seller_verified === 1 && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-blue-600 bg-blue-50 dark:bg-blue-950/50 px-1.5 py-0.5 rounded-full">
                            <Shield className="h-2.5 w-2.5" />
                            {bn ? "ভেরিফাইড" : "Verified"}
                          </span>
                        )}
                        {(shop.shop_popular === 1 || Number(shop.total_orders) >= 10) && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-orange-600 bg-orange-50 dark:bg-orange-950/50 px-1.5 py-0.5 rounded-full">
                            <Flame className="h-2.5 w-2.5" />
                            {bn ? "জনপ্রিয়" : "Popular"}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                        {Number(shop.seller_total_products) > 0 && (
                          <span>{shop.seller_total_products} {bn ? "পণ্য" : "items"}</span>
                        )}
                        {Number(shop.total_orders) > 0 && (
                          <>
                            <span className="opacity-40">·</span>
                            <span>{shop.total_orders} {bn ? "অর্ডার" : "orders"}</span>
                          </>
                        )}
                      </div>
                      {shop.seller_address && (
                        <div className="flex items-center gap-1 mt-1 text-[10px] text-muted-foreground">
                          <MapPin className="h-2.5 w-2.5 shrink-0" />
                          <span className="line-clamp-1">{shop.seller_address}</span>
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </section>
          </>
        )}

        {/* Category-wise sections */}
        {categoryProducts.map(({ category, products: catProds }: any) => (
          <div key={category.id}>
            <SectionDivider />
            <section className="mb-1">
              <SectionHeader
                icon={
                  category.image_url && category.image_url.startsWith("http") ? (
                    <img src={category.image_url} className="h-5 w-5 object-contain" alt="" />
                  ) : category.icon_url && category.icon_url.startsWith("http") ? (
                    <img src={category.icon_url} className="h-5 w-5 object-contain" alt="" />
                  ) : category.icon_url ? (
                    <span className="text-lg">{category.icon_url}</span>
                  ) : (
                    <Package className="h-5 w-5" />
                  )
                }
                title={bn ? category.name : category.name_en || category.name}
                onViewAll={() => navigate(`/mart/category/${category.slug ?? category.id}`)}
                viewAllLabel={bn ? "আরও দেখুন" : "View More"}
              />
              {category.children && category.children.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-none -mx-1 px-1 mb-4">
                  {category.children.map((sub: any) => (
                    <button
                      key={sub.id}
                      onClick={() => navigate(`/mart/category/${sub.slug ?? sub.id}`)}
                      className="shrink-0 px-3 py-1.5 rounded-full bg-white dark:bg-card text-[12px] font-medium text-foreground hover:bg-primary/5 hover:text-primary transition-colors border border-border/60 shadow-sm"
                    >
                      {bn ? sub.name : sub.name_en || sub.name}
                    </button>
                  ))}
                </div>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {catProds.slice(0, 5).map((p: any) => <MartProductCard key={p.id} product={p} />)}
              </div>
            </section>
          </div>
        ))}

        {/* Just For You */}
        <SectionDivider />
        <section>
          <SectionHeader
            icon={<TrendingUp className="h-5 w-5" />}
            title={bn ? "আপনার জন্য" : "Just For You"}
            subtitle={
              hasPersonalizedForYou
                ? (bn ? "আপনার উইশলিস্ট ও অর্ডার ক্যাটাগরি অনুযায়ী" : "Based on your wishlist and ordered categories")
                : (bn ? "আপনার পছন্দ অনুযায়ী পণ্য" : "Handpicked based on what's trending")
            }
            onViewAll={() => navigate("/mart/category/all")}
            viewAllLabel={bn ? "আরও দেখুন" : "View More"}
          />
          <div className="flex items-center gap-2 overflow-x-auto pb-3 scrollbar-none mb-4">
            {[
              { key: "popular", label: bn ? "জনপ্রিয়" : "Popular" },
              { key: "price-low", label: bn ? "কম দাম" : "Low Price" },
              { key: "price-high", label: bn ? "বেশি দাম" : "High Price" },
              { key: "rating", label: bn ? "রেটিং" : "Top Rated" },
              { key: "newest", label: bn ? "নতুন" : "Newest" },
            ].map((opt) => (
              <button
                key={opt.key}
                onClick={() => setHomeSort(opt.key)}
                className={`shrink-0 px-4 py-1.5 rounded-full text-[12px] font-semibold border transition-all ${
                  homeSort === opt.key
                    ? "bg-primary text-white border-primary shadow-sm"
                    : "bg-white dark:bg-card text-muted-foreground border-border/60 hover:border-primary/40 hover:text-foreground"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {forYouProducts.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {sortedForYou.map((p: any) => <MartProductCard key={p.id} product={p} />)}
            </div>
          ) : (
            <div className="text-center py-16 text-muted-foreground">
              <ShoppingCart className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-base font-medium">{bn ? "শীঘ্রই পণ্য আসছে!" : "Products coming soon!"}</p>
              <p className="text-sm text-muted-foreground/60 mt-1">{bn ? "আমরা নতুন পণ্য যোগ করছি" : "We're adding new products"}</p>
            </div>
          )}
        </section>
      </div>

      <Footer />
      {/* <BackToHomeButton /> */}
      <div className="h-20 md:hidden" />
    </div>
  );
};

export default MartHome;

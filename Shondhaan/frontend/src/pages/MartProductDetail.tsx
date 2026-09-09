import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";
import { ShoppingCart, Star, Minus, Plus, Truck, Shield, RotateCcw, Heart, ChevronRight, Clock, Store, Package, AlertTriangle, Zap, MessageCircle, ChevronLeft, ChevronDown, CheckCircle2, Tag } from "lucide-react";
import { ShareButton } from "@/components/SharePopup";
import MartChatModal from "@/components/mart/MartChatModal";
import ARProductPreview from "@/components/mart/ARProductPreview";
import PinchZoomImage from "@/components/PinchZoomImage";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLanguage } from "@/contexts/LanguageContext";
import { useMartProduct, useMartProducts } from "@/hooks/useMartData";
import { useMartCart } from "@/contexts/MartCartContext";
import { useMartWishlist } from "@/contexts/MartWishlistContext";
import { useQuery } from "@tanstack/react-query";
import MartProductCard from "@/components/mart/MartProductCard";
import MartProductReviews from "@/components/mart/MartProductReviews";
import MartProductQA from "@/components/mart/MartProductQA";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { toast } from "sonner";
import { addDays, format } from "date-fns";
import { bn as bnLocale } from "date-fns/locale";
import { haptic } from "@/lib/haptics";
import { getFullImageUrl } from "@/lib/imageUrl";
import { useSEO } from "@/hooks/useSEO";

const FREE_SHIPPING_MIN = 50000;
const COURIER_FEE_MIN = 45;
const COURIER_FEE_MAX = 70;
const MART_API_BASE =
  import.meta.env.VITE_MART_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE;

type ProductOrderStats = {
  order_count: number;
  customer_count?: number;
  quantity_sold?: number;
};

type ProductReviewStats = {
  count: number;
  avgRating: number;
};

type VendorFeeSetting = {
  selected_areas?: string[] | string | null;
  area_fee?: number | string;
  other_area_fee?: number | string;
};

type ProductDetailTab = "description" | "reviews" | "qa" | "shipping";
const PRODUCT_DETAIL_TABS = new Set<ProductDetailTab>(["description", "reviews", "qa", "shipping"]);

const readSelectedAreas = (value: VendorFeeSetting["selected_areas"]) => {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  try {
    const parsed = JSON.parse(value || "[]");
    return Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : [];
  } catch {
    return [];
  }
};

const MartProductDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { language } = useLanguage();
  const bn = language === "bn";
  const { user } = useAuth();
  const { data: product, isLoading } = useMartProduct(slug || "");
  const { addItem, totalItems, setIsOpen } = useMartCart();
  const { toggleWishlist, isInWishlist } = useMartWishlist();
  const [qty, setQty] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [recentlyViewed, setRecentlyViewed] = useState<any[]>([]);
  const [chatOpen, setChatOpen] = useState(false);
  const [liveReviewStats, setLiveReviewStats] = useState<ProductReviewStats | null>(null);
  const [activeTab, setActiveTab] = useState<ProductDetailTab>("description");
  const [vendorFeeSettings, setVendorFeeSettings] = useState<VendorFeeSetting[]>([]);

  const requireAuthForPurchase = (action: () => void) => {
    if (!user) {
      toast.info(bn ? "ক্রয় করতে অনুগ্রহ করে লগইন করুন" : "Please login to purchase");
      navigate(`/login?redirect=/mart/product/${slug}`);
      return;
    }
    action();
  };

  const productName = product ? (bn ? product.name : product.name_en || product.name) : "";
  const productImage = getFullImageUrl(product?.image_url);
  const productPrice = product?.price ? Number(product.price) : null;
  const productDesc = product
    ? bn
      ? `${productName} — ৳${productPrice?.toLocaleString("bn-BD") || ""}। সন্ধান মার্টে কিনুন।`
      : `${productName} — ৳${productPrice?.toLocaleString() || ""}. Buy on Yess Mart.`
    : "";

  useSEO({
    title: productName || (bn ? "পণ্যের বিবরণ" : "Product Details"),
    description: productDesc,
    canonical: slug ? `/mart/product/${slug}` : undefined,
    image: productImage,
    type: "product",
    jsonLd: product
      ? {
          "@context": "https://schema.org",
          "@type": "Product",
          name: productName,
          image: productImage,
          description: productDesc,
          offers: {
            "@type": "Offer",
            price: productPrice,
            priceCurrency: "BDT",
            availability:
              (product as any).stock && (product as any).stock > 0
                ? "https://schema.org/InStock"
                : "https://schema.org/OutOfStock",
          },
        }
      : undefined,
  });

  // Vendor display info now comes straight off the product payload
  // (shop_name / seller_name), which the MySQL /api/products endpoints
  // already return. No separate profile/stats lookup is needed.
  const vendorDisplayName =
    product?.shop_name ||
    product?.seller_name ||
    (bn ? "সন্ধান মার্ট বিক্রেতা" : "Yess Mart Seller");

  const vendorVerified = product?.seller_verified === 1 || product?.seller_verified === true;

  useEffect(() => {
    if (!product?.vendor_id) {
      setVendorFeeSettings([]);
      return;
    }

    fetch(`${MART_API_BASE}/api/mart-fee-settings?user_id=${encodeURIComponent(String(product.vendor_id))}`)
      .then((response) => response.json())
      .then((result) => setVendorFeeSettings(result.success && Array.isArray(result.data) ? result.data : []))
      .catch(() => setVendorFeeSettings([]));
  }, [product?.vendor_id]);

  const vendorAreaSetting = vendorFeeSettings.find((setting) => readSelectedAreas(setting.selected_areas).length > 0);
  const vendorDeliveryAreas = vendorFeeSettings.flatMap((setting) => {
    const fee = Number(setting.area_fee || 0);
    return readSelectedAreas(setting.selected_areas).map((district) => ({ district, fee }));
  });
  const vendorAreaFee = Number(vendorAreaSetting?.area_fee || 0);
  const vendorOtherAreaFee = Number(vendorAreaSetting?.other_area_fee || 0);

  const isMysqlProduct = Boolean(slug?.startsWith("mysql-product-"));

  // Upgrade legacy mysql-product-<id> links to the readable slug URL so the
  // address bar shows the product name (e.g. /mart/product/teddy-bear) instead
  // of /mart/product/mysql-product-5. Preserves any ?tab= query and #hash.
  useEffect(() => {
    if (isMysqlProduct && product?.slug) {
      navigate(
        `/mart/product/${encodeURIComponent(product.slug)}${location.search || ""}${location.hash || ""}`,
        { replace: true }
      );
    }
  }, [isMysqlProduct, product?.slug, navigate, location.search, location.hash]);

  // Every product is MySQL-backed now, so stats always key off product.id.
  const orderStatsProductId = product?.id ?? null;

  const { data: orderStats } = useQuery<ProductOrderStats>({
    queryKey: ["mart-product-order-stats", orderStatsProductId],
    queryFn: async () => {
      if (!orderStatsProductId) return { order_count: 0 };
      const res = await fetch(`${MART_API_BASE}/api/orders/product/${encodeURIComponent(String(orderStatsProductId))}/stats`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.success === false) throw new Error(json.message || "Failed to load product order stats");
      return {
        order_count: Number(json.data?.order_count || 0),
        customer_count: Number(json.data?.customer_count || 0),
        quantity_sold: Number(json.data?.quantity_sold || 0),
      };
    },
    enabled: !!orderStatsProductId,
    staleTime: 60 * 1000,
  });

  const { data: reviewStats } = useQuery<ProductReviewStats>({
    queryKey: ["mart-product-review-stats", orderStatsProductId],
    queryFn: async () => {
      if (!orderStatsProductId) return { count: 0, avgRating: 0 };
      const res = await fetch(`${MART_API_BASE}/api/reviews?product_id=${encodeURIComponent(String(orderStatsProductId))}`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.success === false) throw new Error(json.message || "Failed to load product reviews");
      const reviews = (json.data || []) as Array<{ rating?: number }>;
      const avgRating = reviews.length > 0 ? reviews.reduce((sum, r) => sum + Number(r.rating || 0), 0) / reviews.length : 0;
      return { count: reviews.length, avgRating };
    },
    enabled: !!orderStatsProductId,
    staleTime: 60 * 1000,
  });

  const handleReviewStatsChange = useCallback((stats: ProductReviewStats) => {
    setLiveReviewStats(stats);
  }, []);

  useEffect(() => { setLiveReviewStats(null); }, [orderStatsProductId]);

  useEffect(() => {
    const requestedTab = searchParams.get("tab") as ProductDetailTab | null;
    if (requestedTab && PRODUCT_DETAIL_TABS.has(requestedTab)) setActiveTab(requestedTab);
  }, [searchParams]);

  useEffect(() => {
    if (!location.hash) return;
    const timeout = window.setTimeout(() => {
      const target = document.querySelector(location.hash);
      target?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 120);
    return () => window.clearTimeout(timeout);
  }, [activeTab, location.hash]);

  useEffect(() => {
    if (!product) return;
    const KEY = "mart_recently_viewed";
    const stored: any[] = JSON.parse(localStorage.getItem(KEY) || "[]");
    const updated = [
      { id: product.id, slug: product.slug, name: product.name, name_en: product.name_en, price: product.price, original_price: product.original_price, image_url: product.image_url, rating: product.rating, total_sold: product.total_sold, stock: product.stock, unit: product.unit },
      ...stored.filter((p: any) => p.id !== product.id),
    ].slice(0, 12);
    localStorage.setItem(KEY, JSON.stringify(updated));
    setRecentlyViewed(updated.filter((p: any) => p.id !== product.id).slice(0, 6));
  }, [product]);

  const catSlug = product?.category?.slug;
  const { data: related = [] } = useMartProducts(catSlug, undefined, 12);
  const relatedFiltered = related.filter((p) => p.id !== product?.id).slice(0, 6);

  const estimatedMin = addDays(new Date(), 3);
  const estimatedMax = addDays(new Date(), 5);
  const deliveryDateText = bn
    ? `${format(estimatedMin, "d MMM", { locale: bnLocale })} - ${format(estimatedMax, "d MMM", { locale: bnLocale })}`
    : `${format(estimatedMin, "MMM d")} - ${format(estimatedMax, "MMM d")}`;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f5f5f5]">
        <Navbar />
        {/* <div className="pt-[44px] md:pt-[104px]" /> */}
        <div className="app-container py-4 grid md:grid-cols-[380px_1fr] gap-4">
          <div className="bg-white rounded-sm p-4 space-y-3">
            <div className="aspect-square bg-gray-100 rounded animate-pulse" />
            <div className="flex gap-2">{[0,1,2,3].map(i => <div key={i} className="h-14 w-14 bg-gray-100 rounded animate-pulse" />)}</div>
          </div>
          <div className="bg-white rounded-sm p-4 space-y-4">
            <div className="h-6 bg-gray-100 rounded animate-pulse w-3/4" />
            <div className="h-4 bg-gray-100 rounded animate-pulse w-1/3" />
            <div className="h-10 bg-gray-100 rounded animate-pulse w-1/2" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-[#f5f5f5]">
        <Navbar />
        {/* <div className="pt-[44px] md:pt-[104px]" /> */}
        <div className="text-center py-20">
          <p className="text-xl text-gray-600">{bn ? "পণ্য পাওয়া যায়নি" : "Product not found"}</p>
          <Button className="mt-4 bg-primary hover:bg-primary/90 text-white border-0" onClick={() => navigate("/mart/home")}>
            {bn ? "মার্টে ফিরুন" : "Back to Mart"}
          </Button>
        </div>
      </div>
    );
  }

  // ── Discount calculation ──────────────────────────────────────────────────
  // Only treat the product as discounted when original_price is actually
  // greater than the current price. Previously this only checked truthiness
  // of original_price, so products where original_price === price (e.g. the
  // seller form always saves an original_price even with no real discount)
  // incorrectly showed a "-0%" badge and a strikethrough price equal to the
  // current price.
  const hasDiscount = Boolean(product.original_price) && product.original_price > product.price;
  const discount = hasDiscount
    ? Math.round(((product.original_price - product.price) / product.original_price) * 100)
    : 0;

  const allImages = [productImage, ...(product.gallery_urls || []).map(getFullImageUrl)].filter(Boolean);
  const wishlistProductId = String(slug?.startsWith("mysql-product-") ? slug.replace("mysql-product-", "") : product.id);
  const wishlisted = isInWishlist(wishlistProductId);
  const handleToggleWishlist = () => toggleWishlist({ ...product, id: wishlistProductId });
  const courierFee = Math.min(COURIER_FEE_MAX, Math.max(COURIER_FEE_MIN, Math.round(product.price * 0.05)));
  const freeShipping = product.price >= FREE_SHIPPING_MIN;
  const orderedCount = Number(orderStats?.order_count ?? product.total_sold ?? 0);
  const orderedCountText = orderedCount.toLocaleString(bn ? "bn-BD" : "en-US");
  const currentReviewStats = liveReviewStats || reviewStats;
  const reviewCount = Number(currentReviewStats?.count ?? product.total_reviews ?? 0);
  const reviewCountText = reviewCount.toLocaleString(bn ? "bn-BD" : "en-US");
  const displayedRating = currentReviewStats?.count
    ? Number(currentReviewStats.avgRating.toFixed(1))
    : Number(product.rating || 0);

  const productUrl = `${window.location.origin}/mart/product/${product.slug}`;
  const productPath = isMysqlProduct ? `/mart/product/mysql-product-${product.id}` : `/mart/product/${product.slug}`;
  const productTitle = bn ? product.name : (product.name_en || product.name);

  const handleTabChange = (value: string) => {
  const nextTab = value as ProductDetailTab;
  if (!PRODUCT_DETAIL_TABS.has(nextTab)) return;
  setActiveTab(nextTab);
  const nextParams = new URLSearchParams(searchParams);
  if (nextTab === "description") nextParams.delete("tab");
  else nextParams.set("tab", nextTab);
  setSearchParams(nextParams, { replace: true });
  window.setTimeout(() => {
    document.getElementById("product-tabs-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, 50);
};

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <Navbar />
      {/* <div className="pt-[44px] md:pt-[104px]" /> */}

      {/* Breadcrumb */}
      <div className="bg-white border-b border-gray-200">
        <div className="app-container py-2 flex items-center gap-1 overflow-x-auto text-xs text-gray-500 whitespace-nowrap">
          <button onClick={() => navigate("/mart/home")} className="hover:text-primary">
            {bn ? "সন্ধান মার্ট" : "Yess Mart"}
          </button>
          <ChevronRight className="h-3 w-3 text-gray-400 shrink-0" />
          {product.category && (
            <>
              <button onClick={() => navigate(`/mart/category/${product.category!.slug}`)} className="hover:text-primary">
                {bn ? product.category.name : (product.category.name_en || product.category.name)}
              </button>
              <ChevronRight className="h-3 w-3 text-gray-400 shrink-0" />
            </>
          )}
          <span className="text-gray-700 font-medium truncate max-w-[200px]">
            {bn ? product.name : (product.name_en || product.name)}
          </span>
        </div>
      </div>

      <div className="app-container py-3 space-y-3">

        {/* Main product block */}
        <div className="bg-white rounded-sm shadow-sm overflow-hidden">
          <div className="grid lg:grid-cols-[380px_1fr_280px]">

            {/* ── Left: Image Gallery ── */}
            {/* ── Left: Image Gallery ── */}
<div className="p-4 border-r border-gray-100">
  {/* Main image */}
  <div className="relative aspect-square overflow-hidden border border-gray-200 rounded bg-gray-50 group">
    {allImages[selectedImage] ? (
      <PinchZoomImage
        src={allImages[selectedImage]}
        alt={product.name}
        className="block w-full h-full object-contain"
      />
    ) : (
      <div className="w-full h-full flex items-center justify-center">
        <ShoppingCart className="h-16 w-16 text-gray-300" />
      </div>
    )}
    {hasDiscount && (
      <div className="absolute top-2 left-2 bg-primary text-white text-[11px] font-bold px-2 py-0.5 rounded-sm">
        -{discount}%
      </div>
    )}
    {/* Wishlist heart */}
    <button
      onClick={handleToggleWishlist}
      className="absolute top-2 right-2 h-8 w-8 flex items-center justify-center bg-white rounded-full shadow border border-gray-100 hover:border-primary transition-colors"
    >
      <Heart className={`h-4 w-4 ${wishlisted ? "fill-red-500 text-red-500" : "text-gray-400"}`} />
    </button>

    {/* Prev/Next arrows when multiple images */}
    {allImages.length > 1 && (
      <>
        <button
          onClick={() => setSelectedImage((i) => (i - 1 + allImages.length) % allImages.length)}
          className="absolute left-2 top-1/2 -translate-y-1/2 h-7 w-7 flex items-center justify-center bg-white/80 hover:bg-white rounded-full border border-gray-200 shadow-sm transition-colors"
          aria-label="Previous image"
        >
          <ChevronLeft className="h-4 w-4 text-gray-600" />
        </button>
        <button
          onClick={() => setSelectedImage((i) => (i + 1) % allImages.length)}
          className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 flex items-center justify-center bg-white/80 hover:bg-white rounded-full border border-gray-200 shadow-sm transition-colors"
          aria-label="Next image"
        >
          <ChevronRight className="h-4 w-4 text-gray-600" />
        </button>
      </>
    )}
  </div>

  {/* Thumbnail strip — always shown, dots fallback when 1 image */}
  {allImages.length > 1 ? (
    <div className="mt-3 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
      {allImages.map((img, i) => (
        <button
          key={i}
          onClick={() => setSelectedImage(i)}
          className={`h-[60px] w-[60px] shrink-0 border-2 rounded bg-gray-50 overflow-hidden transition-all ${
            i === selectedImage
              ? "border-primary shadow-sm scale-105"
              : "border-gray-200 hover:border-primary/50"
          }`}
        >
          <img src={img} alt={`${product.name} image ${i + 1}`} className="w-full h-full object-contain" />
        </button>
      ))}
    </div>
  ) : (
    /* Single-image dot indicator */
    <div className="mt-3 flex justify-center">
      <span className="h-1.5 w-4 bg-primary rounded-full" />
    </div>
  )}

  {/* Image count badge */}
  {allImages.length > 1 && (
    <p className="mt-1.5 text-center text-[11px] text-gray-400">
      {selectedImage + 1} / {allImages.length}
    </p>
  )}

  {/* Action links below image */}
  <div className="mt-3 flex items-center gap-3 justify-center text-xs text-gray-500">
    <ShareButton
      url={productUrl}
      title={productTitle}
      className="flex items-center gap-1 hover:text-primary"
      iconClassName="h-3.5 w-3.5"
    />
    <ARProductPreview productName={productTitle} imageUrl={productImage} />
  </div>
</div>

            {/* ── Middle: Product Info ── */}
            <div className="p-4 lg:p-5 border-r border-gray-100 space-y-4">

              {/* Title */}
              <h1 className="text-base md:text-lg font-medium text-gray-900 leading-snug">
                {bn ? product.name : (product.name_en || product.name)}
              </h1>

              {/* Rating + sold row */}
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <div className="flex items-center gap-0.5">
                  {[1,2,3,4,5].map((s) => (
                    <Star key={s} className={`h-3.5 w-3.5 ${s <= Math.round(displayedRating) ? "fill-primary text-primary" : "text-gray-200 fill-gray-200"}`} />
                  ))}
                </div>
                <span className="text-primary font-medium">{displayedRating.toFixed(1)}</span>
                <span className="text-gray-400">|</span>
                <button className="text-gray-500 hover:text-primary" onClick={() => handleTabChange("reviews")}>
                  {reviewCountText} {bn ? "রিভিউ" : "Ratings"}
                </button>
                <span className="text-gray-400">|</span>
                <span className="text-gray-500">{orderedCountText} {bn ? "বিক্রি" : "Sold"}</span>
              </div>

              <Separator className="bg-gray-100" />

              {/* Price block — Daraz orange highlight strip */}
              <div className="bg-primary/10 border-l-4 border-primary px-4 py-3 rounded-r-sm">
                <div className="flex flex-wrap items-baseline gap-3">
                  <span className="text-2xl md:text-3xl font-bold text-primary">
                    ৳{product.price.toLocaleString("bn-BD")}
                  </span>
                  {hasDiscount && (
                    <>
                      <span className="text-sm text-gray-400 line-through">৳{product.original_price.toLocaleString("bn-BD")}</span>
                      <span className="text-xs bg-primary text-white px-1.5 py-0.5 rounded-sm font-bold">-{discount}%</span>
                    </>
                  )}
                </div>
                {freeShipping && (
                  <div className="mt-1.5 flex items-center gap-1 text-xs text-green-600 font-medium">
                    <Truck className="h-3 w-3" />
                    {bn ? "ফ্রি ডেলিভারি পাচ্ছেন!" : "You get Free Delivery!"}
                  </div>
                )}
              </div>

              {/* Vouchers / Promo row (decorative Daraz-style) */}
              <div className="flex items-start gap-2 text-sm">
                <Tag className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <div className="flex flex-wrap gap-2">
                  {freeShipping && (
                    <span className="border border-dashed border-primary text-primary text-[11px] px-2 py-0.5 rounded-sm">
                      {bn ? "ফ্রি শিপিং" : "Free Shipping"}
                    </span>
                  )}
                  <span className="border border-dashed border-gray-300 text-gray-500 text-[11px] px-2 py-0.5 rounded-sm">
                    {bn ? "ক্যাশ অন ডেলিভারি" : "Cash on Delivery"}
                  </span>
                  <span className="border border-dashed border-gray-300 text-gray-500 text-[11px] px-2 py-0.5 rounded-sm">
                    {bn ? "৭ দিনে রিটার্ন" : "7-Day Return"}
                  </span>
                </div>
              </div>

              {/* Stock warnings */}
              {product.stock > 0 && product.stock <= 10 && (
                <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-sm px-3 py-2">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  {bn ? `মাত্র ${product.stock} টি বাকি!` : `Only ${product.stock} left in stock!`}
                </div>
              )}
              {product.stock <= 0 && (
                <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-sm px-3 py-2">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  {bn ? "স্টক শেষ হয়ে গেছে" : "This item is out of stock"}
                </div>
              )}

              {/* Quantity selector */}
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-600 w-20 shrink-0">{bn ? "পরিমাণ:" : "Quantity:"}</span>
                <div className="flex items-center border border-gray-300 rounded-sm">
                  <button
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                    className="h-8 w-8 flex items-center justify-center hover:bg-gray-100 text-gray-600 transition-colors border-r border-gray-300"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="h-8 w-10 flex items-center justify-center text-sm font-semibold select-none">{qty}</span>
                  <button
                    onClick={() => setQty((q) => Math.min(product.stock || 99, q + 1))}
                    className="h-8 w-8 flex items-center justify-center hover:bg-gray-100 text-gray-600 transition-colors border-l border-gray-300"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
                {product.stock > 0 && (
                  <span className="text-xs text-gray-400">{product.stock} {bn ? "টি পাওয়া যাচ্ছে" : "pieces available"}</span>
                )}
              </div>

              {/* CTA Buttons — Daraz style */}
              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => { addItem(product, qty); }}
                  disabled={product.stock <= 0}
                  className="flex-1 h-11 flex items-center justify-center gap-2 border-2 border-primary text-primary bg-white hover:bg-primary/10 rounded-sm text-sm font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ShoppingCart className="h-4 w-4" />
                  {bn ? "কার্টে যোগ করুন" : "Add to Cart"}
                </button>
                <button
                  onClick={() => requireAuthForPurchase(() => { addItem(product, qty); navigate("/mart/checkout"); })}
                  disabled={product.stock <= 0}
                  className="flex-1 h-11 flex items-center justify-center gap-2 bg-primary hover:bg-emerald-800 text-white rounded-sm text-sm font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                >
                  <Zap className="h-4 w-4" />
                  {bn ? "এখনই কিনুন" : "Buy Now"}
                </button>
              </div>

              {/* Description (collapsed) */}
              {product.description && (
                <div className="pt-2 border-t border-gray-100">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">{bn ? "পণ্যের বিবরণ" : "Product Highlights"}</h3>
                  <p className="text-sm text-gray-500 whitespace-pre-line leading-relaxed line-clamp-4">{product.description}</p>
                  <button className="mt-1 text-xs text-primary flex items-center gap-0.5 hover:underline" onClick={() => handleTabChange("description")}>
                    {bn ? "আরও দেখুন" : "See more"} <ChevronDown className="h-3 w-3" />
                  </button>
                </div>
              )}

              {/* Trust badges row */}
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-100">
                {[
                  { icon: Shield, label: bn ? "১০০% অরিজিনাল" : "100% Authentic" },
                  { icon: RotateCcw, label: bn ? "৭ দিনে রিটার্ন" : "7-Day Return" },
                  { icon: Truck, label: bn ? "দ্রুত ডেলিভারি" : "Fast Delivery" },
                ].map(({ icon: Icon, label }) => (
                  <div key={label} className="flex flex-col items-center gap-1 text-center text-gray-500 bg-gray-50 rounded-sm py-2 px-1">
                    <Icon className="h-4 w-4 text-primary" />
                    <span className="text-[10px] leading-tight">{label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Right: Delivery + Seller panel ── */}
            <div className="p-4 space-y-4 bg-gray-50/50 hidden lg:block">

              {/* Delivery box */}
              <div className="bg-white border border-gray-200 rounded-sm p-3 space-y-3">
                <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide">{bn ? "ডেলিভারি" : "Delivery"}</h3>
                <div className="flex items-start gap-2 text-sm">
                  <Truck className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-gray-800 text-xs">{bn ? "আনুমানিক ডেলিভারি" : "Estimated Delivery"}</p>
                    <p className="text-primary font-bold text-xs mt-0.5">{deliveryDateText}</p>
                  </div>
                </div>
                <Separator className="bg-gray-100" />
                <div className="space-y-2 text-xs text-gray-600">
                  <div className="flex justify-between">
                    <span>{bn ? "নির্বাচিত এলাকার ভিতরে" : "Inside selected areas"}</span>
                    <span className="font-medium">
                      {vendorDeliveryAreas.length > 0
                        ? `৳${vendorAreaFee.toLocaleString()} · 2-3 ${bn ? "দিন" : "days"}`
                        : (bn ? "এলাকা নির্ধারিত নয়" : "Areas not configured")}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>{bn ? "নির্বাচিত এলাকার বাইরে" : "Outside selected areas"}</span>
                    <span className="font-medium">
                      {vendorDeliveryAreas.length > 0
                        ? `৳${vendorOtherAreaFee.toLocaleString()} · 3-5 ${bn ? "দিন" : "days"}`
                        : (bn ? "এলাকা নির্ধারিত নয়" : "Areas not configured")}
                    </span>
                  </div>
                  {vendorDeliveryAreas.length > 0 && (
                    <div className="rounded-sm bg-gray-50 p-2 text-[11px] text-gray-500">
                      <p className="mb-1 font-medium text-gray-700">{bn ? "বিক্রেতার ডেলিভারি এলাকা" : "Seller delivery areas"}</p>
                      <p>{vendorDeliveryAreas.map(({ district }) => district).join(", ")}</p>
                    </div>
                  )}
                  {freeShipping && (
                    <div className="flex justify-between text-green-600 font-medium">
                      <span>{bn ? "৳৫০০+ অর্ডার" : "Orders ৳500+"}</span>
                      <span>{bn ? "ফ্রি ডেলিভারি" : "Free Delivery"}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Seller box — Daraz style */}
              <div className="bg-white border border-gray-200 rounded-sm p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide">{bn ? "বিক্রেতা" : "Sold By"}</h3>
                  {vendorVerified && (
                    <div className="flex items-center gap-1 text-[10px] text-green-600 font-medium">
                      <CheckCircle2 className="h-3 w-3" />
                      {bn ? "ভেরিফাইড" : "Verified"}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
                    <Store className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{vendorDisplayName}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => navigate(`/mart/store/${product.seller_slug || product.vendor_id}`)}
                    className="flex-1 h-8 text-xs border border-primary text-primary bg-white hover:bg-primary/10 rounded-sm font-medium transition-colors"
                  >
                    {bn ? "স্টোর দেখুন" : "Visit Store"}
                  </button>
                  <button
                    onClick={() => {
                      if (!user) { toast.info(bn ? "চ্যাট করতে লগইন করুন" : "Login to chat"); navigate(`/login?redirect=/mart/product/${slug}`); return; }
                      if (user.id === product?.vendor_id) { toast.info(bn ? "নিজের পণ্যে চ্যাট করা যায় না" : "Can't chat on your own product"); return; }
                      setChatOpen(true);
                    }}
                    className="h-8 w-8 flex items-center justify-center border border-gray-200 text-gray-500 hover:border-primary hover:text-primary rounded-sm transition-colors shrink-0"
                  >
                    <MessageCircle className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Safe payment */}
              <div className="bg-white border border-gray-200 rounded-sm p-3 text-center">
                <p className="text-[11px] text-gray-500 font-medium mb-2">{bn ? "নিরাপদ পেমেন্ট" : "Safe Payment"}</p>
                <div className="flex justify-center gap-2 flex-wrap">
                  {["bKash", "Nagad", "COD", "Card"].map((m) => (
                    <span key={m} className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-sm font-medium">{m}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Mobile-only: Seller + Delivery (stacked under image+info) */}
          <div className="lg:hidden p-4 border-t border-gray-100 grid sm:grid-cols-2 gap-3">
            {/* Seller row */}
            <div className="flex items-center gap-3 bg-gray-50 rounded-sm p-3">
              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
                <Store className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold truncate">{vendorDisplayName}</p>
              </div>
<button onClick={() => navigate(`/mart/store/${product.seller_slug || product.vendor_id}`)} className="text-[11px] border border-primary text-primary px-2 py-1 rounded-sm shrink-0">{bn ? "স্টোর" : "Store"}</button>
            </div>
            {/* Delivery row */}
            <div className="flex items-center gap-3 bg-gray-50 rounded-sm p-3">
              <Truck className="h-5 w-5 text-primary shrink-0" />
              <div>
                <p className="text-xs font-semibold text-gray-700">{bn ? "আনুমানিক ডেলিভারি" : "Est. Delivery"}</p>
                <p className="text-[11px] text-primary font-bold">{deliveryDateText}</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Tabs section ── */}
        <div id="product-tabs-section" className="bg-white rounded-sm shadow-sm overflow-hidden">
  <Tabs value={activeTab} onValueChange={handleTabChange}>
            {/* Daraz-style tab bar: orange underline active */}
            <div className="border-b border-gray-200 px-4">
              <TabsList className="flex h-auto gap-0 bg-transparent rounded-none p-0">
                {(["description", "reviews", "qa", "shipping"] as ProductDetailTab[]).map((tab) => {
                  const labels: Record<ProductDetailTab, string> = {
                    description: bn ? "বিবরণ" : "Description",
                    reviews: bn ? `রিভিউ (${reviewCountText})` : `Ratings (${reviewCountText})`,
                    qa: bn ? "প্রশ্ন-উত্তর" : "Q&A",
                    shipping: bn ? "শিপিং" : "Shipping",
                  };
                  return (
                    <TabsTrigger
                      key={tab}
                      value={tab}
                      className={`rounded-none h-11 px-4 text-sm font-medium border-b-2 transition-colors bg-transparent
                        ${activeTab === tab
                          ? "border-primary text-primary"
                          : "border-transparent text-gray-500 hover:text-gray-800"
                        }`}
                    >
                      {labels[tab]}
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            </div>

            <div className="p-4 md:p-5">
              <TabsContent value="description">
                {product.description ? (
                  <p className="text-sm text-gray-600 whitespace-pre-line leading-relaxed">{product.description}</p>
                ) : (
                  <p className="text-sm text-gray-400">{bn ? "বিস্তারিত বিবরণ শীঘ্রই আসছে" : "Detailed description coming soon"}</p>
                )}
              </TabsContent>

              <TabsContent id="product-reviews" value="reviews" className="scroll-mt-28">
                <MartProductReviews
                  productId={String(product.id)}
                  productName={bn ? product.name : (product.name_en || product.name)}
                  productUrl={productPath}
                  vendorId={product.vendor_id}
                  storage="mysql"
                  onStatsChange={handleReviewStatsChange}
                />
              </TabsContent>

              <TabsContent id="product-qa" value="qa" className="scroll-mt-28">
                <MartProductQA
                  productId={String(product.id)}
                  productName={bn ? product.name : (product.name_en || product.name)}
                  productUrl={productPath}
                  vendorId={product.vendor_id}
                  storage="mysql"
                />
              </TabsContent>

              <TabsContent value="shipping">
                <div className="max-w-md space-y-0 divide-y divide-gray-100">
                  {[
                    {
                      label: bn ? "নির্বাচিত এলাকার ভিতরে" : "Inside selected areas",
                      value: vendorDeliveryAreas.length > 0
                        ? `৳${vendorAreaFee.toLocaleString()} · 2-3 ${bn ? "দিন" : "days"}`
                        : (bn ? "এলাকা নির্ধারিত নয়" : "Areas not configured"),
                    },
                    {
                      label: bn ? "নির্বাচিত এলাকার বাইরে" : "Outside selected areas",
                      value: vendorDeliveryAreas.length > 0
                        ? `৳${vendorOtherAreaFee.toLocaleString()} · 3-5 ${bn ? "দিন" : "days"}`
                        : (bn ? "এলাকা নির্ধারিত নয়" : "Areas not configured"),
                    },
                    // { label: bn ? "কুরিয়ার ফি" : "Courier Fee (per item)", value: `৳${COURIER_FEE_MIN}-৳${COURIER_FEE_MAX}` },
                    // { label: bn ? "৳৫০০+ অর্ডারে" : "Orders ৳500+", value: bn ? "ফ্রি ডেলিভারি ✓" : "Free Delivery ✓", highlight: true },
                  ].map(({ label, value, highlight }) => (
                    <div key={label} className="flex justify-between py-3 text-sm">
                      <span className="text-gray-500">{label}</span>
                      <span className={`font-medium ${highlight ? "text-green-600" : "text-gray-800"}`}>{value}</span>
                    </div>
                  ))}
                  {vendorDeliveryAreas.length > 0 && (
                    <div className="py-3 text-sm">
                      <span className="text-gray-500">{bn ? "বিক্রেতার নির্বাচিত এলাকা" : "Seller-selected areas"}</span>
                      <p className="mt-1 text-gray-800">{vendorDeliveryAreas.map(({ district }) => district).join(", ")}</p>
                    </div>
                  )}
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>

        {/* ── Related Products ── */}
        {relatedFiltered.length > 0 && (
          <section className="bg-white rounded-sm shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide">
                {bn ? "সম্পর্কিত পণ্য" : "You May Also Like"}
              </h2>
              <button className="text-xs text-primary flex items-center gap-0.5 hover:underline" onClick={() => product.category && navigate(`/mart/category/${product.category.slug}`)}>
                {bn ? "সব দেখুন" : "View All"} <ChevronRight className="h-3 w-3" />
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {relatedFiltered.map((p) => <MartProductCard key={p.id} product={p} />)}
            </div>
          </section>
        )}

        {/* ── Recently Viewed ── */}
        {recentlyViewed.length > 0 && (
          <section className="bg-white rounded-sm shadow-sm p-4 mb-24 md:mb-4">
            <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              {bn ? "সম্প্রতি দেখা" : "Recently Viewed"}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {recentlyViewed.map((p) => <MartProductCard key={p.id} product={p} />)}
            </div>
          </section>
        )}
      </div>

      {/* ── Mobile sticky bottom bar ── Daraz style */}
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 24 }}
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 shadow-[0_-2px_12px_rgba(0,0,0,0.08)]"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
        role="region"
        aria-label={bn ? "দ্রুত কেনাকাটা" : "Quick purchase"}
      >
        <div className="flex h-14">
          {/* Wishlist */}
          <button
            onClick={handleToggleWishlist}
            className="flex flex-col items-center justify-center gap-0.5 w-14 shrink-0 border-r border-gray-100 text-gray-500 hover:text-red-500 transition-colors"
          >
            <Heart className={`h-5 w-5 ${wishlisted ? "fill-red-500 text-red-500" : ""}`} />
            <span className="text-[9px] leading-none">{bn ? "উইশ" : "Wish"}</span>
          </button>
          {/* Cart */}
          <button
            onClick={() => { if (product.stock <= 0) return; haptic("medium"); addItem(product, qty); toast.success(bn ? "কার্টে যোগ হয়েছে" : "Added to cart"); }}
            disabled={product.stock <= 0}
            className="flex flex-col items-center justify-center gap-0.5 w-1/3 border-r border-gray-100 text-primary bg-white hover:bg-primary/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ShoppingCart className="h-5 w-5" />
            <span className="text-[10px] font-medium leading-none">{bn ? "কার্টে যোগ" : "Add to Cart"}</span>
          </button>
          {/* Buy Now */}
          <button
            onClick={() => { if (product.stock <= 0) return; haptic("medium"); requireAuthForPurchase(() => { addItem(product, qty); navigate("/mart/checkout"); }); }}
            disabled={product.stock <= 0}
            className="flex-1 flex items-center justify-center gap-2 bg-primary text-white text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
          >
            <Zap className="h-4 w-4" />
            {bn ? "এখনই কিনুন" : "Buy Now"}
          </button>
        </div>
      </motion.div>

      {product && user && product.vendor_id !== user.id && (
        <MartChatModal
          open={chatOpen}
          onOpenChange={setChatOpen}
          productId={product.id}
          productName={bn ? product.name : (product.name_en || product.name)}
          productImage={productImage}
          productPrice={product.price}
          sellerId={String(product.vendor_id)}
        />
      )}

      <Footer />
    </div>
  );
};

export default MartProductDetail;
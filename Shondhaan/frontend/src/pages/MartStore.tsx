import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, MessageCircle, Play, UserPlus } from "lucide-react";
import {
  Store, Package, Tag, Truck, MapPin,
  Phone, ShieldCheck, ShoppingCart,
} from "lucide-react";
import { useMartCart } from "@/contexts/MartCartContext";
import { useAuth } from "@/contexts/AuthContext";
import MartChatModal from "@/components/mart/MartChatModal";
import { toast } from "sonner";

const API_BASE = `${import.meta.env.VITE_MART_API_BASE_URL}/api`;

type StoreMediaItem = {
  url: string;
  type: "image" | "video";
  title?: string;
};

type MartProduct = {
  id: number;
  vendor_id?: number;
  slug?: string | null;
  name_bn: string;
  name_en?: string | null;
  image?: string | null;
  sale_price: number | string;
  original_price?: number | string | null;
  stock: number;
  unit?: string | null;
  rating?: number;
  total_sold?: number;
  discount?: number;
  is_freedelivery?: number;
  category_id?: number;
  sub_category_id?: number | null;
};

type MartSeller = {
  id: number;
  user_id?: number;
  shop_name?: string | null;
  seller_name?: string | null;
  seller_verified?: number;
  shop_type?: string | null;
  total_products?: number;
  banner_url?: string | null;
  profile_image_url?: string | null;
  store_carousel_media?: unknown;
  seller_mobile?: string | null;
  seller_address?: string | null;
};

const parseStoreCarouselMedia = (value: unknown): StoreMediaItem[] => {
  if (Array.isArray(value)) return value.filter((item) => item?.url && item?.type);
  if (typeof value !== "string" || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item) => item?.url && item?.type) : [];
  } catch {
    return [];
  }
};

// ── Fetchers ───────────────────────────────────────────────────────────────────
// The store URL can be either a numeric user id (legacy /mart/store/8) or a
// store slug (e.g. /mart/store/rabeya-shop-2). Detect which one we got and
// query the backend accordingly.
const fetchSeller = async (vendorId: string): Promise<MartSeller> => {
  const isNumeric = /^\d+$/.test(vendorId);
  const query = isNumeric
    ? `user_id=${encodeURIComponent(vendorId)}`
    : `slug=${encodeURIComponent(vendorId)}`;
  const res  = await fetch(`${API_BASE}/sellers?${query}`);
  const json = await res.json();
  if (!json.success || !json.data?.length) throw new Error("Seller not found");
  return json.data[0];
};

const fetchProducts = async (sellerId: number): Promise<MartProduct[]> => {
  const res  = await fetch(`${API_BASE}/products?seller_id=${sellerId}&status=active`);
  const json = await res.json();
  if (!json.success) throw new Error(json.message || "Failed to fetch products");
  return json.data;
};

// ── Product Card ───────────────────────────────────────────────────────────────
const ProductCard = ({
  product,
  onAddToCart,
  onOpen,
}: {
  product: MartProduct;
  onAddToCart: (product: MartProduct) => void;
  onOpen: (product: MartProduct) => void;
}) => (
  <div
    role="button"
    tabIndex={0}
    onClick={() => onOpen(product)}
    onKeyDown={(e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onOpen(product);
      }
    }}
    className="rounded-xl border bg-card overflow-hidden hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 cursor-pointer group"
  >
    {product.image ? (
      <img
        src={product.image}
        alt={product.name_bn}
        className="w-full h-40 object-cover group-hover:scale-105 transition-transform duration-300"
      />
    ) : (
      <div className="w-full h-40 bg-muted flex items-center justify-center">
        <Package className="h-8 w-8 text-muted-foreground/30" />
      </div>
    )}

    <div className="p-3">
      <p className="font-semibold text-sm line-clamp-2 leading-snug">{product.name_bn}</p>
      {product.name_en && (
        <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{product.name_en}</p>
      )}

      <div className="mt-2 flex items-center gap-2">
        <span className="text-primary font-bold">৳{product.sale_price}</span>
        {product.original_price &&
          Number(product.original_price) > Number(product.sale_price) && (
            <span className="text-xs text-muted-foreground line-through">
              ৳{product.original_price}
            </span>
          )}
      </div>

      <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
        {product.discount > 0 && (
          <span className="inline-flex items-center gap-1 text-xs text-orange-500">
            <Tag className="h-3 w-3" /> {product.discount}% off
          </span>
        )}
        {product.is_freedelivery === 1 && (
          <span className="inline-flex items-center gap-1 text-xs text-green-600">
            <Truck className="h-3 w-3" /> Free delivery
          </span>
        )}
      </div>

      <p className={`text-xs mt-1.5 ${product.stock > 0 ? "text-muted-foreground" : "text-destructive"}`}>
        {product.stock > 0 ? `${product.stock} in stock` : "Out of stock"}
      </p>

      <button
        type="button"
        disabled={product.stock <= 0}
        onClick={(e) => { e.stopPropagation(); onAddToCart(product); }}
        className="mt-3 w-full flex items-center justify-center gap-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold py-2 px-3 hover:bg-primary/90 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <ShoppingCart className="h-3.5 w-3.5" />
        {product.stock <= 0 ? "Out of Stock" : "Add to Cart"}
      </button>
    </div>
  </div>
);

// ── Skeleton ───────────────────────────────────────────────────────────────────
const SkeletonCard = () => (
  <div className="rounded-xl border bg-card overflow-hidden animate-pulse">
    <div className="h-40 bg-muted" />
    <div className="p-3 space-y-2">
      <div className="h-4 bg-muted rounded w-3/4" />
      <div className="h-3 bg-muted rounded w-1/2" />
      <div className="h-4 bg-muted rounded w-1/3" />
      <div className="h-8 bg-muted rounded w-full mt-3" />
    </div>
  </div>
);

// ── Main Component ─────────────────────────────────────────────────────────────
const MartStore = () => {
  const { vendorId } = useParams<{ vendorId: string }>();
  const { addItem }  = useMartCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [filterCategory,    setFilterCategory]    = useState<string>("all");
  const [filterSubCategory, setFilterSubCategory] = useState<string>("all");
  const [activeSlide, setActiveSlide] = useState(0);
  const [chatOpen, setChatOpen] = useState(false);
  const [following, setFollowing] = useState(false);

  // ── Categories (global list — filtered down below to what this seller actually stocks) ──
  const { data: categories = [] } = useQuery({
    queryKey: ["mart-categories"],
    queryFn: async () => {
      const res  = await fetch(`${API_BASE}/categories`);
      const json = await res.json();
      if (!json.success) throw new Error("Failed to fetch categories");
      return json.data as { id: number; name: string }[];
    },
  });

  // ── Sub-categories — fetched lazily when a category is selected ─────────────
  const { data: subCategories = [], isLoading: subCatLoading } = useQuery({
    queryKey: ["mart-sub-categories", filterCategory],
    queryFn: async () => {
      const res  = await fetch(`${API_BASE}/sub-categories?category_id=${filterCategory}`);
      const json = await res.json();
      if (!json.success) throw new Error("Failed to fetch sub-categories");
      return json.data as { id: number; name: string; category_id: number }[];
    },
    enabled: filterCategory !== "all",
  });

  // ── Seller ───────────────────────────────────────────────────────────────────
  const {
    data: seller,
    isLoading: sellerLoading,
    isError,
  } = useQuery({
    queryKey: ["seller", vendorId],
    queryFn: () => fetchSeller(vendorId!),
    enabled: !!vendorId,
  });

  // ── Products ─────────────────────────────────────────────────────────────────
  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ["seller-products", seller?.id],
    queryFn: () => fetchProducts(seller.id),
    enabled: !!seller?.id,
  });

  const carouselMedia = useMemo(
    () => parseStoreCarouselMedia(seller?.store_carousel_media),
    [seller]
  );

  // ── Category scoping: only show categories/subcategories this seller has products in ──
  const sellerCategoryIds = useMemo(
    () => new Set(products.map((p) => p.category_id).filter((id): id is number => id != null)),
    [products]
  );

  const availableCategories = useMemo(
    () => categories.filter((c) => sellerCategoryIds.has(c.id)),
    [categories, sellerCategoryIds]
  );

  const sellerSubCategoryIds = useMemo(
    () =>
      new Set(
        products
          .filter((p) => String(p.category_id) === filterCategory)
          .map((p) => p.sub_category_id)
          .filter((id): id is number => id != null)
      ),
    [products, filterCategory]
  );

  const availableSubCategories = useMemo(
    () => subCategories.filter((sc) => sellerSubCategoryIds.has(sc.id)),
    [subCategories, sellerSubCategoryIds]
  );

  useEffect(() => {
    setActiveSlide(0);
  }, [seller?.id]);

  useEffect(() => {
    if (!user?.id || !seller?.id) {
      setFollowing(false);
      return;
    }

    const storageKey = `mart-followed-stores-${user.id}`;
    const followedStoreIds = JSON.parse(localStorage.getItem(storageKey) || "[]") as number[];
    setFollowing(followedStoreIds.includes(seller.id));
  }, [seller?.id, user?.id]);

  useEffect(() => {
    if (carouselMedia.length <= 1) return;
    const timer = window.setInterval(() => {
      setActiveSlide((current) => (current + 1) % carouselMedia.length);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [carouselMedia.length]);

  // ── Filtering ─────────────────────────────────────────────────────────────────
  const filteredProducts = products.filter((p) => {
    // category filter
    if (filterCategory !== "all" && String(p.category_id) !== filterCategory) return false;

    // sub-category filter
    if (filterSubCategory !== "all") {
      if (p.sub_category_id != null) {
        return String(p.sub_category_id) === filterSubCategory;
      }
      // product has no sub_category_id saved yet — keep it visible under parent
      return true;
    }

    return true;
  });

  // ── Handlers ──────────────────────────────────────────────────────────────────
  const handleCategoryChange = (catId: string) => {
    if (filterCategory === catId) {
      setFilterCategory("all");
    } else {
      setFilterCategory(catId);
    }
    setFilterSubCategory("all");
  };
  const [showCategories, setShowCategories] = useState(false);
  const handleAddToCart = (product: MartProduct) => {
    const cartProduct = {
      id:             product.id,
      slug:           product.slug ?? String(product.id),
      name:           product.name_bn,
      name_en:        product.name_en    ?? null,
      price:          Number(product.sale_price),
      original_price: product.original_price ? Number(product.original_price) : null,
      image_url:      product.image      ?? null,
      stock:          product.stock,
      unit:           product.unit       ?? null,
      rating:         product.rating     ?? 0,
      total_sold:     product.total_sold ?? 0,
    };
    addItem(cartProduct, 1);
    toast.success(`"${product.name_bn}" added to cart`);
  };

  // Navigate to the product detail page. Falls back to the legacy
  // "mysql-product-<id>" route (which MartProductDetail auto-upgrades to the
  // readable slug URL) when the product payload doesn't include a slug.
  const handleOpenProduct = (product: MartProduct) => {
    const target = product.slug
      ? `/mart/product/${product.slug}`
      : `/mart/product/mysql-product-${product.id}`;
    navigate(target);
  };

  // Product-backed conversations are still used when possible. Stores without
  // products use a negative seller id as a stable virtual product id, allowing
  // visitors to start a live store conversation before products are listed.
  const handleOpenChat = () => {
    const chatProduct = products[0];
    const sellerUserId = seller?.user_id ?? chatProduct?.vendor_id;

    if (!user) {
      setChatOpen(true);
      return;
    }

    if (!sellerUserId) {
      toast.error("Unable to identify this store for chat");
      return;
    }

    if (Number(user.id) === Number(sellerUserId)) {
      toast.info("You can't chat with your own store");
      return;
    }

    setChatOpen(true);
  };

  const handleFollow = () => {
    if (!user) {
      toast.info("Login to follow this store");
      navigate(`/auth?redirect=${encodeURIComponent(`/mart/store/${vendorId}`)}`);
      return;
    }

    if (Number(user.id) === Number(seller.user_id)) {
      toast.info("You can't follow your own store");
      return;
    }

    const storageKey = `mart-followed-stores-${user.id}`;
    const followedStoreIds = JSON.parse(localStorage.getItem(storageKey) || "[]") as number[];
    const nextFollowing = !following;
    const nextStoreIds = nextFollowing
      ? [...new Set([...followedStoreIds, seller.id])]
      : followedStoreIds.filter((storeId) => storeId !== seller.id);

    localStorage.setItem(storageKey, JSON.stringify(nextStoreIds));
    setFollowing(nextFollowing);
    toast.success(nextFollowing ? "Store followed" : "Store unfollowed");
  };

  // ── Guards ────────────────────────────────────────────────────────────────────
  if (sellerLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground animate-pulse">Loading store...</p>
      </div>
    );
  }

  if (isError || !seller) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-destructive font-medium">Store not found.</p>
      </div>
    );
  }

  const selectedCategoryName = categories.find((c) => String(c.id) === filterCategory)?.name;

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <>
    <div className="min-h-screen bg-muted/30">

      {/* ════ Store Header ════ */}
      <div className="relative bg-background border-b">

        {/* Cover image */}
        <div
          className="h-32 md:h-40 bg-gradient-to-r from-primary via-primary/80 to-primary/50"
          style={
            seller.banner_url
              ? {
                  backgroundImage:    `url(${seller.banner_url})`,
                  backgroundSize:     "cover",
                  backgroundPosition: "center",
                }
              : {}
          }
        />

        <div className="app-container">
          <div className="relative">

            {/* Avatar */}
            <div className="absolute -top-12 left-4">
              <div className="h-20 w-20 md:h-24 md:w-24 rounded-full bg-background border-4 border-background shadow-xl flex items-center justify-center overflow-hidden">
                {seller.profile_image_url ? (
                  <img
                    src={seller.profile_image_url}
                    alt={seller.shop_name || seller.seller_name}
                    className="w-full h-full object-cover"
                    onError={() => console.warn("Profile image failed:", seller.profile_image_url)}
                  />
                ) : (
                  <Store className="h-10 w-10 text-primary" />
                )}
              </div>
            </div>

            {/* Store info */}
            <div className="pt-3 md:pt-4 md:pl-32 pb-5">
              <div className="flex items-center flex-col lg:flex-row lg:items-end lg:justify-between gap-4">

                <div>
                  <h1 className="text-2xl md:text-3xl font-bold">
                    {seller.shop_name || seller.seller_name}
                  </h1>
                  {/* {seller.shop_name && seller.seller_name && (
                    <p className="text-muted-foreground mt-1">by {seller.seller_name}</p>
                  )} */}
                  <div className="flex flex-wrap items-center gap-2 mt-3">
                    {seller.seller_verified === 1 && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-sm font-medium">
                        <ShieldCheck className="h-4 w-4" /> Verified Store
                      </span>
                    )}
                    {seller.shop_type && (
                      <span className="px-3 py-1 rounded-full border bg-muted text-sm">
                        {seller.shop_type}
                      </span>
                    )}
                    {/* Meta info */}
              <div className=" flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
                
                
                
                <div className="flex items-center gap-1.5">
                  <Package className="h-4 w-4 text-primary" />
                  <span>{seller.total_products ?? products.length} Products</span>
                </div>
              </div>
                  </div>
                </div>

                



<div className="flex items-center gap-3">
  <button
    type="button"
    onClick={handleFollow}
    className="
      group flex items-center gap-2
      px-5 py-2.5
      rounded-xl
      bg-primary
      text-primary-foreground
      font-medium
      shadow-sm
      hover:shadow-md
      hover:-translate-y-0.5
      transition-all duration-300
    "
  >
    <UserPlus className="w-4 h-4 transition-transform group-hover:scale-110" />
    <span>{following ? "Following" : "Follow"}</span>
  </button>

  <button
    type="button"
    onClick={handleOpenChat}
    className="
      group flex items-center gap-2
      px-5 py-2.5
      rounded-xl
      bg-background
      border border-border
      text-foreground
      font-medium
      shadow-sm
      hover:bg-muted/60
      hover:border-primary/20
      hover:-translate-y-0.5
      hover:shadow-md
      transition-all duration-300
    "
  >
    <MessageCircle className="w-4 h-4 transition-transform group-hover:scale-110" />
    <span>Chat</span>
  </button>
</div>
              </div>

             
            </div>

            {/* Nav tabs */}
            <div className="border-t">
              <div className="flex gap-8">
                <button className="py-2 border-b-2 border-primary text-primary font-medium text-sm">
                  Products
                </button>
                <button className="py-2 text-muted-foreground hover:text-foreground text-sm">
                  About
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* ════ Body ════ */}
      {carouselMedia.length > 0 && (
        <section className="app-container pt-6">
          <div className="relative overflow-hidden rounded-2xl border bg-background shadow-sm">
            <div className="h-[120px] md:h-[160px] bg-muted relative overflow-hidden">
              {carouselMedia[activeSlide]?.type === "video" ? (
                <video
                  src={carouselMedia[activeSlide].url}
                  className="h-full w-full object-cover"
                  controls
                  muted
                  playsInline
                />
              ) : (
                <img
                  src={carouselMedia[activeSlide]?.url}
                  alt={`${seller.shop_name || "Store"} banner`}
                  className="h-full w-full object-cover"
                />
              )}
            </div>

            {carouselMedia[activeSlide]?.type === "video" && (
              <div className="pointer-events-none absolute left-4 top-4 rounded-full bg-black/55 px-3 py-1 text-xs font-medium text-white">
                <span className="inline-flex items-center gap-1.5">
                  <Play className="h-3.5 w-3.5 fill-white" />
                  Video
                </span>
              </div>
            )}

            {carouselMedia.length > 1 && (
              <>
                <button
                  type="button"
                  aria-label="Previous banner"
                  onClick={() => setActiveSlide((current) => (current - 1 + carouselMedia.length) % carouselMedia.length)}
                  className="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-background/85 text-foreground shadow-sm hover:bg-background z-20"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  aria-label="Next banner"
                  onClick={() => setActiveSlide((current) => (current + 1) % carouselMedia.length)}
                  className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-background/85 text-foreground shadow-sm hover:bg-background z-20"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
                <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5 z-20">
                  {carouselMedia.map((item, index) => (
                    <button
                      key={`${item.url}-${index}`}
                      type="button"
                      aria-label={`Show banner ${index + 1}`}
                      onClick={() => setActiveSlide(index)}
                      className={`h-2 rounded-full transition-all ${
                        activeSlide === index ? "w-6 bg-white" : "w-2 bg-white/55 hover:bg-white/80"
                      }`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </section>
      )}

      <div className="app-container py-6 flex gap-6">

        {/* ── Sidebar ── */}
        <aside className="hidden lg:block w-72 shrink-0">
          <div className="sticky top-4 space-y-4">

            {/* About card */}
            <div className="bg-card border rounded-2xl overflow-hidden shadow-sm">
              <div className="px-5 py-4 border-b">
                <h3 className="font-semibold">About Store</h3>
              </div>
              <div className="p-5 space-y-4 text-sm">
                {seller.seller_mobile && (
                  <div className="flex gap-3">
                    <Phone className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground">Phone</p>
                      <p className="font-medium">{seller.seller_mobile}</p>
                    </div>
                  </div>
                )}
                {seller.seller_email && (
                  <div className="flex gap-3">
                    <span className="text-primary shrink-0 mt-0.5">✉</span>
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">Email</p>
                      <p className="font-medium break-all">{seller.seller_email}</p>
                    </div>
                  </div>
                )}
                {seller.seller_address && (
                  <div className="flex gap-3">
                    <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground">Address</p>
                      <p className="font-medium">{seller.seller_address}</p>
                    </div>
                  </div>
                )}
                {seller.shop_type && (
                  <div className="flex gap-3">
                    <Store className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground">Business Type</p>
                      <p className="font-medium">{seller.shop_type}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Stats card */}
            <div className="bg-card border rounded-2xl p-5 shadow-sm">
              <h4 className="font-semibold mb-3 text-sm">Store Statistics</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-muted p-3">
                  <p className="text-xs text-muted-foreground">Products</p>
                  <p className="text-xl font-bold">{seller.total_products ?? products.length}</p>
                </div>
                <div className="rounded-xl bg-muted p-3">
                  <p className="text-xs text-muted-foreground">Status</p>
                  <p className="text-sm font-semibold text-green-600">Active</p>
                </div>
              </div>
            </div>

            

          </div>
        </aside>

        {/* ── Products main area ── */}
        <main className="flex-1 min-w-0">
          {availableCategories.length > 0 && (
          <div className="relative mb-5">
  {/* Trigger Button */}
  <button
    onClick={() => setShowCategories(!showCategories)}
    className="
      flex items-center gap-2
      px-4 py-2.5
      rounded-xl
      bg-card
      border border-border
      text-sm font-medium
      hover:bg-muted/60
      hover:shadow-sm
      transition-all duration-300
    "
  >
    Category
    <span
      className={`text-xs transition-transform duration-300 ${
        showCategories ? "rotate-180" : ""
      }`}
    >
      ▼
    </span>
  </button>

  {/* Dropdown */}
  {showCategories && (
    <div
      className="
        absolute top-full left-0 mt-2 w-72
        bg-card/95 backdrop-blur-md
        border border-border
        rounded-2xl
        shadow-xl
        z-50
        p-2
      "
    >
      {/* All Products */}
      <button
        onClick={() => {
          setFilterCategory("all");
          setFilterSubCategory("all");
          setShowCategories(false);
        }}
        className="
          w-full text-left
          px-3 py-2.5
          rounded-xl
          text-sm font-medium
          hover:bg-muted/60
          transition
        "
      >
        All Products
      </button>

      <div className="my-1 h-px bg-border/60" />

      {/* Categories — only the ones this seller actually has products in */}
      {availableCategories.map((cat) => (
        <div key={cat.id} className="mb-1">
          {/* Category */}
          <button
            onClick={() => handleCategoryChange(String(cat.id))}
            className="
              w-full text-left
              px-3 py-2.5
              rounded-xl
              font-semibold
              text-sm
              hover:bg-muted/60
              hover:text-primary
              transition
            "
          >
            {cat.name}
          </button>

          {/* Subcategories — only the ones this seller has products in, within this category */}
          {filterCategory === String(cat.id) && (
            <div className="ml-2 mt-1 space-y-1 border-l border-border/50 pl-3">
              {availableSubCategories.map((sub) => (
                <button
                  key={sub.id}
                  onClick={() => {
                    setFilterSubCategory(String(sub.id));
                    setShowCategories(false);
                  }}
                  className="
                    w-full text-left
                    px-3 py-1.5
                    text-sm
                    text-muted-foreground
                    rounded-lg
                    hover:bg-muted/50
                    hover:text-foreground
                    transition
                  "
                >
                  {sub.name}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )}
</div>
          )}
{/* Category filter sidebar */}
            
         

          {/* Breadcrumb */}
          {filterCategory !== "all" && (
            <div className="flex items-center gap-2 mb-4 text-xs text-muted-foreground">
              <button
                className="hover:text-primary transition-colors"
                onClick={() => { setFilterCategory("all"); setFilterSubCategory("all"); }}
              >
                All
              </button>
              <span>/</span>
              <button
                className={`hover:text-primary transition-colors ${
                  filterSubCategory === "all" ? "text-foreground font-medium" : ""
                }`}
                onClick={() => setFilterSubCategory("all")}
              >
                {selectedCategoryName}
              </button>
              {filterSubCategory !== "all" && (
                <>
                  <span>/</span>
                  <span className="text-foreground font-medium">
                    {subCategories.find((sc) => String(sc.id) === filterSubCategory)?.name}
                  </span>
                </>
              )}
            </div>
          )}

          {/* Product count */}
          <p className="text-sm text-muted-foreground mb-4">
            {productsLoading
              ? "Loading products..."
              : `${filteredProducts.length} product${filteredProducts.length !== 1 ? "s" : ""}`}
          </p>

          {/* Grid */}
          {productsLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="rounded-xl border bg-card p-14 text-center">
              <Package className="h-12 w-12 mx-auto mb-3 text-muted-foreground/20" />
              <p className="text-muted-foreground font-medium">
                {products.length === 0
                  ? "No products listed yet."
                  : "No products in this category."}
              </p>
              {products.length > 0 && (
                <button
                  onClick={() => { setFilterCategory("all"); setFilterSubCategory("all"); }}
                  className="mt-3 text-xs text-primary hover:underline"
                >
                  View all products
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onAddToCart={handleAddToCart}
                  onOpen={handleOpenProduct}
                />
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
      <MartChatModal
        open={chatOpen}
        onOpenChange={setChatOpen}
        productId={products[0]?.id ?? -Number(seller.id)}
        productName={products[0]?.name_bn || products[0]?.name_en || seller.shop_name || seller.seller_name || "Store"}
        productImage={products[0]?.image || seller.profile_image_url || null}
        productPrice={products[0]?.sale_price ?? null}
        sellerId={seller.user_id ?? products[0]?.vendor_id ?? 0}
      />
    </>
  );
};

export default MartStore;
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ShoppingCart, Star, Heart, Flame, GitCompareArrows, Truck, Eye, Share2, Copy } from "lucide-react";
import { ShareButton } from "@/components/SharePopup";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useMartCart } from "@/contexts/MartCartContext";
import { useMartWishlist } from "@/contexts/MartWishlistContext";
import { useMartCompare } from "@/contexts/MartCompareContext";
import { MartProduct } from "@/hooks/useMartData";
import { useLongPress } from "@/hooks/useLongPress";
import { haptic } from "@/lib/haptics";
import { getFullImageUrl } from "@/lib/imageUrl";
import { toast } from "sonner";
import yessMartLogo from "/fullLogo.png";

// ── Variant price helpers (mirrors the logic used on the product detail
// page) ──────────────────────────────────────────────────────────────────
// A product's real price/unit can live in two places: the top-level
// product.price/product.unit fields, or a unit_prices array of variants
// (e.g. "200gm" - ৳500, "300gm" - ৳700). When a seller adds variants, the
// top-level fields are often left at 0/"piece" and are stale — the card
// must read the first variant's price/unit the same way the detail page
// does, or it shows "৳0 / piece -100%" while the detail page correctly
// shows "৳500 / 200gm".
const getVariantPrice = (variant: any) => {
  const storedSalePrice = Number(variant?.sale_price);
  const legacyPrice = Number(variant?.price);
  const originalPrice = Number(variant?.original_price);

  if (Number.isFinite(storedSalePrice) && storedSalePrice > 0) return storedSalePrice;
  if (Number.isFinite(legacyPrice) && legacyPrice > 0) return legacyPrice;
  if (Number.isFinite(originalPrice) && originalPrice > 0) return originalPrice;
  return 0;
};

const parseUnitOptions = (value: unknown) => {
  let options = value;
  if (typeof options === "string") {
    try {
      options = JSON.parse(options);
    } catch {
      return [];
    }
  }

  if (!Array.isArray(options)) return [];

  return options.filter((option) => {
    const unit = String(option?.unit || "").trim();
    const salePrice = getVariantPrice(option);
    return Boolean(unit) && Number.isFinite(salePrice) && salePrice >= 0;
  });
};

const FREE_SHIPPING_MIN = 500;

interface Props {
  product: MartProduct;
  variant?: "grid" | "list";
}

const MartProductCard = ({ product, variant = "grid" }: Props) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addItem } = useMartCart();
  const { toggleWishlist, isInWishlist } = useMartWishlist();
  const { addToCompare, removeFromCompare, isInCompare } = useMartCompare();
  const { language } = useLanguage();
  const bn = language === "bn";
  const [actionsOpen, setActionsOpen] = useState(false);
  const longPress = useLongPress<HTMLDivElement>(() => setActionsOpen(true), 480);

  const requireAuthForPurchase = (action: () => void) => {
    if (!user) {
      toast.info(bn ? "ক্রয় করতে অনুগ্রহ করে লগইন করুন" : "Please login to purchase");
      navigate("/auth?redirect=/mart/home");
      return;
    }
    action();
  };

  // ── Price resolution ──────────────────────────────────────────────────
  // Prefer the first variant from unit_prices (e.g. "200gm" - ৳500), same as
  // the product detail page. Products with variants often leave the
  // top-level product.price/product.unit/product.original_price stale (0 /
  // "piece"), which previously made the card show "৳0 / piece -100%" while
  // the detail page correctly showed "৳500 / 200gm". Falling back to those
  // top-level fields only when there are no variants keeps both pages
  // consistent and still covers products that don't use variants at all.
  const unitOptions = parseUnitOptions((product as any).unit_prices);
  const primaryVariant = unitOptions[0];

  const variantPrice = primaryVariant ? getVariantPrice(primaryVariant) : 0;
  const rawPrice = variantPrice > 0 ? variantPrice : (Number(product.price) || 0);

  const variantOriginal = Number(primaryVariant?.original_price);
  const rawOriginalPrice = Number.isFinite(variantOriginal) && variantOriginal > 0
    ? variantOriginal
    : (Number(product.original_price) || 0);

  const displayPrice = rawPrice > 0 ? rawPrice : rawOriginalPrice;

  // Only treat the product as discounted when both a real sale price and a
  // real original price exist, and the original price is actually greater.
  const hasDiscount = rawPrice > 0 && rawOriginalPrice > rawPrice;
  const discount = hasDiscount
    ? Math.round(((rawOriginalPrice - rawPrice) / rawOriginalPrice) * 100)
    : 0;

  // Cart items should carry the resolved price/unit, not stale ৳0/"piece".
  const resolvedUnit = String(primaryVariant?.unit || (product as any).unit || "").trim();
  const cartProduct = {
    ...product,
    price: displayPrice,
    unit: resolvedUnit || (product as any).unit,
    original_price: rawOriginalPrice || null,
  };

  const wishlisted = isInWishlist(product.id);
  const compared = isInCompare(product.id);
  const freeShipping = displayPrice >= FREE_SHIPPING_MIN;
  const lowStock = product.stock > 0 && product.stock <= 5;

  const productUrl = `${window.location.origin}/mart/product/${product.slug}`;
  const productName = bn ? product.name : (product.name_en || product.name);
  const ratingText = Number(product.rating || 0).toFixed(1);
  const reviewCountText = Number(product.total_reviews || 0).toLocaleString(bn ? "bn-BD" : "en-US");
  const soldCountText = Number(product.total_sold || 0).toLocaleString(bn ? "bn-BD" : "en-US");
  // Unit label shown beside the price (e.g. "200gm", "piece"). Uses the
  // resolved unit (first variant if present, else the product's own unit)
  // so it always matches whichever price is actually being displayed.
  const unitLabel = resolvedUnit;

  const handleAddToCart = (e?: React.MouseEvent | React.SyntheticEvent) => {
    if (e && "stopPropagation" in e) e.stopPropagation();
    if (product.stock <= 0) {
      toast.error(bn ? "স্টকে নেই" : "Out of stock");
      return;
    }
    haptic("medium");
    addItem(cartProduct);
    toast.success(bn ? "কার্টে যোগ হয়েছে" : "Added to cart", {
      description: productName,
    });
  };

  const shareProduct = async () => {
    haptic("light");
    try {
      if (navigator.share) {
        await navigator.share({ title: productName, url: productUrl });
      } else {
        await navigator.clipboard.writeText(productUrl);
        toast.success(bn ? "লিংক কপি হয়েছে" : "Link copied");
      }
    } catch {/* ignored */}
    setActionsOpen(false);
  };
  const copyLink = async () => {
    haptic("light");
    try {
      await navigator.clipboard.writeText(productUrl);
      toast.success(bn ? "লিংক কপি হয়েছে" : "Link copied");
    } catch {/* ignored */}
    setActionsOpen(false);
  };

  const ActionDrawer = (
    <Drawer open={actionsOpen} onOpenChange={setActionsOpen}>
      <DrawerContent className="pb-[max(1rem,env(safe-area-inset-bottom))]">
        <DrawerHeader className="text-left">
          <DrawerTitle className="text-sm font-semibold line-clamp-1">{productName}</DrawerTitle>
          <p className="text-[11px] text-muted-foreground">
            ৳{displayPrice.toLocaleString("bn-BD")}{unitLabel ? `/${unitLabel}` : ""}
          </p>
        </DrawerHeader>
        <div className="px-4 pb-4 space-y-1">
          <ProdAction icon={<Eye className="h-4 w-4" />} label={bn ? "বিস্তারিত দেখুন" : "View details"} onClick={() => { setActionsOpen(false); navigate(`/mart/product/${product.slug}`); }} />
          <ProdAction icon={<ShoppingCart className="h-4 w-4" />} label={bn ? "কার্টে যোগ করুন" : "Add to cart"} onClick={() => { setActionsOpen(false); handleAddToCart(); }} />
          <ProdAction icon={<Heart className={`h-4 w-4 ${wishlisted ? "fill-red-500 text-red-500" : ""}`} />} label={wishlisted ? (bn ? "উইশলিস্ট থেকে সরান" : "Remove from wishlist") : (bn ? "উইশলিস্টে যোগ" : "Add to wishlist")} onClick={() => { setActionsOpen(false); toggleWishlist(product); }} />
          <ProdAction icon={<GitCompareArrows className="h-4 w-4" />} label={compared ? (bn ? "কম্পেয়ার থেকে সরান" : "Remove from compare") : (bn ? "তুলনা করুন" : "Compare")} onClick={() => { setActionsOpen(false); compared ? removeFromCompare(product.id) : addToCompare(product); }} />
          <ProdAction icon={<Share2 className="h-4 w-4" />} label={bn ? "শেয়ার করুন" : "Share"} onClick={shareProduct} />
          <ProdAction icon={<Copy className="h-4 w-4" />} label={bn ? "লিংক কপি" : "Copy link"} onClick={copyLink} />
        </div>
      </DrawerContent>
    </Drawer>
  );

  if (variant === "list") {
    return (
      <>
      <div
        className="flex gap-3 bg-card border border-border/50 rounded-xl overflow-hidden cursor-pointer hover:shadow-md transition-shadow p-3 select-none md:select-auto"
        onClick={() => navigate(`/mart/product/${product.slug}`)}
        {...longPress}
      >
        <div className="relative h-28 w-28 rounded-lg overflow-hidden bg-muted/30 shrink-0">
          {product.image_url ? (
            <img src={getFullImageUrl(product.image_url)} alt={product.name} className="w-full h-full object-cover" loading="lazy" decoding="async" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground"><ShoppingCart className="h-8 w-8" /></div>
          )}
          <img
            src={yessMartLogo}
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute bottom-1 right-1 h-5 w-auto opacity-60 mix-blend-multiply drop-shadow"
          />
          {hasDiscount && <Badge className="absolute top-1 left-1 bg-red-500 text-white text-[9px]">-{discount}%</Badge>}
          {freeShipping && <Badge className="absolute bottom-1 left-1 bg-green-500 text-white text-[8px] px-1"><Truck className="h-2.5 w-2.5 mr-0.5" />{bn ? "ফ্রি" : "Free"}</Badge>}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium line-clamp-2">{bn ? product.name : (product.name_en || product.name)}</h3>
          {product.description && (
            <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">{product.description}</p>
          )}
          <div className="flex items-center gap-1 mt-1">
            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
            <span className="text-xs text-muted-foreground">{ratingText} ({reviewCountText})</span>
            <span className="text-xs text-muted-foreground ml-1">| {soldCountText} {bn ? "বিক্রি" : "sold"}</span>
          </div>
          <div className="flex items-baseline gap-2 mt-1.5">
            <span className="text-lg font-bold text-primary">৳{displayPrice.toLocaleString("bn-BD")}</span>
            {unitLabel && <span className="text-xs font-medium text-muted-foreground">/{unitLabel}</span>}
            {hasDiscount && <span className="text-xs text-muted-foreground line-through">৳{rawOriginalPrice.toLocaleString("bn-BD")}</span>}
          </div>
          {lowStock && <p className="text-[10px] text-amber-600 font-medium mt-0.5">{bn ? `মাত্র ${product.stock} টি বাকি` : `Only ${product.stock} left`}</p>}
          <div className="flex gap-2 mt-2">
            <Button
              size="sm"
              className="press text-xs h-9 px-3 disabled:opacity-50"
              disabled={product.stock <= 0}
              onClick={handleAddToCart}
              aria-label={bn ? "কার্টে যোগ করুন" : "Add to cart"}
            >
              <ShoppingCart className="h-3.5 w-3.5 mr-1" />
              {product.stock <= 0 ? (bn ? "স্টক নেই" : "Sold out") : (bn ? "কার্ট" : "Cart")}
            </Button>
            <Button size="sm" variant="outline" className="text-xs h-7 px-2" onClick={(e) => { e.stopPropagation(); toggleWishlist(product); }}>
              <Heart className={`h-3 w-3 ${wishlisted ? "fill-red-500 text-red-500" : ""}`} />
            </Button>
            <Button size="sm" variant={compared ? "default" : "outline"} className="text-xs h-7 px-2" onClick={(e) => { e.stopPropagation(); compared ? removeFromCompare(product.id) : addToCompare(product); }}>
              <GitCompareArrows className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
      {ActionDrawer}
      </>
    );
  }

  return (
    <>
    <motion.div
      whileHover={{ y: -4 }}
      className="bg-card border border-border/50 rounded-xl overflow-hidden cursor-pointer group transition-shadow hover:shadow-lg select-none md:select-auto"
      onClick={() => navigate(`/mart/product/${product.slug}`)}
      {...longPress}
    >
      <div className="relative aspect-square bg-muted/30 overflow-hidden">
        {product.image_url ? (
          <img src={getFullImageUrl(product.image_url)} alt={product.name} className="w-auto mx-auto h-full group-hover:scale-105 transition-transform duration-300" loading="lazy" decoding="async" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground"><ShoppingCart className="h-10 w-10" /></div>
        )}
        <img
          src={yessMartLogo}
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute bottom-6 right-2 h-7 md:h-5 w-auto opacity-60 mix-blend-multiply drop-shadow-md"
        />
        {hasDiscount && <Badge className="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-bold">-{discount}%</Badge>}
        {product.is_featured && (
          <Badge className="absolute top-2 right-8 bg-amber-500 text-white text-[10px]">
            <Flame className="h-3 w-3 mr-0.5" /> {bn ? "হট" : "Hot"}
          </Badge>
        )}
        {freeShipping && (
          <Badge className="absolute bottom-2 left-2 bg-gradient-to-tr from-pink-500 via-red-500 to-amber-500 text-white text-[9px] px-1.5 gap-0.5">
            <Truck className="h-3 w-3" /> {bn ? "ফ্রি ডেলিভারি" : "Free"}
          </Badge>
        )}
        <button
          className="absolute top-2 right-2 h-7 w-7 rounded-full bg-white/80 flex items-center justify-center hover:bg-white transition-colors"
          onClick={(e) => { e.stopPropagation(); toggleWishlist(product); }}
        >
          <Heart className={`h-4 w-4 ${wishlisted ? "fill-red-500 text-red-500" : "text-gray-500"}`} />
        </button>
        <button
          className={`absolute top-10 right-2 h-7 w-7 rounded-full flex items-center justify-center transition-colors ${compared ? "bg-primary text-white" : "bg-white/80 hover:bg-white text-gray-500"}`}
          onClick={(e) => { e.stopPropagation(); compared ? removeFromCompare(product.id) : addToCompare(product); }}
        >
          <GitCompareArrows className="h-3.5 w-3.5" />
        </button>
        <ShareButton
          url={`${window.location.origin}/mart/product/${product.slug}`}
          title={bn ? product.name : (product.name_en || product.name)}
          className="absolute top-[4.5rem] right-2 h-7 w-7 rounded-full bg-white/80 hover:bg-white flex items-center justify-center transition-colors text-gray-500"
          iconClassName="h-3.5 w-3.5"
        />
      </div>
      <div className="p-3">
        <h3 className="text-lg font-bold line-clamp-2 text-primary group-hover:text-primary transition-colors min-h-[2.5rem]">
          {bn ? product.name : (product.name_en || product.name)}
        </h3>
        {product.description && (
          <p className="text-[10px] text-muted-foreground line-clamp-2 mt-0.5">{product.description}</p>
        )}
        <div className="flex items-baseline gap-2 mt-1.5">
          <span className="text-lg text-primary">৳{displayPrice.toLocaleString("bn-BD")}</span>
          {unitLabel && <span className="text-xs font-medium text-muted-foreground">/{unitLabel}</span>}
          {hasDiscount && <span className="text-xs text-muted-foreground line-through">৳{rawOriginalPrice.toLocaleString("bn-BD")}</span>}
        </div>
        <div className="flex items-center justify-between mt-1">
          <div className="flex items-center gap-1">
            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
            <span className="text-xs text-muted-foreground">{ratingText} ({reviewCountText}) | {soldCountText} {bn ? "বিক্রি" : "sold"}</span>
          </div>
          {lowStock && <span className="text-[9px] text-amber-600 font-bold">{bn ? `${product.stock}টি বাকি` : `${product.stock} left`}</span>}
        </div>
        <Button
          size="sm"
          className="press w-full mt-2 text-xs h-9 text-white disabled:opacity-50"
          disabled={product.stock <= 0}
          onClick={handleAddToCart}
          aria-label={bn ? "কার্টে যোগ করুন" : "Add to cart"}
        >
          <ShoppingCart className="h-3.5 w-3.5 mr-1" />
          {product.stock <= 0 ? (bn ? "স্টক শেষ" : "Sold out") : (bn ? "কার্টে যোগ" : "Add to Cart")}
        </Button>
      </div>
    </motion.div>
    {ActionDrawer}
    </>
  );
};

const ProdAction = ({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) => (
  <button
    onClick={onClick}
    className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted active:scale-[0.98]"
  >
    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">{icon}</span>
    {label}
  </button>
);

export default MartProductCard;
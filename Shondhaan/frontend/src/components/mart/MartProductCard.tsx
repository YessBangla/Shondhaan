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
import yessMartLogo from "@/assets/yess-mart-logo.png";

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

  // Only treat the product as discounted when original_price is actually
  // greater than the current price. Previously this only checked truthiness
  // of original_price, so products where original_price === price (e.g. the
  // seller form always saves an original_price even with no real discount)
  // still showed a strikethrough "original" price equal to the current price.
  const hasDiscount = Boolean(product.original_price) && product.original_price > product.price;
  const discount = hasDiscount
    ? Math.round(((product.original_price - product.price) / product.original_price) * 100)
    : 0;

  const wishlisted = isInWishlist(product.id);
  const compared = isInCompare(product.id);
  const freeShipping = product.price >= FREE_SHIPPING_MIN;
  const lowStock = product.stock > 0 && product.stock <= 5;

  const productUrl = `${window.location.origin}/mart/product/${product.slug}`;
  const productName = bn ? product.name : (product.name_en || product.name);
  const ratingText = Number(product.rating || 0).toFixed(1);
  const reviewCountText = Number(product.total_reviews || 0).toLocaleString(bn ? "bn-BD" : "en-US");
  const soldCountText = Number(product.total_sold || 0).toLocaleString(bn ? "bn-BD" : "en-US");

  const handleAddToCart = (e?: React.MouseEvent | React.SyntheticEvent) => {
    if (e && "stopPropagation" in e) e.stopPropagation();
    if (product.stock <= 0) {
      toast.error(bn ? "স্টকে নেই" : "Out of stock");
      return;
    }
    haptic("medium");
    addItem(product);
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
          <p className="text-[11px] text-muted-foreground">৳{product.price.toLocaleString("bn-BD")}</p>
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
            <span className="text-lg font-bold text-primary">৳{product.price.toLocaleString("bn-BD")}</span>
            {hasDiscount && <span className="text-xs text-muted-foreground line-through">৳{product.original_price.toLocaleString("bn-BD")}</span>}
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
          <img src={getFullImageUrl(product.image_url)} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" decoding="async" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground"><ShoppingCart className="h-10 w-10" /></div>
        )}
        <img
          src={yessMartLogo}
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute bottom-2 right-2 h-7 md:h-8 w-auto opacity-60 mix-blend-multiply drop-shadow-md"
        />
        {hasDiscount && <Badge className="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-bold">-{discount}%</Badge>}
        {product.is_featured && (
          <Badge className="absolute top-2 right-8 bg-amber-500 text-white text-[10px]">
            <Flame className="h-3 w-3 mr-0.5" /> {bn ? "হট" : "Hot"}
          </Badge>
        )}
        {freeShipping && (
          <Badge className="absolute bottom-2 left-2 bg-green-500 text-white text-[9px] px-1.5 gap-0.5">
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
        <h3 className="text-sm font-medium line-clamp-2 text-foreground group-hover:text-primary transition-colors min-h-[2.5rem]">
          {bn ? product.name : (product.name_en || product.name)}
        </h3>
        {product.description && (
          <p className="text-[10px] text-muted-foreground line-clamp-2 mt-0.5">{product.description}</p>
        )}
        <div className="flex items-baseline gap-2 mt-1.5">
          <span className="text-lg font-bold text-primary">৳{product.price.toLocaleString("bn-BD")}</span>
          {hasDiscount && <span className="text-xs text-muted-foreground line-through">৳{product.original_price.toLocaleString("bn-BD")}</span>}
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
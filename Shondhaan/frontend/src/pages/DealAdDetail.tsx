import { useState, useEffect } from "react";
import ListingImage from "@/components/deal/ListingImage";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ChevronLeft, MapPin, Clock, Eye, Phone, MessageCircle, Heart, Share2, Shield, ChevronRight, AlertTriangle, Tag, Pencil, User, Star, CalendarDays, Package, Facebook, Link2, CheckCircle2, BadgeCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useLanguage } from "@/contexts/LanguageContext";
import { useDealListing } from "@/hooks/useDealData";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Skeleton } from "@/components/ui/skeleton";
import DealChatModal from "@/components/deal/DealChatModal";
import DealReportModal from "@/components/deal/DealReportModal";
import { useStartDealConversation } from "@/hooks/useDealChatSocket";
import { useSEO } from "@/hooks/useSEO";
import {
  addDealFavorite,
  getDealAuthUserId,
  getDealFavoriteStatus,
  removeDealFavorite,
} from "@/lib/dealFavoriteApi";

function timeAgo(dateStr: string, bn = true) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return bn ? `${mins} মিনিট আগে` : `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return bn ? `${hours} ঘণ্টা আগে` : `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return bn ? `${days} দিন আগে` : `${days}d ago`;
}

// Helper component to render category icons whether they are URLs or emojis
const CategoryIcon = ({ icon, className = "w-5 h-5" }: { icon?: string; className?: string }) => {
  if (!icon) return null;

  const isImage = icon.startsWith("http") || icon.startsWith("/") || icon.startsWith("data:") || icon.startsWith("blob:");

  if (isImage) {
    return (
      <img
        src={icon}
        alt="Category Icon"
        className={`${className} object-contain`}
        onError={(e) => { (e.target as HTMLImageElement).style.visibility = 'hidden'; }}
      />
    );
  }

  return <span className="text-base leading-none">{icon}</span>;
};

// A single compact row used for the meta strip (location / posted / views / condition)
const StatItem = ({ icon: Icon, label, value }: { icon: any; label: string; value: React.ReactNode }) => (
  <div className="flex items-center gap-2 min-w-0">
    <Icon className="h-4 w-4 text-primary/70 flex-shrink-0" />
    <div className="min-w-0 leading-tight">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold text-foreground truncate">{value}</p>
    </div>
  </div>
);

const SellerProfileCard = ({ sellerId, bn }: { sellerId: string; bn: boolean }) => {
  const navigate = useNavigate();

  const { data: sellerData, isLoading } = useQuery({
    queryKey: ["deal-seller-profile", sellerId],
    queryFn: async () => {
      const [profileRes, adsRes] = await Promise.all([
        supabase.from("profiles").select("display_name, avatar_url, created_at, phone").eq("user_id", sellerId).single(),
        supabase.from("deal_listings").select("id", { count: "exact", head: true }).eq("user_id", sellerId).eq("status", "active"),
      ]);
      return {
        name: profileRes.data?.display_name || (bn ? "ব্যবহারকারী" : "User"),
        avatar: profileRes.data?.avatar_url,
        memberSince: profileRes.data?.created_at,
        totalAds: adsRes.count || 0,
        hasPhone: !!profileRes.data?.phone,
        hasName: !!profileRes.data?.display_name,
      };
    },
    enabled: !!sellerId,
  });

  if (isLoading) return <Card className="border-border/50"><CardContent className="p-4"><Skeleton className="h-14 w-full" /></CardContent></Card>;

  const memberDate = sellerData?.memberSince
    ? new Date(sellerData.memberSince).toLocaleDateString("bn-BD", { year: "numeric", month: "short" })
    : "";

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
      <Card className="border-border/50 overflow-hidden">
        <CardContent className="p-4">
          <button
            onClick={() => navigate(`/deal/seller/${sellerId}`)}
            className="flex items-center gap-3 w-full text-left group"
          >
            {sellerData?.avatar ? (
              <img src={sellerData.avatar} alt="" className="h-11 w-11 rounded-full object-cover flex-shrink-0" />
            ) : (
              <div className="h-11 w-11 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                <User className="h-5 w-5 text-muted-foreground" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-foreground truncate text-sm leading-tight group-hover:text-primary transition-colors">{sellerData?.name}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{bn ? "সদস্য" : "Since"} {memberDate} · {sellerData?.totalAds} {bn ? "বিজ্ঞাপন" : "listings"}</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </button>

          <div className="flex items-center gap-3 mt-3 pt-3 border-t border-border/40 text-[11px] text-muted-foreground">
            <span className={`flex items-center gap-1 ${sellerData?.hasPhone ? "text-foreground" : ""}`}>
              <CheckCircle2 className={`h-3.5 w-3.5 ${sellerData?.hasPhone ? "text-primary" : "text-muted-foreground/50"}`} />
              {bn ? "ফোন যাচাইকৃত" : "Phone verified"}
            </span>
            <span className="flex items-center gap-1 text-foreground">
              <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
              {bn ? "ইমেইল যাচাইকৃত" : "Email verified"}
            </span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

const RelatedAds = ({ categoryId, currentId, bn }: { categoryId?: string; currentId: string; bn: boolean }) => {
  const navigate = useNavigate();
  const { data: relatedAds, isLoading } = useQuery({
    queryKey: ["deal-related", categoryId, currentId],
    queryFn: async () => {
      if (!categoryId) return [];
      const { data } = await supabase
        .from("deal_listings")
        .select("id, title, price, images, location_district, created_at, is_featured")
        .eq("category_id", categoryId)
        .eq("status", "active")
        .neq("id", currentId)
        .order("created_at", { ascending: false })
        .limit(6);
      return data || [];
    },
    enabled: !!categoryId,
  });

  if (isLoading || !relatedAds?.length) return null;

  return (
    <motion.div className="mt-10" initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-bold text-foreground">
          {bn ? "একই ক্যাটাগরিতে আরও" : "More like this"}
        </h2>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {relatedAds.map((ad: any) => {
          // Safety check to handle images if they are a stringified JSON
          let img = ad.images?.[0];
          if (typeof ad.images === 'string') {
            try {
              const parsed = JSON.parse(ad.images);
              img = Array.isArray(parsed) ? parsed[0] : undefined;
            } catch {
              img = undefined;
            }
          }

          return (
            <div
              key={ad.id}
              className="cursor-pointer group"
              onClick={() => navigate(`/deal/ad/${ad.id}`)}
            >
              <div className="relative w-full aspect-square bg-muted overflow-hidden rounded-lg mb-2">
                <ListingImage src={img} alt={ad.title} fallbackSize="md" fit="cover" className="absolute inset-0 w-full h-full object-cover transition-transform duration-200 group-hover:scale-[1.03]" />
              </div>
              <p className="text-sm font-bold text-primary leading-none">৳{ad.price > 0 ? Number(ad.price).toLocaleString("bn-BD") : (bn ? "আলোচনা" : "Negotiable")}</p>
              <h3 className="text-xs text-foreground line-clamp-1 mt-1.5">{ad.title}</h3>
              {ad.location_district && (
                <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
                  <MapPin className="h-3 w-3 flex-shrink-0" />{ad.location_district}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </motion.div>
  );
};

const DealAdDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const bn = language === "bn";
  const { user } = useAuth();
  const [showPhone, setShowPhone] = useState(false);
  const [selectedImg, setSelectedImg] = useState(0);
  const [chatOpen, setChatOpen] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const { data: listing, isLoading } = useDealListing(id || "");
  const startConversation = useStartDealConversation();

  const adImage = listing?.images?.[0];
  const adDesc = listing
    ? bn
      ? `${listing.title} — ৳${listing.price.toLocaleString("bn-BD")}। ডিলে দেখুন। নিরাপদ কেনাবেচা।`
      : `${listing.title} — ৳${listing.price.toLocaleString()}. View on Deal. Safe trading.`
    : "";
  useSEO({
    title: listing
      ? `${listing.title} — ৳${listing.price.toLocaleString(bn ? "bn-BD" : "en-US")}`
      : bn
        ? "বিজ্ঞাপন বিবরণ"
        : "Ad details",
    description: adDesc,
    canonical: id ? `/deal/ad/${id}` : undefined,
    image: adImage,
    type: "product",
    jsonLd: listing
      ? {
          "@context": "https://schema.org",
          "@type": "Product",
          name: listing.title,
          image: adImage,
          description: adDesc,
          offers: {
            "@type": "Offer",
            price: listing.price,
            priceCurrency: "BDT",
            availability: "https://schema.org/InStock",
          },
        }
      : undefined,
  });

  useEffect(() => {
    const userId = getDealAuthUserId(user);

    if (!userId || !id) {
      setIsFavorite(false);
      return;
    }

    getDealFavoriteStatus(userId, id)
      .then(setIsFavorite)
      .catch(() => setIsFavorite(false));
  }, [user, id]);

  const handleToggleFavorite = async () => {
    const userId = getDealAuthUserId(user);

    if (!userId) {
      navigate("/login");
      toast.info(bn ? "পছন্দে যোগ করতে লগইন করুন" : "Please login to save this ad");
      return;
    }

    if (!listing) return;

    if (String(listing.user_id) === String(userId)) {
      toast.info(bn ? "নিজের বিজ্ঞাপন পছন্দে যোগ করা যায় না" : "You cannot save your own ad");
      return;
    }

    try {
      setFavoriteLoading(true);

      if (isFavorite) {
        await removeDealFavorite(userId, listing.id);
        setIsFavorite(false);
        toast.success("Removed from favorites");
      } else {
        await addDealFavorite(userId, listing.id);
        setIsFavorite(true);
        toast.success("Added to favorites");
      }
    } catch (error: any) {
      toast.error(error?.message || "Could not update favorite");
    } finally {
      setFavoriteLoading(false);
    }
  };

  const handleChatClick = async () => {
    if (!user) {
      navigate("/login");
      return;
    }
    if (!listing) return;
    if (user.id === listing.user_id) {
      toast.info(bn ? "এটি আপনার নিজের বিজ্ঞাপন" : "This is your own ad");
      return;
    }

    try {
      const conv = await startConversation.mutateAsync({
        listingId: listing.id,
        otherUserId: listing.user_id,
      });
      const conversationId = conv?.id || conv?.conversation_id;
      if (!conversationId) throw new Error("No conversation id returned");
      setActiveConversationId(String(conversationId));
      setChatOpen(true);
    } catch (err: any) {
      toast.error(err?.message || (bn ? "চ্যাট শুরু করা যায়নি" : "Could not start chat"));
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-[44px] md:pt-[68px]" />
        <div className="app-container py-8">
          <Skeleton className="h-64 rounded-2xl mb-6" />
          <Skeleton className="h-8 w-3/4 mb-3" />
          <Skeleton className="h-6 w-1/2" />
        </div>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-[14px] md:pt-[28px]" />
        <div className="app-container py-20 text-center">
          <p className="text-5xl mb-4">😔</p>
          <p className="text-lg font-medium text-muted-foreground mb-6">{bn ? "বিজ্ঞাপনটি পাওয়া যায়নি" : "Ad not found"}</p>
          <Button onClick={() => navigate("/deal")} size="lg">{bn ? "ফিরে যান" : "Go Back"}</Button>
        </div>
      </div>
    );
  }

  const images = listing.images?.length ? listing.images : [];
  const cat = listing.deal_categories as any;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-[30px] md:pt-[28px]" />
      <div className="app-container py-6 md:pb-12">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-5 overflow-x-auto whitespace-nowrap scrollbar-hide">
          <button onClick={() => navigate("/deal")} className="hover:text-primary transition-colors flex items-center gap-1">
            <ChevronLeft className="h-3.5 w-3.5" />{bn ? "ডিল" : "Deal"}
          </button>
          {cat && (
            <>
              {cat.parent_category && (
                <>
                  <span className="text-border">/</span>
                  <button onClick={() => navigate(`/deal/category/${cat.parent_category.slug}`)} className="hover:text-primary transition-colors flex items-center gap-1">
                    <CategoryIcon icon={cat.parent_category.icon} className="w-3 h-3" />
                    <span>{bn ? cat.parent_category.name : (cat.parent_category.name_en || cat.parent_category.name)}</span>
                  </button>
                </>
              )}
              <span className="text-border">/</span>
              <button onClick={() => navigate(`/deal/category/${cat.slug}`)} className="hover:text-primary transition-colors flex items-center gap-1">
                <CategoryIcon icon={cat.icon} className="w-3 h-3" />
                <span>{bn ? cat.name : (cat.name_en || cat.name)}</span>
              </button>
            </>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {/* Left - Images & Details */}
          <div className="md:col-span-2 space-y-5">
            {/* Image Gallery */}
            <div>
              <div className="relative aspect-square md:aspect-video rounded-xl overflow-hidden bg-muted mb-2 border border-border/50">
                <ListingImage src={images[selectedImg]} alt={listing.title} fallbackSize="lg" fit="contain" />
                {images.length > 1 && (
                  <span className="absolute bottom-2 right-2 text-[11px] font-medium bg-black/60 text-white px-2 py-0.5 rounded-md">
                    {selectedImg + 1}/{images.length}
                  </span>
                )}
              </div>
              {images.length > 1 && (
                <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
                  {images.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedImg(i)}
                      className={`relative flex items-center justify-center w-16 h-16 rounded-md overflow-hidden border shrink-0 transition-opacity ${
                        i === selectedImg
                          ? "border-primary opacity-100"
                          : "border-transparent opacity-60 hover:opacity-90"
                      }`}
                    >
                      <ListingImage src={img} alt="" fallbackSize="sm" fit="cover" className="absolute inset-0 w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Title & Price */}
            <div>
              <div className="flex items-start justify-between gap-3 mb-2">
                <h1 className="text-xl md:text-2xl font-bold text-foreground leading-snug">{bn ? listing.title : (listing.title_en || listing.title)}</h1>
                {user && user.id === listing.user_id && (
                  <Button variant="outline" size="sm" className="shrink-0 gap-1.5" onClick={() => navigate(`/deal/edit/${listing.id}`)}>
                    <Pencil className="h-3.5 w-3.5" /> {bn ? "সম্পাদনা" : "Edit"}
                  </Button>
                )}
              </div>
              <div className="flex items-baseline gap-2.5 mb-4">
                <p className="text-2xl md:text-3xl font-bold text-primary">
                  ৳{listing.price > 0 ? Number(listing.price).toLocaleString("bn-BD") : (bn ? "আলোচনা" : "Negotiable")}
                </p>
                {listing.is_negotiable && (
                  <span className="text-xs font-medium text-amber-700 dark:text-amber-400">
                    {bn ? "দরদাম যোগ্য" : "· negotiable"}
                  </span>
                )}
              </div>

              {/* Meta strip */}
              <div className="flex flex-wrap items-center gap-x-5 gap-y-3 py-3.5 border-y border-border/50">
                <StatItem icon={MapPin} label={bn ? "অবস্থান" : "Location"} value={listing.location_district || listing.location_division} />
                <StatItem icon={Clock} label={bn ? "সময়" : "Posted"} value={timeAgo(listing.created_at, bn)} />
                <StatItem icon={Eye} label={bn ? "দর্শন" : "Views"} value={listing.views_count} />
                <StatItem
                  icon={Package}
                  label={bn ? "অবস্থা" : "Condition"}
                  value={listing.product_condition === "new" ? (bn ? "নতুন" : "New") : listing.product_condition === "used" ? (bn ? "ব্যবহৃত" : "Used") : listing.product_condition}
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <h2 className="font-semibold text-sm text-foreground mb-2">{bn ? "বিবরণ" : "Description"}</h2>
              <p className="text-muted-foreground text-sm leading-relaxed whitespace-pre-line">
                {listing.description || (bn ? "কোনো বিবরণ প্রদান করা হয়নি" : "No description provided")}
              </p>
            </div>

            {/* Safety Tips — compact strip, no oversized card */}
            <div className="rounded-lg bg-muted/40 border border-border/50 p-3.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground mb-2">
                <Shield className="h-3.5 w-3.5 text-primary" />
                {bn ? "নিরাপদে লেনদেন করুন" : "Trade safely"}
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {bn
                  ? "পণ্য হাতে পেয়ে দাম পরিশোধ করুন। অনলাইনে আগাম টাকা পাঠাবেন না। নিরাপদ, জনবহুল জায়গায় দেখা করুন এবং সন্দেহজনক মনে হলে রিপোর্ট করুন।"
                  : "Inspect before you pay, never send money in advance, meet in a public place, and report anything that feels off."}
              </p>
            </div>
          </div>

          {/* Right Sidebar - Seller Info & Actions */}
          <div className="space-y-3 md:sticky md:top-24 self-start">
            {/* Seller Profile */}
            <SellerProfileCard sellerId={listing.user_id} bn={bn} />

            {/* Contact */}
            <Card className="border-border/50">
              <CardContent className="p-4 space-y-2.5">
                {!showPhone ? (
                  <Button
                    className="w-full gap-2"
                    onClick={() => {
                      if (!user) {
                        navigate("/login");
                        toast.info(bn ? "ফোন নম্বর দেখতে লগইন করুন" : "Please login to see phone number");
                        return;
                      }
                      if (!listing.hide_phone) setShowPhone(true);
                      else toast.info(bn ? "বিক্রেতা ফোন নম্বর লুকিয়ে রেখেছেন" : "Seller has hidden phone number");
                    }}
                  >
                    <Phone className="h-4 w-4" />
                    <span>{bn ? "নাম্বার দেখুন" : "Show Phone Number"}</span>
                  </Button>
                ) : (
                  <a href={`tel:${listing.phone}`} className="block w-full">
                    <Button className="w-full gap-2">
                      <Phone className="h-4 w-4" />
                      <span className="font-mono font-semibold">{listing.phone}</span>
                    </Button>
                  </a>
                )}
                <Button
                  className="w-full gap-2"
                  variant="outline"
                  disabled={startConversation.isPending}
                  onClick={handleChatClick}
                >
                  {startConversation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <MessageCircle className="h-4 w-4" />
                  )}
                  {bn ? "মেসেজ দিন" : "Send Message"}
                </Button>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 gap-1.5 text-sm"
                disabled={favoriteLoading}
                onClick={handleToggleFavorite}
              >
                <Heart className={`h-4 w-4 ${isFavorite ? "fill-red-500 text-red-500" : ""}`} />
                {isFavorite ? (bn ? "সংরক্ষিত" : "Saved") : (bn ? "সংরক্ষণ" : "Save")}
              </Button>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="flex-1 gap-1.5 text-sm">
                    <Share2 className="h-4 w-4" />{bn ? "শেয়ার" : "Share"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-52 p-1.5" align="end">
                  <div className="space-y-0.5">
                    <button
                      onClick={() => {
                        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`, "_blank");
                      }}
                      className="flex items-center gap-3 w-full px-2.5 py-2 text-sm rounded-md hover:bg-muted transition-colors"
                    >
                      <Facebook className="h-4 w-4 text-blue-600" />
                      <span>Facebook</span>
                    </button>
                    <button
                      onClick={() => {
                        window.open(`https://wa.me/?text=${encodeURIComponent(listing.title + " - ৳" + listing.price.toLocaleString("bn-BD") + " " + window.location.href)}`, "_blank");
                      }}
                      className="flex items-center gap-3 w-full px-2.5 py-2 text-sm rounded-md hover:bg-muted transition-colors"
                    >
                      <MessageCircle className="h-4 w-4 text-green-600" />
                      <span>WhatsApp</span>
                    </button>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(window.location.href);
                        toast.success(bn ? "লিংক কপি হয়েছে" : "Link copied");
                      }}
                      className="flex items-center gap-3 w-full px-2.5 py-2 text-sm rounded-md hover:bg-muted transition-colors"
                    >
                      <Link2 className="h-4 w-4 text-muted-foreground" />
                      <span>{bn ? "লিংক কপি" : "Copy Link"}</span>
                    </button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* Report */}
            <button
              className="w-full text-xs text-muted-foreground hover:text-destructive flex items-center justify-center gap-1.5 py-1 transition-colors"
              onClick={() => {
                if (!user) {
                  navigate("/login");
                  return;
                }
                if (user.id === listing.user_id) {
                  toast.info(bn ? "নিজের বিজ্ঞাপন রিপোর্ট করা যায় না" : "Cannot report own ad");
                  return;
                }
                setReportOpen(true);
              }}
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              {bn ? "রিপোর্ট করুন" : "Report this ad"}
            </button>
          </div>
        </div>

        {/* Related Ads Section */}
        <RelatedAds categoryId={(listing.deal_categories as any)?.id} currentId={listing.id} bn={bn} />
      </div>

      {activeConversationId && (
        <DealChatModal
          open={chatOpen}
          onOpenChange={setChatOpen}
          conversation_id={activeConversationId}
          listingTitle={listing.title}
          sellerId={listing.user_id}
        />
      )}
      <DealReportModal
        open={reportOpen}
        onOpenChange={setReportOpen}
        listingId={listing.id}
        listingTitle={listing.title}
        bn={bn}
      />
      <Footer />
    </div>
  );
};

export default DealAdDetail;
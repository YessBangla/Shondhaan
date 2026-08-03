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

  if (isLoading) return <Card className="border-border/50"><CardContent className="p-4"><Skeleton className="h-16 w-full" /></CardContent></Card>;

  const memberDate = sellerData?.memberSince
    ? new Date(sellerData.memberSince).toLocaleDateString("bn-BD", { year: "numeric", month: "short" })
    : "";

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.1 }}>
      <Card className="border-border/50 overflow-hidden hover:shadow-md transition-shadow">
        <div className="h-2 bg-gradient-to-r from-primary via-primary/70 to-primary/40" />
        <CardContent className="p-5">
          <div className="flex items-center gap-3 mb-4">
            {sellerData?.avatar ? (
              <img src={sellerData.avatar} alt="" className="h-14 w-14 rounded-full object-cover border-2 border-primary/20 flex-shrink-0" />
            ) : (
              <div className="h-14 w-14 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 border-2 border-primary/20 flex items-center justify-center flex-shrink-0">
                <User className="h-7 w-7 text-primary" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="font-bold text-foreground truncate text-sm leading-tight">{sellerData?.name}</p>
              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                <CalendarDays className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{bn ? "সদস্য" : "Member since"} {memberDate}</span>
              </div>
            </div>
          </div>

          {/* Verification Badges */}
          <div className="flex flex-wrap gap-1.5 mb-4">
            <Badge variant="outline" className={`text-[9px] gap-1 px-2 py-0.5 ${sellerData?.hasPhone ? "border-green-300 text-green-700 bg-green-50 dark:bg-green-950/20 dark:text-green-400 dark:border-green-800" : "border-border text-muted-foreground"}`}>
              {sellerData?.hasPhone ? <CheckCircle2 className="h-3 w-3" /> : <Phone className="h-3 w-3" />}
              {bn ? "ফোন" : "Phone"}
            </Badge>
            <Badge variant="outline" className="text-[9px] gap-1 px-2 py-0.5 border-green-300 text-green-700 bg-green-50 dark:bg-green-950/20 dark:text-green-400 dark:border-green-800">
              <CheckCircle2 className="h-3 w-3" />
              {bn ? "ইমেইল" : "Email"}
            </Badge>
            {sellerData?.hasName && (
              <Badge variant="outline" className="text-[9px] gap-1 px-2 py-0.5 border-blue-300 text-blue-700 bg-blue-50 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-800">
                <BadgeCheck className="h-3 w-3" />
                {bn ? "সম্পূর্ণ" : "Complete"}
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 mb-4">
            <div className="rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 p-3 text-center border border-primary/10">
              <p className="text-lg font-bold text-primary">{sellerData?.totalAds}</p>
              <p className="text-[10px] text-muted-foreground font-medium">{bn ? "বিজ্ঞাপন" : "Ads"}</p>
            </div>
            <div className="rounded-lg bg-gradient-to-br from-amber-50 to-amber-50/50 p-3 text-center border border-amber-100 dark:from-amber-950/20 dark:to-amber-950/10 dark:border-amber-800">
              <div className="flex items-center justify-center gap-0.5">
                <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                <span className="text-lg font-bold text-foreground">—</span>
              </div>
              <p className="text-[10px] text-muted-foreground font-medium">{bn ? "রেটিং" : "Rating"}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" className="w-full text-xs font-medium hover:bg-primary/5" onClick={() => navigate(`/deal/seller/${sellerId}`)}>
            {bn ? "প্রোফাইল দেখুন" : "View Profile"}
          </Button>
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
    <motion.div className="mt-12" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
      <h2 className="text-xl font-bold text-foreground mb-5 flex items-center gap-2">
        <Package className="h-5 w-5 text-primary" />
        {bn ? "সম্পর্কিত বিজ্ঞাপন" : "Related Ads"}
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {relatedAds.map((ad: any, idx) => {
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
            <motion.div
              key={ad.id}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.05 }}
              whileHover={{ y: -4 }}
              className="cursor-pointer"
              onClick={() => navigate(`/deal/ad/${ad.id}`)}
            >
              <Card className="border-border/50 hover:shadow-lg transition-all overflow-hidden h-full flex flex-col">
                {/* Added relative and w-full to ensure the container has proper dimensions */}
                <div className="relative w-full aspect-square bg-muted overflow-hidden flex-shrink-0">
                  {/* Restored ListingImage component to handle image URLs correctly */}
                  <ListingImage src={img} alt={ad.title} fallbackSize="md" fit="cover" className="absolute inset-0 w-full h-full object-cover" />
                </div>
                <CardContent className="p-3 flex-1 flex flex-col justify-between">
                  <div>
                    <p className="text-sm font-bold text-primary">৳{ad.price > 0 ? Number(ad.price).toLocaleString("bn-BD") : (bn ? "আলোচনা" : "Negotiable")}</p>
                    <h3 className="text-xs text-foreground line-clamp-2 mt-1.5 leading-tight font-medium">{ad.title}</h3>
                  </div>
                  {ad.location_district && (
                    <p className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1 pt-2 border-t border-border/30">
                      <MapPin className="h-3 w-3 flex-shrink-0" />{ad.location_district}
                    </p>
                  )}
                </CardContent>
              </Card>
            </motion.div>
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
      navigate("/auth");
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
      navigate("/auth");
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
        <div className="pt-[44px] md:pt-[68px]" />
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
      <div className="pt-[44px] md:pt-[68px]" />
      <div className="app-container py-6 pb-28 md:pb-12">
        {/* Breadcrumb */}
        <motion.div className="flex items-center gap-2 text-xs text-muted-foreground mb-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <button onClick={() => navigate("/deal")} className="hover:text-primary transition-colors">{bn ? "ডিল" : "Deal"}</button>
          <ChevronRight className="h-3 w-3" />
          {cat && (
            <>
              <button onClick={() => navigate(`/deal/category/${cat.slug}`)} className="hover:text-primary transition-colors truncate flex items-center gap-1.5">
                <CategoryIcon icon={cat.icon} className="w-3 h-3" />
                <span className="truncate">{bn ? cat.name : (cat.name_en || cat.name)}</span>
              </button>
              <ChevronRight className="h-3 w-3" />
            </>
          )}
          <span className="text-foreground truncate font-medium">{listing.title}</span>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {/* Left - Images & Details */}
          <div className="md:col-span-2 space-y-6">
            {/* Image Gallery */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
              <div className="aspect-square md:aspect-video rounded-2xl overflow-hidden bg-gradient-to-br from-muted to-muted/50 mb-4 border border-border/50 shadow-sm hover:shadow-md transition-shadow">
                <ListingImage src={images[selectedImg]} alt={listing.title} fallbackSize="lg" fit="contain" />
              </div>
              {images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                  {images.map((img, i) => (
                    <motion.button
                      key={i}
                      onClick={() => setSelectedImg(i)}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className={`relative flex items-center justify-center w-20 h-20 rounded-lg overflow-hidden border-2 shrink-0 transition-all ${
                        i === selectedImg 
                          ? "border-primary shadow-md ring-2 ring-primary/30" 
                          : "border-border/30 hover:border-border/60"
                      }`}
                    >
                      <ListingImage src={img} alt="" fallbackSize="sm" fit="cover" className="absolute inset-0 w-full h-full object-cover" />
                    </motion.button>
                  ))}
                </div>
              )}
            </motion.div>

            {/* Title & Price */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.1 }}>
              <div className="flex items-start justify-between gap-3 mb-3">
                <h1 className="text-2xl md:text-3xl font-bold text-foreground leading-tight">{bn ? listing.title : (listing.title_en || listing.title)}</h1>
                {user && user.id === listing.user_id && (
                  <Button variant="outline" size="sm" className="shrink-0 gap-1.5" onClick={() => navigate(`/deal/edit/${listing.id}`)}>
                    <Pencil className="h-4 w-4" /> {bn ? "সম্পাদনা" : "Edit"}
                  </Button>
                )}
              </div>
              <div className="flex items-baseline gap-3 mb-4">
                <p className="text-3xl md:text-4xl font-bold text-primary">
                  ৳{listing.price > 0 ? Number(listing.price).toLocaleString("bn-BD") : (bn ? "আলোচনা" : "Negotiable")}
                </p>
                {listing.is_negotiable && (
                  <Badge variant="outline" className="text-xs font-medium border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/20 dark:text-amber-400">
                    {bn ? "দরদাম যোগ্য" : "Negotiable"}
                  </Badge>
                )}
              </div>

              {/* Meta Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                <div className="rounded-lg bg-muted/50 p-3 border border-border/30">
                  <p className="text-xs text-muted-foreground font-medium mb-1">{bn ? "অবস্থান" : "Location"}</p>
                  <p className="text-sm font-semibold text-foreground flex items-center gap-1">
                    <MapPin className="h-4 w-4 text-primary flex-shrink-0" />
                    <span className="truncate">{listing.location_district || listing.location_division}</span>
                  </p>
                </div>
                <div className="rounded-lg bg-muted/50 p-3 border border-border/30">
                  <p className="text-xs text-muted-foreground font-medium mb-1">{bn ? "সময়" : "Posted"}</p>
                  <p className="text-sm font-semibold text-foreground flex items-center gap-1">
                    <Clock className="h-4 w-4 text-primary flex-shrink-0" />
                    {timeAgo(listing.created_at, bn)}
                  </p>
                </div>
                <div className="rounded-lg bg-muted/50 p-3 border border-border/30">
                  <p className="text-xs text-muted-foreground font-medium mb-1">{bn ? "দর্শন" : "Views"}</p>
                  <p className="text-sm font-semibold text-foreground flex items-center gap-1">
                    <Eye className="h-4 w-4 text-primary flex-shrink-0" />
                    {listing.views_count}
                  </p>
                </div>
                <div className="rounded-lg bg-muted/50 p-3 border border-border/30">
                  <p className="text-xs text-muted-foreground font-medium mb-1">{bn ? "অবস্থা" : "Condition"}</p>
                  <p className="text-sm font-semibold text-foreground flex items-center gap-1 capitalize">
                    <Package className="h-4 w-4 text-primary flex-shrink-0" />
                    {/* Updated to use product_condition based on JSON payload */}
                    {listing.product_condition === "new" ? (bn ? "নতুন" : "New") : listing.product_condition === "used" ? (bn ? "ব্যবহৃত" : "Used") : listing.product_condition}
                  </p>
                </div>
              </div>
            </motion.div>

            <Separator className="my-2" />

            {/* Description */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.15 }}>
              <h2 className="font-bold text-lg text-foreground mb-3">{bn ? "বিবরণ" : "Description"}</h2>
              <p className="text-muted-foreground text-sm leading-relaxed whitespace-pre-line bg-muted/30 rounded-lg p-4 border border-border/30">
                {listing.description || (bn ? "কোনো বিবরণ প্রদান করা হয়নি" : "No description provided")}
              </p>
            </motion.div>

            <Separator className="my-2" />

            {/* Safety Tips */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.2 }}>
              <Card className="border-amber-200/50 bg-gradient-to-br from-amber-50 to-amber-50/50 dark:from-amber-950/20 dark:to-amber-950/10 dark:border-amber-800/50">
                <CardContent className="p-4">
                  <h3 className="font-bold text-foreground flex items-center gap-2 text-sm mb-3">
                    <Shield className="h-4 w-4 text-amber-600 dark:text-amber-400" />{bn ? "নিরাপত্তা টিপস" : "Safety Tips"}
                  </h3>
                  <ul className="text-xs text-muted-foreground space-y-2">
                    <li className="flex gap-2">
                      <span className="text-primary font-bold flex-shrink-0">•</span>
                      <span>{bn ? "পণ্য হাতে পেয়ে দাম পরিশোধ করুন" : "Pay only after inspecting the product"}</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-primary font-bold flex-shrink-0">•</span>
                      <span>{bn ? "অনলাইনে আগাম টাকা পাঠাবেন না" : "Never send money in advance online"}</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-primary font-bold flex-shrink-0">•</span>
                      <span>{bn ? "নিরাপদ জায়গায় দেখা করুন" : "Meet in a safe, public place"}</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-primary font-bold flex-shrink-0">•</span>
                      <span>{bn ? "সন্দেহজনক বিজ্ঞাপন রিপোর্ট করুন" : "Report suspicious ads immediately"}</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Right Sidebar - Seller Info & Actions */}
          <div className="space-y-4">
            {/* Seller Profile */}
            <SellerProfileCard sellerId={listing.user_id} bn={bn} />

            {/* Contact */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.12 }}>
              <Card className="border-border/50 hover:shadow-md transition-shadow">
                <CardContent className="p-5 space-y-3">
                  <h3 className="font-bold text-foreground text-sm">{bn ? "যোগাযোগ করুন" : "Contact Seller"}</h3>

                  {!showPhone ? (
                    <Button
                      className="w-full gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                      onClick={() => {
                        if (!user) {
                          navigate("/auth");
                          toast.info(bn ? "ফোন নম্বর দেখতে লগইন করুন" : "Please login to see phone number");
                          return;
                        }
                        if (!listing.hide_phone) setShowPhone(true);
                        else toast.info(bn ? "বিক্রেতা ফোন নম্বর লুকিয়ে রেখেছেন" : "Seller has hidden phone number");
                      }}
                    >
                      <Phone className="h-4 w-4" />
                      <span>{bn ? "ফোন দেখুন" : "Show Phone"}</span>
                    </Button>
                  ) : (
                    <a href={`tel:${listing.phone}`} className="block w-full">
                      <Button className="w-full gap-2 bg-green-600 hover:bg-green-700 text-white">
                        <Phone className="h-4 w-4" />
                        <span className="font-mono font-semibold">{listing.phone}</span>
                      </Button>
                    </a>
                  )}

                  <Button
                    className="w-full gap-2 border-primary text-primary hover:bg-primary/10"
                    variant="outline"
                    disabled={startConversation.isPending}
                    onClick={handleChatClick}
                  >
                    {startConversation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <MessageCircle className="h-4 w-4" />
                    )}
                    {bn ? "চ্যাট করুন" : "Send Message"}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>

            {/* Actions */}
            <motion.div className="flex gap-2" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.14 }}>
              <Button
                variant="outline"
                className="flex-1 gap-2 text-sm font-medium hover:bg-red-50 dark:hover:bg-red-950/20 hover:border-red-200 dark:hover:border-red-800"
                disabled={favoriteLoading}
                onClick={handleToggleFavorite}
              >
                <Heart className={`h-4 w-4 ${isFavorite ? "fill-red-500 text-red-500" : ""}`} />
                {isFavorite ? (bn ? "সংরক্ষিত" : "Saved") : (bn ? "সংরক্ষণ" : "Save")}
              </Button>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="flex-1 gap-2 text-sm font-medium">
                    <Share2 className="h-4 w-4" />{bn ? "শেয়ার" : "Share"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-2" align="end">
                  <div className="space-y-1">
                    <button
                      onClick={() => {
                        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`, "_blank");
                      }}
                      className="flex items-center gap-3 w-full px-3 py-2.5 text-sm rounded-lg hover:bg-muted transition-colors"
                    >
                      <Facebook className="h-4 w-4 text-blue-600" />
                      <span className="font-medium">Facebook</span>
                    </button>
                    <button
                      onClick={() => {
                        window.open(`https://wa.me/?text=${encodeURIComponent(listing.title + " - ৳" + listing.price.toLocaleString("bn-BD") + " " + window.location.href)}`, "_blank");
                      }}
                      className="flex items-center gap-3 w-full px-3 py-2.5 text-sm rounded-lg hover:bg-muted transition-colors"
                    >
                      <MessageCircle className="h-4 w-4 text-green-600" />
                      <span className="font-medium">WhatsApp</span>
                    </button>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(window.location.href);
                        toast.success(bn ? "লিংক কপি হয়েছে" : "Link copied");
                      }}
                      className="flex items-center gap-3 w-full px-3 py-2.5 text-sm rounded-lg hover:bg-muted transition-colors"
                    >
                      <Link2 className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{bn ? "লিংক কপি" : "Copy Link"}</span>
                    </button>
                  </div>
                </PopoverContent>
              </Popover>
            </motion.div>

            {/* Report */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.16 }}>
              <Button
                variant="ghost"
                className="w-full text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 gap-1.5 font-medium"
                onClick={() => {
                  if (!user) {
                    navigate("/auth");
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
                {bn ? "রিপোর্ট করুন" : "Report Ad"}
              </Button>
            </motion.div>
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
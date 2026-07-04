import { useState, useEffect } from "react";
import ListingImage from "@/components/deal/ListingImage";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ChevronLeft, MapPin, Clock, Eye, Phone, MessageCircle, Heart, Share2, Shield, ChevronRight, AlertTriangle, Tag, Pencil, User, Star, CalendarDays, Package, Facebook, Link2, CheckCircle2, BadgeCheck } from "lucide-react";
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
import { useSEO } from "@/hooks/useSEO";

function timeAgo(dateStr: string, bn = true) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return bn ? `${mins} মিনিট আগে` : `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return bn ? `${hours} ঘণ্টা আগে` : `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return bn ? `${days} দিন আগে` : `${days}d ago`;
}

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
    <Card className="border-border/50 overflow-hidden">
      <div className="h-1.5 bg-gradient-to-r from-primary via-primary/70 to-primary/40" />
      <CardContent className="p-4">
        <div className="flex items-center gap-3 mb-3">
          {sellerData?.avatar ? (
            <img src={sellerData.avatar} alt="" className="h-12 w-12 rounded-full object-cover border-2 border-primary/20" />
          ) : (
            <div className="h-12 w-12 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center">
              <User className="h-6 w-6 text-primary" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="font-bold text-foreground truncate text-sm">{sellerData?.name}</p>
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-0.5">
              <CalendarDays className="h-3 w-3" />
              {bn ? "সদস্য" : "Member since"} {memberDate}
            </div>
          </div>
        </div>

        {/* Verification Badges */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          <Badge variant="outline" className={`text-[10px] gap-1 ${sellerData?.hasPhone ? "border-green-300 text-green-700 bg-green-50 dark:bg-green-950/20 dark:text-green-400 dark:border-green-800" : "border-border text-muted-foreground"}`}>
            {sellerData?.hasPhone ? <CheckCircle2 className="h-3 w-3" /> : <Phone className="h-3 w-3" />}
            {bn ? "ফোন" : "Phone"} {sellerData?.hasPhone ? "✓" : "✗"}
          </Badge>
          <Badge variant="outline" className="text-[10px] gap-1 border-green-300 text-green-700 bg-green-50 dark:bg-green-950/20 dark:text-green-400 dark:border-green-800">
            <CheckCircle2 className="h-3 w-3" />
            {bn ? "ইমেইল ভেরিফাইড" : "Email Verified"}
          </Badge>
          {sellerData?.hasName && (
            <Badge variant="outline" className="text-[10px] gap-1 border-blue-300 text-blue-700 bg-blue-50 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-800">
              <BadgeCheck className="h-3 w-3" />
              {bn ? "প্রোফাইল সম্পন্ন" : "Profile Complete"}
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-muted/50 p-2 text-center">
            <p className="text-lg font-bold text-primary">{sellerData?.totalAds}</p>
            <p className="text-[10px] text-muted-foreground">{bn ? "সক্রিয় বিজ্ঞাপন" : "Active Ads"}</p>
          </div>
          <div className="rounded-lg bg-muted/50 p-2 text-center">
            <div className="flex items-center justify-center gap-0.5">
              <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
              <span className="text-lg font-bold text-foreground">—</span>
            </div>
            <p className="text-[10px] text-muted-foreground">{bn ? "রেটিং" : "Rating"}</p>
          </div>
        </div>
        <Button variant="outline" size="sm" className="w-full mt-3 text-xs" onClick={() => navigate(`/deal/seller/${sellerId}`)}>
          {bn ? "সেলারের প্রোফাইল দেখুন" : "View Seller Profile"}
        </Button>
      </CardContent>
    </Card>
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
    <div className="mt-8">
      <h2 className="text-lg font-bold text-foreground mb-4">{bn ? "সম্পর্কিত বিজ্ঞাপন" : "Related Ads"}</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {relatedAds.map((ad: any) => {
          const img = ad.images?.[0];
          return (
            <motion.div key={ad.id} whileHover={{ y: -2 }} className="cursor-pointer" onClick={() => navigate(`/deal/ad/${ad.id}`)}>
              <Card className="border-border/50 hover:shadow-md transition-all overflow-hidden">
                <div className="aspect-[4/3] bg-muted overflow-hidden">
                  <ListingImage src={img} alt={ad.title} fallbackSize="md" />
                </div>
                <CardContent className="p-2.5">
                  <p className="text-sm font-bold text-primary">৳{ad.price > 0 ? ad.price.toLocaleString("bn-BD") : (bn ? "আলোচনা" : "Negotiable")}</p>
                  <h3 className="text-xs text-foreground line-clamp-2 mt-0.5">{ad.title}</h3>
                  {ad.location_district && <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-0.5"><MapPin className="h-2.5 w-2.5" />{ad.location_district}</p>}
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
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
  const [reportOpen, setReportOpen] = useState(false);
  const { data: listing, isLoading } = useDealListing(id || "");

  const adImage = listing?.images?.[0];
  const adDesc = listing
    ? bn
      ? `${listing.title} — ৳${listing.price.toLocaleString("bn-BD")}। ইয়েস ডিলে দেখুন। নিরাপদ কেনাবেচা।`
      : `${listing.title} — ৳${listing.price.toLocaleString()}. View on Yess Deal. Safe trading.`
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
      <div className="pt-[44px] md:pt-[68px]" />
        <div className="max-w-4xl mx-auto px-4 py-6">
          <Skeleton className="h-80 rounded-xl mb-4" />
          <Skeleton className="h-8 w-3/4 mb-2" />
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
        <div className="max-w-4xl mx-auto px-4 py-20 text-center">
          <p className="text-4xl mb-3">😔</p>
          <p className="text-muted-foreground">{bn ? "বিজ্ঞাপনটি পাওয়া যায়নি" : "Ad not found"}</p>
          <Button onClick={() => navigate("/deal")} className="mt-4">{bn ? "ফিরে যান" : "Go Back"}</Button>
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
      <div className="max-w-5xl mx-auto px-4 py-4 pb-28 md:pb-10">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
          <button onClick={() => navigate("/deal")} className="hover:text-primary">{bn ? "ইয়েস ডিল" : "Yess Deal"}</button>
          <ChevronRight className="h-3 w-3" />
          {cat && (
            <>
              <button onClick={() => navigate(`/deal/category/${cat.slug}`)} className="hover:text-primary">{bn ? cat.name : (cat.name_en || cat.name)}</button>
              <ChevronRight className="h-3 w-3" />
            </>
          )}
          <span className="text-foreground truncate">{listing.title}</span>
        </div>

        <div className="flex flex-col md:flex-row gap-6">
          {/* Left - Images & Details */}
          <div className="flex-1">
            {/* Image Gallery */}
            <div className="mb-4">
              <div className="aspect-[4/3] rounded-xl overflow-hidden bg-muted mb-2">
                <ListingImage src={images[selectedImg]} alt={listing.title} fallbackSize="lg" fit="contain" />
              </div>
              {images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto">
                  {images.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedImg(i)}
                      className={`w-16 h-16 rounded-lg overflow-hidden border-2 shrink-0 ${i === selectedImg ? "border-primary" : "border-transparent"}`}
                    >
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Title & Price */}
            <div className="flex items-start justify-between gap-2">
              <h1 className="text-xl md:text-2xl font-bold text-foreground">{bn ? listing.title : (listing.title_en || listing.title)}</h1>
              {user && user.id === listing.user_id && (
                <Button variant="outline" size="sm" className="shrink-0 gap-1.5" onClick={() => navigate(`/deal/edit/${listing.id}`)}>
                  <Pencil className="h-3.5 w-3.5" /> {bn ? "সম্পাদনা" : "Edit"}
                </Button>
              )}
            </div>
            <p className="text-2xl md:text-3xl font-bold text-primary mt-2">
              ৳{listing.price > 0 ? listing.price.toLocaleString("bn-BD") : "আলোচনা সাপেক্ষ"}
              {listing.is_negotiable && <Badge variant="outline" className="ml-2 text-xs">{bn ? "দরদাম যোগ্য" : "Negotiable"}</Badge>}
            </p>

            {/* Meta */}
            <div className="flex flex-wrap items-center gap-3 mt-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{[listing.location_area, listing.location_district, listing.location_division].filter(Boolean).join(", ")}</span>
              <span className="flex items-center gap-1"><Clock className="h-4 w-4" />{timeAgo(listing.created_at, bn)}</span>
              <span className="flex items-center gap-1"><Eye className="h-4 w-4" />{listing.views_count} {bn ? "বার দেখা হয়েছে" : "views"}</span>
              <span className="flex items-center gap-1"><Tag className="h-4 w-4" />{listing.condition === "নতুন" ? (bn ? "নতুন" : "New") : listing.condition === "ব্যবহৃত" ? (bn ? "ব্যবহৃত" : "Used") : listing.condition}</span>
            </div>

            <Separator className="my-4" />

            {/* Description */}
            <h2 className="font-bold text-foreground mb-2">{bn ? "বিবরণ" : "Description"}</h2>
            <p className="text-muted-foreground text-sm whitespace-pre-line leading-relaxed">{listing.description || (bn ? "কোনো বিবরণ দেওয়া হয়নি" : "No description provided")}</p>

            <Separator className="my-4" />

            {/* Safety Tips */}
            <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
              <CardContent className="p-4">
                <h3 className="font-bold text-foreground flex items-center gap-2 text-sm mb-2">
                  <Shield className="h-4 w-4 text-amber-600" />{bn ? "নিরাপত্তা টিপস" : "Safety Tips"}
                </h3>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• {bn ? "পণ্য হাতে পেয়ে দাম পরিশোধ করুন" : "Pay only after inspecting the product"}</li>
                  <li>• {bn ? "অনলাইনে আগাম টাকা পাঠাবেন না" : "Never send money in advance online"}</li>
                  <li>• {bn ? "নিরাপদ জায়গায় দেখা করুন" : "Meet in a safe, public place"}</li>
                  <li>• {bn ? "সন্দেহজনক বিজ্ঞাপন রিপোর্ট করুন" : "Report suspicious ads"}</li>
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Right Sidebar - Seller Info & Actions */}
          <div className="w-full md:w-72 shrink-0 space-y-4">
            {/* Seller Profile */}
            <SellerProfileCard sellerId={listing.user_id} bn={bn} />

            {/* Contact */}
            <Card className="border-border/50">
              <CardContent className="p-4 space-y-3">
                <h3 className="font-bold text-foreground">{bn ? "বিক্রেতার সাথে যোগাযোগ" : "Contact Seller"}</h3>

                {!showPhone ? (
                  <Button className="w-full gap-2" onClick={() => {
                    if (!user) { navigate("/auth"); toast.info(bn ? "ফোন নম্বর দেখতে লগইন করুন" : "Please login to see phone number"); return; }
                    if (!listing.hide_phone) setShowPhone(true);
                    else toast.info(bn ? "বিক্রেতা ফোন নম্বর লুকিয়ে রেখেছেন" : "Seller has hidden phone number");
                  }}>
                    <Phone className="h-4 w-4" />{bn ? "ফোন নম্বর দেখুন" : "Show Phone Number"}
                  </Button>
                ) : (
                  <a href={`tel:${listing.phone}`} className="block w-full">
                    <Button className="w-full gap-2 bg-green-600 hover:bg-green-700">
                      <Phone className="h-4 w-4" />{listing.phone}
                    </Button>
                  </a>
                )}

                <Button variant="outline" className="w-full gap-2" onClick={() => {
                  if (!user) { navigate("/auth"); return; }
                  if (user.id === listing.user_id) { toast.info(bn ? "এটি আপনার নিজের বিজ্ঞাপন" : "This is your own ad"); return; }
                  setChatOpen(true);
                }}>
                  <MessageCircle className="h-4 w-4" />{bn ? "চ্যাট করুন" : "Chat"}
                </Button>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 gap-1 text-xs" onClick={() => toast.success(bn ? "পছন্দে যোগ করা হয়েছে" : "Added to favorites")}>
                <Heart className="h-4 w-4" />{bn ? "পছন্দ" : "Save"}
              </Button>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="flex-1 gap-1 text-xs">
                    <Share2 className="h-4 w-4" />{bn ? "শেয়ার" : "Share"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-48 p-2" align="end">
                  <div className="space-y-1">
                    <button onClick={() => { window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`, "_blank"); }} className="flex items-center gap-2 w-full px-3 py-2 text-sm rounded-md hover:bg-muted transition-colors">
                      <Facebook className="h-4 w-4 text-blue-600" /> Facebook
                    </button>
                    <button onClick={() => { window.open(`https://wa.me/?text=${encodeURIComponent(listing.title + " - ৳" + listing.price.toLocaleString("bn-BD") + " " + window.location.href)}`, "_blank"); }} className="flex items-center gap-2 w-full px-3 py-2 text-sm rounded-md hover:bg-muted transition-colors">
                      <MessageCircle className="h-4 w-4 text-green-600" /> WhatsApp
                    </button>
                    <button onClick={() => { navigator.clipboard.writeText(window.location.href); toast.success(bn ? "লিংক কপি হয়েছে" : "Link copied"); }} className="flex items-center gap-2 w-full px-3 py-2 text-sm rounded-md hover:bg-muted transition-colors">
                      <Link2 className="h-4 w-4 text-muted-foreground" /> {bn ? "লিংক কপি" : "Copy Link"}
                    </button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* Report */}
            <Button variant="ghost" className="w-full text-xs text-muted-foreground gap-1" onClick={() => {
              if (!user) { navigate("/auth"); return; }
              if (user.id === listing.user_id) { toast.info(bn ? "নিজের বিজ্ঞাপন রিপোর্ট করা যায় না" : "Cannot report own ad"); return; }
              setReportOpen(true);
            }}>
              <AlertTriangle className="h-3 w-3" />{bn ? "এই বিজ্ঞাপন রিপোর্ট করুন" : "Report this ad"}
            </Button>
          </div>
        </div>

        {/* Related Ads Section */}
        <RelatedAds categoryId={(listing.deal_categories as any)?.id} currentId={listing.id} bn={bn} />
      </div>

      <DealChatModal
        open={chatOpen}
        onOpenChange={setChatOpen}
        listingId={listing.id}
        listingTitle={listing.title}
        sellerId={listing.user_id}
      />
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

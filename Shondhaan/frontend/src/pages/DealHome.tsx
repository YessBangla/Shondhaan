import React, { useState } from "react";
import ListingImage from "@/components/deal/ListingImage";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronRight,
  Eye,
  Clock,
  Star,
  Plus,
  MessageCircle,
  MapPin,
  Package,
  LayoutGrid,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  useDealCategoryTree,
  useFeaturedDeals,
  useLatestDeals,
  DealListing,
  DealCategory,
} from "@/hooks/useDealData";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BackToHomeButton from "@/components/BackToHomeButton";
import DealSearchBox from "@/components/deal/DealSearchBox";
import DealLocationSelector from "@/components/deal/DealLocationSelector";
import { Skeleton } from "@/components/ui/skeleton";
import PullToRefreshIndicator from "@/components/PullToRefreshIndicator";
import PlatformSwitcher from "@/components/mart/PlatformSwitcher";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { useQueryClient } from "@tanstack/react-query";
import yessDealLogo from "@/assets/yess-deal-logo.png";
import { useSEO } from "@/hooks/useSEO";

const DEAL_API_BASE_URL = (
  import.meta.env.VITE_DEAL_API_BASE_URL || "VITE_DEAL_API_BASE_URL"
).replace(/\/+$/, "");

const getDealImageUrl = (url?: string | null) => {
  const value = String(url || "").trim();

  if (!value) return "";

  if (
    value.startsWith("http://") ||
    value.startsWith("https://") ||
    value.startsWith("data:") ||
    value.startsWith("blob:")
  ) {
    return value;
  }

  return `${DEAL_API_BASE_URL}${value.startsWith("/") ? value : `/${value}`}`;
};

// ✅ Helper function to check if the icon is a URL or an emoji
const isUrl = (str?: string | null) => {
  if (!str) return false;
  return str.startsWith("http://") || str.startsWith("https://");
};

function timeAgo(dateStr: string, bn = true) {
  const date = new Date(dateStr).getTime();

  if (!date || Number.isNaN(date)) {
    return bn ? "এইমাত্র" : "Just now";
  }

  const diff = Date.now() - date;
  const mins = Math.floor(diff / 60000);

  if (mins < 1) return bn ? "এইমাত্র" : "Just now";
  if (mins < 60) return bn ? `${mins} মিনিট আগে` : `${mins}m ago`;

  const hours = Math.floor(mins / 60);

  if (hours < 24) return bn ? `${hours} ঘণ্টা আগে` : `${hours}h ago`;

  const days = Math.floor(hours / 24);

  return bn ? `${days} দিন আগে` : `${days}d ago`;
}

const DealCard = React.forwardRef<
  HTMLDivElement,
  {
    listing: DealListing;
    onClick: () => void;
    bn?: boolean;
  }
>(({ listing, onClick, bn = true }, ref) => {
  const img = getDealImageUrl(listing.images?.[0]);

  return (
    <motion.div
      ref={ref}
      whileHover={{ y: -4 }}
      className="cursor-pointer"
      onClick={onClick}
    >
      <Card className="border-blue-100/60 hover:border-emerald-400/50 hover:shadow-xl hover:shadow-emerald-500/10 transition-all duration-300 overflow-hidden h-full bg-white">
        <div className="relative">
          <div className="relative aspect-[4/3] bg-gradient-to-br from-blue-50 to-emerald-50 overflow-hidden">
            <ListingImage src={img} alt={listing.title} fallbackSize="lg" />
          </div>

          {listing.is_featured && (
            <div className="absolute top-0 left-0 z-10">
              <div className="bg-gradient-to-r from-blue-600 to-emerald-500 text-white text-[9px] font-bold px-3 py-0.5 rounded-br-lg rounded-tl-lg flex items-center gap-0.5 shadow-sm">
                <Star className="h-2.5 w-2.5 fill-white" />
                {bn ? "প্রমোটেড" : "PROMOTED"}
              </div>
            </div>
          )}

          {listing.is_negotiable && (
            <Badge
              variant="outline"
              className="absolute top-2 right-2 bg-white/90 text-blue-700 border-blue-200 text-[10px] backdrop-blur-sm"
            >
              {bn ? "দরদাম" : "Negotiable"}
            </Badge>
          )}
        </div>

        <CardContent className="p-3">
          <p className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-emerald-500">
            ৳
            {listing.price > 0
              ? listing.price.toLocaleString("bn-BD")
              : bn
                ? "আলোচনা সাপেক্ষ"
                : "Negotiable"}
          </p>

          <h3 className="text-sm font-medium text-foreground line-clamp-2 mt-1">
            {bn ? listing.title : listing.title_en || listing.title}
          </h3>

          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3 text-blue-500" />
            <span className="truncate">
              {listing.location_area ||
                listing.location_district ||
                listing.location_division ||
                ""}
            </span>
          </div>

          <div className="flex items-center justify-between mt-2 text-[10px] text-muted-foreground border-t border-blue-50/50 pt-2">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3 text-emerald-500" />
              {timeAgo(listing.created_at, bn)}
            </span>

            <span className="flex items-center gap-1">
              <Eye className="h-3 w-3 text-blue-500" />
              {listing.views_count || 0}
            </span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
});

DealCard.displayName = "DealCard";

const DealHome = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const bn = language === "bn";

  const [searchTerm, setSearchTerm] = useState("");

  const [locationFilter, setLocationFilter] = useState({
    division: "",
    district: "",
    thana: "",
  });

  const [hoveredCat, setHoveredCat] = useState<string | null>(null);

  const queryClient = useQueryClient();

  const { pull, refreshing } = usePullToRefresh(async () => {
    await queryClient.invalidateQueries();
  });

  useSEO({
    title: bn
      ? "ডিল — কেনাবেচার সেরা প্ল্যাটফর্ম"
      : "Deal — Buy & Sell Platform",
    description: bn
      ? "ডিলে নতুন ও পুরাতন পণ্য কেনাবেচা করুন — মোবাইল, যানবাহন, প্রপার্টি, ফার্নিচার এবং আরও অনেক কিছু।"
      : "Buy & sell new and used items on Deal — mobiles, vehicles, properties, furniture & more.",
    canonical: "/deal",
    keywords: bn
      ? "কেনাবেচা, বিক্রয়, ক্লাসিফাইড বাংলাদেশ, ডিল"
      : "buy sell bangladesh, classifieds, deal",
  });

  const { data: categoryTree, isLoading: catLoading } = useDealCategoryTree();
  const { data: featured, isLoading: featLoading } = useFeaturedDeals();
  const { data: latest, isLoading: latestLoading } = useLatestDeals();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();

    if (!searchTerm.trim()) {
      navigate("/deal/ads");
      return;
    }

    const params = new URLSearchParams();
    params.set("search", searchTerm.trim());

    if (locationFilter.division) params.set("division", locationFilter.division);
    if (locationFilter.district) params.set("district", locationFilter.district);
    if (locationFilter.thana) params.set("thana", locationFilter.thana);

    navigate(`/deal/ads?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50/40 via-background to-emerald-50/30">
      <PullToRefreshIndicator pull={pull} refreshing={refreshing} />
      <Navbar />
      <PlatformSwitcher className="md:hidden" exclude={["deal"]} />
      <div className="mt-6 text-center py-5 flex gap-3 justify-center flex-wrap">
        <Button
          size="lg"
          onClick={() => navigate("/deal/post")}
          className="rounded-xl text-base font-bold gap-2 px-8 bg-gradient-to-r from-blue-600 to-emerald-500 text-white shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-emerald-500/30 hover:opacity-90 transition-all"
        >
          <Plus className="h-5 w-5" />
          {bn ? "ফ্রি বিজ্ঞাপন দিন" : "Post Free Ad"}
        </Button>

        <Button
          size="lg"
          variant="outline"
          onClick={() => navigate("/deal/my-ads")}
          className="rounded-xl text-base font-bold gap-2 px-8 border-blue-200 text-blue-700 hover:bg-primary hover:border-blue-300 transition-colors"
        >
          <Package className="h-5 w-5" />
          {bn ? "আমার বিজ্ঞাপন" : "My Ads"}
        </Button>

        <Button
          size="lg"
          variant="outline"
          onClick={() => navigate("/deal/inbox")}
          className="rounded-xl text-base font-bold gap-2 px-8 border-emerald-200 text-emerald-700 hover:bg-emerald-700 hover:border-emerald-300 transition-colors"
        >
          <MessageCircle className="h-5 w-5" />
          {bn ? "ইনবক্স" : "Inbox"}
        </Button>
        <Button
          size="lg"
          onClick={() => navigate("/deal/ads")}
          className="rounded-xl text-sm md:text-base bg-white text-primary border border-blue-900/40 font-bold gap-2 px-6 md:px-8 hover:text-white hover:opacity-90 transition-all"
        >
          <LayoutGrid className="h-5 w-5" />
          {bn ? "সকল বিজ্ঞাপন দেখুন" : "View All Ads"}
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="bg-gradient-to-b from-blue-100/50 via-emerald-50/30 to-background pt-[44px] pb-8 md:pt-[68px] md:pb-12 border-b border-blue-100/50">
        <div className="app-container text-center">
          <p className="text-blue-900/70 mb-6 text-xl font-bold tracking-wide">
            {bn
              ? "বাংলাদেশের সবচেয়ে বিশ্বস্ত কেনাবেচার প্ল্যাটফর্ম"
              : "Bangladesh's Most Trusted Buy & Sell Platform"}
          </p>

          <div className="mx-12 mb-4">
            <DealLocationSelector
              value={locationFilter}
              onChange={setLocationFilter}
            />
          </div>
        </div>
      </div>

      <div className="app-container py-8 pb-28 md:py-10 md:pb-12">
        <h2 className="text-lg font-bold mb-5 flex items-center gap-2 text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-emerald-500">
          {bn ? "ক্যাটাগরি অনুযায়ী ব্রাউজ করুন" : "Browse by Category"}
        </h2>

        {catLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-10">
            {Array(14)
              .fill(0)
              .map((_, index) => (
                <Skeleton key={index} className="h-20 rounded-xl bg-blue-50/50" />
              ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-10">
            {categoryTree?.map((cat) => (
              <div
                key={cat.id}
                className="relative"
                onMouseEnter={() => setHoveredCat(cat.id)}
                onMouseLeave={() => setHoveredCat(null)}
              >
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => navigate(`/deal/category/${cat.slug}`)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl border border-blue-100/60 bg-white hover:border-emerald-400/50 hover:shadow-md hover:shadow-blue-500/10 transition-all text-left"
                >
                  {/* ✅ FIXED: Render Image if URL, else render Emoji */}
                  <span className="w-10 h-10 flex items-center justify-center p-1.5 rounded-md bg-gradient-to-br from-blue-50 to-emerald-50 overflow-hidden shrink-0">
                    {cat.icon && isUrl(cat.icon) ? (
                      <img 
                        src={cat.icon} 
                        alt={cat.name} 
                        className="w-full h-full object-cover rounded" 
                      />
                    ) : (
                      <span className="text-xl leading-none">{cat.icon || "📦"}</span>
                    )}
                  </span>

                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-semibold text-foreground block truncate">
                      {bn ? cat.name : cat.name_en || cat.name}
                    </span>

                    {cat.children && cat.children.length > 0 && (
                      <span className="text-[10px] text-blue-500/80 font-medium">
                        {cat.children.length}{" "}
                        {bn ? "টি সাব-ক্যাটাগরি" : "subcategories"}
                      </span>
                    )}
                  </div>

                  {cat.children && cat.children.length > 0 && (
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                </motion.button>

                <AnimatePresence>
                  {hoveredCat === cat.id &&
                    cat.children &&
                    cat.children.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.15 }}
                        className="absolute left-0 right-0 top-full z-30 mt-1 bg-white border border-blue-100/80 rounded-xl shadow-xl shadow-blue-500/10 p-2 max-h-64 overflow-y-auto"
                      >
                        {cat.children.map((sub: DealCategory) => (
                          <button
                            key={sub.id}
                            onClick={() => navigate(`/deal/category/${sub.slug}`)}
                            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-blue-50 hover:text-blue-700 transition-colors text-left"
                          >
                            {/* ✅ FIXED: Render Image if URL, else render Emoji for Subcategories */}
                            <span className="w-6 h-6 flex items-center justify-center overflow-hidden shrink-0">
                              {sub.icon && isUrl(sub.icon) ? (
                                <img 
                                  src={sub.icon} 
                                  alt={sub.name} 
                                  className="w-full h-full object-cover rounded" 
                                />
                              ) : (
                                <span className="text-base leading-none">{sub.icon || "📦"}</span>
                              )}
                            </span>

                            <span>
                              {bn ? sub.name : sub.name_en || sub.name}
                            </span>
                          </button>
                        ))}
                        <button
                          onClick={() => navigate(`/deal/category/${cat.slug}`)}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-emerald-600 font-medium hover:bg-emerald-50 transition-colors mt-1 border-t border-blue-50/50 pt-2"
                        >
                          {bn
                            ? `সকল ${cat.name} দেখুন`
                            : `View all ${cat.name_en || cat.name}`}
                          <ChevronRight className="h-3 w-3" />
                        </button>
                      </motion.div>
                    )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        )}

        {(featLoading || (featured?.length || 0) > 0) && (
          <div className="mb-12">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <span className="bg-gradient-to-br from-blue-500 to-emerald-500 p-1.5 rounded-lg text-white shadow-sm">
                  <Star className="h-5 w-5 fill-white" />
                </span>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-emerald-500">
                  {bn ? "ফিচার্ড বিজ্ঞাপন" : "Featured Ads"}
                </span>
              </h2>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/deal/ads?featured=1")}
                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
              >
                {bn ? "সবগুলো দেখুন" : "View All"}
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            {featLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {Array(4)
                  .fill(0)
                  .map((_, index) => (
                    <Skeleton key={index} className="h-64 rounded-xl bg-blue-50/50" />
                  ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {featured?.map((listing) => (
                  <div key={listing.id} className="relative group">
                    <div className="absolute -inset-[1.5px] rounded-xl bg-gradient-to-br from-blue-500 via-cyan-400 to-emerald-500 opacity-60 group-hover:opacity-100 transition-opacity z-0" />
                    <div className="relative z-10 rounded-[11px] overflow-hidden bg-white">
                      <DealCard
                        listing={listing}
                        onClick={() => navigate(`/deal/ad/${listing.id}`)}
                        bn={bn}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-emerald-500">
            {bn ? "সর্বশেষ বিজ্ঞাপন" : "Latest Ads"}
          </h2>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/deal/ads")}
            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
          >
            {bn ? "সবগুলো দেখুন" : "View All"}
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {latestLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {Array(8)
              .fill(0)
              .map((_, index) => (
                <Skeleton key={index} className="h-64 rounded-xl bg-blue-50/50" />
              ))}
          </div>
        ) : (latest?.length || 0) > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {latest?.map((listing) => (
              <DealCard
                key={listing.id}
                listing={listing}
                onClick={() => navigate(`/deal/ad/${listing.id}`)}
                bn={bn}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-blue-100/60 bg-white p-8 text-center text-muted-foreground">
            {bn ? "এখনও কোনো বিজ্ঞাপন নেই" : "No ads yet"}
          </div>
        )}
      </div>

      <Footer />
      <BackToHomeButton />
    </div>
  );
};

export default DealHome;
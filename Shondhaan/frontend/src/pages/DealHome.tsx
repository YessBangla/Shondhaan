import React, { useState } from "react";
import ListingImage from "@/components/deal/ListingImage";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronRight,
  ChevronUp,
  Eye,
  Clock,
  Star,
  Plus,
  MessageCircle,
  MapPin,
  Package,
  LayoutGrid,
  Search,
  ChevronDown,
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

// Category Card Component (Extracted for reusability)
const CategoryCardItem = ({
  cat,
  bn,
  isHovered,
  onHover,
  onLeave,
  onCategoryClick,
  onNavigate,
}: {
  cat: DealCategory;
  bn: boolean;
  isHovered: boolean;
  onHover: () => void;
  onLeave: () => void;
  onCategoryClick: () => void;
  onNavigate: (slug: string) => void;
}) => {
  return (
    <div
      className="relative group"
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
    >
      {/* Animated gradient border glow */}
      <div className="absolute -inset-0.5 bg-gradient-to-br from-blue-500/20 via-cyan-400/20 to-emerald-500/20 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-sm" />
      
      <motion.button
        whileHover={{ y: -2 }}
        whileTap={{ scale: 0.98 }}
        onClick={onCategoryClick}
        className="relative w-full h-full flex flex-col items-center justify-center gap-2 p-1 md:p-2 rounded-2xl bg-gradient-to-br from-white to-blue-50/40 border border-blue-100/40 backdrop-blur-sm hover:border-emerald-300/60 hover:from-white hover:to-emerald-50/40 transition-all duration-300 shadow-sm hover:shadow-xl hover:shadow-emerald-500/15 text-center overflow-hidden"
      >
        {/* Premium icon container */}
        <span className="relative w-7 h-8 md:w-8 md:h-8 flex items-center justify-center rounded-md bg-gradient-to-br from-blue-100/80 to-emerald-100/80 group-hover:from-blue-500 group-hover:to-emerald-500 transition-all duration-300 overflow-hidden shadow-md group-hover:shadow-lg">
          {/* Subtle inner shine on hover */}
          <span className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          

          {cat.icon && isUrl(cat.icon) ? (
            <img 
              src={cat.icon} 
              alt={cat.name} 
              className="w-5 h-5 md:w-5 md:h-5 object-cover group-hover:scale-110 transition-transform duration-300" 
            />
          ) : (
            <span className="text-sm md:text-base leading-none group-hover:scale-110 transition-transform duration-300">
              {cat.icon || "📦"}
            </span>
          )}
        </span>

        {/* Category text */}
        <div className="flex-1 min-w-0 flex flex-col gap-1">
          <h3 className="text-xs md:text-sm font-bold text-foreground line-clamp-2 leading-tight group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-blue-600 group-hover:to-emerald-500 transition-all duration-300">
            {bn ? cat.name : cat.name_en || cat.name}
          </h3>

          {cat.children && cat.children.length > 0 && (
            <p className="text-[9px] md:text-[10px] text-emerald-600/80 font-bold bg-emerald-100/50 px-2 py-0.5 rounded-full inline-block backdrop-blur-sm">
              {cat.children.length}
            </p>
          )}
        </div>
      </motion.button>

      {/* Premium Dropdown Menu */}
      <AnimatePresence>
        {isHovered &&
          cat.children &&
          cat.children.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -12, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.92 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="absolute left-1/2 -translate-x-1/2 top-full z-50 mt-3 w-72 bg-white/95 backdrop-blur-xl border border-blue-200/60 rounded-2xl shadow-2xl shadow-blue-500/20 p-4 max-h-96 overflow-y-auto"
            >
              {/* Gradient top accent */}
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-300 to-transparent" />
              
              <div className="space-y-1.5">
                {cat.children.map((sub: DealCategory, idx: number) => (
                  <motion.button
                    key={sub.id}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.04, ease: "easeOut" }}
                    onClick={() => onNavigate(sub.slug)}
                    className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm text-foreground/80 hover:text-foreground hover:bg-gradient-to-r hover:from-blue-50/80 hover:to-emerald-50/80 transition-all duration-200 text-left group/sub border border-transparent hover:border-blue-200/40"
                  >
                    <span className="w-6 h-6 flex items-center justify-center flex-shrink-0 text-lg group-hover/sub:scale-125 transition-transform duration-200">
                      {sub.icon && isUrl(sub.icon) ? (
                        <img 
                          src={sub.icon} 
                          alt={sub.name} 
                          className="w-full h-full object-cover rounded" 
                        />
                      ) : (
                        <span>{sub.icon || "📦"}</span>
                      )}
                    </span>

                    <span className="font-semibold flex-1 text-sm">
                      {bn ? sub.name : sub.name_en || sub.name}
                    </span>
                    
                    <ChevronRight className="h-4 w-4 text-emerald-500 opacity-0 group-hover/sub:opacity-100 group-hover/sub:translate-x-1 transition-all duration-200" />
                  </motion.button>
                ))}
              </div>

              {/* View All button */}
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.15 }}
                onClick={() => onNavigate(cat.slug)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold bg-gradient-to-r from-blue-500/10 to-emerald-500/10 text-transparent bg-clip-text hover:from-blue-500/20 hover:to-emerald-500/20 transition-all duration-200 mt-3 border border-blue-200/40 hover:border-emerald-300/60 group/view"
              >
                {bn
                  ? `সকল ${cat.name}`
                  : `View all ${cat.name_en || cat.name}`}
                <ChevronRight className="h-4 w-4 text-emerald-500 group-hover/view:translate-x-2 transition-transform" />
              </motion.button>
            </motion.div>
          )}
      </AnimatePresence>
    </div>
  );
};

const DealHome = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const bn = language === "bn";

  const [searchTerm, setSearchTerm] = useState("");
  const [expandedCategories, setExpandedCategories] = useState(false);
  const [hoveredCat, setHoveredCat] = useState<string | null>(null);

  const [locationFilter, setLocationFilter] = useState({
    division: "",
    district: "",
    thana: "",
  });

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

  // Calculate how many categories to show per row
  const categoriesPerRow = {
    mobile: 2,
    tablet: 4,
    desktop: 9,
  };

  // Get all visible categories (first row or all if expanded)
  const visibleCategories = expandedCategories 
    ? categoryTree 
    : categoryTree?.slice(0, categoriesPerRow.desktop);

  const hasMoreCategories = (categoryTree?.length || 0) > categoriesPerRow.desktop;
  const [bgImage, setBgImage] = useState<string>(
    "/deal/hero_deal.png"
  );
  return (
    <div className="bg-[aliceblue]">
      <PullToRefreshIndicator pull={pull} refreshing={refreshing} />
      <Navbar />
      <PlatformSwitcher className="md:hidden" exclude={["deal"]} />

      <div className="bg-gradient-to-b from-blue-100/50 mb-4 via-emerald-50/30 to-background pt-[12px] md:pt-[18px] border-b border-blue-100/50">
        {/* <div className="app-container text-center"> */}
          {/* <p className="text-blue-900/70 text-xl font-bold tracking-wide">
            {bn
              ? "বাংলাদেশের সবচেয়ে বিশ্বস্ত কেনাবেচার প্ল্যাটফর্ম"
              : "Bangladesh's Most Trusted Buy & Sell Platform"}
          </p> */}

          <div className="">
            
         
            <DealLocationSelector
              value={locationFilter}
              onChange={setLocationFilter}
              bgImage={bgImage} // from DealHome's state
            />
          </div>
        {/* </div> */}
      </div>

      <div className="app-container py-6 pb-28 md:py-2 md:pb-10">
        {/*PREMIUM CATEGORY SECTION WITH EXPAND FUNCTIONALITY */}
        <div className="mb-12">
          {/* Premium Header */}
          <div className="mb-8">
            <div className="flex items-baseline gap-4 mb-2">
              <h2 className="text-xl md:text-2xl font-bold tracking-tight">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-cyan-500 to-emerald-500">
                  {bn ? "ক্যাটাগরি অনুযায়ী ব্রাউজ করুন" : "Browse by Category"}
                </span>
              </h2>
              <div className="h-1 w-16 bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full" />
            </div>
            <p className="text-sm text-muted-foreground">
              {bn ? "আপনার পছন্দের পণ্য খুঁজে বের করুন" : "Explore what you're looking for"}
            </p>
          </div>

          {catLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-9 gap-2 md:gap-2">
              {Array(9)
                .fill(0)
                .map((_, index) => (
                  <Skeleton key={index} className="h-24 rounded-2xl bg-gradient-to-br from-blue-100/50 to-emerald-100/50" />
                ))}
            </div>
          ) : (
            <div>
              {/* Categories Grid */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={expandedCategories ? "expanded" : "collapsed"}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-9 gap-2 md:gap-2"
                >
                  {visibleCategories?.map((cat) => (
                    <motion.div
                      key={cat.id}
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.2 }}
                    >
                      <CategoryCardItem
                        cat={cat}
                        bn={bn}
                        isHovered={hoveredCat === cat.id}
                        onHover={() => setHoveredCat(cat.id)}
                        onLeave={() => setHoveredCat(null)}
                        onCategoryClick={() => navigate(`/deal/category/${cat.slug}`)}
                        onNavigate={(slug) => navigate(`/deal/category/${slug}`)}
                      />
                    </motion.div>
                  ))}
                </motion.div>
              </AnimatePresence>

              {/* See More / See Less Button */}
              {hasMoreCategories && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="flex justify-center mt-8"
                >
                  <Button
                    onClick={() => setExpandedCategories(!expandedCategories)}
                    className="rounded-xl font-bold gap-2 px-8 py-3 bg-gradient-to-r from-blue-600 to-emerald-500 text-white shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-emerald-500/30 hover:opacity-90 transition-all"
                  >
                    {expandedCategories ? (
                      <>
                        {bn ? "সব লুকান" : "See Less"}
                        <ChevronUp className="h-5 w-5" />
                      </>
                    ) : (
                      <>
                        {bn ? "আরো দেখুন" : "See More"}
                        <ChevronDown className="h-5 w-5" />
                      </>
                    )}
                  </Button>
                </motion.div>
              )}

              {/* Category Count Badge */}
              {expandedCategories && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="flex justify-center mt-6"
                >
                  <p className="text-sm text-muted-foreground">
                    {bn 
                      ? `${categoryTree?.length} টি ক্যাটাগরি দেখাচ্ছি` 
                      : `Showing ${categoryTree?.length} categories`}
                  </p>
                </motion.div>
              )}
            </div>
          )}
        </div>

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
      <div className="app-container flex justify-center mb-10">
        <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/deal/ads?featured=1")}
            className="bg-primary px-4 w-auto text-white hover:bg-gradient-to-r from-blue-600 to-emerald-500"
            >
          {bn ? "সকল বিজ্ঞাপন দেখুন" : "View All"}
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      <Footer />
      {/* <BackToHomeButton /> */}
    </div>
  );
};

export default DealHome;
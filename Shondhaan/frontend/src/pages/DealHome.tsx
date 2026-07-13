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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
  import.meta.env.VITE_DEAL_API_BASE_URL || "http://localhost:4000"
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
      whileHover={{ y: -2 }}
      className="cursor-pointer"
      onClick={onClick}
    >
      <Card className="border-border/50 hover:shadow-lg transition-all overflow-hidden h-full">
        <div className="relative">
          <div className="relative aspect-[4/3] bg-muted overflow-hidden">
            <ListingImage src={img} alt={listing.title} fallbackSize="lg" />
          </div>

          {listing.is_featured && (
            <div className="absolute top-0 left-0 z-10">
              <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[9px] font-bold px-3 py-0.5 rounded-br-lg rounded-tl-lg flex items-center gap-0.5 shadow-sm">
                <Star className="h-2.5 w-2.5 fill-white" />
                {bn ? "প্রমোটেড" : "PROMOTED"}
              </div>
            </div>
          )}

          {listing.is_negotiable && (
            <Badge
              variant="outline"
              className="absolute top-2 right-2 bg-background/80 text-[10px]"
            >
              {bn ? "দরদাম" : "Negotiable"}
            </Badge>
          )}
        </div>

        <CardContent className="p-3">
          <p className="text-lg font-bold text-primary">
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
            <MapPin className="h-3 w-3" />
            <span className="truncate">
              {listing.location_area ||
                listing.location_district ||
                listing.location_division ||
                ""}
            </span>
          </div>

          <div className="flex items-center justify-between mt-2 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {timeAgo(listing.created_at, bn)}
            </span>

            <span className="flex items-center gap-1">
              <Eye className="h-3 w-3" />
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
      ? "ইয়েস ডিল — কেনাবেচার সেরা প্ল্যাটফর্ম"
      : "Yess Deal — Buy & Sell Platform",
    description: bn
      ? "ইয়েস ডিলে নতুন ও পুরাতন পণ্য কেনাবেচা করুন — মোবাইল, যানবাহন, প্রপার্টি, ফার্নিচার এবং আরও অনেক কিছু।"
      : "Buy & sell new and used items on Yess Deal — mobiles, vehicles, properties, furniture & more.",
    canonical: "/deal",
    keywords: bn
      ? "কেনাবেচা, বিক্রয়, ক্লাসিফাইড বাংলাদেশ, ইয়েস ডিল"
      : "buy sell bangladesh, classifieds, yess deal",
  });

  const { data: categoryTree, isLoading: catLoading } = useDealCategoryTree();
  const { data: featured, isLoading: featLoading } = useFeaturedDeals();
  const { data: latest, isLoading: latestLoading } = useLatestDeals();

  return (
    <div className="min-h-screen bg-background">
      <PullToRefreshIndicator pull={pull} refreshing={refreshing} />

      <Navbar />

      <PlatformSwitcher className="md:hidden" exclude={["deal"]} />

      <div className="bg-gradient-to-b from-primary/10 to-background pt-[44px] pb-5 md:pt-[68px] md:pb-10">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h1 className="mb-2 flex items-center justify-center">
            <img
              src={yessDealLogo}
              alt="Yess Deal"
              className="h-10 md:h-14 w-auto drop-shadow-md"
            />
          </h1>

          <p className="text-muted-foreground mb-6 text-sm">
            {bn
              ? "বাংলাদেশের সবচেয়ে বিশ্বস্ত কেনাবেচার প্ল্যাটফর্ম"
              : "Bangladesh's Most Trusted Buy & Sell Platform"}
          </p>

          <div className="flex items-center justify-center gap-2 mb-4">
            <DealLocationSelector
              value={locationFilter}
              onChange={setLocationFilter}
            />
          </div>

          <DealSearchBox
            location={locationFilter.division || "all"}
            className="max-w-xl mx-auto"
          />

          <div className="mt-4 flex justify-center">
            <Button
              size="lg"
              onClick={() => navigate("/deal/ads")}
              className="rounded-xl text-sm md:text-base font-bold gap-2 px-6 md:px-8 shadow-md hover:shadow-lg"
            >
              <LayoutGrid className="h-5 w-5" />
              {bn ? "সকল বিজ্ঞাপন দেখুন" : "View All Ads"}
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 pb-28 md:pb-10">
        <h2 className="text-lg font-bold text-foreground mb-4">
          {bn ? "ক্যাটাগরি অনুযায়ী ব্রাউজ করুন" : "Browse by Category"}
        </h2>

        {catLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-8">
            {Array(14)
              .fill(0)
              .map((_, index) => (
                <Skeleton key={index} className="h-20 rounded-xl" />
              ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-8">
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
                  className="w-full flex items-center gap-3 p-3 rounded-xl border border-border/50 bg-card hover:shadow-md hover:border-primary/30 transition-all text-left"
                >
                  <span className="text-2xl">{cat.icon || "📦"}</span>

                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-semibold text-foreground block truncate">
                      {bn ? cat.name : cat.name_en || cat.name}
                    </span>

                    {cat.children && cat.children.length > 0 && (
                      <span className="text-[10px] text-muted-foreground">
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
                        className="absolute left-0 right-0 top-full z-30 mt-1 bg-card border border-border/60 rounded-xl shadow-xl p-2 max-h-64 overflow-y-auto"
                      >
                        {cat.children.map((sub: DealCategory) => (
                          <button
                            key={sub.id}
                            onClick={() =>
                              navigate(`/deal/category/${sub.slug}`)
                            }
                            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors text-left"
                          >
                            <span className="text-base">
                              {sub.icon || "📦"}
                            </span>

                            <span>
                              {bn ? sub.name : sub.name_en || sub.name}
                            </span>
                          </button>
                        ))}

                        <button
                          onClick={() => navigate(`/deal/category/${cat.slug}`)}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-primary font-medium hover:bg-primary/10 transition-colors mt-1 border-t border-border/30 pt-2"
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
          <div className="mb-10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <span className="bg-amber-500/10 p-1.5 rounded-lg">
                  <Star className="h-5 w-5 text-amber-500 fill-amber-500" />
                </span>
                {bn ? "ফিচার্ড বিজ্ঞাপন" : "Featured Ads"}
              </h2>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/deal/ads?featured=1")}
                className="text-primary"
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
                    <Skeleton key={index} className="h-64 rounded-xl" />
                  ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {featured?.map((listing) => (
                  <div key={listing.id} className="relative">
                    <div className="absolute -inset-[1px] rounded-xl bg-gradient-to-br from-amber-400 via-amber-500 to-orange-500 opacity-60 z-0" />
                    <div className="relative z-10">
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

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-foreground">
            {bn ? "সর্বশেষ বিজ্ঞাপন" : "Latest Ads"}
          </h2>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/deal/ads")}
            className="text-primary"
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
                <Skeleton key={index} className="h-64 rounded-xl" />
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
          <div className="rounded-xl border border-border/50 bg-card p-8 text-center text-muted-foreground">
            {bn ? "এখনও কোনো বিজ্ঞাপন নেই" : "No ads yet"}
          </div>
        )}

        <div className="mt-8 text-center flex gap-3 justify-center flex-wrap">
          <Button
            size="lg"
            onClick={() => navigate("/deal/post")}
            className="rounded-xl text-base font-bold gap-2 px-8"
          >
            <Plus className="h-5 w-5" />
            {bn ? "ফ্রি বিজ্ঞাপন দিন" : "Post Free Ad"}
          </Button>

          <Button
            size="lg"
            variant="outline"
            onClick={() => navigate("/deal/my-ads")}
            className="rounded-xl text-base font-bold gap-2 px-8"
          >
            <Package className="h-5 w-5" />
            {bn ? "আমার বিজ্ঞাপন" : "My Ads"}
          </Button>

          <Button
            size="lg"
            variant="outline"
            onClick={() => navigate("/deal/inbox")}
            className="rounded-xl text-base font-bold gap-2 px-8"
          >
            <MessageCircle className="h-5 w-5" />
            {bn ? "ইনবক্স" : "Inbox"}
          </Button>
        </div>
      </div>

      <Footer />
      <BackToHomeButton />
    </div>
  );
};

export default DealHome;
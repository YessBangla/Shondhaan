import { useEffect, useState } from "react";
import ListingImage from "@/components/deal/ListingImage";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Search,
  MapPin,
  Filter,
  Eye,
  Clock,
  Star,
  Grid,
  List,
  SlidersHorizontal,
  Home as HomeIcon,
  ChevronRight,
  Heart,
  X,
  Image as ImageIcon,
  Phone,
  Tag,
  BadgeCheck,
  Truck,
  RefreshCw,
  Building2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import {
  useDealCategoryTree,
  useDealListings,
  DealListing,
} from "@/hooks/useDealData";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BackToHomeButton from "@/components/BackToHomeButton";
import DealLocationSelector from "@/components/deal/DealLocationSelector";
import { Skeleton } from "@/components/ui/skeleton";
import { useSEO } from "@/hooks/useSEO";
import { toast } from "sonner";
import {
  addDealFavorite,
  getDealAuthUserId,
  listDealFavorites,
  removeDealFavorite,
} from "@/lib/dealFavoriteApi";

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

const getConditionLabel = (condition?: string | null, bn = true) => {
  if (!condition) return "";

  const value = String(condition).toLowerCase();

  if (value === "new") return bn ? "নতুন" : "New";
  if (value === "used") return bn ? "ব্যবহৃত" : "Used";
  if (value === "reconditioned") return bn ? "রিকন্ডিশনড" : "Reconditioned";

  return condition;
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

const DealAllAds = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { user } = useAuth();
  const bn = language === "bn";

  const [search, setSearch] = useState(searchParams.get("q") || "");

  const [locationFilter, setLocationFilter] = useState({
    division: searchParams.get("div") || "",
    district: "",
    thana: "",
  });

  const [condition, setCondition] = useState("all");
  const [sortBy, setSortBy] = useState("newest");

  const [priceRange, setPriceRange] = useState<[number, number]>([
    0,
    10000000,
  ]);

  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const featuredOnly = searchParams.get("featured") === "1";

  const [selectedCats, setSelectedCats] = useState<string[]>([]);
  const [withImageOnly, setWithImageOnly] = useState(false);
  const [withPhoneOnly, setWithPhoneOnly] = useState(false);
  const [negotiableOnly, setNegotiableOnly] = useState(false);
  const [promotedOnly, setPromotedOnly] = useState(featuredOnly);
  const [urgentOnly, setUrgentOnly] = useState(false);
  const [memberOnly, setMemberOnly] = useState(false);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [postedWithin, setPostedWithin] = useState<string>("any");
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [favoriteLoadingId, setFavoriteLoadingId] = useState<string | null>(null);

  const PAGE_SIZE = 20;

  useSEO({
    title: bn ? "সকল বিজ্ঞাপন — ডিল" : "All Ads — Deal",
    description: bn
      ? "বাংলাদেশের সকল বিভাগ ও জেলা থেকে নতুন ও পুরাতন পণ্যের বিজ্ঞাপন দেখুন।"
      : "Browse all classified ads from every division & district in Bangladesh.",
    canonical: "/deal/ads",
  });

  const { data: categoryTree } = useDealCategoryTree();

  const { data: listings, isLoading } = useDealListings({
    search,
    division: locationFilter.division || undefined,
    district: locationFilter.district || undefined,
    thana: locationFilter.thana || undefined,
    condition: condition !== "all" ? condition : undefined,
    minPrice: priceRange[0] > 0 ? priceRange[0] : undefined,
    maxPrice: priceRange[1] < 10000000 ? priceRange[1] : undefined,
    sortBy:
      sortBy === "price_asc" || sortBy === "price_desc" ? sortBy : undefined,
  });

  useEffect(() => {
    const userId = getDealAuthUserId(user);

    if (!userId) {
      setFavoriteIds(new Set());
      return;
    }

    listDealFavorites(userId)
      .then((items) => {
        setFavoriteIds(
          new Set(items.map((item: any) => String(item.listing_id)))
        );
      })
      .catch(() => setFavoriteIds(new Set()));
  }, [user]);

  const allCats =
    categoryTree?.flatMap((cat) => [cat, ...(cat.children || [])]) || [];

  const slugToId = new Map(allCats.map((cat) => [cat.slug, cat.id]));

  const selectedCatIds = selectedCats
    .map((slug) => slugToId.get(slug))
    .filter(Boolean) as string[];

  let visibleListings = listings ? [...listings] : [];

  if (promotedOnly) {
    visibleListings = visibleListings.filter((listing) => listing.is_featured);
  }

  if (selectedCatIds.length > 0) {
    visibleListings = visibleListings.filter(
      (listing) =>
        listing.category_id && selectedCatIds.includes(listing.category_id)
    );
  }

  if (withImageOnly) {
    visibleListings = visibleListings.filter(
      (listing) => (listing.images?.length || 0) > 0
    );
  }

  if (withPhoneOnly) {
    visibleListings = visibleListings.filter(
      (listing) => listing.phone && !listing.hide_phone
    );
  }

  if (negotiableOnly) {
    visibleListings = visibleListings.filter(
      (listing) => listing.is_negotiable
    );
  }

  if (postedWithin !== "any") {
    const now = Date.now();

    const ms =
      postedWithin === "24h"
        ? 86400000
        : postedWithin === "7d"
          ? 7 * 86400000
          : 30 * 86400000;

    visibleListings = visibleListings.filter(
      (listing) => now - new Date(listing.created_at).getTime() <= ms
    );
  }

  if (sortBy === "date_asc") {
    visibleListings.sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
  } else if (sortBy === "popular") {
    visibleListings.sort(
      (a, b) => (b.views_count || 0) - (a.views_count || 0)
    );
  }

  const totalCount = visibleListings.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);

  const pagedListings = visibleListings.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  useEffect(() => {
    setPage(1);
  }, [
    search,
    locationFilter,
    condition,
    priceRange,
    sortBy,
    selectedCats.join(","),
    withImageOnly,
    withPhoneOnly,
    negotiableOnly,
    promotedOnly,
    postedWithin,
  ]);

  const toggleCat = (slug: string) => {
    setSelectedCats((prev) =>
      prev.includes(slug)
        ? prev.filter((item) => item !== slug)
        : [...prev, slug]
    );
  };

  const handleToggleFavorite = async (listing: DealListing) => {
    const userId = getDealAuthUserId(user);

    if (!userId) {
      navigate("/auth");
      toast.info(bn ? "Please login to save ads" : "Please login to save ads");
      return;
    }

    if (String(listing.user_id) === String(userId)) {
      toast.info(bn ? "You cannot save your own ad" : "You cannot save your own ad");
      return;
    }

    const listingId = String(listing.id);
    const currentlyFavorite = favoriteIds.has(listingId);

    try {
      setFavoriteLoadingId(listingId);

      if (currentlyFavorite) {
        await removeDealFavorite(userId, listingId);
        setFavoriteIds((prev) => {
          const next = new Set(prev);
          next.delete(listingId);
          return next;
        });
        toast.success(bn ? "Removed from favorites" : "Removed from favorites");
      } else {
        await addDealFavorite(userId, listingId);
        setFavoriteIds((prev) => new Set(prev).add(listingId));
        toast.success(bn ? "Added to favorites" : "Added to favorites");
      }
    } catch (error: any) {
      toast.error(error?.message || "Could not update favorite");
    } finally {
      setFavoriteLoadingId(null);
    }
  };

  const activeFilterCount =
    (search ? 1 : 0) +
    (locationFilter.division ? 1 : 0) +
    (condition !== "all" ? 1 : 0) +
    (priceRange[0] > 0 || priceRange[1] < 10000000 ? 1 : 0) +
    selectedCats.length +
    (withImageOnly ? 1 : 0) +
    (withPhoneOnly ? 1 : 0) +
    (negotiableOnly ? 1 : 0) +
    (promotedOnly ? 1 : 0) +
    (urgentOnly ? 1 : 0) +
    (memberOnly ? 1 : 0) +
    (verifiedOnly ? 1 : 0) +
    (postedWithin !== "any" ? 1 : 0);

  const clearAllFilters = () => {
    setSearch("");
    setLocationFilter({ division: "", district: "", thana: "" });
    setCondition("all");
    setPriceRange([0, 10000000]);
    setSelectedCats([]);
    setWithImageOnly(false);
    setWithPhoneOnly(false);
    setNegotiableOnly(false);
    setPromotedOnly(false);
    setUrgentOnly(false);
    setMemberOnly(false);
    setVerifiedOnly(false);
    setPostedWithin("any");
  };

  const toggleExpand = (id: string) => {
    setExpandedCats((prev) => {
      const next = new Set(prev);

      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }

      return next;
    });
  };

  const CategoryTree = () => (
    <div className="space-y-0.5 max-h-[480px] overflow-y-auto pr-1 -mx-1">
      {categoryTree?.map((cat) => {
        const isOpen = expandedCats.has(cat.id);
        const checked = selectedCats.includes(cat.slug);
        const hasChildren = (cat.children?.length || 0) > 0;

        return (
          <div key={cat.id}>
            <div
              className={`flex items-center gap-1.5 px-1.5 py-1.5 rounded-md hover:bg-muted/70 transition-colors ${
                checked ? "bg-primary/10" : ""
              }`}
            >
              {hasChildren ? (
                <button
                  type="button"
                  onClick={() => toggleExpand(cat.id)}
                  className="h-5 w-5 flex items-center justify-center text-muted-foreground hover:text-foreground"
                  aria-label={isOpen ? "collapse" : "expand"}
                >
                  <ChevronRight
                    className={`h-3.5 w-3.5 transition-transform ${
                      isOpen ? "rotate-90" : ""
                    }`}
                  />
                </button>
              ) : (
                <span className="w-5" />
              )}

              <button
                type="button"
                onClick={() => toggleCat(cat.slug)}
                className="flex-1 flex items-center gap-2 text-left text-sm cursor-pointer min-w-0"
              >
                <span className="text-base shrink-0">{cat.icon}</span>

                <span
                  className={`flex-1 truncate ${
                    checked ? "font-semibold text-primary" : "text-foreground"
                  }`}
                >
                  {bn ? cat.name : cat.name_en || cat.name}
                </span>
              </button>
            </div>

            {hasChildren && isOpen && (
              <div className="ml-7 border-l border-border/60 pl-2 mt-0.5 mb-1 space-y-0.5">
                {cat.children!.map((child) => {
                  const childChecked = selectedCats.includes(child.slug);

                  return (
                    <button
                      type="button"
                      key={child.id}
                      onClick={() => toggleCat(child.slug)}
                      className={`w-full flex items-center gap-2 px-1.5 py-1 rounded-md text-left text-[13px] hover:bg-muted/70 transition-colors ${
                        childChecked
                          ? "bg-primary/10 font-semibold text-primary"
                          : "text-foreground"
                      }`}
                    >
                      <span className="shrink-0">{child.icon || "•"}</span>

                      <span className="truncate flex-1">
                        {bn ? child.name : child.name_en || child.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  const FilterPanel = () => (
    <div className="space-y-5">
      <div>
        <label className="text-sm font-medium text-foreground mb-2 block">
          {bn ? "লোকেশন" : "Location"}
        </label>

        <DealLocationSelector
          value={locationFilter}
          onChange={setLocationFilter}
        />
      </div>

      <div>
        <label className="text-sm font-medium text-foreground mb-2 block">
          {bn ? "অবস্থা" : "Condition"}
        </label>

        <Select value={condition} onValueChange={setCondition}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>

          <SelectContent>
            <SelectItem value="all">{bn ? "সকল" : "All"}</SelectItem>
            <SelectItem value="new">{bn ? "নতুন" : "New"}</SelectItem>
            <SelectItem value="used">{bn ? "ব্যবহৃত" : "Used"}</SelectItem>
            <SelectItem value="reconditioned">
              {bn ? "রিকন্ডিশনড" : "Reconditioned"}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <label className="text-sm font-medium text-foreground mb-2 block">
          {bn ? "মূল্য (৳)" : "Price (৳)"}
        </label>

        <div className="grid grid-cols-2 gap-2">
          <Input
            type="number"
            inputMode="numeric"
            placeholder={bn ? "সর্বনিম্ন" : "Min"}
            value={priceRange[0] || ""}
            onChange={(e) =>
              setPriceRange([Number(e.target.value) || 0, priceRange[1]])
            }
            className="h-9 text-sm"
          />

          <Input
            type="number"
            inputMode="numeric"
            placeholder={bn ? "সর্বোচ্চ" : "Max"}
            value={priceRange[1] === 10000000 ? "" : priceRange[1]}
            onChange={(e) =>
              setPriceRange([
                priceRange[0],
                Number(e.target.value) || 10000000,
              ])
            }
            className="h-9 text-sm"
          />
        </div>

        <Slider
          value={priceRange}
          onValueChange={(value) => setPriceRange(value as [number, number])}
          min={0}
          max={10000000}
          step={5000}
          className="mt-3"
        />

        <div className="flex flex-wrap gap-1.5 mt-2">
          {[
            { label: "<5K", value: [0, 5000] as [number, number] },
            { label: "5K-25K", value: [5000, 25000] as [number, number] },
            { label: "25K-1L", value: [25000, 100000] as [number, number] },
            { label: "1L-5L", value: [100000, 500000] as [number, number] },
            { label: "5L+", value: [500000, 10000000] as [number, number] },
          ].map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => setPriceRange(item.value)}
              className="text-[11px] px-2 py-0.5 rounded-full border border-border bg-background hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors"
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-sm font-medium text-foreground mb-2 block">
          {bn ? "পোস্ট করা হয়েছে" : "Posted within"}
        </label>

        <Select value={postedWithin} onValueChange={setPostedWithin}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>

          <SelectContent>
            <SelectItem value="any">
              {bn ? "যেকোনো সময়" : "Any time"}
            </SelectItem>
            <SelectItem value="24h">
              {bn ? "গত ২৪ ঘণ্টা" : "Last 24 hours"}
            </SelectItem>
            <SelectItem value="7d">
              {bn ? "গত ৭ দিন" : "Last 7 days"}
            </SelectItem>
            <SelectItem value="30d">
              {bn ? "গত ৩০ দিন" : "Last 30 days"}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2 pt-1">
        <label className="text-sm font-medium text-foreground mb-1 block">
          {bn ? "অতিরিক্ত ফিল্টার" : "More Filters"}
        </label>

        <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
          <Checkbox
            checked={withImageOnly}
            onCheckedChange={(value) => setWithImageOnly(!!value)}
          />
          <ImageIcon className="h-3.5 w-3.5 text-muted-foreground" />
          <span>{bn ? "শুধু ছবি সহ" : "With image only"}</span>
        </label>

        <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
          <Checkbox
            checked={withPhoneOnly}
            onCheckedChange={(value) => setWithPhoneOnly(!!value)}
          />
          <Phone className="h-3.5 w-3.5 text-muted-foreground" />
          <span>{bn ? "ফোন নম্বর সহ" : "With phone number"}</span>
        </label>

        <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
          <Checkbox
            checked={negotiableOnly}
            onCheckedChange={(value) => setNegotiableOnly(!!value)}
          />
          <Tag className="h-3.5 w-3.5 text-muted-foreground" />
          <span>{bn ? "দরদাম যোগ্য" : "Negotiable"}</span>
        </label>

        <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
          <Checkbox
            checked={promotedOnly}
            onCheckedChange={(value) => setPromotedOnly(!!value)}
          />
          <Star className="h-3.5 w-3.5 text-amber-500" />
          <span>{bn ? "প্রমোটেড বিজ্ঞাপন" : "Promoted ads"}</span>
        </label>

        <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
          <Checkbox
            checked={urgentOnly}
            onCheckedChange={(value) => setUrgentOnly(!!value)}
          />
          <RefreshCw className="h-3.5 w-3.5 text-rose-500" />
          <span>{bn ? "জরুরি বিক্রয়" : "Urgent sale"}</span>
        </label>
      </div>

      <div className="space-y-2 pt-1">
        <label className="text-sm font-medium text-foreground mb-1 block">
          {bn ? "বিক্রেতার ধরন" : "Seller Type"}
        </label>

        <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
          <Checkbox
            checked={memberOnly}
            onCheckedChange={(value) => setMemberOnly(!!value)}
          />
          <Building2 className="h-3.5 w-3.5 text-blue-500" />
          <span>{bn ? "শুধু মেম্বার" : "Members only"}</span>
        </label>

        <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
          <Checkbox
            checked={verifiedOnly}
            onCheckedChange={(value) => setVerifiedOnly(!!value)}
          />
          <BadgeCheck className="h-3.5 w-3.5 text-green-600" />
          <span>{bn ? "ভেরিফায়েড" : "Verified sellers"}</span>
        </label>
      </div>

      {activeFilterCount > 0 && (
        <Button
          variant="outline"
          size="sm"
          onClick={clearAllFilters}
          className="w-full gap-2"
        >
          <X className="h-3.5 w-3.5" />
          {bn
            ? `সকল ফিল্টার মুছুন (${activeFilterCount})`
            : `Clear all filters (${activeFilterCount})`}
        </Button>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-muted/30">
      <Navbar />

      <div className="pt-[44px] md:pt-[68px]" />

      <div className="bg-background border-b border-border/50">
        <div className="app-container py-3">
          <nav className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
            <button
              onClick={() => navigate("/")}
              className="hover:text-primary flex items-center gap-1"
            >
              <HomeIcon className="h-3 w-3" />
              {bn ? "হোম" : "Home"}
            </button>

            <ChevronRight className="h-3 w-3" />

            <button
              onClick={() => navigate("/deal")}
              className="hover:text-primary"
            >
              {bn ? "ডিল" : "Deal"}
            </button>

            <ChevronRight className="h-3 w-3" />

            <span className="text-foreground font-medium">
              {bn ? "বাংলাদেশের সকল বিজ্ঞাপন" : "All Ads in Bangladesh"}
            </span>
          </nav>

          <h1 className="text-xl md:text-2xl font-bold text-foreground">
            {bn ? "বাংলাদেশের সকল বিজ্ঞাপন" : "All Ads in Bangladesh"}
          </h1>

          <p className="text-xs text-muted-foreground mt-1">
            {visibleListings.length}{" "}
            {bn ? "টি বিজ্ঞাপন পাওয়া গেছে" : "ads found"}
          </p>
        </div>
      </div>

      <div className="app-container py-4 pb-28 md:pb-10">
        <div className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />

            <Input
              placeholder={
                bn
                  ? "বাংলাদেশের সকল বিজ্ঞাপনে খুঁজুন..."
                  : "Search all ads in Bangladesh..."
              }
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="pl-9 bg-background"
            />
          </div>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-40 bg-background">
              <SelectValue />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="newest">
                {bn ? "তারিখ: নতুন আগে" : "Date: Newest"}
              </SelectItem>
              <SelectItem value="date_asc">
                {bn ? "তারিখ: পুরাতন আগে" : "Date: Oldest"}
              </SelectItem>
              <SelectItem value="price_asc">
                {bn ? "কম মূল্য" : "Price ↑"}
              </SelectItem>
              <SelectItem value="price_desc">
                {bn ? "বেশি মূল্য" : "Price ↓"}
              </SelectItem>
              <SelectItem value="popular">
                {bn ? "জনপ্রিয়" : "Most Popular"}
              </SelectItem>
            </SelectContent>
          </Select>

          <div className="hidden md:flex gap-1">
            <Button
              variant={viewMode === "grid" ? "default" : "outline"}
              size="icon"
              onClick={() => setViewMode("grid")}
            >
              <Grid className="h-4 w-4" />
            </Button>

            <Button
              variant={viewMode === "list" ? "default" : "outline"}
              size="icon"
              onClick={() => setViewMode("list")}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>

          <Sheet>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="outline" size="icon">
                <SlidersHorizontal className="h-4 w-4" />
              </Button>
            </SheetTrigger>

            <SheetContent side="right" className="w-72">
              <SheetHeader>
                <SheetTitle>{bn ? "ফিল্টার" : "Filters"}</SheetTitle>
              </SheetHeader>

              <div className="mt-4">
                <FilterPanel />
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {activeFilterCount > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="text-xs font-medium text-muted-foreground">
              {bn ? "সক্রিয় ফিল্টার:" : "Active filters:"}
            </span>

            {locationFilter.division && (
              <Badge variant="secondary" className="gap-1">
                <MapPin className="h-3 w-3" />
                {locationFilter.division}
                <button
                  onClick={() =>
                    setLocationFilter({
                      division: "",
                      district: "",
                      thana: "",
                    })
                  }
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}

            {condition !== "all" && (
              <Badge variant="secondary" className="gap-1">
                {getConditionLabel(condition, bn)}
                <button onClick={() => setCondition("all")}>
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}

            {(priceRange[0] > 0 || priceRange[1] < 10000000) && (
              <Badge variant="secondary" className="gap-1">
                ৳{priceRange[0].toLocaleString("bn-BD")} – ৳
                {priceRange[1].toLocaleString("bn-BD")}
                <button onClick={() => setPriceRange([0, 10000000])}>
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}

            {selectedCats.map((slug) => {
              const cat = allCats.find((item) => item.slug === slug);

              return (
                <Badge key={slug} variant="secondary" className="gap-1">
                  {cat?.icon} {bn ? cat?.name : cat?.name_en || cat?.name}
                  <button onClick={() => toggleCat(slug)}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              );
            })}

            {withImageOnly && (
              <Badge variant="secondary" className="gap-1">
                {bn ? "ছবি সহ" : "With image"}
                <button onClick={() => setWithImageOnly(false)}>
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}

            {withPhoneOnly && (
              <Badge variant="secondary" className="gap-1">
                {bn ? "ফোন সহ" : "With phone"}
                <button onClick={() => setWithPhoneOnly(false)}>
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}

            {negotiableOnly && (
              <Badge variant="secondary" className="gap-1">
                {bn ? "দরদাম" : "Negotiable"}
                <button onClick={() => setNegotiableOnly(false)}>
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}

            {promotedOnly && (
              <Badge variant="secondary" className="gap-1">
                {bn ? "প্রমোটেড" : "Promoted"}
                <button onClick={() => setPromotedOnly(false)}>
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}

            <button
              onClick={clearAllFilters}
              className="text-xs text-primary hover:underline ml-1"
            >
              {bn ? "সব মুছুন" : "Clear all"}
            </button>
          </div>
        )}

        <div className="flex gap-5">
          <aside className="hidden md:block w-60 shrink-0 space-y-4">
            <Card className="border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-foreground text-sm uppercase tracking-wide">
                    {bn ? "ক্যাটাগরি" : "Categories"}
                  </h3>

                  {selectedCats.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedCats([])}
                      className="text-[11px] text-primary hover:underline"
                    >
                      {bn ? "মুছুন" : "Clear"}
                    </button>
                  )}
                </div>

                <CategoryTree />
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardContent className="p-4">
                <h3 className="font-bold text-foreground mb-3 text-sm uppercase tracking-wide flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  {bn ? "ফিল্টার" : "Filters"}
                </h3>

                <FilterPanel />
              </CardContent>
            </Card>

            <Card className="border-border/50 bg-primary/5">
              <CardContent className="p-4 text-xs text-muted-foreground space-y-2">
                <div className="flex items-start gap-2">
                  <BadgeCheck className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                  <span>
                    {bn
                      ? "শুধুমাত্র ভেরিফায়েড বিক্রেতাদের সাথে লেনদেন করুন।"
                      : "Deal only with verified sellers."}
                  </span>
                </div>

                <div className="flex items-start gap-2">
                  <Truck className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <span>
                    {bn
                      ? "পণ্য পরীক্ষা করে তবেই অর্থ প্রদান করুন।"
                      : "Inspect the item before paying."}
                  </span>
                </div>
              </CardContent>
            </Card>
          </aside>

          <main className="flex-1 min-w-0">
            {isLoading ? (
              <div
                className={
                  viewMode === "grid"
                    ? "grid grid-cols-2 lg:grid-cols-4 gap-3"
                    : "space-y-3"
                }
              >
                {Array(8)
                  .fill(0)
                  .map((_, index) => (
                    <Skeleton key={index} className="h-64 rounded-xl" />
                  ))}
              </div>
            ) : totalCount === 0 ? (
              <div className="text-center py-16 bg-background rounded-xl border border-border/50">
                <p className="text-4xl mb-3">📭</p>

                <p className="text-muted-foreground">
                  {bn ? "কোনো বিজ্ঞাপন পাওয়া যায়নি" : "No ads found"}
                </p>

                {activeFilterCount > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearAllFilters}
                    className="mt-4"
                  >
                    {bn ? "সকল ফিল্টার মুছুন" : "Clear all filters"}
                  </Button>
                )}
              </div>
            ) : viewMode === "grid" ? (
              <>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {pagedListings.map((listing) => (
                    <ListingCard
                      key={listing.id}
                      listing={listing}
                      onClick={() => navigate(`/deal/ad/${listing.id}`)}
                      bn={bn}
                      isFavorite={favoriteIds.has(String(listing.id))}
                      favoriteLoading={favoriteLoadingId === String(listing.id)}
                      onFavorite={() => handleToggleFavorite(listing)}
                    />
                  ))}
                </div>

                <Pagination
                  page={currentPage}
                  totalPages={totalPages}
                  onChange={setPage}
                  bn={bn}
                />
              </>
            ) : (
              <>
                <div className="space-y-3">
                  {pagedListings.map((listing) => (
                    <ListingListItem
                      key={listing.id}
                      listing={listing}
                      onClick={() => navigate(`/deal/ad/${listing.id}`)}
                      bn={bn}
                      isFavorite={favoriteIds.has(String(listing.id))}
                      favoriteLoading={favoriteLoadingId === String(listing.id)}
                      onFavorite={() => handleToggleFavorite(listing)}
                    />
                  ))}
                </div>

                <Pagination
                  page={currentPage}
                  totalPages={totalPages}
                  onChange={setPage}
                  bn={bn}
                />
              </>
            )}
          </main>
        </div>
      </div>

      <Footer />
      <BackToHomeButton />
    </div>
  );
};

function Pagination({
  page,
  totalPages,
  onChange,
  bn,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
  bn: boolean;
}) {
  if (totalPages <= 1) return null;

  const pages: number[] = [];
  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, start + 4);

  for (let item = start; item <= end; item++) {
    pages.push(item);
  }

  return (
    <div className="flex items-center justify-center gap-1 mt-6">
      <Button
        variant="outline"
        size="sm"
        disabled={page === 1}
        onClick={() => onChange(page - 1)}
      >
        {bn ? "পূর্ববর্তী" : "Previous"}
      </Button>

      {pages.map((item) => (
        <Button
          key={item}
          variant={item === page ? "default" : "outline"}
          size="sm"
          className="w-9"
          onClick={() => onChange(item)}
        >
          {item}
        </Button>
      ))}

      <Button
        variant="outline"
        size="sm"
        disabled={page === totalPages}
        onClick={() => onChange(page + 1)}
      >
        {bn ? "পরবর্তী" : "Next"}
      </Button>
    </div>
  );
}

function ListingCard({
  listing,
  onClick,
  bn = true,
  isFavorite = false,
  favoriteLoading = false,
  onFavorite,
}: {
  listing: DealListing;
  onClick: () => void;
  bn?: boolean;
  isFavorite?: boolean;
  favoriteLoading?: boolean;
  onFavorite?: () => void;
}) {
  const img = getDealImageUrl(listing.images?.[0]);

  return (
    <motion.div whileHover={{ y: -2 }} className="cursor-pointer" onClick={onClick}>
      <Card className="border-border/50 hover:shadow-lg transition-all overflow-hidden h-full bg-background">
        <div className="relative">
          <div className="aspect-[4/3] bg-muted overflow-hidden">
            <ListingImage src={img} alt={listing.title} fallbackSize="lg" />
          </div>

          {listing.is_featured && (
            <Badge className="absolute top-2 left-2 bg-amber-500 text-white text-[10px] border-0">
              <Star className="h-3 w-3 mr-0.5 fill-white" />
              {bn ? "প্রমোটেড" : "Promoted"}
            </Badge>
          )}

          <button
            onClick={(event) => {
              event.stopPropagation();
              onFavorite?.();
            }}
            disabled={favoriteLoading}
            className="absolute top-2 right-2 h-7 w-7 rounded-full bg-background/80 backdrop-blur flex items-center justify-center hover:bg-background"
            aria-label="favorite"
          >
            <Heart className={`h-3.5 w-3.5 ${isFavorite ? "fill-red-500 text-red-500" : "text-muted-foreground"}`} />
          </button>
        </div>

        <CardContent className="p-3">
          <p className="text-base font-bold text-primary">
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
                listing.location_division}
            </span>
          </div>

          <div className="flex items-center justify-between mt-2 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {timeAgo(listing.created_at, bn)}
            </span>

            <span className="flex items-center gap-1">
              <Eye className="h-3 w-3" />
              {listing.views_count}
            </span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function ListingListItem({
  listing,
  onClick,
  bn,
  isFavorite = false,
  favoriteLoading = false,
  onFavorite,
}: {
  listing: DealListing;
  onClick: () => void;
  bn: boolean;
  isFavorite?: boolean;
  favoriteLoading?: boolean;
  onFavorite?: () => void;
}) {
  const img = getDealImageUrl(listing.images?.[0]);

  return (
    <Card
      className="border-border/50 hover:shadow-md transition-shadow cursor-pointer bg-background"
      onClick={onClick}
    >
      <CardContent className="p-3 flex gap-3">
        <div className="w-32 h-24 rounded-lg overflow-hidden bg-muted shrink-0">
          <ListingImage src={img} alt={listing.title} fallbackSize="sm" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-lg font-bold text-primary">
            ৳
            {listing.price > 0
              ? listing.price.toLocaleString("bn-BD")
              : bn
                ? "আলোচনা সাপেক্ষ"
                : "Negotiable"}
          </p>

          <h3 className="text-sm font-medium text-foreground line-clamp-1">
            {bn ? listing.title : listing.title_en || listing.title}
          </h3>

          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {listing.location_area || listing.location_district}
            </span>

            {listing.condition && (
              <span>{getConditionLabel(listing.condition, bn)}</span>
            )}
          </div>

          <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {timeAgo(listing.created_at, bn)}
            </span>

            <span className="flex items-center gap-1">
              <Eye className="h-3 w-3" />
              {listing.views_count}
            </span>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2 shrink-0">
          <button
            onClick={(event) => {
              event.stopPropagation();
              onFavorite?.();
            }}
            disabled={favoriteLoading}
            className="h-8 w-8 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80"
            aria-label="favorite"
          >
            <Heart className={`h-4 w-4 ${isFavorite ? "fill-red-500 text-red-500" : "text-muted-foreground"}`} />
          </button>

          {listing.is_featured && (
            <Badge className="bg-amber-500 text-white text-[10px] border-0">
              {bn ? "Promoted" : "Promoted"}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default DealAllAds;


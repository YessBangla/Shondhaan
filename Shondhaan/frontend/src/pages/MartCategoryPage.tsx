import { useState, useMemo, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { ShoppingCart, SlidersHorizontal, ArrowLeft, LayoutGrid, List, X, Flame, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { useLanguage } from "@/contexts/LanguageContext";
import { useMartCategories, useMartProducts } from "@/hooks/useMartData";
import { useMartCart } from "@/contexts/MartCartContext";
import MartProductCard from "@/components/mart/MartProductCard";
import MartSearchBox from "@/components/mart/MartSearchBox";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PullToRefreshIndicator from "@/components/PullToRefreshIndicator";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { useQueryClient } from "@tanstack/react-query";

// A product only counts as "on deal" when its original_price is genuinely
// higher than its current price — not just present/truthy. Centralizing
// this here keeps it consistent with MartHome's Best Deals section.
const isDiscounted = (p: any) =>
  Boolean(p.original_price) && Number(p.original_price) > Number(p.price);

const MartCategoryPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const bn = language === "bn";
  const [searchQ, setSearchQ] = useState(searchParams.get("q") || "");

  // Read filter/sort intent coming from "View All" links (e.g. Best Deals,
  // Top Selling on MartHome) so this page actually honors them instead of
  // showing every product regardless of which section linked here.
  const dealsFilter = searchParams.get("filter") === "deals";
  const featuredFilter = searchParams.get("featured") === "true";
  const sortParam = searchParams.get("sort");

  const [sort, setSort] = useState(sortParam === "top-selling" ? "popular" : "popular");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 100000]);
  const [showFilters, setShowFilters] = useState(false);
  const [ratingFilter, setRatingFilter] = useState(0);
  const { data: categories = [] } = useMartCategories();
  const { data: products = [], isLoading } = useMartProducts(slug === "all" ? undefined : slug, searchQ || undefined, 100);
  const { totalItems, setIsOpen } = useMartCart();
  const queryClient = useQueryClient();
  const { pull, refreshing } = usePullToRefresh(async () => {
    await queryClient.invalidateQueries();
  });

  // Keep search box and sort/filter state in sync if the user navigates here
  // again with different query params (e.g. clicking another "View All").
  useEffect(() => {
    setSearchQ(searchParams.get("q") || "");
  }, [searchParams]);

  const allSubCats = categories.flatMap((category) => category.children || []);
  const currentSubCat = slug !== "all" ? allSubCats.find((sub) => sub.slug === slug) : null;
  const currentCat = slug !== "all"
    ? categories.find((c) => c.slug === slug) || categories.find((c) => c.id === currentSubCat?.parent_id) || null
    : null;
  const subCats = currentCat?.children || [];

  const filtered = useMemo(() => {
    let arr = products.filter((p) => p.price >= priceRange[0] && p.price <= priceRange[1]);
    if (ratingFilter > 0) arr = arr.filter((p) => p.rating >= ratingFilter);
    if (dealsFilter) arr = arr.filter(isDiscounted);
    if (featuredFilter) arr = arr.filter((p: any) => p.is_featured);

    // "View All" from Top Selling should sort by total_sold by default,
    // unless the user explicitly changes the sort dropdown afterward.
    const effectiveSort = sortParam === "top-selling" && sort === "popular" ? "popular" : sort;

    switch (effectiveSort) {
      case "price-low": return arr.sort((a, b) => a.price - b.price);
      case "price-high": return arr.sort((a, b) => b.price - a.price);
      case "newest": return arr.sort((a, b) => b.id.localeCompare(a.id));
      case "rating": return arr.sort((a, b) => b.rating - a.rating);
      default: return arr.sort((a, b) => b.total_sold - a.total_sold);
    }
  }, [products, sort, priceRange, ratingFilter, dealsFilter, featuredFilter, sortParam]);

  const maxPrice = Math.max(...products.map((p) => p.price), 100000);

  const pageTitle = dealsFilter
    ? (bn ? "সেরা ডিসকাউন্ট" : "Best Deals")
    : sortParam === "top-selling"
      ? (bn ? "সেরা বিক্রিত পণ্য" : "Top Selling")
      : currentSubCat
        ? (bn ? currentSubCat.name : (currentSubCat.name_en || currentSubCat.name))
        : currentCat
        ? (bn ? currentCat.name : (currentCat.name_en || currentCat.name))
        : (bn ? "সকল পণ্য" : "All Products");

  return (
    <div className="min-h-screen bg-background">
      <PullToRefreshIndicator pull={pull} refreshing={refreshing} />
      <Navbar />
      <div className="pt-[44px] md:pt-[104px]" />

      <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
        <div className="app-container py-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="text-primary-foreground" onClick={() => navigate("/mart/home")}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-xl font-bold flex items-center gap-2">
                {dealsFilter && <Flame className="h-5 w-5" />}
                {sortParam === "top-selling" && !dealsFilter && <Award className="h-5 w-5" />}
                {pageTitle}
              </h1>
            </div>
            <Button variant="secondary" size="sm" className="relative" onClick={() => setIsOpen(true)}>
              <ShoppingCart className="h-4 w-4" />
              {totalItems > 0 && <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-bold">{totalItems}</span>}
            </Button>
          </div>
        </div>
      </div>

      <div className="app-container py-4">
        {/* Sub-categories */}
        {subCats.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-3 mb-4">
            <Button variant={!slug || slug === currentCat?.slug ? "default" : "outline"} size="sm" className="shrink-0 text-xs" onClick={() => navigate(`/mart/category/${currentCat?.slug}`)}>
              {bn ? "সকল" : "All"}
            </Button>
            {subCats.map((sub) => (
              <Button key={sub.id} variant={slug === sub.slug ? "default" : "outline"} size="sm" className="shrink-0 text-xs" onClick={() => navigate(`/mart/category/${sub.slug}`)}>
                {bn ? sub.name : (sub.name_en || sub.name)}
              </Button>
            ))}
          </div>
        )}

        {/* Active filter chip — lets user clear a deals/featured filter that arrived via URL */}
        {(dealsFilter || featuredFilter) && (
          <div className="flex items-center gap-2 mb-4">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-100 dark:bg-orange-950/40 text-orange-700 dark:text-orange-400 text-xs font-semibold px-3 py-1.5">
              {dealsFilter && (bn ? "শুধু ডিসকাউন্ট পণ্য" : "Discounted items only")}
              {featuredFilter && !dealsFilter && (bn ? "শুধু ফিচার্ড পণ্য" : "Featured items only")}
              <button
                onClick={() => navigate(slug ? `/mart/category/${slug}` : "/mart/category/all")}
                className="ml-1 hover:text-orange-900 dark:hover:text-orange-200"
                aria-label={bn ? "ফিল্টার সরান" : "Clear filter"}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          </div>
        )}

        {/* Filter/Sort bar */}
        <div className="flex items-center gap-2 mb-4">
          <MartSearchBox className="flex-1" />
          <Button variant="outline" size="sm" className="h-9" onClick={() => setShowFilters(!showFilters)}>
            <SlidersHorizontal className="h-3.5 w-3.5 mr-1" /> {bn ? "ফিল্টার" : "Filter"}
          </Button>
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="w-[120px] h-9 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="popular">{bn ? "জনপ্রিয়" : "Popular"}</SelectItem>
              <SelectItem value="newest">{bn ? "নতুন" : "Newest"}</SelectItem>
              <SelectItem value="price-low">{bn ? "কম দাম" : "Low Price"}</SelectItem>
              <SelectItem value="price-high">{bn ? "বেশি দাম" : "High Price"}</SelectItem>
              <SelectItem value="rating">{bn ? "রেটিং" : "Top Rated"}</SelectItem>
            </SelectContent>
          </Select>
          <div className="hidden sm:flex border border-border rounded-lg">
            <Button variant={viewMode === "grid" ? "default" : "ghost"} size="icon" className="h-9 w-9" onClick={() => setViewMode("grid")}><LayoutGrid className="h-4 w-4" /></Button>
            <Button variant={viewMode === "list" ? "default" : "ghost"} size="icon" className="h-9 w-9" onClick={() => setViewMode("list")}><List className="h-4 w-4" /></Button>
          </div>
        </div>

        {/* Filter panel */}
        {showFilters && (
          <div className="bg-card border border-border/50 rounded-xl p-4 mb-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm">{bn ? "ফিল্টার" : "Filters"}</h3>
              <Button variant="ghost" size="sm" onClick={() => { setPriceRange([0, maxPrice]); setRatingFilter(0); }}>
                <X className="h-3 w-3 mr-1" /> {bn ? "রিসেট" : "Reset"}
              </Button>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">{bn ? "মূল্য পরিসীমা" : "Price Range"}: ৳{priceRange[0].toLocaleString("bn-BD")} - ৳{priceRange[1].toLocaleString("bn-BD")}</label>
              <Slider value={priceRange} onValueChange={(v) => setPriceRange(v as [number, number])} min={0} max={maxPrice} step={100} className="mt-2" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">{bn ? "ন্যূনতম রেটিং" : "Min Rating"}</label>
              <div className="flex gap-2 mt-1">
                {[0, 3, 3.5, 4, 4.5].map((r) => (
                  <Button key={r} variant={ratingFilter === r ? "default" : "outline"} size="sm" className="text-xs" onClick={() => setRatingFilter(r)}>
                    {r === 0 ? (bn ? "সকল" : "All") : `${r}+⭐`}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Results count */}
        <p className="text-sm text-muted-foreground mb-3">{filtered.length} {bn ? "টি পণ্য" : "products"}</p>

        {/* Products */}
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {Array.from({ length: 8 }).map((_, i) => <div key={i} className="aspect-square rounded-xl bg-muted animate-pulse" />)}
          </div>
        ) : filtered.length > 0 ? (
          viewMode === "grid" ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {filtered.map((p) => <MartProductCard key={p.id} product={p} />)}
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((p) => <MartProductCard key={p.id} product={p} variant="list" />)}
            </div>
          )
        ) : (
          <div className="text-center py-16 text-muted-foreground">
            <ShoppingCart className="h-12 w-12 mx-auto mb-3 opacity-40" />
            <p>{dealsFilter ? (bn ? "এখন কোনো ডিসকাউন্ট পণ্য নেই" : "No discounted products right now") : (bn ? "কোনো পণ্য পাওয়া যায়নি" : "No products found")}</p>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default MartCategoryPage;

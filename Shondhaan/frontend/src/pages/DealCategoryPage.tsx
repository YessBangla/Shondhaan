import { useState } from "react";
import ListingImage from "@/components/deal/ListingImage";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Search, MapPin, Filter, ChevronLeft, Eye, Clock, Star, Grid, List, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useLanguage } from "@/contexts/LanguageContext";
import { useDealCategoryTree, useDealListings, DealListing } from "@/hooks/useDealData";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import DealLocationSelector from "@/components/deal/DealLocationSelector";
import { Skeleton } from "@/components/ui/skeleton";
import { divisions as locationData } from "@/data/locations";
import DealWatermark from "@/components/deal/DealWatermark";

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
  
  // Check if it's a URL, base64, or blob path
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
  
  // Fallback for emojis or plain text
  return <span className="text-base leading-none">{icon}</span>;
};

const DealCategoryPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const bn = language === "bn";

  const [search, setSearch] = useState(searchParams.get("q") || "");
  const [locationFilter, setLocationFilter] = useState({ division: searchParams.get("div") || "", district: "", thana: "" });
  const [condition, setCondition] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000000]);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const { data: categoryTree } = useDealCategoryTree();
  const allCats = categoryTree?.flatMap(c => [c, ...(c.children || [])]) || [];
  const currentCat = allCats.find(c => c.slug === slug);

  const { data: listings, isLoading } = useDealListings({
    categorySlug: slug,
    search,
    division: locationFilter.division || undefined,
    district: locationFilter.district || undefined,
    thana: locationFilter.thana || undefined,
    condition: condition !== "all" ? condition : undefined,
    minPrice: priceRange[0] > 0 ? priceRange[0] : undefined,
    maxPrice: priceRange[1] < 10000000 ? priceRange[1] : undefined,
    sortBy: sortBy === "price_asc" ? "price_asc" : sortBy === "price_desc" ? "price_desc" : undefined,
  });

  const FilterPanel = () => (
    <div className="space-y-5">
      <div>
        <label className="text-sm font-medium text-foreground mb-2 block">{bn ? "লোকেশন" : "Location"}</label>
        <DealLocationSelector value={locationFilter} onChange={setLocationFilter} />
      </div>
      <div>
        <label className="text-sm font-medium text-foreground mb-2 block">{bn ? "অবস্থা" : "Condition"}</label>
        <Select value={condition} onValueChange={setCondition}>
          <SelectTrigger><SelectValue placeholder={bn ? "সকল" : "All"} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{bn ? "সকল" : "All"}</SelectItem>
            <SelectItem value="নতুন">{bn ? "নতুন" : "New"}</SelectItem>
            <SelectItem value="ব্যবহৃত">{bn ? "ব্যবহৃত" : "Used"}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <label className="text-sm font-medium text-foreground mb-2 block">{bn ? "মূল্য সীমা" : "Price Range"}</label>
        <Slider
          value={priceRange}
          onValueChange={(v) => setPriceRange(v as [number, number])}
          min={0}
          max={10000000}
          step={5000}
          className="mt-3"
        />
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          <span>৳{priceRange[0].toLocaleString("bn-BD")}</span>
          <span>৳{priceRange[1].toLocaleString("bn-BD")}</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-[50px] md:pt-[45px]" />
      <div className="app-container py-4 pb-28 md:pb-10">
        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/deal")}><ChevronLeft className="h-5 w-5" /></Button>
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <CategoryIcon icon={currentCat?.icon} className="w-6 h-6" />
              {bn ? (currentCat?.name || "সকল বিজ্ঞাপন") : (currentCat?.name_en || "All Ads")}
            </h1>
            <p className="text-xs text-muted-foreground">{listings?.length || 0} {bn ? "টি বিজ্ঞাপন" : " ads found"}</p>
          </div>
        </div>

        {/* Search & Sort */}
        <div className="flex flex-col md:flex-row gap-2 mb-4">
          <div className="relative flex-1 border border-primary rounded-lg">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder={bn ? "খুঁজুন..." : "Search..."} value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <div className="flex items-center gap-2">
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">{bn ? "সর্বশেষ" : "Newest"}</SelectItem>
                <SelectItem value="price_asc">{bn ? "কম মূল্য" : "Price ↑"}</SelectItem>
                <SelectItem value="price_desc">{bn ? "বেশি মূল্য" : "Price ↓"}</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex gap-1">
              <Button variant={viewMode === "grid" ? "default" : "outline"} size="icon" onClick={() => setViewMode("grid")}><Grid className="h-4 w-4" /></Button>
              <Button variant={viewMode === "list" ? "default" : "outline"} size="icon" onClick={() => setViewMode("list")}><List className="h-4 w-4" /></Button>
            </div>
            {/* Mobile filter */}
            <Sheet>
              <SheetTrigger asChild className="md:hidden">
                <Button variant="outline" size="icon"><SlidersHorizontal className="h-4 w-4" /></Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72">
                <SheetHeader><SheetTitle>{bn ? "ফিল্টার" : "Filters"}</SheetTitle></SheetHeader>
                <div className="mt-4"><FilterPanel /></div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        <div className="flex gap-6">
          {/* Desktop Sidebar */}
          <div className="hidden md:block w-56 shrink-0">
            <Card className="border-border/50">
              <CardContent className="p-4">
                <h3 className="font-bold text-foreground mb-3 flex items-center gap-2"><Filter className="h-4 w-4" />{bn ? "ফিল্টার" : "Filters"}</h3>
                <FilterPanel />
              </CardContent>
            </Card>

            {/* Category Links */}
            <Card className="border-border/50 mt-4">
              <CardContent className="p-4">
                <h3 className="font-bold text-foreground mb-3">{bn ? "ক্যাটাগরি" : "Categories"}</h3>
                <div className="space-y-0.5">
                  {categoryTree?.map(cat => (
                    <div key={cat.id}>
                      <button
                        onClick={() => navigate(`/deal/category/${cat.slug}`)}
                        className={`w-full text-left text-sm p-2 rounded-lg hover:bg-muted transition-colors flex items-center gap-2 ${cat.slug === slug ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground"}`}
                      >
                        <span className="flex items-center justify-center w-5 h-5 shrink-0">
                          <CategoryIcon icon={cat.icon} className="w-5 h-5" />
                        </span>
                        <span>{bn ? cat.name : (cat.name_en || cat.name)}</span>
                      </button>
                      {/* Show subcategories if this parent is active or one of its children is */}
                      {cat.children && cat.children.length > 0 && (cat.slug === slug || cat.children.some(s => s.slug === slug)) && (
                        <div className="ml-6 space-y-0.5 mt-0.5">
                          {cat.children.map(sub => (
                            <button
                              key={sub.id}
                              onClick={() => navigate(`/deal/category/${sub.slug}`)}
                              className={`w-full text-left text-xs p-1.5 rounded-md hover:bg-muted transition-colors flex items-center gap-1.5 ${sub.slug === slug ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground"}`}
                            >
                              <span className="flex items-center justify-center w-4 h-4 shrink-0">
                                <CategoryIcon icon={sub.icon} className="w-4 h-4" />
                              </span>
                              <span>{bn ? sub.name : (sub.name_en || sub.name)}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Listings */}
          <div className="flex-1">
            {isLoading ? (
              <div className={viewMode === "grid" ? "grid grid-cols-2 lg:grid-cols-3 gap-3" : "space-y-3"}>
                {Array(6).fill(0).map((_, i) => <Skeleton key={i} className="h-64 rounded-xl" />)}
              </div>
            ) : listings?.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-4xl mb-3">📭</p>
                <p className="text-muted-foreground">{bn ? "কোনো বিজ্ঞাপন পাওয়া যায়নি" : "No ads found"}</p>
              </div>
            ) : viewMode === "grid" ? (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                {listings?.map(listing => (
                  <ListingCard key={listing.id} listing={listing} onClick={() => navigate(`/deal/ad/${listing.id}`)} bn={bn} />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {listings?.map(listing => (
                  <ListingListItem key={listing.id} listing={listing} onClick={() => navigate(`/deal/ad/${listing.id}`)} bn={bn} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      <Footer/>
    </div>
  );
};

function ListingCard({ listing, onClick, bn = true }: { listing: DealListing; onClick: () => void; bn?: boolean }) {
  const img = listing.images?.[0];
  return (
    <motion.div whileHover={{ y: -2 }} className="cursor-pointer" onClick={onClick}>
      <Card className="border-border/50 hover:shadow-lg transition-all overflow-hidden h-full">
        <div className="relative">
          <div className="aspect-[4/3] bg-muted overflow-hidden">
            <ListingImage src={img} alt={listing.title} fallbackSize="lg" />
          </div>
          {listing.is_featured && <Badge className="absolute top-2 left-2 bg-amber-500 text-white text-[10px]"><Star className="h-3 w-3 mr-0.5" />{bn ? "ফিচার্ড" : "Featured"}</Badge>}
        </div>
        <CardContent className="p-3">
          <p className="text-lg font-bold text-primary">৳{listing.price > 0 ? listing.price.toLocaleString("bn-BD") : (bn ? "আলোচনা সাপেক্ষ" : "Negotiable")}</p>
          <h3 className="text-sm font-medium text-foreground line-clamp-2 mt-1">{bn ? listing.title : (listing.title_en || listing.title)}</h3>
          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" /><span>{listing.location_area || listing.location_district || listing.location_division}</span>
          </div>
          <div className="flex items-center justify-between mt-2 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{timeAgo(listing.created_at, bn)}</span>
            <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{listing.views_count}</span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function ListingListItem({ listing, onClick, bn }: { listing: DealListing; onClick: () => void; bn: boolean }) {
  const img = listing.images?.[0];
  const conditionText = listing.condition === "নতুন" ? (bn ? "নতুন" : "New") : listing.condition === "ব্যবহৃত" ? (bn ? "ব্যবহৃত" : "Used") : listing.condition;
  return (
    <Card className="border-border/50 hover:shadow-md transition-shadow cursor-pointer" onClick={onClick}>
      <CardContent className="p-3 flex gap-3">
        <div className="w-32 h-24 rounded-lg overflow-hidden bg-muted shrink-0">
          <ListingImage src={img} alt={listing.title} fallbackSize="sm" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-lg font-bold text-primary">৳{listing.price > 0 ? listing.price.toLocaleString("bn-BD") : (bn ? "আলোচনা সাপেক্ষ" : "Negotiable")}</p>
          <h3 className="text-sm font-medium text-foreground line-clamp-1">{bn ? listing.title : (listing.title_en || listing.title)}</h3>
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{listing.location_area || listing.location_district}</span>
            <span>{conditionText}</span>
          </div>
          <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{timeAgo(listing.created_at, bn)}</span>
            <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{listing.views_count}</span>
          </div>
        </div>

        {listing.is_featured && <Badge className="bg-amber-500 text-white text-[10px] self-start shrink-0">{bn ? "ফিচার্ড" : "Featured"}</Badge>}
      </CardContent>
    </Card>
  );
}

export default DealCategoryPage;
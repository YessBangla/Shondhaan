import { useState, useRef, useEffect, useMemo } from "react";
import { getServiceImage } from "@/data/serviceImages";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Star, Search, ChevronLeft, GitCompareArrows, Check, Share2, X, SlidersHorizontal, MapPin } from "lucide-react";
import { ShareButton } from "@/components/SharePopup";
import { useLocation } from "@/contexts/LocationContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCompare } from "@/contexts/CompareContext";
import { useCmsCategories, useCmsServices, CmsService, CmsCategory } from "@/hooks/useCmsData";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

// Fallback imports for when CMS has no data
import { allServices } from "@/data/services";
import { serviceCategories } from "@/data/categories";
import { useSEO } from "@/hooks/useSEO";
import { divisions } from "@/data/locations";

const AllServices = () => {
  const navigate = useNavigate();
  const { selectedCity } = useLocation();
  const { t, language } = useLanguage();
  const bn = language === "bn";

  const { data: cmsCategories = [] } = useCmsCategories();
  const { data: cmsServices = [] } = useCmsServices();

  useSEO({
    title: bn ? "সকল সেবা" : "All Services",
    description: bn
      ? "ইয়েস সার্ভিসের সকল হোম সার্ভিস ব্রাউজ করুন — এসি, প্লাম্বিং, ক্লিনিং, ইলেকট্রিক্যাল, বিউটি ও আরও অনেক ক্যাটাগরি।"
      : "Browse all home services on Yess Service — AC, plumbing, cleaning, electrical, beauty & more categories.",
    canonical: "/all-services",
  });

  const activeCategories = useMemo(() => cmsCategories.filter((c) => c.is_active), [cmsCategories]);
  const activeServices = useMemo(() => cmsServices.filter((s) => s.is_active), [cmsServices]);
  const useCms = activeCategories.length > 0 && activeServices.length > 0;

  const [activeCategory, setActiveCategory] = useState("");
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [debouncedQuery, setDebouncedQuery] = useState(searchQuery);
  const [filterCategory, setFilterCategory] = useState<string>(searchParams.get("cat") || "all");
  const [minRating, setMinRating] = useState<number>(Number(searchParams.get("rating")) || 0);
  const [sortBy, setSortBy] = useState<string>(searchParams.get("sort") || "popular");
  const [showFilters, setShowFilters] = useState(false);
  // Additional filters
  const [priceMin, setPriceMin] = useState<string>(searchParams.get("pmin") || "");
  const [priceMax, setPriceMax] = useState<string>(searchParams.get("pmax") || "");
  const [availability, setAvailability] = useState<string>(searchParams.get("avail") || "all"); // all | citywide | nationwide
  const [cityOverride, setCityOverride] = useState<string>(searchParams.get("city") || "");
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const initialCategoryHandledRef = useRef(false);
  const categoryFromUrl = searchParams.get("category");

  // Set initial active category (from URL param or first)
  useEffect(() => {
    if (categoryFromUrl) {
      setActiveCategory(categoryFromUrl);
      if (!initialCategoryHandledRef.current) {
        initialCategoryHandledRef.current = true;
        setTimeout(() => {
          const el = sectionRefs.current[categoryFromUrl];
          if (!el) return;
          const isMobile = window.innerWidth < 768;
          const offset = isMobile ? 100 : 90;
          const top = el.getBoundingClientRect().top + window.scrollY - offset;
          window.scrollTo({ top, behavior: "smooth" });
        }, 300);
      }
    } else if (useCms && activeCategories.length > 0 && !activeCategory) {
      setActiveCategory(activeCategories[0].id);
    } else if (!useCms && serviceCategories.length > 0 && !activeCategory) {
      setActiveCategory(serviceCategories[0].id);
    }
  }, [categoryFromUrl, useCms, activeCategories.length, activeCategory]);

  // Effective city: user-overridden via filter, else global selected city
  const effectiveCity = cityOverride || selectedCity;

  // Filter services by city
  const filteredByCity = useCms
    ? activeServices.filter((s) => {
        const cities = Array.isArray(s.available_cities) ? (s.available_cities as string[]) : [];
        return cities.length === 0 || cities.includes(effectiveCity);
      })
    : allServices.filter(
        (s) => s.availableCities.length === 0 || s.availableCities.includes(effectiveCity)
      );

  const scrollToCategory = (catId: string) => {
    setActiveCategory(catId);
    const el = sectionRefs.current[catId];
    if (!el) return;
    // Account for fixed navbar + mobile category tab bar
    const isMobile = window.innerWidth < 768;
    const offset = isMobile ? 100 : 90;
    const top = el.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top, behavior: "smooth" });
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        // Pick the entry closest to the top that is intersecting
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) {
          setActiveCategory((prev) => (prev === visible[0].target.id ? prev : visible[0].target.id));
        }
      },
      { rootMargin: "-120px 0px -70% 0px", threshold: 0 }
    );

    Object.values(sectionRefs.current).forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => observer.disconnect();
  }, [useCms, activeCategories.length]);

  // Debounce search input (200ms)
  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedQuery(searchQuery), 200);
    return () => window.clearTimeout(id);
  }, [searchQuery]);

  // Sync filters → URL (q, cat, rating, sort)
  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    debouncedQuery.trim() ? next.set("q", debouncedQuery.trim()) : next.delete("q");
    filterCategory !== "all" ? next.set("cat", filterCategory) : next.delete("cat");
    minRating > 0 ? next.set("rating", String(minRating)) : next.delete("rating");
    sortBy !== "popular" ? next.set("sort", sortBy) : next.delete("sort");
    priceMin ? next.set("pmin", priceMin) : next.delete("pmin");
    priceMax ? next.set("pmax", priceMax) : next.delete("pmax");
    availability !== "all" ? next.set("avail", availability) : next.delete("avail");
    cityOverride ? next.set("city", cityOverride) : next.delete("city");
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery, filterCategory, minRating, sortBy, priceMin, priceMax, availability, cityOverride]);

  const isFiltering =
    debouncedQuery.trim().length > 0 ||
    filterCategory !== "all" ||
    minRating > 0 ||
    sortBy !== "popular" ||
    !!priceMin ||
    !!priceMax ||
    availability !== "all" ||
    !!cityOverride;

  // Search + filter + sort pipeline
  const searchResults = useMemo(() => {
    if (!isFiltering) return null;
    const q = debouncedQuery.trim().toLowerCase();
    const pMin = priceMin ? Number(priceMin) : null;
    const pMax = priceMax ? Number(priceMax) : null;

    if (useCms) {
      let list = (filteredByCity as CmsService[]).filter((s) => {
        if (filterCategory !== "all" && s.category_id !== filterCategory) return false;
        if (minRating > 0 && (s.rating ?? 0) < minRating) return false;
        const cities = Array.isArray(s.available_cities) ? s.available_cities : [];
        if (availability === "nationwide" && cities.length !== 0) return false;
        if (availability === "citywide" && cities.length === 0) return false;
        if (!q) return true;
        return (
          s.title.toLowerCase().includes(q) ||
          (s.title_en && s.title_en.toLowerCase().includes(q)) ||
          (s.description && s.description.toLowerCase().includes(q))
        );
      });
      list = [...list].sort((a, b) => {
        if (sortBy === "rating") return (b.rating ?? 0) - (a.rating ?? 0);
        // Price sort uses the legacy/static catalog only — CMS packages are fetched per-service.
        return 0;
      });
      return list;
    }

    let list = (filteredByCity as typeof allServices).filter((s) => {
      if (minRating > 0 && (s.rating ?? 0) < minRating) return false;
      const startPrice = s.packages[0]?.price ?? 0;
      if (pMin !== null && startPrice < pMin) return false;
      if (pMax !== null && startPrice > pMax) return false;
      const cities = s.availableCities || [];
      if (availability === "nationwide" && cities.length !== 0) return false;
      if (availability === "citywide" && cities.length === 0) return false;
      if (!q) return true;
      return (
        s.title.toLowerCase().includes(q) ||
        (s.titleEn && s.titleEn.toLowerCase().includes(q)) ||
        s.features.some((f) => f.toLowerCase().includes(q))
      );
    });
    list = [...list].sort((a, b) => {
      if (sortBy === "rating") return (b.rating ?? 0) - (a.rating ?? 0);
      if (sortBy === "price-low") return (a.packages[0]?.price ?? Infinity) - (b.packages[0]?.price ?? Infinity);
      if (sortBy === "price-high") return (b.packages[0]?.price ?? -Infinity) - (a.packages[0]?.price ?? -Infinity);
      return 0;
    });
    return list;
  }, [debouncedQuery, filterCategory, minRating, sortBy, priceMin, priceMax, availability, useCms, filteredByCity, isFiltering]);

  const clearAllFilters = () => {
    setSearchQuery("");
    setFilterCategory("all");
    setMinRating(0);
    setSortBy("popular");
    setPriceMin("");
    setPriceMax("");
    setAvailability("all");
    setCityOverride("");
  };

  // Build a flat city list (Bangla names, deduplicated) for the location filter
  const allCities = useMemo(() => {
    const set = new Set<string>();
    divisions.forEach((d) => d.districts.forEach((dist) => set.add(dist.nameBn)));
    return Array.from(set).sort((a, b) => a.localeCompare(b, "bn"));
  }, []);

  const getCmsServiceTitle = (s: CmsService) => (bn ? s.title : s.title_en || s.title);
  const getLegacyServiceTitle = (s: { title: string; titleEn?: string }) =>
    language === "en" && s.titleEn ? s.titleEn : s.title;
  const getCatName = (c: CmsCategory) => (bn ? c.name : c.name_en || c.name);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-[44px] md:pt-[104px]" />

      <div className="mx-auto max-w-5xl px-4 py-5 md:py-8">
        <div className="flex items-center gap-3 mb-5">
          <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h1 className="font-heading text-xl md:text-2xl font-bold text-foreground">{t("as.title")}</h1>
        </div>

        {/* Search + Filter toolbar */}
        <div className="mb-4 space-y-2.5">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t("as.searchPlaceholder")}
                className="w-full rounded-xl border border-input bg-background pl-10 pr-9 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-ring"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  aria-label={bn ? "মুছুন" : "Clear"}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-secondary"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <button
              onClick={() => setShowFilters((v) => !v)}
              className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition-colors ${showFilters || isFiltering ? "border-primary bg-primary/10 text-primary" : "border-input bg-background text-foreground"}`}
              aria-label={bn ? "ফিল্টার" : "Filters"}
              title={bn ? "ফিল্টার" : "Filters"}
            >
              <SlidersHorizontal className="h-4 w-4" />
              {isFiltering && (
                <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-primary ring-2 ring-background" />
              )}
            </button>
          </div>

          {/* Filter panel */}
          {showFilters && (
            <div className="rounded-xl border border-border bg-card p-3 space-y-3">
              {/* Category chips */}
              {useCms && activeCategories.length > 0 && (
                <div>
                  <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {bn ? "ক্যাটাগরি" : "Category"}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      onClick={() => setFilterCategory("all")}
                      className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${filterCategory === "all" ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-foreground hover:bg-secondary"}`}
                    >
                      {bn ? "সব" : "All"}
                    </button>
                    {activeCategories.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => setFilterCategory(c.id)}
                        className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${filterCategory === c.id ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-foreground hover:bg-secondary"}`}
                      >
                        {getCatName(c)}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {/* Rating + Sort */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {bn ? "ন্যূনতম রেটিং" : "Min rating"}
                  </p>
                  <div className="flex gap-1">
                    {[0, 3, 4, 4.5].map((r) => (
                      <button
                        key={r}
                        onClick={() => setMinRating(r)}
                        className={`flex flex-1 items-center justify-center gap-0.5 rounded-lg border px-2 py-1.5 text-xs transition-colors ${minRating === r ? "border-primary bg-primary/10 text-primary font-semibold" : "border-border bg-background text-foreground hover:bg-secondary"}`}
                      >
                        {r === 0 ? (bn ? "সব" : "Any") : (
                          <>
                            {r}+ <Star className="h-3 w-3 fill-current" />
                          </>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {bn ? "সাজান" : "Sort by"}
                  </p>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full rounded-lg border border-input bg-background px-2 py-1.5 text-xs text-foreground outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="popular">{bn ? "জনপ্রিয়" : "Popular"}</option>
                    <option value="rating">{bn ? "সর্বোচ্চ রেটিং" : "Top rated"}</option>
                    <option value="price-low">{bn ? "মূল্য (কম)" : "Price (low)"}</option>
                    <option value="price-high">{bn ? "মূল্য (বেশি)" : "Price (high)"}</option>
                  </select>
                </div>
              </div>
              {isFiltering && (
                <button
                  onClick={clearAllFilters}
                  className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-border bg-background py-2 text-xs font-medium text-muted-foreground hover:bg-secondary"
                >
                  <X className="h-3.5 w-3.5" />
                  {bn ? "সব ফিল্টার মুছুন" : "Clear all filters"}
                </button>
              )}
              {/* Price range */}
              <div>
                <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {bn ? "মূল্যসীমা (৳)" : "Price range (৳)"}
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={priceMin}
                    onChange={(e) => setPriceMin(e.target.value)}
                    placeholder={bn ? "সর্বনিম্ন" : "Min"}
                    className="w-full rounded-lg border border-input bg-background px-2 py-1.5 text-xs text-foreground outline-none focus:ring-1 focus:ring-ring"
                  />
                  <span className="text-xs text-muted-foreground">—</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={priceMax}
                    onChange={(e) => setPriceMax(e.target.value)}
                    placeholder={bn ? "সর্বোচ্চ" : "Max"}
                    className="w-full rounded-lg border border-input bg-background px-2 py-1.5 text-xs text-foreground outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
                {useCms && (
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    {bn
                      ? "টিপ: মূল্য ফিল্টার সার্ভিসের শুরুর প্যাকেজ মূল্যে প্রযোজ্য।"
                      : "Tip: Price filter applies to the starting package price."}
                  </p>
                )}
              </div>
              {/* Availability + Location */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {bn ? "প্রাপ্যতা" : "Availability"}
                  </p>
                  <div className="flex flex-col gap-1">
                    {[
                      { id: "all", label: bn ? "সব" : "All" },
                      { id: "citywide", label: bn ? "শহর-নির্দিষ্ট" : "City-specific" },
                      { id: "nationwide", label: bn ? "সারাদেশে" : "Nationwide" },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => setAvailability(opt.id)}
                        className={`rounded-lg border px-2 py-1.5 text-xs font-medium transition-colors ${availability === opt.id ? "border-primary bg-primary/10 text-primary" : "border-border bg-background text-foreground hover:bg-secondary"}`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <MapPin className="inline h-3 w-3 mr-0.5" />
                    {bn ? "অবস্থান" : "Location"}
                  </p>
                  <select
                    value={cityOverride}
                    onChange={(e) => setCityOverride(e.target.value)}
                    className="w-full rounded-lg border border-input bg-background px-2 py-1.5 text-xs text-foreground outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="">
                      {bn ? `বর্তমান (${selectedCity})` : `Current (${selectedCity})`}
                    </option>
                    {allCities.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  {cityOverride && (
                    <button
                      onClick={() => setCityOverride("")}
                      className="mt-1 text-[10px] text-primary hover:underline"
                    >
                      {bn ? "রিসেট করুন" : "Reset"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {searchResults ? (
          <div>
            <p className="text-sm text-muted-foreground mb-4">
              {searchResults.length > 0
                ? `${searchResults.length}${t("as.found")}`
                : t("as.notFound")}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {useCms
                ? (searchResults as CmsService[]).map((service) => (
                    <CmsServiceCard
                      key={service.id}
                      service={service}
                      title={getCmsServiceTitle(service)}
                      fromLabel={t("as.from")}
                      onClick={() => navigate(`/service/${service.slug}`)}
                    />
                  ))
                : (searchResults as typeof allServices).map((service) => (
                    <LegacyServiceCard
                      key={service.slug}
                      service={service}
                      title={getLegacyServiceTitle(service)}
                      fromLabel={t("as.from")}
                      onClick={() => navigate(`/service/${service.slug}`)}
                    />
                  ))}
            </div>
          </div>
        ) : useCms ? (
          <CmsLayout
            categories={activeCategories}
            services={filteredByCity as CmsService[]}
            activeCategory={activeCategory}
            scrollToCategory={scrollToCategory}
            sectionRefs={sectionRefs}
            getCatName={getCatName}
            getCmsServiceTitle={getCmsServiceTitle}
            fromLabel={t("as.from")}
            navigate={navigate}
            bn={bn}
          />
        ) : (
          <LegacyLayout
            categories={serviceCategories}
            services={filteredByCity as typeof allServices}
            activeCategory={activeCategory}
            scrollToCategory={scrollToCategory}
            sectionRefs={sectionRefs}
            getTitle={getLegacyServiceTitle}
            fromLabel={t("as.from")}
            navigate={navigate}
            language={language}
          />
        )}
      </div>

      <Footer />
      <div className="h-16 md:hidden" />
    </div>
  );
};

// CMS-based layout
const CmsLayout = ({
  categories, services, activeCategory, scrollToCategory, sectionRefs, getCatName, getCmsServiceTitle, fromLabel, navigate, bn,
}: {
  categories: CmsCategory[];
  services: CmsService[];
  activeCategory: string;
  scrollToCategory: (id: string) => void;
  sectionRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
  getCatName: (c: CmsCategory) => string;
  getCmsServiceTitle: (s: CmsService) => string;
  fromLabel: string;
  navigate: (path: string) => void;
  bn: boolean;
}) => (
  <div className="flex gap-6">
    {/* ALLSERVICE sidebar */}
    <aside className="hidden md:block w-52 shrink-0">
      <div className="sticky top-20 space-y-0.5">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => scrollToCategory(cat.id)}
            className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition-all text-left ${
              activeCategory === cat.id
                ? "bg-primary/10 text-primary font-semibold border-l-[3px] border-primary"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground border-l-[3px] border-transparent"
            }`}
          >
            {cat.icon_url && <img src={cat.icon_url} alt={getCatName(cat)} className="h-6 w-6 object-contain" />}
            {getCatName(cat)}
          </button>
        ))}
      </div>
    </aside>

    <div className="md:hidden fixed top-[52px] left-0 right-0 z-30 bg-background border-b border-border">
      <div className="flex gap-2 overflow-x-auto px-4 py-2.5" style={{ scrollbarWidth: "none" }}>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => scrollToCategory(cat.id)}
            className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
              activeCategory === cat.id
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground"
            }`}
          >
            {cat.icon_url && <img src={cat.icon_url} alt={getCatName(cat)} className="h-4 w-4 object-contain" />}
            {getCatName(cat)}
          </button>
        ))}
      </div>
    </div>
  
{/* cart code */}
    <main className="flex-1 pt-12 md:pt-0">
      {categories.map((cat, ci) => {
        const catServices = services.filter((s) => s.category_id === cat.id);
        if (catServices.length === 0) return null;
        return (
          <div
            key={cat.id}
            id={cat.id}
            ref={(el) => { sectionRefs.current[cat.id] = el; }}
            className={ci > 0 ? "mt-10" : ""}
          >
            <div className="flex items-center gap-3 mb-4 border-b border-border px-1 pb-3">
              {cat.icon_url && <img src={cat.icon_url} alt={getCatName(cat)} className="h-7 w-7 object-contain" />}
              <h2 className="font-heading text-lg font-bold text-foreground">{getCatName(cat)}</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {catServices.map((service) => (
                <CmsServiceCard
                  key={service.id}
                  service={service}
                  title={getCmsServiceTitle(service)}
                  fromLabel={fromLabel}
                  onClick={() => navigate(`/service/${service.slug}`)}
                />
              ))}
            </div>
          </div>
        );
      })}
    </main>
  </div>
);

// Legacy layout (fallback)
const LegacyLayout = ({
  categories, services, activeCategory, scrollToCategory, sectionRefs, getTitle, fromLabel, navigate, language,
}: {
  categories: typeof serviceCategories;
  services: typeof allServices;
  activeCategory: string;
  scrollToCategory: (id: string) => void;
  sectionRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
  getTitle: (s: { title: string; titleEn?: string }) => string;
  fromLabel: string;
  navigate: (path: string) => void;
  language: string;
}) => (
  <div className="flex gap-6">
    <aside className="hidden md:block w-52 shrink-0">
      <div className="sticky top-20 space-y-0.5">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => scrollToCategory(cat.id)}
            className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition-all text-left ${
              activeCategory === cat.id
                ? "bg-primary/10 text-primary font-semibold border-l-[3px] border-primary"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground border-l-[3px] border-transparent"
            }`}
          >
            <img src={cat.icon} alt={cat.name} className="h-6 w-6 object-contain" />
            {cat.name}
          </button>
        ))}
      </div>
    </aside>

    <div className="md:hidden fixed top-[52px] left-0 right-0 z-30 bg-background border-b border-border">
      <div className="flex gap-2 overflow-x-auto px-4 py-2.5" style={{ scrollbarWidth: "none" }}>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => scrollToCategory(cat.id)}
            className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
              activeCategory === cat.id
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground"
            }`}
          >
            <img src={cat.icon} alt={cat.name} className="h-4 w-4 object-contain" />
            {cat.name}
          </button>
        ))}
      </div>
    </div>

    <main className="flex-1 pt-12 md:pt-0">
      {categories.map((cat, ci) => {
        const catServices = services.filter((s) => cat.serviceSlugs.includes(s.slug));
        if (catServices.length === 0) return null;
        return (
          <div
            key={cat.id}
            id={cat.id}
            ref={(el) => { sectionRefs.current[cat.id] = el; }}
            className={ci > 0 ? "mt-10" : ""}
          >
            <div className="flex items-center gap-3 mb-4 border-b border-border px-1 pb-3">
              <img src={cat.icon} alt={cat.name} className="h-7 w-7 object-contain" />
              <h2 className="font-heading text-lg font-bold text-foreground">
                {language === "en" && cat.nameEn ? cat.nameEn : cat.name}
              </h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {catServices.map((service) => (
                <LegacyServiceCard
                  key={service.slug}
                  service={service}
                  title={getTitle(service)}
                  fromLabel={fromLabel}
                  onClick={() => navigate(`/service/${service.slug}`)}
                />
              ))}
            </div>
          </div>
        );
      })}
    </main>
  </div>
);

// CMS service card
const CmsServiceCard = ({
  service, title, fromLabel, onClick,
}: {
  service: CmsService;
  title: string;
  fromLabel: string;
  onClick: () => void;
}) => {
  const { addToCompare, removeFromCompare, isInCompare, compareList } = useCompare();
  const { language } = useLanguage();
  const bn = language === "bn";
  const inCompare = isInCompare(service.slug);

  const toggleCompare = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (inCompare) {
      removeFromCompare(service.slug);
    } else {
      addToCompare(service);
    }
  };

  return (
    <motion.button
      onClick={onClick}
      whileHover={{ y: -2 }}
      className="group rounded-xl border border-border bg-card overflow-hidden text-left transition-shadow hover:shadow-md relative"
    >
      <div className="relative aspect-[4/3] overflow-hidden yess-wm">
        <img
          src={getServiceImage(service.slug, service.image_url)}
          alt={title}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-foreground/60 to-transparent p-2">
          <span className="flex items-center gap-1 text-[10px] text-background font-medium">
            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" /> {service.rating ?? 4.5}
          </span>
        </div>
        {/* Share & Compare buttons */}
        <div className="absolute top-2 right-2 flex flex-col gap-1.5">
          <ShareButton
            url={`${window.location.origin}/service/${service.slug}`}
            title={title}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-background/80 backdrop-blur-sm border border-border text-muted-foreground hover:border-primary hover:text-primary transition-all"
            iconClassName="h-3.5 w-3.5"
          />
          <button
            onClick={toggleCompare}
            disabled={!inCompare && compareList.length >= 3}
            className={`flex h-7 w-7 items-center justify-center rounded-full border transition-all ${
              inCompare
                ? "bg-primary border-primary text-primary-foreground"
                : "bg-background/80 backdrop-blur-sm border-border text-muted-foreground hover:border-primary hover:text-primary disabled:opacity-30"
            }`}
          >
            {inCompare ? <Check className="h-3.5 w-3.5" /> : <GitCompareArrows className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>
      <div className="p-2.5">
        <h3 className="text-xs font-semibold text-foreground line-clamp-2 leading-snug group-hover:text-primary transition-colors">
          {title}
        </h3>
        {service.total_orders !== undefined && service.total_orders > 0 && (
          <p className="mt-1 text-[11px] text-muted-foreground">
            {service.total_orders}+ {bn ? "অর্ডার" : "orders"}
          </p>
        )}
      </div>
    </motion.button>
  );
};

// Legacy service card (fallback)
const LegacyServiceCard = ({
  service, title, fromLabel, onClick,
}: {
  service: { slug: string; image: string; rating: number; packages: { price: number }[] };
  title: string;
  fromLabel: string;
  onClick: () => void;
}) => (
  <motion.button
    onClick={onClick}
    whileHover={{ y: -2 }}
    className="group rounded-xl border border-border bg-card overflow-hidden text-left transition-shadow hover:shadow-md"
  >
    <div className="relative aspect-[4/3] overflow-hidden yess-wm">
      <img
        src={service.image}
        alt={title}
        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        loading="lazy"
      />
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-foreground/60 to-transparent p-2">
        <span className="flex items-center gap-1 text-[10px] text-background font-medium">
          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" /> {service.rating}
        </span>
      </div>
      <div className="absolute top-2 right-2">
        <ShareButton
          url={`${window.location.origin}/service/${service.slug}`}
          title={title}
          className="flex h-7 w-7 items-center justify-center rounded-full bg-background/80 backdrop-blur-sm border border-border text-muted-foreground hover:border-primary hover:text-primary transition-all"
          iconClassName="h-3.5 w-3.5"
        />
      </div>
    </div>
    <div className="p-2.5">
      <h3 className="text-xs font-semibold text-foreground line-clamp-2 leading-snug group-hover:text-primary transition-colors">
        {title}
      </h3>
      <p className="mt-1 text-[11px] text-muted-foreground">
        ৳{service.packages[0].price} {fromLabel}
      </p>
    </div>
  </motion.button>
);

export default AllServices;

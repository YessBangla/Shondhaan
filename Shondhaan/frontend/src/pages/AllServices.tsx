import { useState, useRef, useEffect, useMemo, forwardRef, useCallback } from "react";
import type { MutableRefObject, MouseEvent } from "react";
import { createPortal } from "react-dom";
import { getServiceImage } from "@/data/serviceImages";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Star,
  Search,
  ChevronLeft,
  GitCompareArrows,
  Check,
  X,
  Copy,
  Share2,
  SlidersHorizontal,
  MapPin,
} from "lucide-react";
import { useLocation } from "@/contexts/LocationContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCompare } from "@/contexts/CompareContext";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useSEO } from "@/hooks/useSEO";
import { divisions } from "@/data/locations";

type ApiCategory = {
  id: string;
  name: string;
  name_en?: string;
  title?: string;
  title_en?: string;
  icon_url?: string;
  is_active?: boolean | number | string;
};

type ApiService = {
  id: string;
  slug: string;
  title: string;
  title_en?: string;
  image_url?: string;
  description?: string;
  rating?: string | number;
  total_reviews?: number;
  total_orders?: number;
  features?: string[] | string;
  available_cities?: string[] | string;
  category_id?: string | null;
  is_active?: boolean | number | string;
  sort_order?: number;
  price?: string | number;
};

export const API_BASE = import.meta.env.VITE_SERVICE_API_BASE_URL + "/api";

const parseJsonArray = (value: unknown): string[] => {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value.map(String).filter(Boolean);
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : [value];
    } catch {
      return [value];
    }
  }
  return [];
};

const normalizeCity = (value: unknown) => {
  const text = String(value || "").trim().toLowerCase();

  const map: Record<string, string> = {
    ঢাকা: "dhaka",
    dhaka: "dhaka",
    চট্টগ্রাম: "chittagong",
    chittagong: "chittagong",
    sylhet: "sylhet",
    সিলেট: "sylhet",
    khulna: "khulna",
    খুলনা: "khulna",
  };

  return map[text] || text;
};

const isActive = (value: unknown) => {
  return (
    value === true ||
    value === 1 ||
    value === "1" ||
    value === undefined ||
    value === null
  );
};

/* ──────────────────────── SharePopup (portal) ──────────────────────── */

interface SharePopupProps {
  slug: string;
  title: string;
  anchorRect: DOMRect;
  onClose: () => void;
}

const SharePopup = forwardRef<HTMLDivElement, SharePopupProps>(
  ({ slug, title, anchorRect, onClose }, _ref) => {
    const [copied, setCopied] = useState(false);
    const { language } = useLanguage();
    const bn = language === "bn";
    const url = `${window.location.origin}/service/${slug}`;
    const text = bn ? `${title} - সার্ভিস দেখুন` : `Check out ${title}`;
    const popupRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      const handler = (e: MouseEvent) => {
        const target = e.target;
        if (
          popupRef.current &&
          target instanceof Node &&
          !popupRef.current.contains(target)
        ) {
          onClose();
        }
      };
      document.addEventListener("mousedown", handler);
      return () => document.removeEventListener("mousedown", handler);
    }, [onClose]);

    const copyLink = async () => {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success(bn ? "লিংক কপি হয়েছে!" : "Link copied!");
      setTimeout(() => setCopied(false), 2000);
    };

    const socials = [
      {
        name: "Facebook",
        color: "bg-[#1877F2]",
        icon: "f",
        href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      },
      {
        name: "WhatsApp",
        color: "bg-[#25D366]",
        icon: "w",
        href: `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`,
      },
      {
        name: "X",
        color: "bg-foreground",
        icon: "𝕏",
        href: `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
      },
    ];

    const top = anchorRect.bottom + window.scrollY + 8;
    const left = Math.max(
      8,
      Math.min(anchorRect.left + window.scrollX - 100, window.innerWidth - 240)
    );

    return createPortal(
      <motion.div
        ref={popupRef}
        initial={{ opacity: 0, scale: 0.9, y: -5 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: -5 }}
        transition={{ duration: 0.2 }}
        className="fixed z-[9999] w-[230px] rounded-xl bg-blue-100 p-3 shadow-xl"
        style={{ top, left, position: "absolute" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-foreground">
            {bn ? "শেয়ার করুন" : "Share"}
          </span>
          <button
            onClick={onClose}
            className="rounded-full p-0.5 hover:bg-secondary cursor-pointer"
          >
            <X className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </div>
        <div className="flex gap-2 mb-3">
          {socials.map((s) => (
            <a
              key={s.name}
              href={s.href}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex h-9 w-9 items-center justify-center rounded-full ${s.color} text-white text-sm font-bold transition-transform hover:scale-110 cursor-pointer`}
            >
              {s.icon}
            </a>
          ))}
        </div>
        <div className="flex items-center gap-1.5 rounded-lg border border-border bg-muted/50 px-2 py-1.5">
          <span className="flex-1 truncate text-[11px] text-muted-foreground">
            {url}
          </span>
          <button
            onClick={copyLink}
            className="flex shrink-0 items-center gap-1 rounded-md bg-primary px-2 py-1 text-[10px] font-medium text-white transition-colors hover:bg-primary/90 cursor-pointer"
          >
            {copied ? (
              <Check className="h-3 w-3" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
            {copied
              ? bn
                ? "কপি হয়েছে"
                : "Copied"
              : bn
                ? "কপি"
                : "Copy"}
          </button>
        </div>
      </motion.div>,
      document.body
    );
  }
);

/* ──────────────────────── Main Page ──────────────────────── */

const AllServices = () => {
  const navigate = useNavigate();
  const { selectedCity } = useLocation();
  const { t, language } = useLanguage();
  const bn = language === "bn";

  const [searchParams, setSearchParams] = useSearchParams();

  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [services, setServices] = useState<ApiService[]>([]);
  const [loading, setLoading] = useState(true);

  const categoryFromUrl = searchParams.get("category") || "";
  const catFilterFromUrl = searchParams.get("cat") || "";

  const [activeCategory, setActiveCategory] = useState(categoryFromUrl);
  const [filterCategory, setFilterCategory] = useState(catFilterFromUrl || "all");

  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [debouncedQuery, setDebouncedQuery] = useState(searchQuery);
  const [minRating, setMinRating] = useState(Number(searchParams.get("rating")) || 0);
  const [sortBy, setSortBy] = useState(searchParams.get("sort") || "popular");
  const [showFilters, setShowFilters] = useState(false);
  const [availability, setAvailability] = useState(searchParams.get("avail") || "all");
  const [cityOverride, setCityOverride] = useState(searchParams.get("city") || "");

  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const initialScrollDone = useRef(false);

  useSEO({
    title: bn ? "সকল সার্ভিস" : "All Services",
    description: bn
      ? "সন্ধানের সকল হোম সার্ভিস ব্রাউজ করুন।"
      : "Browse all home services on Shondhaan.",
    canonical: "/all-services",
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        const [serviceRes, categoryRes] = await Promise.all([
          fetch(`${API_BASE}/services`),
          fetch(`${API_BASE}/categories`),
        ]);

        const serviceJson = await serviceRes.json();
        const categoryJson = await categoryRes.json();

        const safeServices: ApiService[] = Array.isArray(serviceJson)
          ? serviceJson
          : serviceJson?.data || serviceJson?.services || [];

        const safeCategories: ApiCategory[] = Array.isArray(categoryJson)
          ? categoryJson
          : categoryJson?.data || categoryJson?.categories || [];

        setServices(safeServices);
        setCategories(safeCategories);
      } catch (err) {
        console.error("❌ AllServices fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const activeCategories = useMemo(() => {
    return categories.filter((cat) => isActive(cat.is_active));
  }, [categories]);

  const activeServices = useMemo(() => {
    return services.filter((service) => isActive(service.is_active));
  }, [services]);

  const effectiveCity = cityOverride || selectedCity;

  const cityMatched = (service: ApiService) => {
    const cities = parseJsonArray(service.available_cities);

    if (!effectiveCity || cities.length === 0) return true;

    return cities.some(
      (city) => normalizeCity(city) === normalizeCity(effectiveCity)
    );
  };

  const filteredByCity = useMemo(() => {
    return activeServices
      .filter(cityMatched)
      .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0));
  }, [activeServices, effectiveCity]);

  const getCatName = (cat: ApiCategory) =>
    bn
      ? cat.name || cat.title || "ক্যাটেগরি"
      : cat.name_en || cat.title_en || cat.name || cat.title || "Category";

  const getServiceTitle = (service: ApiService) =>
    bn ? service.title : service.title_en || service.title;

  const scrollToCategory = (catId: string, updateUrl = true) => {
    setActiveCategory(catId);

    if (updateUrl) {
      const next = new URLSearchParams(searchParams);
      next.set("category", catId);
      setSearchParams(next, { replace: true });
    }

    setTimeout(() => {
      const el = sectionRefs.current[catId];

      if (!el) return;

      const offset = window.innerWidth < 768 ? 105 : 95;
      const top = el.getBoundingClientRect().top + window.scrollY - offset;

      window.scrollTo({ top, behavior: "smooth" });
    }, 120);
  };

  useEffect(() => {
    if (loading) return;

    if (categoryFromUrl && !initialScrollDone.current) {
      initialScrollDone.current = true;
      setActiveCategory(categoryFromUrl);

      setTimeout(() => {
        scrollToCategory(categoryFromUrl, false);
      }, 400);

      return;
    }

    if (!categoryFromUrl && !activeCategory && activeCategories.length > 0) {
      setActiveCategory(activeCategories[0].id);
    }
  }, [categoryFromUrl, loading, activeCategories.length]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 200);

    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  const isFiltering = Boolean(
    debouncedQuery.trim() ||
      filterCategory !== "all" ||
      minRating > 0 ||
      sortBy !== "popular" ||
      availability !== "all" ||
      cityOverride
  );

  useEffect(() => {
    const next = new URLSearchParams(searchParams);

    debouncedQuery.trim() ? next.set("q", debouncedQuery.trim()) : next.delete("q");
    filterCategory !== "all" ? next.set("cat", filterCategory) : next.delete("cat");
    minRating > 0 ? next.set("rating", String(minRating)) : next.delete("rating");
    sortBy !== "popular" ? next.set("sort", sortBy) : next.delete("sort");
    availability !== "all" ? next.set("avail", availability) : next.delete("avail");
    cityOverride ? next.set("city", cityOverride) : next.delete("city");

    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery, filterCategory, minRating, sortBy, availability, cityOverride]);

  const searchResults = useMemo(() => {
    if (!isFiltering) return null;

    const q = debouncedQuery.trim().toLowerCase();

    let list = filteredByCity.filter((service) => {
      if (
        filterCategory !== "all" &&
        String(service.category_id || "") !== String(filterCategory)
      ) {
        return false;
      }

      if (minRating > 0 && Number(service.rating || 0) < minRating) {
        return false;
      }

      const cities = parseJsonArray(service.available_cities);

      if (availability === "nationwide" && cities.length !== 0) return false;
      if (availability === "citywide" && cities.length === 0) return false;

      if (!q) return true;

      return (
        service.title?.toLowerCase().includes(q) ||
        service.title_en?.toLowerCase().includes(q) ||
        service.description?.toLowerCase().includes(q)
      );
    });

    list = [...list].sort((a, b) => {
      if (sortBy === "rating") {
        return Number(b.rating || 0) - Number(a.rating || 0);
      }

      return Number(a.sort_order || 0) - Number(b.sort_order || 0);
    });

    return list;
  }, [
    isFiltering,
    filteredByCity,
    debouncedQuery,
    filterCategory,
    minRating,
    sortBy,
    availability,
  ]);

  useEffect(() => {
    if (loading || searchResults) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

        if (visible[0]) {
          const nextActive = visible[0].target.id;
          setActiveCategory((prev) => (prev === nextActive ? prev : nextActive));
        }
      },
      {
        rootMargin: "-120px 0px -70% 0px",
        threshold: 0,
      }
    );

    Object.values(sectionRefs.current).forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => observer.disconnect();
  }, [loading, activeCategories.length, filteredByCity.length, searchResults]);

  const allCities = useMemo(() => {
    const set = new Set<string>();

    divisions.forEach((division) => {
      division.districts.forEach((district) => {
        set.add(district.nameBn);
      });
    });

    return Array.from(set).sort((a, b) => a.localeCompare(b, "bn"));
  }, []);

  const clearAllFilters = () => {
    setSearchQuery("");
    setFilterCategory("all");
    setMinRating(0);
    setSortBy("popular");
    setAvailability("all");
    setCityOverride("");

    const next = new URLSearchParams(searchParams);
    next.delete("q");
    next.delete("cat");
    next.delete("rating");
    next.delete("sort");
    next.delete("avail");
    next.delete("city");

    setSearchParams(next, { replace: true });
  };

  return (
    <div className="min-h-screen bg-[aliceblue]">
      <Navbar />
      <div className="pt-[20px]" />

      <div className="app-container py-5 md:py-8">
        <div className="block gap-3">
          <div className="mb-5 flex items-center gap-3 w-full">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>

            <h1 className="font-heading text-xl font-bold text-foreground md:text-2xl">
              {t("as.title")}
            </h1>
          </div>
          
          <div className="mb-4 space-y-2.5 w-full">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t("as.searchPlaceholder")}
                  className="w-full rounded-xl border border-primary bg-background py-3 pl-10 pr-9 text-sm outline-none focus:ring-1 focus:ring-ring"
                />

                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-secondary"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              <button
                  type="button"
                  onClick={() => setShowFilters((prev) => !prev)}
                  className={`relative flex h-12 w-14 items-center bg-primary text-white justify-center rounded-xl border ${
                    showFilters || isFiltering
                      ? "bg-green-700 text-primary"
                      : "border-input bg-background text-foreground"
                  }`}
                >
                <SlidersHorizontal className="h-4 w-4" />

                {isFiltering && (
                  <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-primary ring-2 ring-background" />
                )}
              </button>
            </div>

            {showFilters && (
              <div className="space-y-3 rounded-xl border border-border bg-card p-3">
                <div>
                  <p className="mb-1.5 text-[11px] font-semibold uppercase text-muted-foreground">
                    {bn ? "ক্যাটাগরি" : "Category"}
                  </p>

                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => setFilterCategory("all")}
                      className={`rounded-full border px-3 py-1 text-xs font-medium ${
                        filterCategory === "all"
                          ? "border-primary bg-primary text-white"
                          : "border-border bg-background text-foreground hover:bg-secondary"
                      }`}
                    >
                      {bn ? "সব" : "All"}
                    </button>

                    {activeCategories.map((cat) => (
                      <button
                        type="button"
                        key={cat.id}
                        onClick={() => {
                          setFilterCategory(cat.id);
                          setActiveCategory(cat.id);
                        }}
                        className={`rounded-full border px-3 py-1 text-xs font-medium ${
                          filterCategory === cat.id
                            ? "border-primary bg-primary text-white"
                            : "border-border bg-background text-foreground hover:bg-secondary"
                        }`}
                      >
                        {getCatName(cat)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="mb-1.5 text-[11px] font-semibold uppercase text-muted-foreground">
                      {bn ? "সাজান" : "Sort"}
                    </p>

                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="w-full rounded-lg border border-input bg-background px-2 py-2 text-xs text-foreground outline-none"
                    >
                      <option value="popular">{bn ? "জনপ্রিয়" : "Popular"}</option>
                      <option value="rating">{bn ? "সর্বোচ্চ রেটিং" : "Top rated"}</option>
                    </select>
                  </div>

                  <div>
                    <p className="mb-1.5 text-[11px] font-semibold uppercase text-muted-foreground">
                      <MapPin className="mr-0.5 inline h-3 w-3" />
                      {bn ? "অবস্থান" : "Location"}
                    </p>

                    <select
                      value={cityOverride}
                      onChange={(e) => setCityOverride(e.target.value)}
                      className="w-full rounded-lg border border-input bg-background px-2 py-2 text-xs text-foreground outline-none"
                    >
                      <option value="">
                        {bn ? `বর্তমান (${selectedCity})` : `Current (${selectedCity})`}
                      </option>

                      {allCities.map((city) => (
                        <option key={city} value={city}>
                          {city}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <p className="mb-1.5 text-[11px] font-semibold uppercase text-muted-foreground">
                    {bn ? "ন্যূনতম রেটিং" : "Min rating"}
                  </p>

                  <div className="flex gap-1">
                    {[0, 3, 4, 4.5].map((rating) => (
                      <button
                        type="button"
                        key={rating}
                        onClick={() => setMinRating(rating)}
                        className={`flex flex-1 items-center justify-center gap-0.5 rounded-lg border px-2 py-1.5 text-xs ${
                          minRating === rating
                            ? "border-primary bg-primary/10 font-semibold text-primary"
                            : "border-border bg-background text-foreground hover:bg-secondary"
                        }`}
                      >
                        {rating === 0 ? (
                          bn ? "সব" : "Any"
                        ) : (
                          <>
                            {rating}+ <Star className="h-3 w-3 fill-current" />
                          </>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="mb-1.5 text-[11px] font-semibold uppercase text-muted-foreground">
                    {bn ? "প্রাপ্যতা" : "Availability"}
                  </p>

                  <div className="grid grid-cols-3 gap-1">
                    {[
                      { id: "all", label: bn ? "সব" : "All" },
                      { id: "citywide", label: bn ? "শহর" : "City" },
                      { id: "nationwide", label: bn ? "সারাদেশ" : "Nationwide" },
                    ].map((item) => (
                      <button
                        type="button"
                        key={item.id}
                        onClick={() => setAvailability(item.id)}
                        className={`rounded-lg border px-2 py-1.5 text-xs font-medium ${
                          availability === item.id
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border bg-background text-foreground hover:bg-secondary"
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                {isFiltering && (
                  <button
                    type="button"
                    onClick={clearAllFilters}
                    className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-border bg-background py-2 text-xs font-medium text-muted-foreground hover:bg-secondary"
                  >
                    <X className="h-3.5 w-3.5" />
                    {bn ? "সব ফিল্টার মুছুন" : "Clear all filters"}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-6">
          <CategorySidebar
            categories={activeCategories}
            activeCategory={activeCategory}
            getCatName={getCatName}
            scrollToCategory={scrollToCategory}
          />

          <main className="flex-1 pt-12 md:pt-0">
            {loading ? (
              <div className="py-16 text-center text-muted-foreground">
                {bn ? "লোড হচ্ছে..." : "Loading..."}
              </div>
            ) : searchResults ? (
              <div>
                <p className="mb-4 text-sm text-muted-foreground">
                  {searchResults.length > 0
                    ? `${searchResults.length}${t("as.found")}`
                    : t("as.notFound")}
                </p>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {searchResults.map((service) => (
                    <CmsServiceCard
                      key={service.id}
                      service={service}
                      title={getServiceTitle(service)}
                      onClick={() => navigate(`/service/${service.slug}`)}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <CategorySections
                categories={activeCategories}
                services={filteredByCity}
                sectionRefs={sectionRefs}
                getCatName={getCatName}
                getServiceTitle={getServiceTitle}
                navigate={navigate}
              />
            )}
          </main>
        </div>
        
      </div>

      <Footer />
      <div className="h-16 md:hidden" />
    </div>
  );
};

const CategorySidebar = ({
  categories,
  activeCategory,
  getCatName,
  scrollToCategory,
}: {
  categories: ApiCategory[];
  activeCategory: string;
  getCatName: (cat: ApiCategory) => string;
  scrollToCategory: (id: string) => void;
}) => {
  return (
    <>
      <aside className="hidden w-52 shrink-0 md:block">
        <div className="sticky top-20 space-y-0.5">
          {categories.map((cat) => (
            <button
              type="button"
              key={cat.id}
              onClick={() => scrollToCategory(cat.id)}
              className={`flex w-full items-center rounded gap-2.5 px-3 py-2.5 text-left text-sm transition-all ${
                activeCategory === cat.id
                  ? "border-primary bg-primary/10 font-semibold text-primary"
                  : "border-transparent text-muted-foreground hover:text-primary hover:font-semibold"
              }`}
            >
              {cat.icon_url && (
                <img
                  src={
                    /^https?:\/\//i.test(cat.icon_url)
                      ? cat.icon_url
                      : `${import.meta.env.VITE_SERVICE_API_BASE_URL}${cat.icon_url}`
                  }
                  alt={getCatName(cat)}
                  className="h-6 w-6 object-contain"
                />
              )}
              <span className="line-clamp-2">{getCatName(cat)}</span>
            </button>
          ))}
        </div>
      </aside>

      <div className="fixed left-0 right-0 top-[52px] z-30 border-b border-border bg-background md:hidden">
        <div
          className="flex gap-2 overflow-x-auto px-4 py-2.5"
          style={{ scrollbarWidth: "none" }}>
          {categories.map((cat) => (
            <button
              type="button"
              key={cat.id}
              onClick={() => scrollToCategory(cat.id)}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ${
                activeCategory === cat.id
                  ? "bg-primary text-white"
                  : "bg-secondary text-muted-foreground"
              }`}
            >
              {cat.icon_url && (
                <img
                  src={
                    /^https?:\/\//i.test(cat.icon_url)
                      ? cat.icon_url
                      : `${import.meta.env.VITE_SERVICE_API_BASE_URL}${cat.icon_url}`
                  }
                  alt={getCatName(cat)}
                  className="h-4 w-4 object-contain"
                />
              )}
              {getCatName(cat)}
            </button>
          ))}
        </div>
      </div>
    </>
  );
};

const CategorySections = ({
  categories,
  services,
  sectionRefs,
  getCatName,
  getServiceTitle,
  navigate,
}: {
  categories: ApiCategory[];
  services: ApiService[];
  sectionRefs: MutableRefObject<Record<string, HTMLDivElement | null>>;
  getCatName: (cat: ApiCategory) => string;
  getServiceTitle: (service: ApiService) => string;
  navigate: (path: string) => void;
}) => {
  const { language } = useLanguage();
  const bn = language === "bn";

  const visibleCategoryCount = categories.filter((cat) =>
    services.some((service) => String(service.category_id || "") === String(cat.id))
  ).length;

  const uncategorizedServices = services
    .filter((service) => !service.category_id)
    .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0));

  if (visibleCategoryCount === 0 && uncategorizedServices.length === 0) {
    return (
      <div className="py-16 text-center text-muted-foreground">
        {bn ? "কোনো সার্ভিস পাওয়া যায়নি" : "No services available"}
      </div>
    );
  }

  return (
    <>
      {categories.map((cat, index) => {
        const catServices = services
          .filter((service) => String(service.category_id || "") === String(cat.id))
          .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0));

        if (!catServices.length) return null;

        return (
          <div
            key={cat.id}
            id={cat.id}
            ref={(el) => {
              sectionRefs.current[cat.id] = el;
            }}
            className={index > 0 ? "mb-10" : ""}
          >
            <div className="mb-4 flex items-center gap-3 border-b border-border px-1 pb-3">
            {cat.icon_url && (
              <img
                src={
                  /^https?:\/\//i.test(cat.icon_url)
                    ? cat.icon_url
                    : `${import.meta.env.VITE_SERVICE_API_BASE_URL}${cat.icon_url}`
                }
                alt={getCatName(cat)}
                className="h-7 w-7 object-contain"
              />
            )}

              <h2 className="font-heading text-lg font-bold text-foreground">
                {getCatName(cat)}
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {catServices.map((service) => (
                <CmsServiceCard
                  key={service.id}
                  service={service}
                  title={getServiceTitle(service)}
                  onClick={() => navigate(`/service/${service.slug}`)}
                />
              ))}
            </div>
          </div>
        );
      })}

      {uncategorizedServices.length > 0 && (
        <div className={visibleCategoryCount > 0 ? "mt-10" : ""}>
          <div className="mb-4 flex items-center gap-3 border-b border-border px-1 pb-3">
            <h2 className="font-heading text-lg font-bold text-foreground">
              {bn ? "অন্যান্য সার্ভিস" : "Other Services"}
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {uncategorizedServices.map((service) => (
              <CmsServiceCard
                key={service.id}
                service={service}
                title={getServiceTitle(service)}
                onClick={() => navigate(`/service/${service.slug}`)}
              />
            ))}
          </div>
        </div>
      )}
    </>
  );
};

const CmsServiceCard = ({
  service,
  title,
  onClick,
}: {
  service: ApiService;
  title: string;
  onClick: () => void;
}) => {
  const { language } = useLanguage();
  const bn = language === "bn";

  const { addToCompare, removeFromCompare, isInCompare, compareList } = useCompare();
  const inCompare = isInCompare(service.slug);

  const [shareState, setShareState] = useState<{
    slug: string;
    title: string;
    rect: DOMRect;
  } | null>(null);

  const closeShare = useCallback(() => setShareState(null), []);

  const toggleCompare = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();

    if (inCompare) {
      removeFromCompare(service.slug);
      return;
    }

    if (compareList.length >= 3) return;

    addToCompare(service as any);
  };

  const handleShareClick = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (shareState?.slug === service.slug) {
      setShareState(null);
    } else {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      setShareState({ slug: service.slug, title, rect });
    }
  };

  const parsePrice = (value: unknown) => {
    if (value === null || value === undefined) return 0;
    const s = String(value).trim();
    if (!s) return 0;

    const cleaned = s.replace(/৳/g, "").replace(/,/g, "").replace(/\s/g, "");

    const n = Number(cleaned);
    return Number.isFinite(n) ? n : 0;
  };
  const price = parsePrice(service.price);
  const formattedPrice = price % 1 === 0 ? String(price) : price.toFixed(2);

  return (
    <motion.div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter") onClick();
      }}
      whileHover={{ y: -2 }}
      className="group relative cursor-pointer overflow-hidden rounded-xl border border-border bg-card text-left transition-shadow hover:shadow-md"
    >
      <div className="relative aspect-[4/3] overflow-hidden yess-wm">
      <img
          src={getServiceImage(
            service.slug,
            service.image_url
              ? /^https?:\/\//i.test(service.image_url)
                ? service.image_url
                : `${import.meta.env.VITE_SERVICE_API_BASE_URL}${service.image_url}`
              : service.image_url
          )}
          alt={title}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />

        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-foreground/60 to-transparent p-2">
          <span className="flex items-center gap-1 text-[10px] font-medium text-background">
            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
            {Number(service.rating || 0)}
          </span>
        </div>

        <div className="absolute right-2 top-2 flex flex-col gap-1.5">
          <button
            type="button"
            onClick={handleShareClick}
            className="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-background/80 text-muted-foreground backdrop-blur-sm hover:text-primary transition-colors cursor-pointer"
          >
            <Share2 className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={toggleCompare}
            disabled={!inCompare && compareList.length >= 3}
            className={`flex h-7 w-7 items-center justify-center rounded-full border ${
              inCompare
                ? "border-primary bg-primary text-white"
                : "border-border bg-background/80 text-muted-foreground disabled:opacity-30"
            }`}
          >
            {inCompare ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              <GitCompareArrows className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      </div>

      <div className="p-2.5">
        <h3 className="line-clamp-2 text-xs font-semibold leading-snug text-foreground group-hover:text-primary">
          {title}
        </h3>

        {price > 0 ? (
          <p className="mt-1 text-[11px] font-bold text-foreground">
            ৳{formattedPrice}
            <span className="ml-1 font-normal text-muted-foreground">
              {bn ? "থেকে" : "from"}
            </span>
          </p>
        ) : (
          <p className="mt-1 text-[11px] text-muted-foreground">
            {bn ? "দাম দেখুন" : "View"}
          </p>
        )}
        

        {!!service.total_orders && (
          <p className="mt-1 text-[11px] text-muted-foreground">
            {service.total_orders}+ orders
          </p>
        )}
      </div>

      <AnimatePresence>
        {shareState && (
          <SharePopup
            slug={shareState.slug}
            title={shareState.title}
            anchorRect={shareState.rect}
            onClose={closeShare}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default AllServices;
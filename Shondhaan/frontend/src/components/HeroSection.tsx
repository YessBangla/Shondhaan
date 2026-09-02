import { useState, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, ShoppingBag, Tag, Briefcase, ArrowRight, MapPin, ChevronDown, LucideWorkflow } from "lucide-react";
import { haptic } from "@/lib/haptics";
import { useNavigate } from "react-router-dom";
import { useLocation } from "@/contexts/LocationContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { INDIVIDUAL_API_BASE_URL } from "@/lib/api";
import { getMySqlAuth } from "@/lib/mysqlAuth";
import { useHomeServices, type HomeService } from "@/hooks/useHomeServices";
import LocationSelector from "@/components/LocationSelector";

// ─── Types ────────────────────────────────────────────────────────────────────

type SearchService = {
  slug: string;
  title: string;
  image: string | null;
  price: number;
  sortOrder: number;
  searchText: string;
};

type HeroBanner = {
  id?: string | number;
  title_bn?: string | null;
  title_en?: string | null;
  subtitle_bn?: string | null;
  subtitle_en?: string | null;
  image_url?: string | null;
  is_active?: boolean | number | string | null;
  sort_order?: number | string | null;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const parseStringList = (value: unknown): string[] => {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : [value];
    } catch {
      return value.split(",").map((item) => item.trim()).filter(Boolean);
    }
  }
  return [];
};

const normalizeSearch = (value: unknown) =>
  String(value || "")
    .toLowerCase()
    .replace(/[-_/]+/g, " ")
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

const looksMojibake = (value: unknown) => /Ã|Â|à¦|à§/.test(String(value || ""));

const chooseDisplayTitle = (service: HomeService, bn: boolean) => {
  const title = String(service.title || "").trim();
  const titleEn = String(service.title_en || "").trim();
  if (bn && title && !looksMojibake(title)) return title;
  return titleEn || title;
};

const getBackendImageUrl = (value: unknown) => {
  const imageUrl = String(value || "").trim();
  if (!imageUrl) return null;
  if (/^https?:\/\//i.test(imageUrl)) return imageUrl;
  if (!imageUrl.startsWith("/") && !imageUrl.startsWith("uploads/")) return null;
  const base = INDIVIDUAL_API_BASE_URL.replace(/\/+$/, "");
  const path = imageUrl.startsWith("/") ? imageUrl : `/${imageUrl}`;
  return `${base}${path}`;
};

const normalizeCity = (value: unknown) => {
  const text = String(value || "").trim().toLowerCase();
  const cityMap: Record<string, string> = {
    "ঢাকা": "dhaka", dhaka: "dhaka",
    "চট্টগ্রাম": "chittagong", chittagong: "chittagong", chattogram: "chittagong",
    sylhet: "sylhet", "সিলেট": "sylhet",
    khulna: "khulna", "খুলনা": "khulna",
  };
  return cityMap[text] || text;
};

const isActiveService = (service: HomeService) => {
  const value = service.is_active;
  if (value === undefined || value === null) return true;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") {
    return ["1", "true", "active", "yes"].includes(value.trim().toLowerCase());
  }
  return false;
};

const isActiveBanner = (banner: HeroBanner) => {
  const value = banner.is_active;
  if (value === undefined || value === null) return true;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") {
    return ["1", "true", "active", "yes"].includes(value.trim().toLowerCase());
  }
  return false;
};

const getAuthHeaders = () => {
  const auth = getMySqlAuth();
  return {
    "Content-Type": "application/json",
  };
};

const extractBanners = (payload: any): HeroBanner[] => {
  const data =
    payload?.data ??
    payload?.banners ??
    payload?.hero_banners ??
    payload?.items ??
    payload?.rows ??
    payload;

  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.rows)) return data.rows;
  if (Array.isArray(data?.items)) return data.items;

  return [];
};

const normalizeHeroBanner = (banner: any): HeroBanner => ({
  id: banner.id,
  title_bn: banner.title_bn ?? "",
  title_en: banner.title_en ?? "",
  subtitle_bn: banner.subtitle_bn ?? "",
  subtitle_en: banner.subtitle_en ?? "",
  image_url: banner.image_url ?? "",
  is_active: banner.is_active,
  sort_order: Number(banner.sort_order ?? 0),
});

// ─── Platform shortcuts with refined metadata & background imagery ───────────

const PLATFORM_CARDS = [
  {
    to: "/#services-section",
    labelBn: "হোম সার্ভিস", labelEn: "Sondhaan Services",
    descBn: "সেরা সার্ভিসসমূহ", descEn: "Best Services",
    Icon: LucideWorkflow,
    imgIcon: "images/modules_logo/service.png",
    accentColor: "#a89a9c",
    bgDark: "#1a1a2e",
    bgPattern: "radial-gradient(circle at 100% 100%, rgba(168, 154, 156, 0.08), transparent 50%)",
  },
  {
    to: "/mart/home",
    labelBn: "সন্ধান মার্ট", labelEn: "Shondhaan Mart",
    descBn: "প্রিমিয়াম পণ্য ও সার্ভিস", descEn: "Premium products",
    Icon: ShoppingBag,
    imgIcon: "images/modules_logo/mart.png",
    accentColor: "#d4a574",
    bgDark: "#1a1a2e",
    bgPattern: "radial-gradient(circle at 100% 0%, rgba(212, 165, 116, 0.08), transparent 50%)",
  },
  {
    to: "/deal",
    labelBn: "সন্ধান ডিল", labelEn: "Shondhaan Deal",
    descBn: "নির্ভরযোগ্য লেনদেন", descEn: "Verified exchanges",
    Icon: Tag,
    imgIcon: "images/modules_logo/deal.png",
    accentColor: "#9ca89a",
    bgDark: "#1a1a2e",
    bgPattern: "radial-gradient(circle at 0% 100%, rgba(156, 168, 154, 0.08), transparent 50%)",
  },
  {
    to: "/jobs",
    labelBn: "চাকরির সূযোগ", labelEn: "Job Opportunities",
    descBn: "দক্ষ পেশাদাররা", descEn: "Skilled professionals",
    Icon: Briefcase,
    imgIcon: "images/modules_logo/job.png",
    accentColor: "#a89a9c",
    bgDark: "#1a1a2e",
    bgPattern: "radial-gradient(circle at 100% 100%, rgba(168, 154, 156, 0.08), transparent 50%)",
  },
] as const;

// ─── Demo guard ───────────────────────────────────────────────────────────

const DEMO_EMAILS = new Set([
  "representative@yessservice.com", "admin@yessservice.com",
  "provider@yessservice.com", "callcenter@yessservice.com",
  "moderator@yessservice.com", "supervisor@yessservice.com",
  "finance@yessservice.com", "delivery@yessservice.com",
  "superadmin@yessservice.com", "vendor@yessservice.com", "dealer@yessservice.com",
]);

// ─── Elegant Search Dropdown ──────────────────────────────────────────────────

function SearchDropdown({
  show,
  filtered,
  quickSuggestions,
  activeIndex,
  setActiveIndex,
  onSelect,
  bn,
}: {
  show: "results" | "quick" | false;
  filtered: SearchService[];
  quickSuggestions: SearchService[];
  activeIndex: number;
  setActiveIndex: (i: number) => void;
  onSelect: (slug: string) => void;
  bn: boolean;
}) {
  if (!show) return null;
  
  return (
    <AnimatePresence>
      <motion.div
        key={show}
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-lg border border-amber-900/25 bg-slate-950/98 shadow-xl shadow-black/40 bg-white"
      >
        {show === "results" ? (
          filtered.length > 0 ? (
            <ul className="max-h-64 overflow-y-auto divide-y divide-amber-900/10">
              {filtered.map((s, i) => (
                <li key={s.slug}>
                  <button
                    onClick={() => onSelect(s.slug)}
                    onMouseEnter={() => setActiveIndex(i)}
                    className={`flex w-full items-center gap-3 px-4 py-2 text-left transition-all duration-150 ${
                      i === activeIndex ? "bg-amber-900/15" : "hover:bg-amber-900/8"
                    }`}
                  >
                    {s.image ? (
                      <img src={s.image} alt={s.title} className="h-10 w-10 rounded-sm object-cover" />
                    ) : (
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm bg-amber-900/10">
                        <Search className="h-4 w-4 text-amber-700/60" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-semibold text-foreground">{s.title}</p>
                      <p className="text-[12px] text-amber-foreground mt-0.5">
                        ৳{s.price} {bn ? "থেকে" : "from"}
                      </p>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 shrink-0 text-foreground" />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
              <Search className="h-6 w-6 text-amber-700/30" />
              <p className="text-xs text-amber-200/40">
                {bn ? "সার্ভিস পাওয়া যায়নি" : "No service found"}
              </p>
            </div>
          )
        ) : (
          <div className="p-3 space-y-2">
            <p className="text-[9px] font-semibold uppercase tracking-widest text-forground">
              {bn ? "সাজেশন" : "Suggestions"}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {quickSuggestions.map((s) => (
                <button
                  key={s.slug}
                  onClick={() => onSelect(s.slug)}
                  className="rounded-sm border border-amber-700/25 bg-amber-900/10 px-2.5 py-1 text-[10px] font-bold text-foreground transition-colors hover:bg-amber-900/20 hover:border-amber-700/40"
                >
                  {s.title}
                </button>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Premium HeroSection ──────────────────────────────────────────────────────

const HeroSection = () => {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [pressedCard, setPressedCard] = useState<string | null>(null);

  const { selectedCity, selectedCityEn } = useLocation();
  const { language } = useLanguage();
  const bn = language === "bn";
  const navigate = useNavigate();
  const { services, categories } = useHomeServices();

  const [heroBanners, setHeroBanners] = useState<HeroBanner[]>([]);
  
  useEffect(() => {
    let cancelled = false;
    const fetchHeroBanners = async () => {
      try {
        const response = await fetch(
          `${INDIVIDUAL_API_BASE_URL.replace(/\/+$/, "")}/api/hero-banners?active=1`,
          { headers: getAuthHeaders() }
        );
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload?.message || "Failed");
        const rows = extractBanners(payload)
          .map(normalizeHeroBanner)
          .filter(isActiveBanner)
          .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0));
        if (!cancelled) setHeroBanners(rows);
      } catch (error) {
        console.error("Hero banners error:", error);
        if (!cancelled) setHeroBanners([]);
      }
    };
    fetchHeroBanners();
    return () => { cancelled = true; };
  }, []);

  const authUser = getMySqlAuth()?.user;
  const isDemo = authUser?.email ? DEMO_EMAILS.has(authUser.email) : false;
  const rawName = authUser?.name;
  const isDemoName = rawName?.toLowerCase().startsWith("demo");
  const userName =
    !isDemo && !isDemoName
      ? rawName || (authUser?.email ? authUser.email.split("@")[0] : null)
      : null;
  const greetName = userName || (bn ? "ভিসিটর" : "Visitor");

  const activeHeroBanner = heroBanners[0];

  const heroTitle =
    (bn ? activeHeroBanner?.title_bn : activeHeroBanner?.title_en || activeHeroBanner?.title_bn) ||
    (bn ? "আপনার সার্ভিসর অংশীদার" : "Your Service Partner");

  const heroSubtitle =
    (bn ? activeHeroBanner?.subtitle_bn : activeHeroBanner?.subtitle_en || activeHeroBanner?.subtitle_bn) ||
    (bn ? "প্রিমিয়াম সার্ভিস প্রদানকারী এবং নির্ভরযোগ্য সমাধান" : "Premium providers and trusted solutions");

  const heroImage = getBackendImageUrl(activeHeroBanner?.image_url) || "/hero1.png";

  const mobileSearchRef = useRef<HTMLDivElement>(null);
  const desktopSearchRef = useRef<HTMLDivElement>(null);

  const cityServices: SearchService[] = useMemo(() => {
    const categoryById = new Map(
      categories.map((c) => [
        String(c.id),
        { name: c.name, nameEn: c.name_en, slug: c.slug },
      ])
    );
    const selectedCityKeys = [selectedCity, selectedCityEn]
      .map(normalizeCity)
      .filter(Boolean);

    const activeServices = services.filter(isActiveService);
    const cityMatched = activeServices.filter((service) => {
      const cities = parseStringList(service.available_cities).map(normalizeCity).filter(Boolean);
      if (selectedCityKeys.length === 0 || cities.length === 0) return true;
      return selectedCityKeys.some((s) => cities.includes(s));
    });
    const visible = cityMatched.length > 0 ? cityMatched : activeServices;

    return visible
      .map((service) => {
        const category = service.category_id
          ? categoryById.get(String(service.category_id))
          : undefined;
        const title = chooseDisplayTitle(service, bn);
        const searchText = [
          service.title, service.title_en, service.slug, service.description,
          category?.name, category?.nameEn, category?.slug,
          service.category_name, service.category_title, service.category_slug,
          ...parseStringList(service.features),
          ...parseStringList(service.available_cities),
        ]
          .map(normalizeSearch)
          .filter(Boolean)
          .join(" ");

        return {
          slug: service.slug || "",
          title,
          image: getBackendImageUrl(service.image_url),
          price: Number(service.price || 0),
          sortOrder: Number(service.sort_order ?? 9999),
          searchText,
        };
      })
      .filter((s) => s.slug && s.title)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title));
  }, [bn, categories, selectedCity, selectedCityEn, services]);

  const filtered = useMemo(() => {
    const terms = normalizeSearch(query).split(" ").filter(Boolean);
    if (terms.length === 0) return [];
    const exact = cityServices.filter((s) => terms.every((t) => s.searchText.includes(t)));
    const loose = cityServices.filter((s) => terms.some((t) => s.searchText.includes(t)));
    return (exact.length > 0 ? exact : loose).slice(0, 8);
  }, [cityServices, query]);

  const quickSuggestions = cityServices.slice(0, 6);
  const featuredServices = cityServices.slice(0, 4);
  const showDropdown = focused && query.trim().length > 0 ? "results" : focused && query.trim().length === 0 ? "quick" : false;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target;
      const inside =
        target instanceof Node &&
        [mobileSearchRef.current, desktopSearchRef.current].some((n) => n?.contains(target));
      if (!inside) setFocused(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => { setActiveIndex(-1); }, [query]);

  const handleSelect = (slug: string) => {
    setQuery(""); setFocused(false); setActiveIndex(-1);
    navigate(`/service/${slug}`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (filtered.length === 0) return;
    const idx = activeIndex >= 0 && activeIndex < filtered.length ? activeIndex : 0;
    handleSelect(filtered[idx].slug);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown || filtered.length === 0) {
      if (e.key === "Escape") { setFocused(false); }
      return;
    }
    if (e.key === "ArrowDown") { e.preventDefault(); setActiveIndex((p) => (p + 1) % filtered.length); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActiveIndex((p) => (p <= 0 ? filtered.length - 1 : p - 1)); }
    else if (e.key === "Escape") { e.preventDefault(); setFocused(false); setActiveIndex(-1); }
  };

  const handleCardClick = (to: string) => {
    if (pressedCard) return;
    haptic("medium");
    setPressedCard(to);

    // Handle same-page anchor scroll (e.g. "/#services-section")
    if (to.startsWith("/#")) {
      const targetId = to.split("#")[1];

      window.setTimeout(() => {
        if (window.location.pathname === "/") {
          // Already on home page — just smooth scroll, no navigation needed
          document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth", block: "start" });
          setPressedCard(null);
        } else {
          // Not on home page — navigate there, then scroll after it mounts
          try { sessionStorage.setItem("yess:nav-transition", to); } catch {}
          navigate("/");
          window.setTimeout(() => {
            document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth", block: "start" });
          }, 300);
          setPressedCard(null);
        }
      }, 200);
      return;
    }

    try { sessionStorage.setItem("yess:nav-transition", to); } catch {}
    window.setTimeout(() => { navigate(to); setPressedCard(null); }, 200);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <section className="relative -mt-px bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950" data-hero-section>
      
      {/* ══════════════════════ MOBILE HERO ══════════════════════ */}
      <div 
        className="md:hidden relative min-h-fit pb-6 flex flex-col bg-slate-950 bg-cover bg-center" 
        style={{ 
          paddingTop: "100px",
          backgroundImage: heroImage 
            ? `linear-gradient(135deg, rgba(15, 23, 42, 0.32), rgba(15, 23, 42, 0.65)), url('${heroImage}')`
            : "linear-gradient(135deg, rgba(15, 23, 42, 1), rgba(15, 23, 42, 0.95))"
        }}
      >
        {/* Subtle gradient accents */}
        <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-0 w-96 h-96 bg-amber-900/5 rounded-full blur-3xl" />
          <div className="absolute bottom-32 left-0 w-80 h-80 bg-amber-900/3 rounded-full blur-3xl" />
          
          {/* Decorative mesh pattern */}
          <svg className="absolute inset-0 w-full h-full opacity-5" preserveAspectRatio="none">
            <defs>
              <pattern id="mesh" x="0" y="0" width="80" height="80" patternUnits="userSpaceOnUse">
                <path d="M0 0L80 80M80 0L0 80" stroke="currentColor" strokeWidth="0.5" fill="none" />
                <circle cx="40" cy="40" r="2" fill="currentColor" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#mesh)" className="text-amber-600" />
          </svg>
        </div>

        <div className="flex-1 flex flex-col items-center px-4 py-3 text-center">
          
          {/* Greeting */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="w-full text-center"
          >
            <p className="hidden text-[10px] font-medium tracking-widest uppercase text-white mb-1">
              {bn ? "স্বাগতম" : "Welcome back"}
            </p>
            <h1 className="font-serif text-lg font-light text-white leading-tight">
              {bn ? "হ্যালো, " : "Hello, "}<span className="font-medium">{greetName}</span> 👋
            </h1>
          </motion.div>

          {/* Search box - PRIORITY */}
          <motion.div
            ref={mobileSearchRef}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.08 }}
            className="relative z-30 w-full max-w-md mt-3 mb-4">
            <form onSubmit={handleSubmit} className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-amber-900/20 to-transparent rounded-lg opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 blur" />
              <div className="relative flex items-center gap-2 rounded-lg border border-background bg-background px-3 py-2 backdrop-blur-sm">
                <Search className="h-4 w-4 text-foreground shrink-0" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onFocus={() => setFocused(true)}
                  onKeyDown={handleKeyDown}
                  placeholder={bn ? "সার্ভিস খুঁজুন" : "Search services"}
                  className="flex-1 min-w-0 bg-transparent text-xs !outline-none placeholder:text-foreground text-center"
                />
                <button
                  type="submit"
                  className="flex items-center justify-center h-8 w-8 rounded-md bg-primary text-amber-50 hover:bg-green-600 transition-colors flex-shrink-0"
                >
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </form>
            
            <SearchDropdown
              show={showDropdown}
              filtered={filtered}
              quickSuggestions={quickSuggestions}
              activeIndex={activeIndex}
              setActiveIndex={setActiveIndex}
              onSelect={handleSelect}
              bn={bn}
            />
          </motion.div>

          {/* Cards & Popular Grid - Below Search */}
          <AnimatePresence>
            {!showDropdown && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.4, delay: 0.16 }}
                className="w-full max-w-md space-y-3"
              >
                {/* Platform Cards - 2x2 Grid */}
                <div className="grid grid-cols-2 gap-2">
                  {PLATFORM_CARDS.map(({ to, labelBn, labelEn, Icon, imgIcon, accentColor, bgPattern }, idx) => {
                    const isPressed = pressedCard === to;
                    return (
                      <motion.button
                        key={to}
                        initial={{ opacity: 0, scale: 0.92, y: 8 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: idx * 0.05 }}
                        onClick={() => handleCardClick(to)}
                        className="group relative bg-background overflow-hidden rounded-lg border border-white-900/20 p-2.5 text-center transition-all duration-300">
                        <div className="absolute inset-0 bg-gradient-to-br from-amber-900/0 to-amber-900/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        <div className="relative flex flex-col items-center gap-2">
                          <div 
                            className="flex items-center justify-center h-10 w-10 rounded-lg flex-shrink-0 bg-transparent">
                            {/* <Icon className="h-5 w-5 text-foreground" /> */}
                            <img src={imgIcon} alt="" />
                          </div>
                          <h3 className="text-sm font-semibold text-foreground">
                            {bn ? labelBn : labelEn}
                          </h3>
                        </div>
                        {isPressed && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="absolute inset-0 rounded-lg bg-gradient-to-br from-white/10 to-transparent pointer-events-none"
                          />
                        )}
                      </motion.button>
                    );
                  })}
                </div>

                {/* Popular Searches - Grid */}
                {featuredServices.length > 0 && (
                  <div className="hidden">
                    <p className="text-[12px] uppercase tracking-widest text-background font-medium mb-1.5 text-center">
                      {bn ? "জনপ্রিয় সার্চ" : "Popular Searches"}
                    </p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {featuredServices.slice(0, 4).map((service, idx) => (
                        <motion.button
                          key={service.slug}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.3, delay: 0.24 + idx * 0.04 }}
                          onClick={() => handleSelect(service.slug)}
                          className="px-2 py-1.5 rounded-lg border border-orange-500 backdrop-blur-lg bg-orange-500/20 text-[13px] text-background hover:bg-orange-500 hover:text-black transition-all duration-200 font-light line-clamp-2 text-center"
                        >
                          {service.title}
                        </motion.button>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ══════════════════════ DESKTOP HERO ══════════════════════ */}
      <div 
        className="hidden md:flex relative min-h-fit items-center justify-center bg-cover bg-center py-12"
        style={{
          backgroundImage: heroImage 
            ? `linear-gradient(135deg, rgba(15, 23, 42, 0.28), rgba(15, 23, 42, 0.92)), url('${heroImage}')`
            : "linear-gradient(135deg, rgba(15, 23, 42, 1), rgba(15, 23, 42, 0.95))"
        }}
        >
        {/* Background treatment */}
        <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 right-20 w-[600px] h-[600px] bg-amber-900/8 rounded-full blur-3xl" />
          <div className="absolute bottom-0 -left-40 w-[500px] h-[500px] bg-amber-900/5 rounded-full blur-3xl" />
          
          {/* Decorative grid pattern */}
          <svg className="absolute inset-0 w-full h-full opacity-[0.02]" preserveAspectRatio="none">
            <defs>
              <pattern id="grid-desktop" x="0" y="0" width="120" height="120" patternUnits="userSpaceOnUse">
                <path d="M0 0L120 120M120 0L0 120" stroke="white" strokeWidth="0.5" fill="none" />
                <circle cx="60" cy="60" r="1.5" fill="white" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid-desktop)" />
          </svg>
        </div>

        <div className="w-full max-w-4xl mx-auto px-4" style={{ paddingTop: "22px", paddingBottom: "32px" }}>
          
          {/* Greeting & Headline - Centered */}
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-6 text-center"
            >
            {/* <p className="text-[10px] font-medium uppercase tracking-widest text-white mb-1"> */}
              {/* {bn ? "স্বাগতম" : "Welcome back"}
            </p> */}
            <h1 className="text-3xl font-light text-amber-50 mb-1">
              {heroTitle}
            </h1>
            <p className="text-sm text-amber-200 font-light">
              {heroSubtitle}
            </p>
          </motion.div>

          {/* Search - Centered with max-width */}
          <motion.div
            ref={desktopSearchRef}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="relative z-30 mx-auto mb-6"
            style={{ maxWidth: "640px" }}
            >
              <form onSubmit={handleSubmit} className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-white-900/40 to-transparent rounded-lg opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 blur" />
                <div className="relative flex items-stretch gap-2 rounded-lg border border-white-900/30 bg-white backdrop-blur-sm p-1.5 shadow-lg shadow-amber-900/20 text-black">
                  {/* Location */}
                  <div className="hidden lg:flex items-center gap-1.5 rounded-md border border-white-900/20 bg-white-900 px-3.5 text-xs text-black">
                    <LocationSelector />
                    {/* <MapPin className="h-3.5 w-3.5 opacity-60" /> */}
                  </div>

                  {/* Input */}
                  <div className="flex flex-1 items-center gap-2 px-3">
                    <Search className="h-4 w-4 text-black shrink-0" />
                    <input
                      type="text"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      onFocus={() => setFocused(true)}
                      onKeyDown={handleKeyDown}
                      placeholder={bn ? "আপনি কী সার্ভিস খুঁজছেন?" : "What service are you looking for?"}
                      className="flex-1 bg-transparent text-black outline-none placeholder:text-black font-light text-sm py-2.5 text-center"
                    />
                  </div>

                  {/* Button */}
                  <button
                    type="submit"
                   className="flex items-center justify-center gap-1.5 px-6 rounded-md bg-gradient-to-br from-blue-900 via-green-700 to-green-800 text-amber-50 hover:from-green-700 hover:to-green-900 transition-all duration-200 font-medium text-sm shadow-md shadow-amber-900/30"
                  >
                    <Search className="h-4 w-4" />
                    <span>{bn ? "খুঁজুন" : "Search"}</span>
                  </button>
                </div>
              </form>

              {/* Desktop dropdown */}
              <SearchDropdown
                show={showDropdown}
                filtered={filtered}
                quickSuggestions={quickSuggestions}
                activeIndex={activeIndex}
                setActiveIndex={setActiveIndex}
                onSelect={handleSelect}
                bn={bn}
              />
          </motion.div>

          {/* Cards & Popular Services Grid */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="max-w-7xl mx-auto"
            >
            {/* Platform Cards - 4 column */}
            <div className="grid grid-cols-4 gap-3 mb-4">
              {PLATFORM_CARDS.map(({ to, labelBn, labelEn, descBn, descEn, imgIcon, Icon, accentColor, bgPattern }, idx) => {
                const isPressed = pressedCard === to;
                return (
                  <motion.button
                    key={to}
                    initial={{ opacity: 0, scale: 0.9, y: 12 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ duration: 0.35, delay: 0.22 + idx * 0.06 }}
                    onClick={() => handleCardClick(to)}
                    whileHover={{ y: -8 }}
                    className="group relative overflow-hidden rounded-lg border border-white backdrop-blur-sm text-center hover:border-primary transition-all duration-300 flex flex-col items-center"
                    style={{ background: `linear-gradient(135deg, rgba(51, 65, 85, 0.6), rgba(15, 23, 42, 0.6)), ${bgPattern}` }}
                  >
                    <div className="absolute inset-0 bg-background group-hover:opacity-100 transition-opacity duration-300" />
                    
                    <div className="relative flex flex-col items-center h-full gap-2 pt-2">
                      <div 
                        className="flex items-center justify-center h-10 w-10 rounded-lg flex-shrink-0 p-1">
                        {/* <Icon className="h-7 w-7 text-white group-hover:text-primary transition-colors" /> */}
                        <img src={imgIcon} style={{ filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.25))" }} alt="" />
                      </div>
                      
                      <div className="flex-1">
                        <p className="text-[9px] uppercase tracking-widest font-medium mb-0.5 text-foreground group-hover:text-primary transition-colors">
                          {bn ? descBn : descEn}
                        </p>
                        <h3 className="text-[15px] font-semibold text-foreground group-hover:text-primary transition-colors leading-tight">
                          {bn ? labelBn : labelEn}
                        </h3>
                      </div>

                      <ArrowRight className="h-3 w-3.5 text-amber-700/40 group-hover:text-amber-700/60 transition-colors mt-auto" />
                    </div>

                    {isPressed && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="absolute inset-0 rounded-lg bg-gradient-to-br from-white/10 via-transparent to-transparent pointer-events-none"
                      />
                    )}
                  </motion.button>
                );
              })}
            </div>

            {/* Popular Searches Section */}
            {/* {featuredServices.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.4 }}
              >
                <p className="text-[9px] uppercase tracking-widest text-amber-700/50 font-medium mb-2 text-center">
                  {bn ? "জনপ্রিয় খোঁজা" : "Popular searches"}
                </p>
                <div className="grid grid-cols-6 gap-2">
                  {featuredServices.slice(0, 6).map((service, idx) => (
                    <motion.button
                      key={service.slug}
                      initial={{ opacity: 0, scale: 0.92 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3, delay: 0.45 + idx * 0.04 }}
                      onClick={() => handleSelect(service.slug)}
                      className="px-2.5 py-1.5 rounded-lg border border-amber-900/20 bg-amber-900/8 text-[11px] text-amber-100 hover:bg-amber-900/15 hover:border-amber-900/40 transition-all duration-200 font-light line-clamp-2 text-center"
                    >
                      {service.title}
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )} */}
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
import { useState, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, ShoppingBag, Tag, Briefcase, ArrowRight, MapPin, ChevronDown } from "lucide-react";
import { haptic } from "@/lib/haptics";
import { useNavigate } from "react-router-dom";
import { useLocation } from "@/contexts/LocationContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { INDIVIDUAL_API_BASE_URL } from "@/lib/api";
import { getMySqlAuth } from "@/lib/mysqlAuth";
import { useHomeServices, type HomeService } from "@/hooks/useHomeServices";
import LocationSelector from "@/components/LocationSelector";
import heroBg from "../../public/hero1.png";

// ─── Types ────────────────────────────────────────────────────────────────────

type SearchService = {
  slug: string;
  title: string;
  image: string | null;
  price: number;
  sortOrder: number;
  searchText: string;
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

const isActiveService = (service: HomeService) =>
  service.is_active === true || service.is_active === 1 || service.is_active === undefined;

// ─── Shortcut card data ───────────────────────────────────────────────────────

const SHORTCUTS = [
  {
    to: "/mart/home",
    labelBn: "ইয়েস মার্ট", labelEn: "Yess Mart",
    subBn: "শপিং", subEn: "Shop",
    Icon: ShoppingBag,
    gradient: "from-orange-500 via-rose-500 to-pink-600",
    iconGradient: "from-orange-500 to-rose-500",
    shadow: "shadow-orange-500/30",
    ring: "ring-orange-400/30",
  },
  {
    to: "/deal",
    labelBn: "ইয়েস ডিল", labelEn: "Yess Deal",
    subBn: "কেনা-বেচা", subEn: "Classifieds",
    Icon: Tag,
    gradient: "from-emerald-500 via-teal-500 to-cyan-600",
    iconGradient: "from-emerald-500 to-teal-500",
    shadow: "shadow-emerald-500/30",
    ring: "ring-emerald-400/30",
  },
  {
    to: "/jobs",
    labelBn: "ইয়েস জবস", labelEn: "Yess Jobs",
    subBn: "চাকরি", subEn: "Careers",
    Icon: Briefcase,
    gradient: "from-indigo-500 via-blue-600 to-violet-600",
    iconGradient: "from-indigo-500 to-violet-500",
    shadow: "shadow-indigo-500/30",
    ring: "ring-indigo-400/30",
  },
] as const;

// ─── Demo guard ───────────────────────────────────────────────────────────────

const DEMO_EMAILS = new Set([
  "representative@yessservice.com", "admin@yessservice.com",
  "provider@yessservice.com", "callcenter@yessservice.com",
  "moderator@yessservice.com", "supervisor@yessservice.com",
  "finance@yessservice.com", "delivery@yessservice.com",
  "superadmin@yessservice.com", "vendor@yessservice.com", "dealer@yessservice.com",
]);

// ─── SearchDropdown ───────────────────────────────────────────────────────────

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
        initial={{ opacity: 0, y: -6, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -4, scale: 0.98 }}
        transition={{ duration: 0.15, ease: "easeOut" }}
        className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-border bg-popover shadow-2xl"
      >
        {show === "results" ? (
          filtered.length > 0 ? (
            <ul className="max-h-72 overflow-y-auto py-1">
              {filtered.map((s, i) => (
                <li key={s.slug}>
                  <button
                    onClick={() => onSelect(s.slug)}
                    onMouseEnter={() => setActiveIndex(i)}
                    className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                      i === activeIndex ? "bg-secondary" : "hover:bg-secondary"
                    }`}
                  >
                    {s.image ? (
                      <img src={s.image} alt={s.title} className="h-10 w-10 rounded-xl object-cover" />
                    ) : (
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
                        <Search className="h-4 w-4" />
                      </span>
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{s.title}</p>
                      <p className="text-xs text-muted-foreground">
                        ৳{s.price} {bn ? "থেকে" : "from"}
                      </p>
                    </div>
                    <ArrowRight className="ml-auto h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex flex-col items-center gap-1 px-4 py-8 text-center">
              <Search className="h-8 w-8 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">
                {bn ? "কোনো সেবা পাওয়া যায়নি" : "No service found"}
              </p>
            </div>
          )
        ) : (
          <div className="p-3">
            <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {bn ? "জনপ্রিয় সেবা" : "Popular services"}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {quickSuggestions.map((s) => (
                <button
                  key={s.slug}
                  type="button"
                  onClick={() => onSelect(s.slug)}
                  className="rounded-full border border-border bg-secondary/60 px-3 py-1.5 text-xs font-medium text-foreground transition-colors active:bg-secondary hover:bg-secondary"
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

// ─── HeroSection ──────────────────────────────────────────────────────────────

const HeroSection = () => {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [pressedShortcut, setPressedShortcut] = useState<string | null>(null);

  const { selectedCity, selectedCityEn } = useLocation();
  const { language } = useLanguage();
  const bn = language === "bn";
  const navigate = useNavigate();
  const { services, categories } = useHomeServices();

  const authUser = getMySqlAuth()?.user;
  const isDemo = authUser?.email ? DEMO_EMAILS.has(authUser.email) : false;
  const rawName = authUser?.name;
  const isDemoName = rawName?.toLowerCase().startsWith("demo");
  const userName =
    !isDemo && !isDemoName
      ? rawName || (authUser?.email ? authUser.email.split("@")[0] : null)
      : null;
  const greetName = userName || (bn ? "অতিথি" : "Guest");

  const mobileSearchRef = useRef<HTMLDivElement>(null);
  const desktopSearchRef = useRef<HTMLDivElement>(null);

  // ── Service list filtered by city ─────────────────────────────────────────

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

  // ── Search results ────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    const terms = normalizeSearch(query).split(" ").filter(Boolean);
    if (terms.length === 0) return [];
    const exact = cityServices.filter((s) => terms.every((t) => s.searchText.includes(t)));
    const loose = cityServices.filter((s) => terms.some((t) => s.searchText.includes(t)));
    return (exact.length > 0 ? exact : loose).slice(0, 6);
  }, [cityServices, query]);

  const quickSuggestions = cityServices.slice(0, 8);
  const popularServices = cityServices.slice(0, 5);

  const showDropdown = focused && query.trim().length > 0 ? "results" : focused && query.trim().length === 0 ? "quick" : false;
  const suggestionsOpen = !!showDropdown;

  // ── Event handlers ────────────────────────────────────────────────────────

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
      if (e.key === "Escape") { setFocused(false); (e.target as HTMLInputElement).blur(); }
      return;
    }
    if (e.key === "ArrowDown") { e.preventDefault(); setActiveIndex((p) => (p + 1) % filtered.length); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActiveIndex((p) => (p <= 0 ? filtered.length - 1 : p - 1)); }
    else if (e.key === "Escape") { e.preventDefault(); setFocused(false); setActiveIndex(-1); }
  };

  const handleShortcutClick = (to: string) => {
    if (pressedShortcut) return;
    haptic("medium");
    setPressedShortcut(to);
    try { sessionStorage.setItem("yess:nav-transition", to); } catch {}
    try { window.scrollTo({ top: 0, behavior: "smooth" }); } catch { window.scrollTo(0, 0); }
    window.setTimeout(() => { navigate(to); setPressedShortcut(null); }, 220);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <section className="relative -mt-px" data-hero-section>

      {/* Nav progress bar */}
      <AnimatePresence>
        {pressedShortcut && (
          <motion.div
            key="nav-progress"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-x-0 top-0 z-[100] h-0.5 overflow-hidden md:hidden"
          >
            <motion.div
              initial={{ width: "0%" }} animate={{ width: "85%" }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="h-full bg-gradient-to-r from-orange-500 via-rose-500 to-pink-600"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════════════════════ MOBILE HERO ══════════════════════ */}
      <div
        className="md:hidden relative pb-6"
        style={{ paddingTop: "max(72px, calc(var(--app-header-h, 96px) + 4px))" }}
      >
        {/* Ambient blobs */}
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute -top-12 left-[-20%] h-64 w-64 rounded-full bg-orange-400/20 blur-3xl" />
          <div className="absolute -top-4 right-[-25%] h-72 w-72 rounded-full bg-emerald-400/18 blur-3xl" />
          <div className="absolute top-36 left-1/3 h-56 w-56 rounded-full bg-violet-400/15 blur-3xl" />
        </div>

        <div className="px-4 xs:px-5">

          {/* Welcome pill */}
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
          >
            <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-orange-500 to-rose-500 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-white shadow-lg shadow-orange-500/30">
              <span className="relative flex h-1.5 w-1.5" aria-hidden>
                <span className="absolute inline-flex h-full w-full rounded-full bg-white/70 animate-ping" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" />
              </span>
              {bn ? "স্বাগতম" : "Welcome"}
            </span>
          </motion.div>

          {/* Greeting row */}
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.05 }}
            className="mt-3 flex items-center gap-3"
          >
            {/* Avatar */}
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-rose-500 text-base font-bold text-white shadow-lg shadow-orange-500/40">
              {greetName[0]?.toUpperCase() ?? "G"}
            </div>
            <div className="min-w-0">
              <h1 className="truncate font-heading text-[20px] font-bold leading-tight tracking-tight text-foreground">
                {bn ? "হ্যালো," : "Hello,"}{" "}
                <span className="inline-block">{greetName} 👋</span>
              </h1>
              <p className="mt-0.5 text-[12px] leading-snug text-muted-foreground">
                {bn ? "আজ কোন সেবা নেবেন?" : "What service do you need today?"}
              </p>
            </div>
          </motion.div>

          {/* Search bar */}
          <motion.div
            ref={mobileSearchRef}
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="relative z-30 mt-4"
          >
            <form
              onSubmit={handleSubmit}
              className="flex items-center gap-2 rounded-2xl border border-border/70 bg-card/90 px-3.5 py-2 shadow-[0_6px_24px_-8px_hsl(var(--foreground)/0.18)] backdrop-blur-xl"
            >
              <Search className="h-[18px] w-[18px] shrink-0 text-muted-foreground" strokeWidth={2.2} />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => setFocused(true)}
                onKeyDown={handleKeyDown}
                role="combobox"
                aria-expanded={showDropdown === "results"}
                placeholder={bn ? "আপনি কোন সার্ভিস খুঁজছেন?" : "What service are you looking for?"}
                className="flex-1 min-w-0 bg-transparent py-2.5 text-[15px] text-foreground outline-none placeholder:text-muted-foreground/70"
              />
              <button
                type="submit"
                aria-label="Search"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-rose-500 text-white shadow-md shadow-orange-500/40 transition-transform active:scale-90"
              >
                <Search className="h-[17px] w-[17px]" strokeWidth={2.4} />
              </button>
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

          {/* Platform shortcuts */}
          <AnimatePresence initial={false}>
            {!suggestionsOpen && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.25 }}
                className="mt-4 grid grid-cols-3 gap-2.5"
              >
                {SHORTCUTS.map(({ to, labelBn, labelEn, subBn, subEn, Icon, gradient, iconGradient, shadow, ring }) => {
                  const isPressed = pressedShortcut === to;
                  return (
                    <motion.button
                      key={to}
                      whileTap={{ scale: 0.95 }}
                      animate={isPressed ? { scale: 0.93, y: 1 } : { scale: 1, y: 0 }}
                      transition={{ type: "spring", stiffness: 380, damping: 22 }}
                      onClick={() => handleShortcutClick(to)}
                      aria-busy={isPressed}
                      aria-label={`${bn ? labelBn : labelEn} — ${bn ? subBn : subEn}`}
                      className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br ${gradient} p-[1.5px] ring-1 ${ring} shadow-lg ${shadow} min-h-[92px]`}
                    >
                      <div className={`relative flex h-full flex-col items-start justify-between gap-2 rounded-[14.5px] bg-card/95 px-3 py-3 backdrop-blur-sm`}>
                        {/* Icon pill */}
                        <div className={`flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${iconGradient} text-white shadow-sm`}>
                          <Icon className="h-[17px] w-[17px]" strokeWidth={2.4} />
                        </div>
                        {/* Label */}
                        <div className="min-w-0">
                          <p className="line-clamp-1 text-[12.5px] font-bold leading-tight text-foreground">
                            {bn ? labelBn : labelEn}
                          </p>
                          <p className="line-clamp-1 text-[10.5px] text-muted-foreground">
                            {bn ? subBn : subEn}
                          </p>
                        </div>
                        {/* Arrow */}
                        <ArrowRight
                          className={`absolute right-2 top-2.5 h-3.5 w-3.5 text-muted-foreground/50 transition-transform duration-150 ${isPressed ? "translate-x-1" : "group-active:translate-x-0.5"}`}
                        />
                        {/* Gloss */}
                        <span className="pointer-events-none absolute -top-8 -right-8 h-16 w-16 rounded-full bg-white/25 blur-2xl" />
                        {/* Press shimmer */}
                        {isPressed && (
                          <motion.span
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                            className="pointer-events-none absolute inset-0 rounded-[14.5px] bg-gradient-to-tr from-white/0 via-white/35 to-white/0"
                          />
                        )}
                      </div>
                    </motion.button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ══════════════════════ DESKTOP HERO ══════════════════════ */}
      <div className="hidden md:block">
        <div
          className="relative min-h-[220px] md:min-h-[320px] lg:min-h-[400px] bg-cover bg-center"
          style={{
            backgroundImage: `
              linear-gradient(180deg,
                hsl(210 11% 12% / 0.6) 0%,
                hsl(210 11% 12% / 0.35) 50%,
                hsl(210 11% 12% / 0.72) 100%
              ),
              url(${heroBg})
            `,
          }}
        >
          <div
            className="relative mx-auto flex max-w-5xl flex-col items-center justify-center px-4 pb-10 md:pb-32 lg:max-w-6xl"
            style={{ paddingTop: "max(64px, calc(var(--app-header-h, 96px) + clamp(16px, 4vw, 72px)))" }}
          >
            {/* Headline */}
            <motion.div
              initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
              className="text-center"
            >
              <h1 className="font-heading text-2xl font-bold leading-tight text-white drop-shadow-lg md:text-3xl lg:text-5xl">
                {bn ? "আপনার ব্যক্তিগত সহকারী" : "Your Personal Assistant"}
              </h1>
              <p className="mx-auto mt-3 max-w-2xl text-sm text-white/85 drop-shadow md:mt-5 md:text-lg leading-relaxed">
                {bn
                  ? "আপনার সকল সেবার এক ছাদের নীচে সমাধান। যেকোনো সময়, যেকোনো সেবা অর্ডার করুন।"
                  : "One-stop solution for your services. Order any service, anytime."}
              </p>
            </motion.div>

            {/* Search bar */}
            <motion.div
              ref={desktopSearchRef}
              initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
              className="relative z-30 mt-8 w-full max-w-2xl md:mt-1"
            >
              <form
                onSubmit={handleSubmit}
                className="flex items-stretch gap-2 rounded-2xl bg-white p-2 shadow-2xl shadow-black/30"
              >
                {/* Location pill */}
                <div className="hidden md:flex items-center gap-2 rounded-xl border border-border bg-card px-4 min-w-[170px] text-sm text-muted-foreground cursor-pointer hover:bg-secondary transition-colors">
                  <MapPin className="h-4 w-4 shrink-0 opacity-60" />
                  <LocationSelector />
                  <ChevronDown className="h-3.5 w-3.5 ml-auto opacity-50" />
                </div>

                {/* Input */}
                <div className="flex flex-1 items-center gap-2 px-3">
                  <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => setFocused(true)}
                    onKeyDown={handleKeyDown}
                    role="combobox"
                    aria-expanded={showDropdown === "results"}
                    aria-controls="hero-search-listbox"
                    aria-activedescendant={activeIndex >= 0 ? `hero-search-opt-${activeIndex}` : undefined}
                    placeholder={bn ? "সেবা খুঁজুন (এসি, ক্লিনিং...)" : "Find a service (AC, Cleaning...)"}
                    className="w-full min-w-0 bg-transparent py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground md:text-base"
                  />
                </div>

                {/* Search button */}
                <button
                  type="submit"
                  aria-label="Search"
                  className="flex shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-rose-500 px-5 text-sm font-semibold text-white shadow-lg shadow-orange-500/40 transition-all hover:from-orange-600 hover:to-rose-600 active:scale-95 md:px-7"
                >
                  <Search className="h-4 w-4" />
                  <span className="hidden sm:inline">{bn ? "খুঁজুন" : "Search"}</span>
                </button>
              </form>

              {/* Desktop dropdown */}
              <AnimatePresence>
                {showDropdown === "results" && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.15 }}
                    className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-border bg-popover shadow-2xl"
                  >
                    {filtered.length > 0 ? (
                      <ul id="hero-search-listbox" role="listbox" className="max-h-72 overflow-y-auto py-1">
                        {filtered.map((s, i) => (
                          <li key={s.slug} id={`hero-search-opt-${i}`} role="option" aria-selected={i === activeIndex}>
                            <button
                              onClick={() => handleSelect(s.slug)}
                              onMouseEnter={() => setActiveIndex(i)}
                              className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${i === activeIndex ? "bg-secondary" : "hover:bg-secondary"}`}
                            >
                              {s.image ? (
                                <img src={s.image} alt={s.title} className="h-10 w-10 rounded-xl object-cover" />
                              ) : (
                                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
                                  <Search className="h-4 w-4" />
                                </span>
                              )}
                              <div>
                                <p className="text-sm font-medium text-foreground">{s.title}</p>
                                <p className="text-xs text-muted-foreground">
                                  ৳{s.price} {bn ? "থেকে" : "from"}
                                </p>
                              </div>
                              <ArrowRight className="ml-auto h-3.5 w-3.5 text-muted-foreground/40" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                        {bn ? "কোনো সেবা পাওয়া যায়নি" : "No service found"}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Popular service chips */}
            <motion.div
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="mt-5 flex w-full max-w-3xl flex-wrap items-center justify-center gap-2 md:mt-7"
            >
              {popularServices.map((chip) => (
                <button
                  key={chip.slug}
                  onClick={() => navigate(`/service/${chip.slug}`)}
                  className="rounded-full border border-white/30 bg-white/15 px-3.5 py-2 text-xs font-medium text-white backdrop-blur-md transition-all hover:bg-white/28 active:scale-95 md:text-sm"
                >
                  {chip.title}
                </button>
              ))}
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;

// src/components/deal/DealHeroSection.tsx
import {
  useState,
  useRef,
  useEffect,
  useCallback,
  type KeyboardEvent,
} from "react";
import { useNavigate } from "react-router-dom";
import {
  MapPin,
  Loader2,
  Search,
  ChevronRight,
  Plus,
  MessageCircle,
  Package,
  LayoutGrid,
  X,
  ArrowRight
} from "lucide-react";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";

const DEFAULT_BG_IMAGE = "/deal_assets/hero_deal-3.png";

interface LocationValue {
  division: string;
  district: string;
  thana: string;
}

// Each card flies in from a different outside direction
const CARD_ENTRANCE = [
  { x: -260, y: -160 }, // top-left  → in
  { x: 260, y: -160 },  // top-right → in
  { x: -260, y: 160 },  // bottom-left → in
  { x: 260, y: 160 },   // bottom-right → in
];

const DealHeroSection = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const bn = language === "bn";

  // ─── state ───
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [activeResultIndex, setActiveResultIndex] = useState(-1);
  const [locating, setLocating] = useState(false);
  const [value, setValue] = useState<LocationValue>({
    division: "",
    district: "",
    thana: "",
  });

  const geocodingProvider = true; // TODO: was probably a prop — restore if so
  const isGeoSupported =
    typeof navigator !== "undefined" && "geolocation" in navigator;
  const baseUrl = import.meta.env.VITE_DEAL_API_BASE_URL || "";
  const abortControllerRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // ─── handlers ───
  const getListingImage = (item: any) =>
    item.image || item.thumbnail || item.images?.[0] || null;

  const handleResultClick = (item: any) => {
    setResults([]);
    setSearch("");
    setActiveResultIndex(-1);
    navigate(`/deal/ad/${item.id}`); // TODO: your listing detail route
  };

  const fetchListings = useCallback(
    async (query: string, nextPage: number, append: boolean) => {
      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        if (append) setLoadingMore(true);
        else setLoading(true);

        const response = await fetch(
          `${baseUrl}/api/deal/listings?search=${encodeURIComponent(
            query
          )}&page=${nextPage}`,
          { signal: controller.signal }
        );

        if (!response.ok) throw new Error("Failed to fetch listings");

        const data = await response.json();
        const list =
          data?.data || data?.listings || data?.items || data?.rows || [];

        setResults((current) => (append ? [...current, ...list] : list));
        setHasMore(data?.pagination?.hasMore ?? list.length >= 10);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        console.error("Fetch deal suggestions error:", error);
        setResults([]);
      } finally {
        if (append) setLoadingMore(false);
        else setLoading(false);
      }
    },
    [baseUrl]
  );

  useEffect(() => {
    const query = search.trim();
    const timeout = setTimeout(() => {
      if (query) {
        setPage(1);
        fetchListings(query, 1, false);
      } else {
        setResults([]);
        setPage(1);
        setHasMore(true);
      }
    }, 400);

    return () => clearTimeout(timeout);
  }, [search, fetchListings]);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveResultIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveResultIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      if (activeResultIndex >= 0 && results[activeResultIndex]) {
        handleResultClick(results[activeResultIndex]);
      } else if (search.trim()) {
        navigate(`/deal/ad?search=${encodeURIComponent(search.trim())}`);
      }
    }
  };

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el || loading || loadingMore || !hasMore || !search.trim()) return;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 40) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchListings(search.trim(), nextPage, true);
    }
  }, [fetchListings, hasMore, loading, loadingMore, page, search]);

  const handleClear = () => {
    setValue({ division: "", district: "", thana: "" });
    setSearch("");
    setResults([]);
    setActiveResultIndex(-1);
  };

  const handleUseCurrentLocation = () => {
    if (!isGeoSupported) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      () => {
        setLocating(false);
        // TODO: reverse-geocode coords → setValue({ division, district, thana })
        toast.success(bn ? "লোকেশন পাওয়া গেছে" : "Location found");
      },
      () => {
        setLocating(false);
        toast.error(bn ? "লোকেশন পাওয়া যায়নি" : "Could not get your location");
      }
    );
  };

  // ─── four card sentences (replaces the typewriter words) ───
const cardData = {
  en: [
    { text: "Your Easy Destination for Buying & Selling", icon: "/deal_assets/hero/icons/hero-1.png" },
    { text: "Earn by Selling Unused Products", icon: "/deal_assets/hero/icons/hero-2.png" },
    { text: "Buy Used Products at Affordable Prices", icon: "/deal_assets/hero/icons/hero-3.png" },
    { text: "Trade Safely & Securely", icon: "/deal_assets/hero/icons/hero-4.png" },
  ],
  bn: [
    { text: "বেচা-কেনার সহজ ঠিকানা", icon: "/deal_assets/hero/icons/hero-1.png" },
    { text: "অব্যবহৃত পণ্য বিক্রি করে আয় করুন", icon: "/deal_assets/hero/icons/hero-2.png" },
    { text: "পুরোনো পণ্য কিনুন সাশ্রয়ী দামে", icon: "/deal_assets/hero/icons/hero-3.png" },
    { text: "নিরাপদে লেনদেন করুন", icon: "/deal_assets/hero/icons/hero-4.png" },
  ],
};



  const activeCards = bn ? cardData.bn : cardData.en;

  return (
    <div className="relative">
      {/* 🔍 HERO SEARCH WITH BACKGROUND IMAGE */}
      <div className="relative min-h-[300px] md:min-h-[400px] w-full overflow-hidden">
        {/* Background image + overlay */}
        <div
          className="absolute h-full inset-0 bg-center md:bg-top bg-cover"
          style={{ backgroundImage: `url(${DEFAULT_BG_IMAGE})` }}
        />
        <div className="absolute inset-0 bg-black/40 backdrop-blur-xs" />

        {/* Two-column content wrapper */}
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-6 md:gap-8 w-full max-w-7xl mx-auto px-4 md:px-8 py-8 md:py-12 min-h-[300px] md:min-h-[400px]">

          {/* ---------- LEFT: Search bar + CTA buttons ---------- */}
          <div className="w-full md:w-1/2 flex flex-col gap-4 md:gap-6">
            {/* Search bar */}
            <div className="relative w-full">
              {/* Search Input */}
              <div className="relative w-full">
                <Search className="absolute text-foreground left-3 z-20 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                <Input
                  placeholder={bn ? "আপনার প্রয়োজনীয় যেকোনো কিছু খুঁজুন" : "Find Something you need"}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="pl-10 pr-10 py-6 w-full rounded-lg bg-background backdrop-blur-sm shadow-md border-2 border-primary focus-visible:ring-2 focus-visible:ring-emerald-400"
                  aria-label={bn ? "আপনার প্রয়োজনীয় যেকোনো কিছু খুঁজুন" : "Find Something you need"}
                />
                {loading ? (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-gray-500" />
                ) : (
                  search && (
                    <button
                      onClick={() => setSearch("")}
                      className="absolute z-20 text-foreground right-3 top-1/2 -translate-y-1/2 h-4 w-4 hover:text-red-600 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )
                )}
              </div>

              {/* 🔽 SEARCH RESULTS (with infinite scroll) */}
              <div className="absolute left-0 right-0 top-full z-50 mt-2 w-full">
                {results.length > 0 && (
                  <div
                    ref={scrollRef}
                    onScroll={handleScroll}
                    className="w-full max-h-96 overflow-y-auto rounded-lg border border-gray-200 bg-background shadow-sm divide-y divide-gray-100"
                  >
                    {results.map((item, index) => (
                      <div
                        key={item.id}
                        onClick={() => handleResultClick(item)}
                        className={`p-3 hover:bg-gray-50 cursor-pointer transition-colors duration-150 ${
                          index === activeResultIndex ? "bg-gray-50" : ""
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          {getListingImage(item) ? (
                            <img
                              src={getListingImage(item)}
                              alt={item.title}
                              className="h-12 w-12 rounded-md object-cover flex-shrink-0"
                              loading="lazy"
                            />
                          ) : (
                            <div className="h-12 w-12 rounded-md bg-gray-100 flex items-center justify-center flex-shrink-0">
                              <MapPin className="h-5 w-5 text-gray-400" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-800 truncate">
                              {bn ? item.title : item.title_en || item.title}
                            </p>
                            <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
                              <MapPin size={12} className="text-gray-400 flex-shrink-0" />
                              <span className="truncate">
                                {item.location_district}, {item.location_area}
                              </span>
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                    {loadingMore && (
                      <div className="p-3 flex justify-center">
                        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* CTA buttons */}
            <div className="flex gap-2 md:gap-3 justify-center md:justify-start flex-wrap">

              <Button
                size="lg"
                variant="outline"
                onClick={() => navigate("/deal/my-ads")}
                className="rounded-xl text-[12px] md:text-base font-bold gap-2 px-2 md:px-6 border-blue-200 text-blue-700 hover:bg-primary hover:border-blue-300 transition-colors"
                >
                <Package className="h-5 w-5" />
                {bn ? "আমার বিজ্ঞাপন" : "My Ads"}
              </Button>

              <Button
                size="lg"
                variant="outline"
                onClick={() => navigate("/deal/inbox")}
                className="rounded-xl text-[12px] md:text-base font-bold gap-2 px-2 md:px-6 border-emerald-200 text-emerald-700 hover:bg-emerald-700 hover:border-emerald-300 transition-colors"
                >
                <MessageCircle className="h-5 w-5" />
                {bn ? "ইনবক্স" : "Inbox"}
              </Button>

              <Button
                size="lg"
                onClick={() => navigate("/deal/ads")}
                className="rounded-xl text-[12px] md:text-base bg-white text-primary border border-blue-900/40 font-bold gap-2 px-2 md:px-6 hover:bg-gradient-to-r from-blue-600 to-emerald-500 hover:text-white transition-all"
                >
                <LayoutGrid className="h-5 w-5" />
                {bn ? "সকল বিজ্ঞাপন দেখুন" : "View All Ads"}
                <ChevronRight className="h-4 w-4" />
              </Button>

              <Button
                size="lg"
                onClick={() => navigate("/deal/post")}
                className="rounded-xl text-[12px] md:text-base font-bold gap-2 px-2 md:px-6 bg-gradient-to-r from-blue-600 to-emerald-500 text-white shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-emerald-500/30 hover:opacity-90 transition-all"
                >
                <Plus className="h-5 w-5" />
                {bn ? "ফ্রি বিজ্ঞাপন দিন" : "Post Free Ad"}
              </Button>

            </div>
          </div>

          {/* ---------- RIGHT: four cards flying in from four directions ---------- */}
          <div className="w-full md:w-1/2 flex items-center justify-center">
            <motion.div
              key={language}
              initial="hidden"
              animate="visible"
              variants={{
                hidden: {},
                visible: {
                  transition: { staggerChildren: 0.12, delayChildren: 0.15 },
                },
              }}
              className="grid grid-cols-2 gap-3 md:gap-4 w-full max-w-md"
            >
              {activeCards.map((card, index) => (
              <motion.div
                  key={`${language}-${index}`}
                  variants={{
                    hidden: {
                      opacity: 0,
                      scale: 0.7,
                      x: CARD_ENTRANCE[index].x,
                      y: CARD_ENTRANCE[index].y,
                    },
                    visible: {
                      opacity: 1,
                      scale: 1,
                      x: 0,
                      y: 0,
                      transition: {
                        type: "spring",
                        stiffness: 120,
                        damping: 16,
                        mass: 0.8,
                      },
                    },
                  }}
                  whileHover={{ scale: 1.04 }}
                  // rounded-xl border border-white/20 bg-white/30 backdrop-blur-md
                  className="rounded-xl bg-gradient-to-r from-blue-600/30 to-green-400/20 backdrop-blur-md p-3 md:p-5 min-h-[90px] md:min-h-[120px] flex flex-col items-start justify-start gap-2 text-center shadow-lg shadow-black/10"
                  >
                  <div className="p-1 bg-white rounded-lg">
                    <img
                      src={card.icon}
                      alt=""
                      className="h-8 w-8 md:h-12 md:w-12 object-contain !bg-transparent drop-shadow-[0_2px_2px_rgba(0,0,0,0.5)]"
                      loading="lazy"
                    />
                  </div>
                  <span className="text-white flex gap-2 items-start justify-start text-start font-bold text-sm md:text-base lg:text-lg leading-snug">
                    {card.text}
                    <ArrowRight className="h-4 w-4" />
                  </span>
              </motion.div>
            
              ))}
            </motion.div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default DealHeroSection;
// src/components/deal/DealHeroSection.tsx
import { useState, useRef, useCallback, type KeyboardEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  MapPin,
  Loader2,
  X,
  Search,
  Crosshair,
  ChevronRight,
  Plus,
  MessageCircle,
  Package,
  LayoutGrid,
} from "lucide-react";
import { Typewriter } from "react-simple-typewriter";
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

const DealHeroSection = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const bn = language === "bn";
  // ─── state (reconstructed — this was missing from your file) ───
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
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
  const scrollRef = useRef<HTMLDivElement>(null);

  // ─── handlers (reconstructed — wire to your real logic) ───
  const getListingImage = (item: any) =>
    item.image || item.thumbnail || item.images?.[0] || null;

  const handleResultClick = (item: any) => {
    setResults([]);
    setSearch("");
    setActiveResultIndex(-1);
    navigate(`/deal/ads/${item.id}`); // TODO: your listing detail route
  };

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
        navigate(`/deal/ads?search=${encodeURIComponent(search.trim())}`);
      }
    }
  };

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el || loading || loadingMore) return;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 40) {
      // TODO: fetch next page of results and append to `results`
    }
  }, [loading, loadingMore]);

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

  const typingWords = {
    en: [
      "Find the Best Deals",
      "Buy & Sell Easily",
      "Find Used Products",
      "Discover Great Offers",
      "Trade with Confidence",
    ],
    bn: [
      "যেকোনো পন্য কিনুন ও বিক্রি করুন",
      "আপনার ব্যবহৃত পণ্য বিক্রি করুন",
      "পুরোনো জিনিস ক্রয়-বিক্রয় করুন",
      "সেরা দামে ডিল করুন",
      "নিরাপদে লেনদেন করুন",
    ],
  };

  return (
    <div className="relative">
      {/* 🔍 HERO SEARCH WITH BACKGROUND IMAGE */}
      <div className="relative h-[300px] md:h-[400px] w-full overflow-hidden">

        {/* Background image + overlay */}
        <div
          className="absolute h-full inset-0 bg-center md:bg-top"
          style={{ backgroundImage: `url(${DEFAULT_BG_IMAGE})` }}
        />
        <div className="absolute inset-0 bg-black/40 backdrop-blur-xs" />


        {/* Typewriter heading */}
        <div className="absolute z-10 top-5 md:top-20 w-full flex justify-center">
          <h1 className="text-center text-2xl md:text-3xl lg:text-5xl leading-[1.9] bg-gradient-to-r from-blue-400 via-green-600 to-blue-900 bg-clip-text text-white font-bold">
            <Typewriter
              key={language}
              words={bn ? typingWords.bn : typingWords.en}
              loop={0}
              cursor
              cursorStyle="|"
              typeSpeed={80}
              deleteSpeed={40}
              delaySpeed={2000}
            />
          </h1>
        </div>

        {/* CTA buttons */}
        <div className="absolute z-10 top-[80px] md:top-[150px] text-center flex gap-3 justify-center w-full flex-wrap">
          <Button
            size="lg"
            onClick={() => navigate("/deal/post")}
            className="rounded-xl text-[12px] md:text-base font-bold gap-2 px-2 md:px-8 bg-gradient-to-r from-blue-600 to-emerald-500 text-white shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-emerald-500/30 hover:opacity-90 transition-all"
            >
            <Plus className="h-5 w-5" />
            {bn ? "ফ্রি বিজ্ঞাপন দিন" : "Post Free Ad"}
          </Button>

          <Button
            size="lg"
            variant="outline"
            onClick={() => navigate("/deal/my-ads")}
            className="rounded-xl text-[12px] md:text-base font-bold gap-2 px-2 md:px-8 border-blue-200 text-blue-700 hover:bg-primary hover:border-blue-300 transition-colors"
            >
            <Package className="h-5 w-5" />
            {bn ? "আমার বিজ্ঞাপন" : "My Ads"}
          </Button>

          <Button
            size="lg"
            variant="outline"
            onClick={() => navigate("/deal/inbox")}
            className="rounded-xl text-[12px] md:text-base font-bold gap-2 px-2 md:px-8 border-emerald-200 text-emerald-700 hover:bg-emerald-700 hover:border-emerald-300 transition-colors"
            >
            <MessageCircle className="h-5 w-5" />
            {bn ? "ইনবক্স" : "Inbox"}
          </Button>

          <Button
            size="lg"
            onClick={() => navigate("/deal/ads")}
            className="rounded-xl text-[12px] md:text-base bg-white text-primary border border-blue-900/40 font-bold gap-2 px-2 md:px-8 hover:bg-gradient-to-r from-blue-600 to-emerald-500 hover:text-white transition-all"
            >
            <LayoutGrid className="h-5 w-5" />
            {bn ? "সকল বিজ্ঞাপন দেখুন" : "View All Ads"}
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Search bar */}
        <div className="flex absolute z-10 bottom-10 md:bottom-[120px] w-full">
          <div className="flex mx-auto max-w-4xl px-8 flex-col sm:flex-row w-full mx-auto gap-2 relative">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
              <Input
                placeholder={bn ? "আপনার প্রয়োজনীয় যেকোনো কিছু খুঁজুন" : "Find Something you need"}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={handleKeyDown}
                className="pl-10 pr-10 py-6 w-full rounded-lg bg-white backdrop-blur-sm shadow-md border-2 border-primary focus-visible:ring-2 focus-visible:ring-emerald-400"
                aria-label={bn ? "আপনার প্রয়োজনীয় যেকোনো কিছু খুঁজুন" : "Find Something you need"}
              />
              {loading ? (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-gray-500" />
              ) : (
                search && (
                  <button
                    onClick={() => setSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 hover:text-gray-700 transition-colors"
                    >
                  </button>
                )
              )}
            </div>

            {/* 🔽 SEARCH RESULTS (with infinite scroll) */}
            <div className="max-w-4xl mx-auto absolute sm:w-full left-0 right-0 top-0 z-50">
              {results.length > 0 && (
                <div
                  ref={scrollRef}
                  onScroll={handleScroll}
                  className="w-full border border-gray-200 top-12 bg-white rounded-lg absolute shadow-sm max-h-96 overflow-y-auto divide-y divide-gray-100"
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
              {/* 🧹 CLEAR BUTTON */}
              {(value.division || value.district || value.thana || search) && (
                <button
                  onClick={handleClear}
                  className="text-sm text-red-500 flex items-center gap-1 hover:text-red-600 transition-colors absolute right-3 top-1/2 -translate-y-1/2"
                >
                  <X size={14} /> 
                  {/* {bn ? "মুছুন" : "Clear"} */}
                </button>
              )}
            </div>


          </div>
        </div>
      </div>
    </div>
  );
};

export default DealHeroSection;
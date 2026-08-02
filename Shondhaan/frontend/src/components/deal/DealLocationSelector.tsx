import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom"; // Added useNavigate
import { MapPin, Loader2, X, Search, Crosshair } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChevronRight,
  ChevronUp,
  Eye,
  Clock,
  Star,
  Plus,
  MessageCircle,
  Package,
  LayoutGrid,
  ChevronDown,
} from "lucide-react";

import { Input } from "@/components/ui/input";
import { useLanguage } from "@/contexts/LanguageContext";
import { divisions as locationData } from "@/data/locations";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

// Types
export interface Listing {
  id: string;
  slug?: string; // Added slug to the interface
  title: string;
  title_en?: string;
  price: number;
  location_district: string;
  location_area: string;
  images?: string[];
  image?: string;
}

interface DealLocationSelectorProps {
  value: { division: string; district: string; thana: string };
  onChange: (val: { division: string; district: string; thana: string }) => void;
  onSearchResultClick?: (listing: Listing) => void;
  geocodingProvider?: (
    lat: number,
    lng: number
  ) => Promise<{ division: string; district: string; thana: string }>;
   bgImage?: string;
}

const DEFAULT_BG_IMAGE = "/deal/hero_deal-3.png";

const DealLocationSelector = ({
  value,
  onChange,
  onSearchResultClick,
  geocodingProvider,
}: DealLocationSelectorProps) => {
  const { language } = useLanguage();
  const bn = language === "bn";
  const navigate = useNavigate(); // Initialized navigate
  const baseUrl = import.meta.env.VITE_DEAL_API_BASE_URL || "";
  const abortControllerRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const isGeoSupported =
    typeof window !== "undefined" && !!window.navigator.geolocation;

  // UI state
  const [locating, setLocating] = useState(false);
  const [detailArea, setDetailArea] = useState("");
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [activeResultIndex, setActiveResultIndex] = useState(-1);

  // Location data lookups
  const selectedDivision = locationData.find((d) => d.nameBn === value.division);
  const districtList = selectedDivision?.districts || [];
  const selectedDistrict = districtList.find((d) => d.nameBn === value.district);
  const thanaList = selectedDistrict?.thanas || [];

  // Deduplicate listings by id
  const dedupById = (arr: Listing[]) => {
    const seen = new Set<string>();
    return arr.filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  };

  // Fetch listings from API (search or pagination)
  const fetchListings = useCallback(
    async (query: string, nextPage: number, append: boolean) => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;
      const signal = controller.signal;

      try {
        if (append) setLoadingMore(true);
        else setLoading(true);

        const res = await fetch(
          `${baseUrl}/api/deal/listings?search=${encodeURIComponent(
            query
          )}&page=${nextPage}`,
          { signal }
        );

        if (!res.ok) throw new Error("Failed to fetch listings");
        const data = await res.json();
        const list =
          data?.data || data?.listings || data?.items || data?.rows || [];

        if (append) {
          setResults((prev) => dedupById([...prev, ...list]));
        } else {
          setResults(list);
        }

        const hasMorePages = data?.pagination?.hasMore || list.length >= 10;
        setHasMore(hasMorePages);
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        console.error(err);
        toast.error("Failed to fetch listings");
      } finally {
        if (append) setLoadingMore(false);
        else setLoading(false);
      }
    },
    [baseUrl]
  );

  // Debounced search — resets page to 1, replaces results
  useEffect(() => {
    const delay = setTimeout(() => {
      if (search.trim()) {
        setPage(1);
        fetchListings(search.trim(), 1, false);
      } else {
        setResults([]);
        setHasMore(true);
        setPage(1);
      }
    }, 400);
    return () => clearTimeout(delay);
  }, [search, fetchListings]);

  // Infinite scroll handler
  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const el = e.currentTarget;
      const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
      if (
        distanceToBottom < 60 &&
        !loadingMore &&
        hasMore &&
        !loading &&
        search.trim()
      ) {
        const nextPage = page + 1;
        setPage(nextPage);
        fetchListings(search.trim(), nextPage, true);
      }
    },
    [loadingMore, hasMore, loading, search, page, fetchListings]
  );

  // Detect current location via browser API and reverse geocode
  const handleUseCurrentLocation = useCallback(async () => {
    if (!isGeoSupported) return;
    if (!geocodingProvider) {
      toast.error(
        bn ? "লোকেশন প্রোভাইডার কনফিগার করা হয়নি" : "Geocoding provider not configured"
      );
      return;
    }
    setLocating(true);
    try {
      const position = await new Promise<GeolocationPosition>(
        (resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0,
          });
        }
      );
      const { latitude, longitude } = position.coords;
      const result = await geocodingProvider(latitude, longitude);
      onChange(result);
      toast.success(
        bn ? "লোকেশন সফলভাবে সনাক্ত করা হয়েছে" : "Location detected successfully"
      );
    } catch (err: unknown) {
      console.error(err);
      const errCode = (err as GeolocationPositionError)?.code;
      const msg =
        errCode === 1
          ? bn
            ? "লোকেশন অনুমতি প্রত্যাখ্যাত"
            : "Location permission denied"
          : errCode === 2
          ? bn
            ? "লোকেশন পাওয়া যায়নি"
            : "Location unavailable"
          : errCode === 3
          ? bn
            ? "লোকেশন টাইমআউট"
            : "Location timeout"
          : bn
          ? "লোকেশন সনাক্তকরণে ব্যর্থ"
          : "Failed to detect location";
      toast.error(msg);
    } finally {
      setLocating(false);
    }
  }, [isGeoSupported, geocodingProvider, bn, onChange]);

  // Clear all selections
  const handleClear = useCallback(() => {
    onChange({ division: "", district: "", thana: "" });
    setDetailArea("");
    setSearch("");
    setResults([]);
    setPage(1);
    setHasMore(true);
  }, [onChange]);

  // Handlers for dropdown selectors
  const handleDivisionChange = useCallback(
    (v: string) => {
      onChange({ division: v, district: "", thana: "" });
    },
    [onChange]
  );

  const handleDistrictChange = useCallback(
    (v: string) => {
      onChange({ ...value, district: v, thana: "" });
    },
    [value, onChange]
  );

  const handleThanaChange = useCallback(
    (v: string) => {
      onChange({ ...value, thana: v });
    },
    [value, onChange]
  );

  // Centralized click handler for search results
  const handleResultClick = useCallback(
    (item: Listing) => {
      if (onSearchResultClick) {
        onSearchResultClick(item);
      } else {
        const slugOrId = item.slug || item.id;
        navigate(`/deal/ad/${slugOrId}`);
      }
    },
    [onSearchResultClick, navigate]
  );

  // Keyboard navigation for search results
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveResultIndex((prev) =>
          prev < results.length - 1 ? prev + 1 : prev
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveResultIndex((prev) => (prev > 0 ? prev - 1 : -1));
      } else if (e.key === "Enter" && activeResultIndex >= 0) {
        e.preventDefault();
        const item = results[activeResultIndex];
        if (item) handleResultClick(item);
      } else if (e.key === "Escape") {
        setSearch("");
        setResults([]);
        setActiveResultIndex(-1);
      }
    },
    [results, activeResultIndex, handleResultClick]
  );

  const getListingImage = (item: Listing): string => {
    if (item.images && item.images.length > 0) return item.images[0];
    return item.image || "";
  };

  return (
    <div className="relative">
     
      {/* 🔍 HERO SEARCH WITH BACKGROUND IMAGE */}
      <div className="relative h-[300px] md:h-[400px] w-full overflow-hidden">


      <div className="absolute z-10 top-10 md:top-28 text-center flex gap-3 justify-center w-full flex-wrap">
        <Button
          size="lg"
          onClick={() => navigate("/deal/post")}
          className="rounded-xl text-base font-bold gap-2 px-8 bg-gradient-to-r from-blue-600 to-emerald-500 text-white shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-emerald-500/30 hover:opacity-90 transition-all"
        >
          <Plus className="h-5 w-5" />
          {bn ? "ফ্রি বিজ্ঞাপন দিন" : "Post Free Ad"}
        </Button>

        <Button
          size="lg"
          variant="outline"
          onClick={() => navigate("/deal/my-ads")}
          className="rounded-xl text-base font-bold gap-2 px-8 border-blue-200 text-blue-700 hover:bg-primary hover:border-blue-300 transition-colors"
        >
          <Package className="h-5 w-5" />
          {bn ? "আমার বিজ্ঞাপন" : "My Ads"}
        </Button>

        <Button
          size="lg"
          variant="outline"
          onClick={() => navigate("/deal/inbox")}
          className="rounded-xl text-base font-bold gap-2 px-8 border-emerald-200 text-emerald-700 hover:bg-emerald-700 hover:border-emerald-300 transition-colors"
        >
          <MessageCircle className="h-5 w-5" />
          {bn ? "ইনবক্স" : "Inbox"}
        </Button>
        
        <Button
          size="lg"
          onClick={() => navigate("/deal/ads")}
          className="rounded-xl text-sm md:text-base bg-white text-primary border border-blue-900/40 font-bold gap-2 px-6 md:px-8 hover:text-white hover:opacity-90 transition-all"
        >
          <LayoutGrid className="h-5 w-5" />
          {bn ? "সকল বিজ্ঞাপন দেখুন" : "View All Ads"}
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>


      <div className="absolute h-full inset-0 bg-center md:bg-top"
          style={{ backgroundImage: `url(${DEFAULT_BG_IMAGE})` }}/>

        <div className="absolute inset-0 bg-white/40 backdrop-blur-xs" />
        <div className="absolute z-10 p-6 sm:p-8 mt-4 bottom-1/4 w-full">
          {/* <h2 className="mb-4 text-xl sm:text-2xl font-bold text-primary text-center drop-shadow">
            {bn ? "আপনার প্রয়োজনীয় যেকোনো কিছু খুঁজুন" : "Find Something you need"}
          </h2> */}

          <div className="flex px-8 flex-col sm:flex-row max-w-4xl mx-auto gap-2">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                {/* Left Search Icon */}
              <div className="absolute z-10 left-0 top-1/2 -translate-y-1/2 text-gray-400  flex h-12 w-12 items-center justify-center">
                <Search className="h-5 w-5" />
              </div>
              <Input
                placeholder={bn ? "আপনার প্রয়োজনীয় যেকোনো কিছু খুঁজুন" : "Find Something you need"}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={handleKeyDown}
                className="pl-10 pr-10 py-6 w-full rounded-lg bg-white backdrop-blur-sm shadow-md border-2 border-primary focus-visible:ring-2 focus-visible:ring-emerald-400"
                aria-label={bn ? "আপনার প্রয়োজনীয় যেকোনো কিছু খুঁজুন" : "Find Something you need"}
              />
              {loading ? (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-gray-500" />
              ) : (
                search && (
                  <button
                    onClick={() => {
                      setSearch("");
                      setResults([]);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition-colors"
                    aria-label="Clear search"
                  >
                    <X size={16} />
                  </button>
                )
              )}
            </div>

            {/* Current Location Button */}
            {geocodingProvider && (
              <button
                onClick={handleUseCurrentLocation}
                disabled={locating || !isGeoSupported}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-white/90 hover:bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                title={
                  isGeoSupported
                    ? bn
                      ? "বর্তমান লোকেশন ব্যবহার করুন"
                      : "Use current location"
                    : bn
                    ? "লোকেশন সাপোর্ট করে না"
                    : "Geolocation not supported"
                }
              >
                {locating ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Crosshair size={16} />
                )}
                <span className="hidden sm:inline">
                  {bn ? "আমার অবস্থান" : "My Location"}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 🔽 SEARCH RESULTS (with infinite scroll) */}
      {results.length > 0 && (
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="w-full border border-gray-200 bg-white rounded-lg shadow-sm max-h-96 overflow-y-auto divide-y divide-gray-100"
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
                <div className="flex-2 min-w-0">
                  <p className="font-medium text-gray-800 truncate">
                    {bn ? item.title : item.title_en || item.title}
                  </p>
                  <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
                    <MapPin size={12} className="text-gray-400 flex-shrink-0" />
                    <span className="truncate">
                      {item.location_district}, {item.location_area}
                    </span>
                  </p>
                  {/* <p className="text-sm font-semibold text-emerald-600 mt-0.5">
                    ৳ {item.price}
                  </p> */}
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

      {/* EMPTY STATE */}
      {search.trim() && !loading && results.length === 0 && (
        <div className="w-full border border-gray-200 bg-white rounded-lg p-8 text-center">
          <Search className="h-8 w-8 text-gray-300 mx-auto mb-2" />
          <p className="text-gray-500">
            {bn
              ? `"${search}" এর জন্য কোন ফলাফল পাওয়া যায়নি`
              : `No results found for "${search}"`}
          </p>
        </div>
      )}

      {/* 📍 LOCATION SELECTORS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Division */}
        {/* <Select value={value.division} onValueChange={handleDivisionChange}>
          <SelectTrigger>
            <SelectValue
              placeholder={bn ? "বিভাগ নির্বাচন করুন" : "Select Division"}
            />
          </SelectTrigger>
          <SelectContent>
            {locationData.map((d) => (
              <SelectItem key={d.nameBn} value={d.nameBn}>
                {bn ? d.nameBn : d.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select> */}

        {/* District */}
        {/* <Select
          value={value.district}
          onValueChange={handleDistrictChange}
          disabled={!value.division}
        >
          <SelectTrigger>
            <SelectValue
              placeholder={bn ? "জেলা নির্বাচন করুন" : "Select District"}
            />
          </SelectTrigger>
          <SelectContent>
            {districtList.map((d) => (
              <SelectItem key={d.nameBn} value={d.nameBn}>
                {bn ? d.nameBn : d.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select> */}

        {/* Thana */}
        {/* <Select
          value={value.thana}
          onValueChange={handleThanaChange}
          disabled={!value.district}
        >
          <SelectTrigger>
            <SelectValue
              placeholder={bn ? "এলাকা নির্বাচন করুন" : "Select Area"}
            />
          </SelectTrigger>
          <SelectContent>
            {thanaList.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select> */}
      </div>

      {/* 🧹 CLEAR BUTTON */}
      {(value.division || value.district || value.thana || search) && (
        <button
          onClick={handleClear}
          className="text-sm text-red-500 flex items-center gap-1 hover:text-red-600 transition-colors"
        >
          <X size={14} /> {bn ? "মুছুন" : "Clear"}
        </button>
      )}
    </div>
  );
};

export default DealLocationSelector;
import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom"; // Added useNavigate
import { MapPin, Loader2, X, Search, Crosshair } from "lucide-react";
import { Typewriter } from "react-simple-typewriter";
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

const DEFAULT_BG_IMAGE = "/deal_assets/hero_deal-3.png";

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

    const isGeoSupported = typeof window !== "undefined" && !!window.navigator.geolocation;

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

      {/* 📍 LOCATION SELECTORS */}
      <div className="flex flex-col gap-2">
        {/* Division */}
        <Select value={value.division} onValueChange={handleDivisionChange}>
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
        </Select>

        {/* District */}
        <Select
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
        </Select>

        {/* Thana */}
        <Select
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
        </Select>
      </div>

    </div>
  );
};

export default DealLocationSelector;
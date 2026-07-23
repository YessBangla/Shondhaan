import React, { useState, useEffect, useRef, useMemo, lazy, Suspense, forwardRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Navigation, Search, ChevronDown, ChevronLeft, X, Map as MapIcon } from "lucide-react";
import { divisions, thanaEnMap, type District } from "@/data/locations";
import { useLocation } from "@/contexts/LocationContext";
import { useLanguage } from "@/contexts/LanguageContext";

const MapPicker = lazy(() => import("@/components/MapPicker"));

interface ThanaMatch {
  division: string;
  district: District;
  thana: string;
}

const HighlightText = React.forwardRef<HTMLSpanElement, { text: string; query: string }>(({ text, query }, ref) => {
  if (!query) return <span ref={ref}>{text}</span>;
  const q = query.trim();
  if (!q) return <span ref={ref}>{text}</span>;
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  const bnIdx = idx === -1 ? text.indexOf(q) : idx;
  const matchIdx = idx !== -1 ? idx : bnIdx;
  if (matchIdx === -1) return <span ref={ref}>{text}</span>;
  return (
    <span ref={ref}>
      {text.slice(0, matchIdx)}
      <span className="bg-primary/20 text-primary font-semibold rounded-sm px-0.5">{text.slice(matchIdx, matchIdx + q.length)}</span>
      {text.slice(matchIdx + q.length)}
    </span>
  );
});
HighlightText.displayName = "HighlightText";

interface LocationSelectorProps {
  /** Compact mobile-header variant: smaller padding, no right border, GPS icon visible. */
  compact?: boolean;
}

const LocationSelector = ({ compact = false }: LocationSelectorProps = {}) => {
  const { selectedCity, setSelectedCity, subArea, setSubArea, selectedCityEn, setSelectedCityEn, subAreaEn, setSubAreaEn } = useLocation();
  const { t, language } = useLanguage();
  const bn = language === "bn";

  // Helper: get display name based on language
  const divName = (div: typeof divisions[0]) => bn ? div.nameBn : div.name;
  const distName = (d: District) => bn ? d.nameBn : d.name;
  const thanaName = (th: string) => {
    if (bn) return th;
    // Reverse lookup: thanaEnMap is en->bn, we need bn->en
    const entry = Object.entries(thanaEnMap).find(([, bnName]) => bnName === th);
    return entry ? entry[0] : th;
  };
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [locating, setLocating] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [selectedDistrict, setSelectedDistrict] = useState<District | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target;
      if (ref.current && target instanceof Node && !ref.current.contains(target)) {
        setOpen(false);
        setSelectedDistrict(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleCurrentLocation = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const [resBn, resEn] = await Promise.all([
            fetch(`https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json&accept-language=bn&zoom=16`),
            fetch(`https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json&accept-language=en&zoom=16`),
          ]);
          const [dataBn, dataEn] = await Promise.all([resBn.json(), resEn.json()]);
          const extractCity = (addr: any) => addr?.city || addr?.town || addr?.county || addr?.state_district || "";
          const extractArea = (addr: any) => addr?.suburb || addr?.neighbourhood || addr?.road || addr?.village || "";
          setSelectedCity(extractCity(dataBn.address) || t("location.yourLocation"));
          setSubArea(extractArea(dataBn.address));
          setSelectedCityEn(extractCity(dataEn.address) || "Your Location");
          setSubAreaEn(extractArea(dataEn.address));
        } catch {
          setSelectedCity(t("location.yourLocation"));
          setSubArea("");
        }
        setLocating(false);
        setOpen(false);
        setSelectedDistrict(null);
      },
      () => setLocating(false)
    );
  };

  const handleMapSelect = (city: string, area: string) => {
    setSelectedCity(city);
    setSubArea(area);
    setOpen(false);
    setShowMap(false);
    setSelectedDistrict(null);
  };

  const handleDistrictClick = (district: District) => {
    if (district.thanas && district.thanas.length > 0) {
      setSelectedDistrict(district);
    } else {
      setSelectedCity(district.nameBn);
      setSelectedCityEn(district.name);
      setSubArea("");
      setSubAreaEn("");
      setOpen(false);
      setSearch("");
    }
  };

  const handleThanaClick = (thana: string, district: District) => {
    setSelectedCity(district.nameBn);
    setSelectedCityEn(district.name);
    setSubArea(thana);
    setSubAreaEn(thanaName(thana));
    setOpen(false);
    setSearch("");
    setSelectedDistrict(null);
  };

  const q = search.trim().toLowerCase();
  const searchTrimmed = search.trim();

  // When searching, find direct thana matches to show inline
  const { filteredDivisions, thanaMatches } = useMemo(() => {
    if (!q) return { filteredDivisions: divisions, thanaMatches: [] as ThanaMatch[] };

    const matches: ThanaMatch[] = [];
    
    // Build reverse map: find Bangla thana names that match English query
    const matchingBnThanas = new Set<string>();
    Object.entries(thanaEnMap).forEach(([en, bn]) => {
      if (en.includes(q)) matchingBnThanas.add(bn);
    });

    const divs = divisions
      .map((div) => ({
        ...div,
        districts: div.districts.filter((d) => {
          const districtMatch =
            d.nameBn.includes(searchTrimmed) ||
            d.name.toLowerCase().includes(q) ||
            div.nameBn.includes(searchTrimmed) ||
            div.name.toLowerCase().includes(q);

          // Collect thana matches (Bangla text match OR English name match)
          d.thanas?.forEach((th) => {
            const bnMatch = th.includes(searchTrimmed) || th.toLowerCase().includes(q);
            const enMatch = matchingBnThanas.has(th);
            if (bnMatch || enMatch) {
              matches.push({ division: div.nameBn, district: d, thana: th });
            }
          });

          return districtMatch || d.thanas?.some((th) => {
            const bnMatch = th.includes(searchTrimmed) || th.toLowerCase().includes(q);
            const enMatch = matchingBnThanas.has(th);
            return bnMatch || enMatch;
          });
        }),
      }))
      .filter((div) => div.districts.length > 0);

    return { filteredDivisions: divs, thanaMatches: matches };
  }, [q, searchTrimmed]);

  const cityShow = bn ? selectedCity : (selectedCityEn || selectedCity);
  const areaShow = bn ? subArea : (subAreaEn || subArea);
  const displayText = areaShow ? `${areaShow}, ${cityShow}` : cityShow;
  const hasThanaSearch = q && thanaMatches.length > 0;

  return (
    <div ref={ref} className={`relative ${compact ? "min-w-0 w-full" : ""}`}>
      {compact ? (
        <div className="flex min-w-0 items-center gap-1">
          <button
            type="button"
            onClick={() => setOpen(!open)}
            aria-label={bn ? "অবস্থান নির্বাচন করুন" : "Choose location"}
            className="press flex h-9 min-w-0 max-w-full flex-1 items-center gap-1 rounded-full border border-border/70 bg-background/60 px-2.5 text-foreground/90 backdrop-blur transition-colors hover:border-primary/40 hover:bg-secondary active:scale-[0.97]"
          >
            <MapPin className="h-[14px] w-[14px] shrink-0 text-white" strokeWidth={2.2} />
            <span className="min-w-0 flex-1 text-white truncate text-left text-[11.5px] font-semibold leading-none tracking-tight">
              {displayText}
            </span>
            <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
          </button>
          <button
            type="button"
            onClick={handleCurrentLocation}
            disabled={locating}
            aria-label={bn ? "বর্তমান অবস্থান" : "Current location"}
            title={bn ? "বর্তমান অবস্থান" : "Current location"}
            className="press flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border/70 bg-background/60 text-primary backdrop-blur transition-colors hover:border-primary/40 hover:bg-secondary disabled:opacity-50 active:scale-[0.95]"
          >
            <Navigation className={`h-[14px] w-[14px] ${locating ? "animate-pulse" : ""}`} strokeWidth={2.2} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="flex items-center gap-1.5 border-r border-border px-3 py-3.5 text-sm text-foreground transition-colors hover:bg-orange-400/40 md:px-4 whitespace-nowrap"
        >
          <MapPin className="h-4 w-4 text-primary shrink-0" />
          <span className="max-w-[100px] md:max-w-[160px] truncate text-xs md:text-sm">{displayText}</span>
          <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
        </button>
      )}

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-x-2 top-[44px] z-[200] md:absolute md:inset-x-auto md:top-full md:left-0 md:mt-2 w-auto md:w-[380px] rounded-xl border border-border bg-background shadow-xl max-h-[80vh] flex flex-col"
          >
            {/* Search */}
            <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
              <Search className="h-4 w-4 text-muted-foreground shrink-0" />
              <input
                autoFocus
                type="text"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setSelectedDistrict(null); }}
                placeholder={t("location.searchPlaceholder") || "Search division, district or thana..."}
                className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
              />
              {search && (
                <button onClick={() => setSearch("")} className="text-muted-foreground hover:text-foreground">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Actions row */}
            <div className="flex border-b border-border">
              <button
                onClick={handleCurrentLocation}
                disabled={locating}
                className="flex flex-1 items-center justify-center gap-2 px-3 py-2.5 text-xs font-medium text-primary transition-colors hover:bg-secondary disabled:opacity-50"
              >
                <Navigation className="h-3.5 w-3.5" />
                {locating ? t("location.locating") : t("location.currentLocation")}
              </button>
              <div className="w-px bg-border" />
              <button
                onClick={() => { setShowMap(!showMap); setSelectedDistrict(null); }}
                className={`flex flex-1 items-center justify-center gap-2 px-3 py-2.5 text-xs font-medium transition-colors hover:bg-secondary ${
                  showMap ? "text-primary bg-secondary" : "text-foreground"
                }`}
              >
                <MapIcon className="h-3.5 w-3.5" />
                {showMap ? (bn ? "তালিকা দেখুন" : "Show List") : (bn ? "ম্যাপে সিলেক্ট" : "Select on Map")}
              </button>
            </div>

            {showMap ? (
              <div className="p-3">
                <Suspense
                  fallback={
                    <div className="flex h-[220px] items-center justify-center rounded-xl border border-border bg-secondary">
                      <span className="text-xs text-muted-foreground">{bn ? "ম্যাপ লোড হচ্ছে..." : "Loading map..."}</span>
                    </div>
                  }
                >
                  <MapPicker onLocationSelect={handleMapSelect} />
                </Suspense>
              </div>
            ) : selectedDistrict ? (
              /* Thana list for selected district */
              <div className="max-h-[300px] overflow-y-auto py-1">
                <button
                  onClick={() => setSelectedDistrict(null)}
                  className="flex w-full items-center gap-1.5 px-4 py-2 text-xs font-medium text-primary hover:bg-secondary transition-colors border-b border-border"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  {distName(selectedDistrict)} — {bn ? "থানা/এলাকা বাছুন" : "Select Thana/Area"}
                </button>
                <button
                  onClick={() => {
                    setSelectedCity(selectedDistrict.nameBn);
                    setSelectedCityEn(selectedDistrict.name);
                    setSubArea("");
                    setSubAreaEn("");
                    setOpen(false);
                    setSearch("");
                    setSelectedDistrict(null);
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary border-b border-border/50"
                >
                  <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                  {bn ? "সম্পূর্ণ" : "All of"} {distName(selectedDistrict)}
                </button>
                {selectedDistrict.thanas?.map((thana) => (
                  <button
                    key={thana}
                    onClick={() => handleThanaClick(thana, selectedDistrict)}
                    className={`flex w-full items-center gap-2 px-4 py-2.5 text-sm transition-colors hover:bg-secondary ${
                      selectedCity === selectedDistrict.nameBn && subArea === thana
                        ? "text-primary font-medium bg-secondary"
                        : "text-foreground"
                    }`}
                  >
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    {thanaName(thana)}
                  </button>
                ))}
              </div>
            ) : (
              /* Main list: show thana matches first when searching */
              <div className="max-h-[300px] overflow-y-auto py-1">
                {/* Currently selected location shown first */}
                {!q && selectedCity && (
                  <div>
                    <p className="sticky top-0 bg-primary/10 backdrop-blur-sm px-4 py-1.5 text-xs font-semibold text-primary tracking-wider flex items-center gap-1.5">
                      <MapPin className="h-3 w-3" /> {bn ? "সিলেক্টেড" : "Selected"}
                    </p>
                    <button
                      className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-primary font-medium bg-secondary transition-colors hover:bg-secondary/80"
                      onClick={() => setOpen(false)}
                    >
                      <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span>{areaShow ? `${areaShow}, ${cityShow}` : cityShow}</span>
                    </button>
                  </div>
                )}

                {/* Direct thana matches */}
                {hasThanaSearch && (
                  <div>
                    <p className="sticky top-0 bg-primary/10 backdrop-blur-sm px-4 py-1.5 text-xs font-semibold text-primary tracking-wider flex items-center gap-1.5">
                      <MapPin className="h-3 w-3" /> {bn ? "থানা/এলাকা" : "Thana/Area"} ({thanaMatches.length}{bn ? "টি মিল" : " matches"})
                    </p>
                    {thanaMatches.slice(0, 20).map((m) => (
                      <button
                        key={`${m.district.name}-${m.thana}`}
                        onClick={() => handleThanaClick(m.thana, m.district)}
                        className={`flex w-full items-center justify-between px-4 py-2.5 text-sm transition-colors hover:bg-secondary ${
                          selectedCity === m.district.nameBn && subArea === m.thana
                            ? "text-primary font-medium bg-secondary"
                            : "text-foreground"
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <MapPin className="h-3.5 w-3.5 text-primary/60 shrink-0" />
                          <span>
                            <span className="font-medium"><HighlightText text={thanaName(m.thana)} query={searchTrimmed} /></span>
                            <span className="text-[10px] text-muted-foreground ml-1.5">{distName(m.district)}, {divName(divisions.find(dv => dv.nameBn === m.division) || divisions[0])}</span>
                          </span>
                        </span>
                      </button>
                    ))}
                    {thanaMatches.length > 20 && (
                      <p className="px-4 py-2 text-[10px] text-muted-foreground text-center">
                        {bn ? `আরও ${thanaMatches.length - 20}টি ফলাফল আছে...` : `${thanaMatches.length - 20} more results...`}
                      </p>
                    )}
                  </div>
                )}

                {/* Division > District list */}
                {filteredDivisions.map((div) => (
                  <div key={div.name}>
                    <p className="sticky top-0 bg-secondary/80 backdrop-blur-sm px-4 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {divName(div)}
                    </p>
                    {div.districts.map((d) => (
                      <button
                        key={d.name}
                        onClick={() => handleDistrictClick(d)}
                        className={`flex w-full items-center justify-between px-4 py-2.5 text-sm transition-colors hover:bg-secondary ${
                          selectedCity === d.nameBn ? "text-primary font-medium bg-secondary" : "text-foreground"
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <HighlightText text={distName(d)} query={searchTrimmed} />
                        </span>
                        {d.thanas && d.thanas.length > 0 && (
                          <span className="text-[10px] text-muted-foreground bg-secondary rounded-full px-1.5 py-0.5">
                            {d.thanas.length} {bn ? "থানা" : "thanas"} ›
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                ))}
                {filteredDivisions.length === 0 && !hasThanaSearch && (
                  <p className="px-4 py-6 text-center text-sm text-muted-foreground">{t("location.noDistrict")}</p>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LocationSelector;

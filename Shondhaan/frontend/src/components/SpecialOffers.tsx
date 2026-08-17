import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Clock, Flame, Sparkles, Tag, Star, Timer } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { INDIVIDUAL_API_BASE_URL } from "@/lib/api";

type TabKey = "hot" | "new" | "deal" | "top";

const tabs: { key: TabKey; labelBn: string; labelEn: string; icon: typeof Flame; color: string; activeGradient: string }[] = [
  { key: "hot", labelBn: "হট", labelEn: "Hot", icon: Flame, color: "text-orange-500", activeGradient: "bg-gradient-to-r from-orange-500 to-rose-500 shadow-orange-500/40" },
  { key: "new", labelBn: "নিউ", labelEn: "New", icon: Sparkles, color: "text-emerald-500", activeGradient: "bg-gradient-to-r from-emerald-500 to-teal-500 shadow-emerald-500/40" },
  { key: "deal", labelBn: "ডিল", labelEn: "Deal", icon: Tag, color: "text-blue-500", activeGradient: "bg-gradient-to-r from-blue-500 to-indigo-500 shadow-blue-500/40" },
  { key: "top", labelBn: "টপ", labelEn: "Top", icon: Star, color: "text-amber-500", activeGradient: "bg-gradient-to-r from-amber-500 to-yellow-500 shadow-amber-500/40" },
];

const useCountdown = (expiresAt: string | null) => {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  useEffect(() => {
    const deadline = expiresAt
      ? new Date(expiresAt).getTime()
      : new Date().setHours(0, 0, 0, 0) + 7 * 86400000; // Fallback to 7 days if null
    const tick = () => {
      const diff = Math.max(0, deadline - Date.now());
      setTimeLeft({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);
  return timeLeft;
};

const TimeUnit = ({ value, label }: { value: number; label: string }) => (
  <div className="flex flex-col items-center">
    <span className="text-[11px] md:text-sm font-bold tabular-nums text-destructive bg-destructive/10 rounded px-1 py-0.5 min-w-[24px] md:min-w-[28px] text-center leading-none">
      {String(value).padStart(2, "0")}
    </span>
    <span className="text-[8px] md:text-[9px] text-muted-foreground mt-0.5 leading-none">{label}</span>
  </div>
);

// Deterministic deadline per offer (stable across renders) when API doesn't provide one.
const hashStr = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
};

const getOfferDeadline = (offer: any, fallbackKey: string): string => {
  if (offer?.expires_at || offer?.end_date) return offer.expires_at || offer.end_date;
  const key = offer?.service_slug || fallbackKey;
  const daysAhead = (hashStr(key) % 6) + 2; // 2–7 days
  const hoursOffset = hashStr(key + "h") % 24;
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  return new Date(startOfToday.getTime() + daysAhead * 86400000 + hoursOffset * 3600000).toISOString();
};

const OfferCountdown = ({ deadline, bn }: { deadline: string; bn: boolean }) => {
  const { days, hours, minutes, seconds } = useCountdown(deadline);
  const expired = days + hours + minutes + seconds <= 0;
  if (expired) {
    return (
      <div className="flex items-center gap-1 text-[9px] md:text-[10px] font-semibold text-muted-foreground">
        <Timer className="h-2.5 w-2.5" />
        {bn ? "অফার শেষ" : "Expired"}
      </div>
    );
  }
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    <div className="flex items-center gap-1 rounded-md bg-destructive/10 px-1.5 py-0.5 text-destructive">
      <Timer className="h-2.5 w-2.5 md:h-3 md:w-3 animate-pulse" />
      <span className="text-[9px] md:text-[10px] font-bold tabular-nums leading-none">
        {days > 0 ? `${days}${bn ? "দি" : "d"} ` : ""}
        {pad(hours)}:{pad(minutes)}:{pad(seconds)}
      </span>
    </div>
  );
};

type ServiceOfferApiItem = {
  id?: number | string;
  title?: string;
  title_bn?: string | null;
  description?: string | null;
  description_bn?: string | null;
  image_url?: string | null;
  discount_type?: "percentage" | "fixed" | string;
  discount_value?: number | string | null;
  service_slug?: string | null;
  service_id?: number | string | null;
  category_id?: number | string | null;
  is_active?: boolean | number | string | null;
  is_featured?: boolean | number | string | null;
  start_date?: string | null;
  end_date?: string | null;
  expires_at?: string | null;
  badge?: string | null;
  gradient?: string | null;
  border_color?: string | null;
  accent_color?: string | null;
  bg_accent?: string | null;
};

const normalizeApiOffer = (offer: ServiceOfferApiItem, index: number) => {
  const discountType = String(offer.discount_type || "percentage");
  const discountValue = Number(offer.discount_value ?? 0);
  const titleBn = offer.title_bn || offer.title || "বিশেষ অফার";
  const titleEn = offer.title || "Special Offer";
  const descriptionBn = offer.description_bn || offer.description || "বিশেষ ছাড়ের সুযোগ";
  const descriptionEn = offer.description || "Special discount available";
  const discountLabel =
    discountType === "fixed"
      ? `৳${discountValue}`
      : `${discountValue}${discountValue > 0 && discountValue <= 100 ? "%" : ""}`;

  return {
    id: offer.id ?? `api-offer-${index}`,
    title_bn: titleBn,
    title_en: titleEn,
    discount_bn: `${discountLabel} ছাড়`,
    discount_en: `${discountLabel} OFF`,
    description_bn: descriptionBn,
    description_en: descriptionEn,
    service_slug: offer.service_slug || (offer.service_id ? `service-${offer.service_id}` : ""),
    image: offer.image_url || "", // No fallback image, will hide if empty
    gradient: offer.gradient || "from-primary/15 via-primary/5 to-transparent",
    accent_color: offer.accent_color || "text-primary",
    bg_accent: offer.bg_accent || "bg-primary/10",
    border_accent: offer.border_color || "border-primary/20",
    expires_at: offer.expires_at || offer.end_date || null,
  };
};

const SpecialOffers = () => { 
  const navigate = useNavigate();
  const { language } = useLanguage();
  const bn = language === "bn";
  const [activeTab, setActiveTab] = useState<TabKey>("hot");
  const [apiOffers, setApiOffers] = useState<any[]>([]);
  const [loadingOffers, setLoadingOffers] = useState(true);

  useEffect(() => {
    let ignore = false;

    const fetchLiveOffers = async () => {
      try {
        setLoadingOffers(true);
        const res = await fetch(`${INDIVIDUAL_API_BASE_URL.replace(/\/+$/, "")}/api/service-offers?is_active=true`);
        const json = await res.json().catch(() => ({}));
        const rows = Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : [];
        if (!ignore) {
          // Filter active offers and map them
          const activeRows = rows.filter((offer: any) => offer?.is_active !== false && offer?.is_active !== 0);
          setApiOffers(activeRows.map(normalizeApiOffer));
        }
      } catch (error) {
        console.error("Failed to load service offers:", error);
        if (!ignore) setApiOffers([]);
      } finally {
        if (!ignore) setLoadingOffers(false);
      }
    };

    fetchLiveOffers();
    return () => {
      ignore = true;
    };
  }, []);

  // For demonstration, we populate all tabs with the same live offers.
  // You can later add a 'tab' or 'category' column to your DB to filter these properly.
  const tabOffers: Record<TabKey, any[]> = {
    hot: apiOffers,
    new: apiOffers,
    deal: apiOffers,
    top: apiOffers.filter(o => o.is_featured) // Example: 'top' tab shows featured
  };

  const offers = tabOffers[activeTab];
  const firstExpiry = offers[0]?.expires_at || null;
  const { days, hours, minutes, seconds } = useCountdown(firstExpiry);

  // If API is done loading and returns no offers, hide the whole section
  if (!loadingOffers && apiOffers.length === 0) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.4 }}
      className="py-5 md:py-8 px-4 md:px-0"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-heading text-lg md:text-2xl font-bold text-foreground">
          {bn ? "স্পেশাল অফার" : "Special Offers"}
        </h2>
        <div className="flex items-center gap-1">
          <Clock className="h-3 w-3 text-destructive shrink-0" />
          <div className="flex items-center gap-0.5">
            {days > 0 && (
              <>
                <TimeUnit value={days} label={bn ? "দিন" : "D"} />
                <span className="text-[10px] font-bold text-destructive/40">:</span>
              </>
            )}
            <TimeUnit value={hours} label={bn ? "ঘণ্টা" : "H"} />
            <span className="text-[10px] font-bold text-destructive/40">:</span>
            <TimeUnit value={minutes} label={bn ? "মি" : "M"} />
            <span className="text-[10px] font-bold text-destructive/40">:</span>
            <TimeUnit value={seconds} label={bn ? "সে" : "S"} />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1.5 mb-4 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`relative flex items-center gap-1 px-3.5 py-1.5 rounded-full text-xs md:text-sm font-semibold whitespace-nowrap transition-all duration-200 ${
                isActive
                  ? `${tab.activeGradient} text-white shadow-lg scale-105`
                  : "bg-muted/60 text-muted-foreground hover:bg-muted"
              }`}
            >
              <Icon className={`h-3.5 w-3.5 ${isActive ? "text-white" : tab.color}`} />
              {bn ? tab.labelBn : tab.labelEn}
            </button>
          );
        })}
      </div>

      {/* Cards */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.25 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-2.5 md:gap-4"
        >
          {offers.slice(0, 4).map((offer: any, i: number) => (
            <motion.div
              key={`${offer.id ?? offer.service_slug ?? "offer"}-${i}`}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.25, delay: i * 0.06 }}
              onClick={() => {
                if (offer.service_slug) {
                  navigate(`/service/${offer.service_slug}`);
                } else {
                  navigate("/all-services");
                }
              }}
              className={`cursor-pointer group relative rounded-2xl bg-card border-2 ${offer.border_accent} overflow-hidden transition-all duration-300 hover:shadow-2xl hover:-translate-y-1.5`}
            >
              {/* Image / Gradient Header */}
              <div className={`relative bg-gradient-to-br ${offer.gradient} flex items-center justify-center h-[88px] md:h-28 overflow-hidden`}>
                {/* Decorative blobs */}
                <div className={`absolute -top-6 -left-6 w-20 h-20 rounded-full ${offer.bg_accent} blur-2xl opacity-70`} />
                <div className={`absolute -bottom-8 -right-4 w-24 h-24 rounded-full ${offer.bg_accent} blur-2xl opacity-50`} />
                
                {/* Render image only if available */}
                {offer.image ? (
                  <img
                    src={offer.image}
                    alt=""
                    loading="lazy"
                    className="relative z-10 h-14 w-14 md:h-16 md:w-16 object-contain drop-shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300"
                  />
                ) : (
                  <div className="relative z-10 h-14 w-14 md:h-16 md:w-16 flex items-center justify-center">
                    <Tag className="h-8 w-8 text-muted-foreground/40" />
                  </div>
                )}

                <span className={`absolute top-1.5 right-1.5 z-10 rounded-full bg-white/90 dark:bg-black/60 backdrop-blur-sm px-2 py-0.5 text-[9px] md:text-[10px] font-extrabold ${offer.accent_color} border ${offer.border_accent} shadow-md`}>
                  {bn ? offer.discount_bn : (offer.discount_en || offer.discount_bn)}
                </span>
              </div>

              {/* Content */}
              <div className="p-2.5 md:p-3">
                <h3 className="text-[13px] md:text-sm font-semibold text-foreground leading-tight line-clamp-1">
                  {bn ? offer.title_bn : (offer.title_en || offer.title_bn)}
                </h3>
                <p className="mt-0.5 text-[10px] md:text-[11px] text-muted-foreground leading-snug line-clamp-2">
                  {bn ? offer.description_bn : (offer.description_en || offer.description_bn)}
                </p>
                <div className="mt-2 flex items-center justify-between gap-1">
                  <OfferCountdown deadline={getOfferDeadline(offer, `${activeTab}-${i}`)} bn={bn} />
                  <span className={`flex items-center gap-0.5 text-[10px] md:text-xs font-semibold ${offer.accent_color} group-hover:gap-1 transition-all`}>
                    {bn ? "বুক করুন" : "Book"}
                    <ArrowRight className="h-2.5 w-2.5 md:h-3 md:w-3" />
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </AnimatePresence>
    </motion.section>
  );
};

export default SpecialOffers;
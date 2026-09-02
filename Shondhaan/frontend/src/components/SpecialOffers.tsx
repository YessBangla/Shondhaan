import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Clock, Flame, Sparkles, Tag, Star, Timer, Zap } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { INDIVIDUAL_API_BASE_URL } from "@/lib/api";

type TabKey = "hot" | "new" | "deal" | "top";

const tabs: { key: TabKey; labelBn: string; labelEn: string; icon: typeof Flame; color: string; activeGradient: string; bgColor: string }[] = [
  { key: "hot", labelBn: "🔥 হট ডিল", labelEn: "🔥 Hot Deals", icon: Flame, color: "text-orange-500", activeGradient: "bg-gradient-to-r from-orange-500 via-rose-500 to-red-500 shadow-2xl shadow-orange-500/50", bgColor: "bg-orange-500" },
  { key: "new", labelBn: "✨ নতুন", labelEn: "✨ New", icon: Sparkles, color: "text-emerald-500", activeGradient: "bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 shadow-2xl shadow-emerald-500/50", bgColor: "bg-emerald-500" },
  { key: "deal", labelBn: "🏷️ অফার", labelEn: "🏷️ Deals", icon: Tag, color: "text-blue-500", activeGradient: "bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 shadow-2xl shadow-blue-500/50", bgColor: "bg-blue-500" },
  { key: "top", labelBn: "⭐ টপ রেটেড", labelEn: "⭐ Top Rated", icon: Star, color: "text-amber-500", activeGradient: "bg-gradient-to-r from-amber-500 via-yellow-500 to-orange-400 shadow-2xl shadow-amber-500/50", bgColor: "bg-amber-500" },
];

const SERVICE_API = (import.meta.env.VITE_SERVICE_API_BASE_URL || "http://localhost:3000").replace(/\/+$/, "");
const getImageUrl = (url: string) => {
  if (!url) return "";
  return url.startsWith("http") ? url : `${SERVICE_API}${url}`;
};

const useCountdown = (expiresAt: string | null) => {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  useEffect(() => {
    const deadline = expiresAt
      ? new Date(expiresAt).getTime()
      : new Date().setHours(0, 0, 0, 0) + 7 * 86400000;
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
  <motion.div
    className="flex flex-col items-center"
    animate={{ scale: [1, 1.05, 1] }}
    transition={{ duration: 0.6, repeat: Infinity, repeatDelay: 0.5 }}
  >
    <span className="text-xs md:text-sm font-black tabular-nums text-white bg-gradient-to-br from-red-500 to-orange-600 rounded-lg px-2 py-1 min-w-[28px] md:min-w-[32px] text-center leading-none shadow-lg shadow-orange-500/40">
      {String(value).padStart(2, "0")}
    </span>
    <span className="text-[7px] md:text-[8px] text-muted-foreground mt-1 leading-none uppercase font-bold tracking-wider">{label}</span>
  </motion.div>
);

const hashStr = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
};

const getOfferDeadline = (offer: any, fallbackKey: string): string => {
  if (offer?.expires_at || offer?.end_date) return offer.expires_at || offer.end_date;
  const key = offer?.service_slug || fallbackKey;
  const daysAhead = (hashStr(key) % 6) + 2;
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
      <motion.div
        className="flex items-center gap-1 text-xs font-bold text-muted-foreground/60"
        animate={{ opacity: [0.6, 1] }}
        transition={{ duration: 1, repeat: Infinity }}
      >
        <Timer className="h-3 w-3" />
        {bn ? "শেষ হয়েছে" : "Expired"}
      </motion.div>
    );
  }
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    <motion.div
      className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-orange-500/20 to-red-500/20 backdrop-blur-sm border border-orange-300/40 px-2 py-1"
      animate={{ boxShadow: ["0 0 10px rgba(255,100,0,0)", "0 0 20px rgba(255,100,0,0.5)", "0 0 10px rgba(255,100,0,0)"] }}
      transition={{ duration: 2, repeat: Infinity }}
    >
      <Zap className="h-3.5 w-3.5 text-orange-500 animate-pulse" />
      <span className="text-xs font-black tabular-nums text-orange-600 leading-none">
        {days > 0 ? `${days}${bn ? "দি" : "d"} ` : ""}
        {pad(hours)}:{pad(minutes)}:{pad(seconds)}
      </span>
    </motion.div>
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
    discount_type: discountType,
    discount_value: discountValue,
    description_bn: descriptionBn,
    description_en: descriptionEn,
    service_slug: offer.service_slug || "",
    image: offer.image_url || "",
    gradient: offer.gradient || "from-blue-600/20 via-purple-600/10 to-transparent",
    accent_color: offer.accent_color || "text-blue-600",
    bg_accent: offer.bg_accent || "bg-blue-100",
    border_accent: offer.border_color || "border-blue-300/40",
    expires_at: offer.expires_at || offer.end_date || null,
  };
};

/* ── Price calculator ── */
const calcDiscounted = (original: number, type: string, value: number) => {
  if (!original || original <= 0 || value <= 0) return null;
  const discounted = type === "fixed"
    ? Math.max(0, original - value)
    : Math.max(0, original - (original * value) / 100);
  return discounted < original ? discounted : null;
};

const SpecialOffers = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const bn = language === "bn";
  const [activeTab, setActiveTab] = useState<TabKey>("hot");
  const [apiOffers, setApiOffers] = useState<any[]>([]);
  const [loadingOffers, setLoadingOffers] = useState(true);
  const [servicePrices, setServicePrices] = useState<Record<string, number>>({});

  useEffect(() => {
    let ignore = false;
    const fetchLiveOffers = async () => {
      try {
        setLoadingOffers(true);
        const res = await fetch(`${INDIVIDUAL_API_BASE_URL.replace(/\/+$/, "")}/api/service-offers?is_active=true`);
        const json = await res.json().catch(() => ({}));
        const rows = Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : [];
        if (!ignore) {
          const activeRows = rows.filter((offer: any) => offer?.is_active !== false && offer?.is_active !== 0);
          const normalized = activeRows.map(normalizeApiOffer);
          setApiOffers(normalized);

          // Fetch prices for linked services
          const slugs = [...new Set(normalized.map((o: any) => o.service_slug).filter(Boolean))];
          if (slugs.length > 0) {
            const priceMap: Record<string, number> = {};
            await Promise.all(
              slugs.map(async (slug) => {
                try {
                  const sRes = await fetch(`${SERVICE_API}/api/services/${encodeURIComponent(slug)}`);
                  const sJson = await sRes.json().catch(() => ({}));
                  const s = sJson?.data ?? sJson?.service ?? sJson;
                  if (s?.price != null) priceMap[slug] = Number(s.price);
                } catch { /* skip */ }
              })
            );
            if (!ignore) setServicePrices(priceMap);
          }
          
        }
      } catch (error) {
        console.error("Failed to load service offers:", error);
        if (!ignore) setApiOffers([]);
      } finally {
        if (!ignore) setLoadingOffers(false);
      }
    };
    fetchLiveOffers();
    return () => { ignore = true; };
  }, []);

  const tabOffers: Record<TabKey, any[]> = {
    hot: apiOffers,
    new: apiOffers,
    deal: apiOffers,
    top: apiOffers.filter(o => o.is_featured),
  };

  const offers = tabOffers[activeTab];
  const firstExpiry = offers[0]?.expires_at || null;
  const { days, hours, minutes, seconds } = useCountdown(firstExpiry);

  if (!loadingOffers && apiOffers.length === 0) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.6 }}
      className="py-8 md:py-12 relative overflow-hidden"
    >
      {/* Animated background elements */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <motion.div
          className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-orange-400/20 to-transparent rounded-full blur-3xl"
          animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        />
        <motion.div
          className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-blue-400/20 to-transparent rounded-full blur-3xl"
          animate={{ rotate: -360 }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
        />
      </div>

      {/* Header */}
      <motion.div
        className="flex items-center justify-between mb-6 md:mb-8 gap-4 flex-wrap"
        initial={{ opacity: 0, x: -20 }}
        whileInView={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="flex items-center gap-3">
          <motion.div className="p-2.5 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 text-white shadow-lg shadow-orange-500/40">
            <Flame className="h-5 w-5" />
          </motion.div>
          <div>
            <h2 className="font-heading text-2xl md:text-3xl font-black text-foreground tracking-tight">
              {bn ? " স্পেশাল অফার" : " Special Offers"}
            </h2>
            <p className="text-xs md:text-sm text-muted-foreground/70 font-medium mt-0.5">
              {bn ? "সীমিত সময়ের জন্য" : "Limited time only"}
            </p>
          </div>
        </div>

        {/* Global Countdown */}
        <motion.div
          className="flex items-center gap-2 bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-950/30 dark:to-red-950/30 border border-orange-200/50 dark:border-orange-800/50 rounded-2xl px-3 md:px-4 py-2 backdrop-blur-sm"
          initial={{ opacity: 0, scale: 0.8 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <Clock className="h-4 w-4 text-orange-600 shrink-0" />
          <div className="flex items-center gap-1.5">
            {days > 0 && (
              <>
                <TimeUnit value={days} label={bn ? "দিন" : "D"} />
                <span className="text-xs font-bold text-orange-400/60">:</span>
              </>
            )}
            <TimeUnit value={hours} label={bn ? "ঘ" : "H"} />
            <span className="text-xs font-bold text-orange-400/60">:</span>
            <TimeUnit value={minutes} label={bn ? "মি" : "M"} />
            <span className="text-xs font-bold text-orange-400/60">:</span>
            <TimeUnit value={seconds} label={bn ? "সে" : "S"} />
          </div>
        </motion.div>
      </motion.div>

      {/* Cards Grid */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.4 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6"
        >
          {offers.slice(0, 4).map((offer: any, i: number) => {
            const originalPrice = servicePrices[offer.service_slug] || 0;
            const discountedPrice = calcDiscounted(originalPrice, offer.discount_type, offer.discount_value);
            const hasPrice = originalPrice > 0 && discountedPrice !== null;

            return (
              <motion.div
                key={`${offer.id ?? offer.service_slug ?? "offer"}-${i}`}
                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                whileHover={{ y: -8 }}
                onClick={() => {
                  if (offer.service_slug) {
                    navigate(`/service/${offer.service_slug}?offerId=${offer.id}`);
                  } else {
                    navigate("/all-services");
                  }
                }}
                className="cursor-pointer border shadow group relative rounded-2xl overflow-hidden"
              >
                <div className="relative bg-card border border-border/60 rounded-2xl overflow-hidden h-full flex flex-col shadow-lg group-hover:shadow-2xl group-hover:border-orange-400/60">
                  {/* Image / Gradient Header */}
                  <div className={`relative bg-gradient-to-br ${offer.gradient} flex items-center justify-center h-36 md:h-48 overflow-hidden`}>
                    {offer.image ? (
                      <img
                        src={getImageUrl(offer.image)}
                        alt={offer.title_en || offer.title_bn}
                        loading="lazy"
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    ) : (
                      <>
                        <motion.div
                          className={`absolute -top-8 -left-8 w-24 h-24 rounded-full ${offer.bg_accent} blur-2xl opacity-60`}
                          animate={{ scale: [1, 1.3, 1] }}
                          transition={{ duration: 4, repeat: Infinity }}
                        />
                        <motion.div
                          className={`absolute -bottom-8 -right-8 w-32 h-32 rounded-full ${offer.bg_accent} blur-3xl opacity-40`}
                          animate={{ scale: [1.3, 1, 1.3] }}
                          transition={{ duration: 5, repeat: Infinity, delay: 0.5 }}
                        />
                      </>
                    )}

                    {/* Premium Badge */}
                    <motion.div
                      className="absolute top-3 right-3 z-10 rounded-full bg-gradient-to-br from-orange-500 to-red-600 text-white backdrop-blur-md px-3 py-1.5 text-xs md:text-sm font-black shadow-lg border border-white/30"
                      animate={{ scale: [1, 1.05, 1], y: [0, -2, 0] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      >
                      <div className="flex items-center gap-1">
                        <Zap className="h-3 w-3 md:h-4 md:w-4" />
                        {bn ? offer.discount_bn : (offer.discount_en || offer.discount_bn)}
                      </div>
                    </motion.div>

                    {/* Original price tag on image (when discount available) */}
                    {hasPrice && (
                      <div className="absolute bottom-3 left-3 z-10 rounded-lg bg-black/60 backdrop-blur-sm px-2.5 py-1">
                        <span className="text-[11px] md:text-xs text-white/60 line-through">
                          ৳{originalPrice.toLocaleString(bn ? "bn-BD" : "en-US")}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-3.5 md:p-4 space-y-2 flex-1 flex flex-col">
                    <h3 className="text-sm md:text-base font-bold text-foreground leading-tight line-clamp-2">
                      {bn ? offer.title_bn : (offer.title_en || offer.title_bn)}
                    </h3>
                    <p className="text-[11px] md:text-xs text-muted-foreground/80 leading-snug line-clamp-2 flex-1">
                      {bn ? offer.description_bn : (offer.description_en || offer.description_bn)}
                    </p>

                    {/* ── Discounted price ── */}
                    {hasPrice ? (
                      <div className="flex items-baseline gap-2">
                        <span className="text-base md:text-lg font-black text-primary">
                          ৳{discountedPrice!.toLocaleString(bn ? "bn-BD" : "en-US")}
                        </span>
                        <span className="text-[10px] font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded">
                          {offer.discount_type === "fixed" ? `৳${offer.discount_value} ছাড়` : `${offer.discount_value}% ছাড়`}
                        </span>
                      </div>
                    ) : null}

                    <div className="flex items-center justify-between gap-2 pt-2 mt-auto border-t border-border/50">
                      <OfferCountdown deadline={getOfferDeadline(offer, `${activeTab}-${i}`)} bn={bn} />
                      <motion.span
                        className="flex items-center gap-1 text-xs md:text-sm font-bold text-primary group-hover:gap-2 transition-all whitespace-nowrap"
                        whileHover={{ x: 4 }}
                      >
                        {bn ? "বুক করুন" : "Book Now"}
                        <ArrowRight className="h-3.5 w-3.5 md:h-4 md:w-4" />
                      </motion.span>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </AnimatePresence>
    </motion.section>
  );
};


export default SpecialOffers;
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Clock, Flame, Sparkles, Tag, Star, Timer } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCmsOffers, CmsSpecialOffer } from "@/hooks/useCmsData";

import offerAc from "@/assets/offer-ac.png";
import offerCleaning from "@/assets/offer-cleaning.png";
import offerSalon from "@/assets/offer-salon.png";
import offerPlumbing from "@/assets/offer-plumbing.png";
import offerPest from "@/assets/offer-pest.png";
import offerWater from "@/assets/offer-water.png";
import offerFridge from "@/assets/offer-fridge.png";
import offerGarden from "@/assets/offer-garden.png";
import offerElectric from "@/assets/offer-electric.png";
import offerPaint from "@/assets/offer-paint.png";
import offerWashing from "@/assets/offer-washing.png";
import offerShifting from "@/assets/offer-shifting.png";

type TabKey = "hot" | "new" | "deal" | "top";

const tabs: { key: TabKey; labelBn: string; labelEn: string; icon: typeof Flame; color: string; activeGradient: string }[] = [
  { key: "hot", labelBn: "হট", labelEn: "Hot", icon: Flame, color: "text-orange-500", activeGradient: "bg-gradient-to-r from-orange-500 to-rose-500 shadow-orange-500/40" },
  { key: "new", labelBn: "নিউ", labelEn: "New", icon: Sparkles, color: "text-emerald-500", activeGradient: "bg-gradient-to-r from-emerald-500 to-teal-500 shadow-emerald-500/40" },
  { key: "deal", labelBn: "ডিল", labelEn: "Deal", icon: Tag, color: "text-blue-500", activeGradient: "bg-gradient-to-r from-blue-500 to-indigo-500 shadow-blue-500/40" },
  { key: "top", labelBn: "টপ", labelEn: "Top", icon: Star, color: "text-amber-500", activeGradient: "bg-gradient-to-r from-amber-500 to-yellow-500 shadow-amber-500/40" },
];

const allOffers: Record<TabKey, any[]> = {
  hot: [
    {
      title_bn: "এসি সার্ভিসিং", title_en: "AC Servicing",
      discount_bn: "২০% ছাড়", discount_en: "20% OFF",
      description_bn: "গরমে আরাম পান — বিশেষ ছাড়!",
      description_en: "Beat the heat — special discount!",
      service_slug: "ac-service", image: offerAc,
      gradient: "from-orange-500/40 via-orange-400/25 to-orange-300/10",
      accent_color: "text-orange-600 dark:text-orange-400",
      bg_accent: "bg-orange-500/10", border_accent: "border-orange-500/20",
      expires_at: null,
    },
    {
      title_bn: "হোম ক্লিনিং", title_en: "Home Cleaning",
      discount_bn: "১৫% ছাড়", discount_en: "15% OFF",
      description_bn: "পরিষ্কার ঘর, সুস্থ পরিবার!",
      description_en: "Clean home, healthy family!",
      service_slug: "cleaning", image: offerCleaning,
      gradient: "from-emerald-500/40 via-emerald-400/25 to-emerald-300/10",
      accent_color: "text-emerald-600 dark:text-emerald-400",
      bg_accent: "bg-emerald-500/10", border_accent: "border-emerald-500/20",
      expires_at: null,
    },
    {
      title_bn: "সেলুন কেয়ার", title_en: "Salon Care",
      discount_bn: "২৫% ছাড়", discount_en: "25% OFF",
      description_bn: "নিজেকে প্যাম্পার করুন!",
      description_en: "Pamper yourself!",
      service_slug: "salon", image: offerSalon,
      gradient: "from-pink-500/40 via-pink-400/25 to-pink-300/10",
      accent_color: "text-pink-600 dark:text-pink-400",
      bg_accent: "bg-pink-500/10", border_accent: "border-pink-500/20",
      expires_at: null,
    },
    {
      title_bn: "প্লাম্বিং সেবা", title_en: "Plumbing",
      discount_bn: "১০% ছাড়", discount_en: "10% OFF",
      description_bn: "পাইপ লিকেজ? দক্ষ প্লাম্বার!",
      description_en: "Pipe issue? Expert plumber!",
      service_slug: "plumbing", image: offerPlumbing,
      gradient: "from-blue-500/40 via-blue-400/25 to-blue-300/10",
      accent_color: "text-blue-600 dark:text-blue-400",
      bg_accent: "bg-blue-500/10", border_accent: "border-blue-500/20",
      expires_at: null,
    },
  ],
  new: [
    {
      title_bn: "পেস্ট কন্ট্রোল", title_en: "Pest Control",
      discount_bn: "৩০% ছাড়", discount_en: "30% OFF",
      description_bn: "পোকামাকড় দূর করুন!",
      description_en: "Eliminate pests — new service!",
      service_slug: "pest-control", image: offerPest,
      gradient: "from-teal-500/40 via-teal-400/25 to-teal-300/10",
      accent_color: "text-teal-600 dark:text-teal-400",
      bg_accent: "bg-teal-500/10", border_accent: "border-teal-500/20",
      expires_at: null,
    },
    {
      title_bn: "ওয়াটার পিউরিফায়ার", title_en: "Water Purifier",
      discount_bn: "১৫% ছাড়", discount_en: "15% OFF",
      description_bn: "বিশুদ্ধ পানি নিশ্চিত করুন!",
      description_en: "Ensure pure drinking water!",
      service_slug: "water-purifier", image: offerWater,
      gradient: "from-cyan-500/40 via-cyan-400/25 to-cyan-300/10",
      accent_color: "text-cyan-600 dark:text-cyan-400",
      bg_accent: "bg-cyan-500/10", border_accent: "border-cyan-500/20",
      expires_at: null,
    },
    {
      title_bn: "ফ্রিজ সার্ভিসিং", title_en: "Fridge Service",
      discount_bn: "২০% ছাড়", discount_en: "20% OFF",
      description_bn: "ফ্রিজ ঠিক করুন — দ্রুত সেবা!",
      description_en: "Fridge repair — quick service!",
      service_slug: "fridge-service", image: offerFridge,
      gradient: "from-indigo-500/40 via-indigo-400/25 to-indigo-300/10",
      accent_color: "text-indigo-600 dark:text-indigo-400",
      bg_accent: "bg-indigo-500/10", border_accent: "border-indigo-500/20",
      expires_at: null,
    },
    {
      title_bn: "গার্ডেনিং", title_en: "Gardening",
      discount_bn: "১০% ছাড়", discount_en: "10% OFF",
      description_bn: "বাগান পরিচর্যায় বিশেষ ছাড়!",
      description_en: "Special discount on gardening!",
      service_slug: "gardening", image: offerGarden,
      gradient: "from-green-500/40 via-green-400/25 to-green-300/10",
      accent_color: "text-green-600 dark:text-green-400",
      bg_accent: "bg-green-500/10", border_accent: "border-green-500/20",
      expires_at: null,
    },
  ],
  deal: [
    {
      title_bn: "ইলেকট্রিশিয়ান", title_en: "Electrician",
      discount_bn: "৩৫% ছাড়", discount_en: "35% OFF",
      description_bn: "ইলেকট্রিক সমস্যায় বড় ছাড়!",
      description_en: "Big savings on electrical!",
      service_slug: "electrician", image: offerElectric,
      gradient: "from-amber-500/40 via-amber-400/25 to-amber-300/10",
      accent_color: "text-amber-600 dark:text-amber-400",
      bg_accent: "bg-amber-500/10", border_accent: "border-amber-500/20",
      expires_at: null,
    },
    {
      title_bn: "পেইন্টিং সেবা", title_en: "Painting",
      discount_bn: "২০% ছাড়", discount_en: "20% OFF",
      description_bn: "ঘর রাঙান — সেরা দামে!",
      description_en: "Paint your home — best price!",
      service_slug: "painting", image: offerPaint,
      gradient: "from-violet-500/40 via-violet-400/25 to-violet-300/10",
      accent_color: "text-violet-600 dark:text-violet-400",
      bg_accent: "bg-violet-500/10", border_accent: "border-violet-500/20",
      expires_at: null,
    },
    {
      title_bn: "ওয়াশিং মেশিন", title_en: "Washing Machine",
      discount_bn: "২৫% ছাড়", discount_en: "25% OFF",
      description_bn: "ওয়াশিং মেশিন সার্ভিসিং!",
      description_en: "Washing machine service deal!",
      service_slug: "washing-machine", image: offerWashing,
      gradient: "from-sky-500/40 via-sky-400/25 to-sky-300/10",
      accent_color: "text-sky-600 dark:text-sky-400",
      bg_accent: "bg-sky-500/10", border_accent: "border-sky-500/20",
      expires_at: null,
    },
    {
      title_bn: "শিফটিং সেবা", title_en: "Home Shifting",
      discount_bn: "১৫% ছাড়", discount_en: "15% OFF",
      description_bn: "বাসা বদলান সহজেই!",
      description_en: "Shift your home easily!",
      service_slug: "shifting", image: offerShifting,
      gradient: "from-rose-500/40 via-rose-400/25 to-rose-300/10",
      accent_color: "text-rose-600 dark:text-rose-400",
      bg_accent: "bg-rose-500/10", border_accent: "border-rose-500/20",
      expires_at: null,
    },
  ],
  top: [
    {
      title_bn: "এসি সার্ভিসিং", title_en: "AC Servicing",
      discount_bn: "২০% ছাড়", discount_en: "20% OFF",
      description_bn: "সর্বাধিক জনপ্রিয় সেবা!",
      description_en: "Most popular service!",
      service_slug: "ac-service", image: offerAc,
      gradient: "from-orange-500/40 via-orange-400/25 to-orange-300/10",
      accent_color: "text-orange-600 dark:text-orange-400",
      bg_accent: "bg-orange-500/10", border_accent: "border-orange-500/20",
      expires_at: null,
    },
    {
      title_bn: "ইলেকট্রিশিয়ান", title_en: "Electrician",
      discount_bn: "১০% ছাড়", discount_en: "10% OFF",
      description_bn: "সবচেয়ে বেশি অর্ডার হওয়া সেবা!",
      description_en: "Most ordered service!",
      service_slug: "electrician", image: offerElectric,
      gradient: "from-amber-500/40 via-amber-400/25 to-amber-300/10",
      accent_color: "text-amber-600 dark:text-amber-400",
      bg_accent: "bg-amber-500/10", border_accent: "border-amber-500/20",
      expires_at: null,
    },
    {
      title_bn: "হোম ক্লিনিং", title_en: "Home Cleaning",
      discount_bn: "১৫% ছাড়", discount_en: "15% OFF",
      description_bn: "টপ রেটেড — এখনই বুক করুন!",
      description_en: "Top rated — book now!",
      service_slug: "cleaning", image: offerCleaning,
      gradient: "from-emerald-500/40 via-emerald-400/25 to-emerald-300/10",
      accent_color: "text-emerald-600 dark:text-emerald-400",
      bg_accent: "bg-emerald-500/10", border_accent: "border-emerald-500/20",
      expires_at: null,
    },
    {
      title_bn: "সেলুন কেয়ার", title_en: "Salon Care",
      discount_bn: "২৫% ছাড়", discount_en: "25% OFF",
      description_bn: "কাস্টমার ফেভারিট সেবা!",
      description_en: "Customer favorite!",
      service_slug: "salon", image: offerSalon,
      gradient: "from-pink-500/40 via-pink-400/25 to-pink-300/10",
      accent_color: "text-pink-600 dark:text-pink-400",
      bg_accent: "bg-pink-500/10", border_accent: "border-pink-500/20",
      expires_at: null,
    },
  ],
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
  <div className="flex flex-col items-center">
    <span className="text-[11px] md:text-sm font-bold tabular-nums text-destructive bg-destructive/10 rounded px-1 py-0.5 min-w-[24px] md:min-w-[28px] text-center leading-none">
      {String(value).padStart(2, "0")}
    </span>
    <span className="text-[8px] md:text-[9px] text-muted-foreground mt-0.5 leading-none">{label}</span>
  </div>
);

// Deterministic deadline per offer (stable across renders) when CMS doesn't provide one.
// Cycles between 1–7 days from the start of today based on a hash of the slug.
const hashStr = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
};
const getOfferDeadline = (offer: any, fallbackKey: string): string => {
  if (offer?.expires_at) return offer.expires_at;
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

// Map service slugs to images for CMS offers
const slugImageMap: Record<string, string> = {
  "ac-service": offerAc, "cleaning": offerCleaning, "salon": offerSalon,
  "plumbing": offerPlumbing, "pest-control": offerPest, "water-purifier": offerWater,
  "fridge-service": offerFridge, "gardening": offerGarden, "electrician": offerElectric,
  "painting": offerPaint, "washing-machine": offerWashing, "shifting": offerShifting,
  "mosquito-net": offerPest, "bike-servicing": offerPlumbing,
};

const SpecialOffers = () => { 
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { data: cmsOffers } = useCmsOffers();
  const bn = language === "bn";
  const [activeTab, setActiveTab] = useState<TabKey>("hot");

  // Enrich CMS offers with images and styling, then pad to 4 with fallbacks
  const cmsActive = cmsOffers && cmsOffers.length > 0
    ? cmsOffers.filter((o: CmsSpecialOffer) => o.is_active).map((o) => ({
        ...o,
        image: slugImageMap[o.service_slug || ""] || offerAc,
        gradient: o.gradient?.startsWith("from-") ? o.gradient : "from-primary/15 via-primary/5 to-transparent",
        accent_color: o.accent_color || "text-primary",
        bg_accent: o.bg_accent || "bg-primary/10",
        border_accent: o.border_color || "border-primary/20",
      }))
    : null;

  // Always use tabbed fallback system; merge CMS offers into "hot" tab if they exist
  const tabOffers = { ...allOffers };
  if (cmsActive && cmsActive.length > 0) {
    // Replace hot tab with CMS offers, pad to 4
    const padded = [...cmsActive, ...allOffers.hot].slice(0, 4);
    tabOffers.hot = padded;
  }

  const offers = tabOffers[activeTab];
  const firstExpiry = offers[0]?.expires_at || null;
  const { days, hours, minutes, seconds } = useCountdown(firstExpiry);

  if (offers.length === 0) return null;

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
          {bn ? "🔥 স্পেশাল অফার" : "🔥 Special Offers"}
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
              onClick={() => offer.service_slug && navigate(`/service/${offer.service_slug}`)}
              className={`cursor-pointer group relative rounded-2xl bg-card border-2 ${offer.border_accent} overflow-hidden transition-all duration-300 hover:shadow-2xl hover:-translate-y-1.5`}
            >
              {/* Image */}
              <div className={`relative bg-gradient-to-br ${offer.gradient} flex items-center justify-center h-[88px] md:h-28 overflow-hidden`}>
                {/* Decorative blobs */}
                <div className={`absolute -top-6 -left-6 w-20 h-20 rounded-full ${offer.bg_accent} blur-2xl opacity-70`} />
                <div className={`absolute -bottom-8 -right-4 w-24 h-24 rounded-full ${offer.bg_accent} blur-2xl opacity-50`} />
                <img
                  src={offer.image}
                  alt=""
                  loading="lazy"
                  className="relative z-10 h-14 w-14 md:h-16 md:w-16 object-contain drop-shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300"
                />
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

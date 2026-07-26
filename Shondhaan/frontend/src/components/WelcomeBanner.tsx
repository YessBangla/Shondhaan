import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Calendar, CloudSun, Lightbulb, Sparkles } from "lucide-react";
import { useLocation } from "@/contexts/LocationContext";
import { useLanguage } from "@/contexts/LanguageContext";

/* ─── Time-based greeting ─── */
const getTimeGreeting = (bn: boolean) => {
  const h = new Date().getHours();
  if (h >= 5 && h < 12)
    return { emoji: "🌅", text: bn ? "সুপ্রভাত" : "Good Morning" };
  if (h >= 12 && h < 17)
    return { emoji: "☀️", text: bn ? "শুভ দুপুর" : "Good Afternoon" };
  if (h >= 17 && h < 21)
    return { emoji: "🌇", text: bn ? "শুভ সন্ধ্যা" : "Good Evening" };
  return { emoji: "🌙", text: bn ? "শুভ রাত্রি" : "Good Night" };
};

/* ─── Bangla date formatter ─── */
const bnDigits = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
const toBn = (n: number) =>
  String(n)
    .split("")
    .map((d) => bnDigits[+d] ?? d)
    .join("");

const bnDays = ["রবিবার", "সোমবার", "মঙ্গলবার", "বুধবার", "বৃহস্পতিবার", "শুক্রবার", "শনিবার"];
const bnMonths = [
  "জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন",
  "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর",
];

const getDateText = (bn: boolean) => {
  const d = new Date();
  if (bn)
    return `${bnDays[d.getDay()]}, ${toBn(d.getDate())} ${bnMonths[d.getMonth()]} ${toBn(d.getFullYear())}`;
  return d.toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
};

/* ─── Weather / Season info ─── */
const getWeatherInfo = (bn: boolean) => {
  const h = new Date().getHours();
  const m = new Date().getMonth();

  if (m >= 5 && m <= 9) {
    // Jun–Oct: বর্ষাকাল
    const temp = h >= 10 && h <= 16 ? "30-34" : h >= 17 || h <= 5 ? "25-28" : "27-30";
    return {
      season: bn ? "🌧️ বর্ষাকাল" : "🌧️ Monsoon",
      temp: `${temp}°C`,
      icon: "🌧️",
      tip: bn ? "ছাতা ও রেইনকোট সঙ্গে রাখুন। ডেঙ্গু থেকে সাবধান!" : "Carry umbrella & raincoat. Beware of dengue!",
    };
  }
  if (m >= 10 || m <= 1) {
    // Nov–Feb: শীতকাল
    const temp = h >= 10 && h <= 15 ? "20-25" : h >= 22 || h <= 6 ? "10-15" : "16-20";
    return {
      season: bn ? "❄️ শীতকাল" : "❄️ Winter",
      temp: `${temp}°C`,
      icon: "❄️",
      tip: bn ? "উষ্ণ পোশাক পরুন। ত্বকের যত্ন নিন!" : "Wear warm clothes. Take care of your skin!",
    };
  }
  // Mar–May: গ্রীষ্মকাল
  const temp = h >= 11 && h <= 15 ? "35-40" : h >= 18 || h <= 5 ? "27-30" : "30-35";
  return {
    season: bn ? "☀️ গ্রীষ্মকাল" : "☀️ Summer",
    temp: `${temp}°C`,
    icon: "🔥",
    tip: bn ? "প্রচুর পানি পান করুন। রোদে বের হলে সানস্ক্রিন ব্যবহার করুন!" : "Stay hydrated. Use sunscreen outdoors!",
  };
};

/* ─── Daily tips (rotate by day) ─── */
const dailyTips = [
  { bn: "💡 এসি ফিল্টার মাসে একবার পরিষ্কার করুন — বিদ্যুৎ সাশ্রয় হবে!", en: "💡 Clean AC filters monthly to save electricity!" },
  { bn: "🧹 সপ্তাহে একবার ডিপ ক্লিনিং করুন — ঘর সুস্থ রাখুন", en: "🧹 Deep clean weekly for a healthier home" },
  { bn: "⚡ পুরাতন ওয়্যারিং চেক করুন — অগ্নিকাণ্ড এড়ান", en: "⚡ Check old wiring to prevent fire hazards" },
  { bn: "🔧 পানির ট্যাপ লিক? দ্রুত ঠিক করুন — পানির অপচয় রোধ করুন", en: "🔧 Fix leaky taps to save water" },
  { bn: "🎨 দেয়ালে ড্যাম্প? রেইনি সিজনের আগে পেইন্ট করুন", en: "🎨 Paint damp walls before monsoon" },
  { bn: "💇 চুলের যত্নে মাসে একবার প্রফেশনাল ট্রিটমেন্ট নিন", en: "💇 Get a professional hair treatment monthly" },
  { bn: "🛡️ পেস্ট কন্ট্রোল প্রতি ৬ মাসে করুন — রোগ প্রতিরোধ করুন", en: "🛡️ Do pest control every 6 months" },
];

/* ─── Quick service shortcuts ─── */
const quickServices = [
  { bn: "এসি সার্ভিস", en: "AC Service", slug: "ac-service", icon: "❄️" },
  { bn: "ক্লিনিং", en: "Cleaning", slug: "cleaning", icon: "🧹" },
  { bn: "ইলেকট্রিক্যাল", en: "Electrical", slug: "electrical", icon: "⚡" },
  { bn: "প্লাম্বিং", en: "Plumbing", slug: "plumbing", icon: "🔧" },
  { bn: "বিউটি কেয়ার", en: "Beauty Care", slug: "salon", icon: "💇" },
];

const WelcomeBanner = () => {
  const navigate = useNavigate();
  const { selectedCity, subArea, selectedCityEn, subAreaEn } = useLocation();
  const { language } = useLanguage();
  const bn = language === "bn";

  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const greeting = useMemo(() => getTimeGreeting(bn), [bn, now]);
  const dateText = useMemo(() => getDateText(bn), [bn, now]);
  const weather = useMemo(() => getWeatherInfo(bn), [bn, now]);
  const tip = useMemo(() => {
    const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000);
    return dailyTips[dayOfYear % dailyTips.length];
  }, [now]);

  const cityDisplay = bn ? selectedCity : (selectedCityEn || selectedCity);
  const areaDisplay = bn ? subArea : (subAreaEn || subArea);
  const locationText = areaDisplay ? `${areaDisplay}, ${cityDisplay}` : cityDisplay;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded-2xl border border-border/50 bg-gradient-to-br from-primary/8 via-primary/4 to-accent/6 p-4 md:p-5 space-y-3"
    >
      {/* Row 1: Greeting + Date */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
        <h2 className="text-base md:text-lg font-bold text-foreground leading-snug">
          {greeting.emoji} {greeting.text}, {bn ? "ইয়েস সার্ভিসের পক্ষ থেকে" : "Welcome to"}{" "}
          <span className="text-primary">{locationText}{bn ? "তে" : ""}</span>
          {bn ? " আপনাকে স্বাগতম!" : " from Shondhaan!"}
        </h2>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
          <Calendar className="h-3.5 w-3.5 text-primary/60" />
          <span>{dateText}</span>
        </div>
      </div>

      {/* Row 2: Weather + Daily Tip */}
      <div className="flex flex-col sm:flex-row gap-2">
        {/* Weather chip */}
        <div className="flex items-center gap-2 rounded-xl bg-background/60 border border-border/40 px-3 py-2 text-xs">
          <CloudSun className="h-4 w-4 text-primary shrink-0" />
          <div className="flex flex-col">
            <span className="text-foreground font-semibold">
              {weather.season} • 🌡️ {weather.temp}
            </span>
            <span className="text-muted-foreground text-[10px]">{weather.tip}</span>
          </div>
        </div>
        {/* Tip chip */}
        <div className="flex items-center gap-2 rounded-xl bg-background/60 border border-border/40 px-3 py-2 text-xs flex-1">
          <Lightbulb className="h-4 w-4 text-primary shrink-0" />
          <span className="text-muted-foreground">{bn ? tip.bn : tip.en}</span>
        </div>
      </div>

      {/* Row 3: Popular services shortcuts */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
        <span className="flex items-center gap-1 text-[10px] text-muted-foreground font-medium shrink-0">
          <Sparkles className="h-3 w-3 text-primary/60" />
          {bn ? "জনপ্রিয়:" : "Popular:"}
        </span>
        {quickServices.map((s) => (
          <button
            key={s.slug}
            onClick={() => navigate(`/service/${s.slug}`)}
            className="flex items-center gap-1 shrink-0 rounded-full bg-primary/10 hover:bg-primary/20 border border-primary/20 px-2.5 py-1 text-[11px] font-medium text-primary transition-colors active:scale-95"
          >
            <span>{s.icon}</span>
            <span>{bn ? s.bn : s.en}</span>
          </button>
        ))}
      </div>
    </motion.div>
  );
};

export default WelcomeBanner;

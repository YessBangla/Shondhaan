import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Briefcase, Users, ShoppingBag, Tag, Wrench, Headphones, Sparkles, Package } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import slidePlatform from "@/assets/auth-slide-platform.png";
import slideService from "@/assets/auth-slide-service.png";
import slideMart from "@/assets/auth-slide-mart.png";
import slideDeal from "@/assets/auth-slide-deal.png";
import slideJobs from "@/assets/auth-slide-jobs.png";

const AuthHeroPanel = () => {
  const { language } = useLanguage();
  const [activeSlide, setActiveSlide] = useState(0);

  const slides = [
    {
      titleBn: "এক প্ল্যাটফর্মে সব সমাধান",
      titleEn: "All Solutions in One Platform",
      subtitleBn: "ইয়েস সার্ভিস, ইয়েস মার্ট, ইয়েস ডিল ও ইয়েস জবস — সবকিছু একসাথে।",
      subtitleEn: "Yess Service, Yess Mart, Yess Deal & Yess Jobs — all together.",
      gradient: "from-primary/90 to-primary/60",
      image: slidePlatform,
    },
    {
      titleBn: "ঘরে বসে সব সার্ভিস",
      titleEn: "All Services at Your Doorstep",
      subtitleBn: "ক্লিনিং, ইলেকট্রিশিয়ান, প্লাম্বিং, এসি, হেলথ — ১৮৬+ সার্ভিস।",
      subtitleEn: "Cleaning, electrician, plumbing, AC, health — 186+ services.",
      gradient: "from-emerald-600/90 to-emerald-400/60",
      image: slideService,
    },
    {
      titleBn: "ইয়েস মার্টে কেনাকাটা",
      titleEn: "Shop at Yess Mart",
      subtitleBn: "৭৬টি ক্যাটাগরি, COD, দ্রুত ডেলিভারি ও ফ্রি শিপিং অফার।",
      subtitleEn: "76 categories, COD, fast delivery and free shipping offers.",
      gradient: "from-emerald-700/90 to-green-500/60",
      image: slideMart,
    },
    {
      titleBn: "ইয়েস ডিলে বেচাকেনা",
      titleEn: "Buy & Sell on Yess Deal",
      subtitleBn: "পুরাতন ও নতুন পণ্যের সরাসরি বিজ্ঞাপন — গাড়ি, মোবাইল, প্রপার্টি।",
      subtitleEn: "Direct ads for new & used items — cars, mobiles, properties.",
      gradient: "from-amber-600/90 to-orange-400/60",
      image: slideDeal,
    },
    {
      titleBn: "ক্যারিয়ার গড়ুন ইয়েস জবসে",
      titleEn: "Build Career with Yess Jobs",
      subtitleBn: "ভিডিও সিভি, স্মার্ট প্রোফাইল ও সরাসরি নিয়োগদাতাদের সংযোগ।",
      subtitleEn: "Video CV, smart profiles and direct employer connections.",
      gradient: "from-blue-600/90 to-blue-400/60",
      image: slideJobs,
    },
  ];

  const stats = [
    {
      icon: Wrench,
      valueBn: "১৮৬+",
      valueEn: "186+",
      labelBn: "সার্ভিস ক্যাটাগরি",
      labelEn: "Service Categories",
    },
    {
      icon: ShoppingBag,
      valueBn: "১০,০০০+",
      valueEn: "10,000+",
      labelBn: "মার্ট প্রোডাক্ট",
      labelEn: "Mart Products",
    },
    {
      icon: Tag,
      valueBn: "২০,০০০+",
      valueEn: "20,000+",
      labelBn: "ডিল লিস্টিং",
      labelEn: "Deal Listings",
    },
    {
      icon: Briefcase,
      valueBn: "৫,০০০+",
      valueEn: "5,000+",
      labelBn: "জব ও কোম্পানি",
      labelEn: "Jobs & Companies",
    },
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [slides.length]);

  return (
    <div className="hidden lg:flex flex-col justify-between relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground p-8 min-h-[600px]">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute bottom-20 right-10 w-48 h-48 rounded-full border-2 border-primary-foreground" />
        <div className="absolute top-1/2 left-1/3 w-24 h-24 rounded-full border border-primary-foreground" />
      </div>

      {/* Slide image (top-left circular) */}
      <div className="absolute top-6 left-6 z-10 w-28 h-28 xl:w-32 xl:h-32 rounded-full bg-primary-foreground/15 backdrop-blur-md ring-2 ring-primary-foreground/30 overflow-hidden shadow-xl">
        <AnimatePresence mode="wait">
          <motion.img
            key={activeSlide}
            src={slides[activeSlide].image}
            alt=""
            width={128}
            height={128}
            loading="lazy"
            initial={{ opacity: 0, scale: 0.7, rotate: -15 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            exit={{ opacity: 0, scale: 0.7, rotate: 15 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="absolute inset-0 w-full h-full object-cover"
          />
        </AnimatePresence>
      </div>

      {/* Carousel text */}
      <div className="relative z-10 flex-1 flex flex-col justify-center pt-32 xl:pt-36">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeSlide}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-2xl xl:text-3xl font-bold leading-tight mb-3">
              {language === "bn" ? slides[activeSlide].titleBn : slides[activeSlide].titleEn}
            </h2>
            <p className="text-sm xl:text-base opacity-90 leading-relaxed max-w-md">
              {language === "bn" ? slides[activeSlide].subtitleBn : slides[activeSlide].subtitleEn}
            </p>
          </motion.div>
        </AnimatePresence>

        {/* Dots */}
        <div className="flex gap-2 mt-6">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setActiveSlide(i)}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === activeSlide ? "w-8 bg-primary-foreground" : "w-2 bg-primary-foreground/40"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Stats grid */}
      <div className="relative z-10 grid grid-cols-2 gap-3 mt-8">
        {stats.map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
            className="flex items-center gap-3 rounded-xl bg-primary-foreground/10 backdrop-blur-sm p-3"
          >
            <div className="flex-shrink-0 rounded-lg bg-primary-foreground/20 p-2">
              <stat.icon className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-bold leading-none">
                {language === "bn" ? stat.valueBn : stat.valueEn}
              </p>
              <p className="text-[11px] opacity-80 mt-0.5">
                {language === "bn" ? stat.labelBn : stat.labelEn}
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Support info */}
      <div className="relative z-10 mt-6 rounded-xl bg-primary-foreground/10 backdrop-blur-sm p-3 flex items-center gap-3">
        <div className="flex-shrink-0 rounded-full bg-primary-foreground/20 p-2">
          <Headphones className="h-4 w-4" />
        </div>
        <div>
          <p className="text-xs font-semibold">
            {language === "bn" ? "সাপোর্ট সেন্টার" : "Support Center"}
          </p>
          <p className="text-[11px] opacity-80">
            {language === "bn"
              ? "সকাল ৯টা - রাত ৮টা (শনি - বৃহস্পতি)"
              : "9 AM - 8 PM (Sat - Thu)"}
          </p>
        </div>
        <a href="tel:09638666444" className="ml-auto text-xs font-bold hover:underline">
          09638666444
        </a>
      </div>
    </div>
  );
};

export default AuthHeroPanel;

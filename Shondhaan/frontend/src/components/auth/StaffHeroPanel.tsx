import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield, Crown, Headphones, Wrench, Banknote, Store, Truck,
  ClipboardCheck, MapPinCheck, Briefcase, Lock, Activity, Users, ShieldCheck,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import logo from "/images/yess-service-logo.png?url";

/**
 * Hero panel for the Staff/Office login page (`/main-login`).
 * Mirrors the structure of `AuthHeroPanel` but themed for internal staff —
 * darker palette, security messaging and role highlights instead of consumer slides.
 */
const StaffHeroPanel = () => {
  const { language } = useLanguage();
  const [activeSlide, setActiveSlide] = useState(0);

  const slides = [
    {
      titleBn: "Shondhaan স্টাফ কন্ট্রোল সেন্টার",
      titleEn: "Shondhaan Staff Control Center",
      subtitleBn: "একই পোর্টালে সকল ১৩টি অফিস ভূমিকা — সুপার অ্যাডমিন থেকে ভেন্ডর পর্যন্ত।",
      subtitleEn: "All 13 internal roles in one portal — from Super Admin to Vendor.",
      icon: Crown,
    },
    {
      titleBn: "এন্টারপ্রাইজ-গ্রেড নিরাপত্তা",
      titleEn: "Enterprise-Grade Security",
      subtitleBn: "RBAC, RLS-সুরক্ষিত ডেটাবেস, লগ ও বায়োমেট্রিক সাপোর্ট সহ নিরাপদ অ্যাকসেস।",
      subtitleEn: "Role-based access, RLS-protected database, audit logs and biometric support.",
      icon: ShieldCheck,
    },
    {
      titleBn: "অপারেশন ও ফাইন্যান্স একসাথে",
      titleEn: "Operations & Finance Unified",
      subtitleBn: "বুকিং, কমিশন, পেআউট ও কল সেন্টার — একটি ড্যাশবোর্ডে সব রিয়েল-টাইম।",
      subtitleEn: "Bookings, commissions, payouts and call center — one real-time dashboard.",
      icon: Activity,
    },
    {
      titleBn: "মাঠ থেকে অফিস পর্যন্ত",
      titleEn: "From Field to Office",
      subtitleBn: "প্রোভাইডার, প্রতিনিধি ও ডেলিভারি দলের জন্য মোবাইল-ফার্স্ট টুলস।",
      subtitleEn: "Mobile-first tools for providers, representatives and delivery teams.",
      icon: Wrench,
    },
  ];

  const stats = [
    { icon: Users, valueBn: "১৩+", valueEn: "13+", labelBn: "অফিস ভূমিকা", labelEn: "Staff Roles" },
    { icon: Shield, valueBn: "১০০%", valueEn: "100%", labelBn: "RLS সুরক্ষিত", labelEn: "RLS Secured" },
    { icon: Activity, valueBn: "২৪/৭", valueEn: "24/7", labelBn: "মনিটরিং", labelEn: "Monitoring" },
    { icon: Lock, valueBn: "SSO", valueEn: "SSO", labelBn: "সুরক্ষিত লগইন", labelEn: "Secure Login" },
  ];

  const roleChips = [
    { icon: Crown, labelBn: "সুপার অ্যাডমিন", labelEn: "Super Admin" },
    { icon: Shield, labelBn: "অ্যাডমিন", labelEn: "Admin" },
    { icon: Headphones, labelBn: "কল সেন্টার", labelEn: "Call Center" },
    { icon: Banknote, labelBn: "ফাইন্যান্স", labelEn: "Finance" },
    { icon: Wrench, labelBn: "প্রোভাইডার", labelEn: "Provider" },
    { icon: MapPinCheck, labelBn: "প্রতিনিধি", labelEn: "Representative" },
    { icon: ClipboardCheck, labelBn: "সুপারভাইজার", labelEn: "Supervisor" },
    { icon: Store, labelBn: "মার্ট ভেন্ডর", labelEn: "Mart Vendor" },
    { icon: Truck, labelBn: "ডেলিভারি", labelEn: "Delivery" },
    { icon: Briefcase, labelBn: "নিয়োগদাতা", labelEn: "Employer" },
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [slides.length]);

  const ActiveIcon = slides[activeSlide].icon;

  return (
    <div className="hidden lg:flex flex-col justify-between relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-primary/90 text-white p-8 min-h-[640px] shadow-2xl">
      {/* Decorative background pattern */}
      <div className="absolute inset-0 opacity-[0.08] pointer-events-none">
        <div className="absolute -top-12 -right-12 w-72 h-72 rounded-full border-2 border-primary-foreground" />
        <div className="absolute bottom-10 -left-10 w-56 h-56 rounded-full border border-primary-foreground" />
        <div className="absolute top-1/2 left-1/3 w-24 h-24 rounded-full border border-primary-foreground" />
      </div>

      {/* Top: brand + secure badge */}
      <div className="relative z-10 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-11 w-11 rounded-xl bg-primary-foreground/15 backdrop-blur-md ring-1 ring-primary-foreground/30 flex items-center justify-center">
            <img src={logo} alt="Yess" className="h-7 w-auto" />
          </div>
          <div>
            <p className="text-sm font-bold leading-tight">Yess</p>
            <p className="text-[11px] opacity-80 leading-tight">
              {language === "bn" ? "অফিস পোর্টাল" : "Office Portal"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/20 ring-1 ring-emerald-400/40 px-2.5 py-1 backdrop-blur-sm">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[11px] font-semibold text-emerald-100">
            {language === "bn" ? "সুরক্ষিত সংযোগ" : "Secure"}
          </span>
        </div>
      </div>

      {/* Carousel */}
      <div className="relative z-10 flex-1 flex flex-col justify-center py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeSlide}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center justify-center h-12 w-12 rounded-2xl bg-primary-foreground/15 ring-1 ring-primary-foreground/25 backdrop-blur-sm mb-4">
              <ActiveIcon className="h-6 w-6" />
            </div>
            <h2 className="text-2xl xl:text-3xl font-bold leading-tight mb-3">
              {language === "bn" ? slides[activeSlide].titleBn : slides[activeSlide].titleEn}
            </h2>
            <p className="text-sm xl:text-base opacity-90 leading-relaxed max-w-md">
              {language === "bn" ? slides[activeSlide].subtitleBn : slides[activeSlide].subtitleEn}
            </p>
          </motion.div>
        </AnimatePresence>

        <div className="flex gap-2 mt-6">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setActiveSlide(i)}
              aria-label={`Slide ${i + 1}`}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === activeSlide ? "w-8 bg-primary-foreground" : "w-2 bg-primary-foreground/40"
              }`}
            />
          ))}
        </div>

        {/* Role chips */}
        <div className="mt-6 flex flex-wrap gap-1.5 max-w-md">
          {roleChips.map((r, i) => {
            const Icon = r.icon;
            return (
              <motion.span
                key={i}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="inline-flex items-center gap-1 rounded-full bg-primary-foreground/10 ring-1 ring-primary-foreground/15 backdrop-blur-sm px-2 py-1 text-[10.5px] font-medium"
              >
                <Icon className="h-3 w-3" />
                {language === "bn" ? r.labelBn : r.labelEn}
              </motion.span>
            );
          })}
        </div>
      </div>

      {/* Stats */}
      <div className="relative z-10 grid grid-cols-2 gap-3">
        {stats.map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
            className="flex items-center gap-3 rounded-xl bg-primary-foreground/10 backdrop-blur-sm ring-1 ring-primary-foreground/10 p-3"
          >
            <div className="flex-shrink-0 rounded-lg bg-primary-foreground/15 p-2">
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

      {/* Footer note */}
      <div className="relative z-10 mt-5 flex items-center gap-2 text-[11px] opacity-80">
        <Lock className="h-3 w-3" />
        {language === "bn"
          ? "অননুমোদিত প্রবেশ চেষ্টা লগ ও মনিটর করা হয়।"
          : "Unauthorized access attempts are logged and monitored."}
      </div>
    </div>
  );
};

export default StaffHeroPanel;

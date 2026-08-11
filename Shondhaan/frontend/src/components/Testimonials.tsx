import { motion } from "framer-motion";
import { useRef } from "react";
import { ChevronLeft, ChevronRight, Quote } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import avatarSaima from "@/assets/avatar-saima.png";
import avatarZabin from "@/assets/avatar-zabin.png";
import avatarZeba from "@/assets/avatar-zeba.png";
import avatarArif from "@/assets/avatar-arif.png";

const testimonials = [
  {
    quote: "Shondhaan আমার মতো কর্মজীবী নারীদের জন্য অত্যন্ত সহায়ক। তারা সময়মতো সার্ভিস দিয়েছে এবং আমি তাদের সার্ভিসর মানে খুবই সন্তুষ্ট।",
    quoteEn: "Shondhaan is extremely helpful for working women like me. They provided timely service and I'm very satisfied with the quality.",
    name: "সাইমা আহমেদ",
    nameEn: "Saima Ahmed",
    title: "সহযোগী অধ্যাপক",
    titleEn: "Associate Professor",
    avatar: avatarSaima,
  },
  {
    quote: "এরকম সার্ভিস প্ল্যাটফর্ম অন্যান্য দেশে আছে। আমি বিদেশে থাকাকালে ব্যবহার করেছি। বাংলাদেশে এমন একটি পোর্টাল পেয়ে খুবই খুশি।",
    quoteEn: "Such service platforms exist in other countries. I used them while living abroad. I'm very happy to find one in Bangladesh.",
    name: "জাবিন ইউসুফ নূর",
    nameEn: "Zabin Yusuf Noor",
    title: "আইটি কনসালট্যান্ট",
    titleEn: "IT Consultant",
    avatar: avatarZabin,
  },
  {
    quote: "আমার বিয়ের সময় কোনো বিউটি পার্লরে সময় পাচ্ছিলাম না। Shondhaan অ্যাপে আমার সব প্রয়োজনীয় সার্ভিস পেয়ে গেলাম। সময়মতো বিউটিশিয়ান এসেছিল।",
    quoteEn: "During my wedding, I couldn't get appointments at beauty parlors. I found all the services I needed on Shondhaan app. The beautician arrived on time.",
    name: "জেবা ফারিবা",
    nameEn: "Zeba Fariba",
    title: "ম্যানেজমেন্ট ট্রেইনি",
    titleEn: "Management Trainee",
    avatar: avatarZeba,
  },
  {
    quote: "প্রথমে দ্বিধায় ছিলাম অনলাইন প্ল্যাটফর্ম কেমন হবে। Shondhaan ঠিক যেভাবে চেয়েছিলাম সেভাবেই কাজ সম্পন্ন করেছে। ধন্যবাদ।",
    quoteEn: "I was initially hesitant about online platforms. Shondhaan completed the work exactly as I wanted. Thank you.",
    name: "আরিফ উর রহমান",
    nameEn: "Arif Ur Rahman",
    title: "পার্টনার, ফ্লাইআউট বিডি",
    titleEn: "Partner, FlyOut BD",
    avatar: avatarArif,
  },
   {
    quote: "আমার বিয়ের সময় কোনো বিউটি পার্লরে সময় পাচ্ছিলাম না। Shondhaan অ্যাপে আমার সব প্রয়োজনীয় সার্ভিস পেয়ে গেলাম। সময়মতো বিউটিশিয়ান এসেছিল।",
    quoteEn: "During my wedding, I couldn't get appointments at beauty parlors. I found all the services I needed on Shondhaan app. The beautician arrived on time.",
    name: "জেবা ফারিবা",
    nameEn: "Zeba Fariba",
    title: "ম্যানেজমেন্ট ট্রেইনি",
    titleEn: "Management Trainee",
    avatar: avatarZeba,
  },
   {
    quote: "আমার বিয়ের সময় কোনো বিউটি পার্লরে সময় পাচ্ছিলাম না। Shondhaan অ্যাপে আমার সব প্রয়োজনীয় সার্ভিস পেয়ে গেলাম। সময়মতো বিউটিশিয়ান এসেছিল।",
    quoteEn: "During my wedding, I couldn't get appointments at beauty parlors. I found all the services I needed on Shondhaan app. The beautician arrived on time.",
    name: "জেবা ফারিবা",
    nameEn: "Zeba Fariba",
    title: "ম্যানেজমেন্ট ট্রেইনি",
    titleEn: "Management Trainee",
    avatar: avatarZeba,
  },
];

const Testimonials = () => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { language, t } = useLanguage();

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({
        left: direction === "left" ? -336 : 336,
        behavior: "smooth",
      });
    }
  };

  return (
<div className="bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50">
      <motion.section
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="py-16 px-4 mx-auto max-w-7xl md:py-24 "
    >
      <div className="text-center mb-12 md:mb-16">
        <p className="text-sm font-bold text-blue-600 uppercase tracking-widest mb-3 flex items-center justify-center gap-2">
          <span className="h-1 w-6 bg-gradient-to-r from-blue-600 to-emerald-500 rounded-full"></span>
          {t("testimonials.label")}
          <span className="h-1 w-6 bg-gradient-to-r from-emerald-500 to-blue-600 rounded-full"></span>
        </p>
        <h2 className="font-heading text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-700 via-blue-600 to-emerald-600 bg-clip-text text-transparent mb-2">
          {t("testimonials.title")}
        </h2>
        <p className="text-slate-600 mt-4 max-w-2xl mx-auto text-sm md:text-base leading-relaxed">
          Hear from our satisfied clients about their experiences with Shondhaan
        </p>
        <div className="mx-auto mt-6 h-1.5 w-20 rounded-full bg-gradient-to-r from-blue-600 via-emerald-500 to-blue-600" />
      </div>

      <div className="relative group/section">
        {/* Edge fade masks */}
        <div className="pointer-events-none absolute left-0 top-0 z-[5] hidden h-full w-12 bg-gradient-to-r from-slate-50 to-transparent md:block" />
        <div className="pointer-events-none absolute right-0 top-0 z-[5] hidden h-full w-12 bg-gradient-to-l from-slate-50 to-transparent md:block" />

        {/* Left Navigation Button */}
        <button
          onClick={() => scroll("left")}
          aria-label="Scroll left"
          className="absolute -left-4 top-1/2 z-10 hidden -translate-y-1/2 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-blue-700 shadow-lg border-0 h-11 w-11 text-white opacity-0 transition-all duration-300 hover:shadow-2xl hover:scale-110 hover:from-blue-500 hover:to-blue-600 group-hover/section:opacity-100 md:flex"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        {/* Right Navigation Button */}
        <button
          onClick={() => scroll("right")}
          aria-label="Scroll right"
          className="absolute -right-4 top-1/2 z-10 hidden -translate-y-1/2 items-center justify-center rounded-full bg-gradient-to-br from-emerald-600 to-emerald-700 shadow-lg border-0 h-11 w-11 text-white opacity-0 transition-all duration-300 hover:shadow-2xl hover:scale-110 hover:from-emerald-500 hover:to-emerald-600 group-hover/section:opacity-100 md:flex"
        >
          <ChevronRight className="h-5 w-5" />
        </button>

        {/* Testimonials Container */}
        <div
          ref={scrollRef}
          className="flex gap-6 overflow-x-auto snap-x snap-mandatory scroll-smooth px-4 pb-4 md:px-2"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {testimonials.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.4 }}
              className="relative shrink-0 w-[280px] md:w-[340px] snap-start rounded-2xl border border-blue-200/40 bg-white/80 backdrop-blur-xl p-7 flex flex-col shadow-sm transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:border-blue-300/60 hover:bg-white group overflow-hidden"
            >
              {/* Gradient background overlay */}
              <div className="absolute -top-20 -right-20 h-40 w-40 bg-gradient-to-b from-blue-100 to-transparent rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
              <div className="absolute -bottom-20 -left-20 h-40 w-40 bg-gradient-to-t from-emerald-100 to-transparent rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

              {/* Quote Icon */}
              <div className="relative z-10 h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center shadow-md">
                <Quote className="h-5 w-5 text-white" />
              </div>

              {/* Quote Text */}
              <p className="relative z-10 mt-5 text-sm text-slate-700 leading-relaxed flex-1 italic font-light">
                "{language === "bn" ? item.quote : item.quoteEn}"
              </p>

              {/* Divider */}
              <div className="relative z-10 mt-6 pt-5 border-t border-blue-100/60 flex items-center gap-3">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-emerald-400 rounded-full opacity-20 blur-md"></div>
                  <img
                    src={item.avatar}
                    alt={language === "bn" ? item.name : item.nameEn}
                    className="relative h-12 w-12 rounded-full object-cover ring-2 ring-blue-300/50 shrink-0"
                    loading="lazy"
                    decoding="async"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-900 truncate">
                    {language === "bn" ? item.name : item.nameEn}
                  </p>
                  <p className="text-xs text-slate-500 truncate">
                    {language === "bn" ? item.title : item.titleEn}
                  </p>
                </div>
              </div>

              {/* Bottom accent line */}
              <div className="absolute bottom-0 left-0 h-1 w-full bg-gradient-to-r from-blue-600 via-emerald-500 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </motion.div>
          ))}
        </div>
      </div>
    </motion.section>
</div>
  );
};

export default Testimonials;
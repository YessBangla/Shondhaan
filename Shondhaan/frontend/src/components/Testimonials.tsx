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
    quote: "Yess Service আমার মতো কর্মজীবী নারীদের জন্য অত্যন্ত সহায়ক। তারা সময়মতো সেবা দিয়েছে এবং আমি তাদের সেবার মানে খুবই সন্তুষ্ট।",
    quoteEn: "Yess Service is extremely helpful for working women like me. They provided timely service and I'm very satisfied with the quality.",
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
    quote: "আমার বিয়ের সময় কোনো বিউটি পার্লরে সময় পাচ্ছিলাম না। Yess Service অ্যাপে আমার সব প্রয়োজনীয় সেবা পেয়ে গেলাম। সময়মতো বিউটিশিয়ান এসেছিল।",
    quoteEn: "During my wedding, I couldn't get appointments at beauty parlors. I found all the services I needed on Yess Service app. The beautician arrived on time.",
    name: "জেবা ফারিবা",
    nameEn: "Zeba Fariba",
    title: "ম্যানেজমেন্ট ট্রেইনি",
    titleEn: "Management Trainee",
    avatar: avatarZeba,
  },
  {
    quote: "প্রথমে দ্বিধায় ছিলাম অনলাইন প্ল্যাটফর্ম কেমন হবে। Yess Service ঠিক যেভাবে চেয়েছিলাম সেভাবেই কাজ সম্পন্ন করেছে। ধন্যবাদ।",
    quoteEn: "I was initially hesitant about online platforms. Yess Service completed the work exactly as I wanted. Thank you.",
    name: "আরিফ উর রহমান",
    nameEn: "Arif Ur Rahman",
    title: "পার্টনার, ফ্লাইআউট বিডি",
    titleEn: "Partner, FlyOut BD",
    avatar: avatarArif,
  },
];

const Testimonials = () => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { language, t } = useLanguage();

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({
        left: direction === "left" ? -320 : 320,
        behavior: "smooth",
      });
    }
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="py-10 md:py-16"
    >
      <div className="text-center mb-8">
        <p className="text-sm font-medium text-primary uppercase tracking-wider mb-1">{t("testimonials.label")}</p>
        <h2 className="font-heading text-xl font-bold text-foreground md:text-2xl">{t("testimonials.title")}</h2>
      </div>

      <div className="relative group/section">
        <button onClick={() => scroll("left")} className="absolute -left-3 top-1/2 z-10 hidden -translate-y-1/2 items-center justify-center rounded-full bg-background shadow-md border border-border h-9 w-9 text-muted-foreground hover:text-foreground opacity-0 transition-opacity group-hover/section:opacity-100 md:flex">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button onClick={() => scroll("right")} className="absolute -right-3 top-1/2 z-10 hidden -translate-y-1/2 items-center justify-center rounded-full bg-background shadow-md border border-border h-9 w-9 text-muted-foreground hover:text-foreground opacity-0 transition-opacity group-hover/section:opacity-100 md:flex">
          <ChevronRight className="h-4 w-4" />
        </button>

        <div ref={scrollRef} className="flex gap-4 overflow-x-auto px-4 pb-2 md:px-0" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
          {testimonials.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="shrink-0 w-[280px] md:w-[320px] rounded-xl glass-card p-5 flex flex-col"
            >
              <Quote className="h-6 w-6 text-primary/40 mb-3" />
              <p className="text-sm text-muted-foreground leading-relaxed flex-1">
                "{language === "bn" ? item.quote : item.quoteEn}"
              </p>
              <div className="mt-4 pt-3 border-t border-border flex items-center gap-3">
                <img
                  src={item.avatar}
                  alt={language === "bn" ? item.name : item.nameEn}
                  className="h-10 w-10 rounded-full object-cover border-2 border-primary/20 shrink-0"
                  loading="lazy"
                  decoding="async"
                />
                <div>
                  <p className="text-sm font-semibold text-foreground">{language === "bn" ? item.name : item.nameEn}</p>
                  <p className="text-xs text-muted-foreground">{language === "bn" ? item.title : item.titleEn}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.section>
  );
};

export default Testimonials;

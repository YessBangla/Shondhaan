import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useLanguage } from "@/contexts/LanguageContext";
import { Shield, Users, Clock, Award } from "lucide-react";
import { useSEO } from "@/hooks/useSEO";

const values = [
  { icon: Shield, title_bn: "বিশ্বস্ততা", title_en: "Trust", desc_bn: "প্রতিটি সার্ভিসম্যান ভেরিফাইড ও ব্যাকগ্রাউন্ড-চেকড।", desc_en: "Every service provider is verified and background-checked." },
  { icon: Users, title_bn: "গ্রাহক সন্তুষ্টি", title_en: "Customer Satisfaction", desc_bn: "আমাদের লক্ষ্য ১০০% গ্রাহক সন্তুষ্টি নিশ্চিত করা।", desc_en: "Our goal is to ensure 100% customer satisfaction." },
  { icon: Clock, title_bn: "সময়ানুবর্তিতা", title_en: "Punctuality", desc_bn: "নির্ধারিত সময়ে সার্ভিস প্রদান আমাদের প্রতিশ্রুতি।", desc_en: "Delivering service on time is our commitment." },
  { icon: Award, title_bn: "মানসম্মত সার্ভিস", title_en: "Quality Service", desc_bn: "শিল্প-মানের টুলস ও প্রশিক্ষিত পেশাদারদের মাধ্যমে সার্ভিস।", desc_en: "Service through industry-standard tools and trained professionals." },
];

const AboutUs = () => {
  const { language } = useLanguage();
  const bn = language === "bn";

  useSEO({
    title: bn ? "আমাদের সম্পর্কে" : "About Us",
    description: bn
      ? "Shondhaan বাংলাদেশের একটি অগ্রগামী হোম সার্ভিস প্ল্যাটফর্ম — মানসম্মত, নিরাপদ ও সাশ্রয়ী সার্ভিস সবার জন্য।"
      : "Shondhaan is a leading home service platform in Bangladesh — quality, safe & affordable services for every household.",
    canonical: "/about",
    locale: bn ? "bn_BD" : "en_US",
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-[44px] md:pt-[104px]" />

      <div className="app-container py-8 md:py-14">
        <h1 className="font-heading text-2xl md:text-4xl font-bold text-foreground text-center">
          {bn ? "আমাদের সম্পর্কে" : "About Us"}
        </h1>
        <p className="mt-3 text-center text-sm md:text-base text-muted-foreground leading-relaxed max-w-xl mx-auto">
          {bn
            ? "Shondhaan বাংলাদেশের একটি অগ্রগামী হোম সার্ভিস প্ল্যাটফর্ম। আমরা বিশ্বাস করি প্রতিটি পরিবারের জন্য মানসম্মত, নিরাপদ ও সাশ্রয়ী সার্ভিস সহজলভ্য হওয়া উচিত।"
            : "Shondhaan is a leading home service platform in Bangladesh. We believe quality, safe, and affordable services should be accessible to every household."}
        </p>

        {/* Mission */}
        <div className="mt-10 rounded-2xl border border-border bg-card p-6 md:p-8">
          <h2 className="font-heading text-lg md:text-xl font-semibold text-foreground">
            {bn ? "আমাদের মিশন" : "Our Mission"}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            {bn
              ? "প্রযুক্তির মাধ্যমে ঘরোয়া সার্ভিসকে সহজ, নিরাপদ ও স্বচ্ছ করা। আমরা চাই প্রতিটি গ্রাহক তাদের ঘরে বসে একটি ক্লিকেই দক্ষ, প্রশিক্ষিত ও বিশ্বস্ত সার্ভিসম্যানের সার্ভিস পান।"
              : "Making home services easy, safe, and transparent through technology. We want every customer to access skilled, trained, and trusted service providers from the comfort of their home with just one click."}
          </p>
        </div>

        {/* Values */}
        <h2 className="mt-10 font-heading text-lg md:text-xl font-semibold text-foreground text-center">
          {bn ? "আমাদের মূল্যবোধ" : "Our Values"}
        </h2>
        <div className="mt-4 grid grid-cols-2 gap-3 md:gap-4">
          {values.map((v, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-4 text-center">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <v.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="mt-2 text-sm font-semibold text-foreground">{bn ? v.title_bn : v.title_en}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{bn ? v.desc_bn : v.desc_en}</p>
            </div>
          ))}
        </div>

        {/* Story */}
        <div className="mt-10 rounded-2xl border border-border bg-card p-6 md:p-8">
          <h2 className="font-heading text-lg md:text-xl font-semibold text-foreground">
            {bn ? "আমাদের গল্প" : "Our Story"}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            {bn
              ? "Shondhaan শুরু হয়েছিল একটি সহজ ধারণা থেকে — ঘরের প্রতিটি সমস্যার জন্য একটি নির্ভরযোগ্য সমাধান তৈরি করা। আজ আমরা ঢাকা, চট্টগ্রাম, সিলেট সহ বাংলাদেশের প্রধান শহরগুলোতে হাজার হাজার পরিবারকে সার্ভিস দিচ্ছি। AC সার্ভিসিং থেকে হোম ক্লিনিং, ইলেকট্রিক্যাল থেকে প্লাম্বিং — আমাদের প্রশিক্ষিত দল সবসময় আপনার পাশে আছে।"
              : "Shondhaan started with a simple idea — creating a reliable solution for every household problem. Today we serve thousands of families across major cities in Bangladesh including Dhaka, Chittagong, and Sylhet. From AC servicing to home cleaning, electrical to plumbing — our trained team is always by your side."}
          </p>
        </div>
      </div>

      <Footer />
      <div className="h-16 md:hidden" />
    </div>
  );
};

export default AboutUs;

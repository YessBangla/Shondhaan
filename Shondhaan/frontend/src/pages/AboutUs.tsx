import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useLanguage } from "@/contexts/LanguageContext";
import { Shield, Users, Clock, Award } from "lucide-react";
import { useSEO } from "@/hooks/useSEO";
import aboutUsImage from "/images/about_section.png";
import simpleIdeaImage from "/images/simple_idea.png";
import home from "/images/3d-house.png";

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
      <div className="pt-[44px] md:pt-[30px]" />

        <div className="app-container py-8 md:py-14">

          {/* =========================
              HERO / ABOUT INTRO
          ========================== */}
          <section className="relative overflow-hidden rounded-lg border border-border bg-card shadow-sm">

            <div className="grid lg:grid-cols-2">

              {/* Text */}
              <div className="flex flex-col justify-center p-6 sm:p-8 md:p-12 lg:p-14">

                <span className="mb-4 inline-flex w-fit items-center rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-white">
                  {bn ? "Shondhaan সম্পর্কে" : "About Shondhaan"}
                </span>

                <h1 className="font-heading text-3xl font-bold leading-tight text-foreground sm:text-4xl md:text-5xl">
                  {bn
                    ? "আপনার ঘরের প্রতিটি সমস্যার নির্ভরযোগ্য সমাধান"
                    : "Your Trusted Solution for Every Home Need"}
                </h1>

                <p className="mt-5 max-w-xl text-sm leading-7 text-muted-foreground sm:text-base">
                  {bn
                    ? "Shondhaan বাংলাদেশের একটি অগ্রগামী হোম সার্ভিস প্ল্যাটফর্ম। আমরা বিশ্বাস করি প্রতিটি পরিবারের জন্য মানসম্মত, নিরাপদ ও সাশ্রয়ী সার্ভিস সহজলভ্য হওয়া উচিত।"
                    : "Shondhaan is a leading home service platform in Bangladesh. We believe quality, safe, and affordable services should be accessible to every household."}
                </p>

                {/* Small highlights */}
                <div className="mt-7 grid grid-cols-2 gap-3 sm:gap-4">

                  <div className="rounded-2xl border border-border bg-background/70 p-4">
                    <p className="text-xl font-bold text-primary sm:text-2xl">
                      24/7
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
                      {bn ? "সার্ভিস সাপোর্ট" : "Service Support"}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-border bg-background/70 p-4">
                    <p className="text-xl font-bold text-primary sm:text-2xl">
                      100+
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
                      {bn ? "সার্ভিস ও সমাধান" : "Services & Solutions"}
                    </p>
                  </div>

                </div>
              </div>

              {/* Image */}
              <div className="relative min-h-[280px] overflow-hidden lg:min-h-[500px]">

                <img
                  src={aboutUsImage}
                  alt={bn ? "Shondhaan সম্পর্কে" : "About Shondhaan"}
                  className="absolute inset-0 h-full w-full object-cover"
                />

                {/* Overlay */}
                <div className="absolute hidden inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />

                {/* Image caption */}
                <div className="absolute hidden bottom-5 left-5 right-5 sm:bottom-7 sm:left-7 sm:right-7">
                  <div className="rounded-2xl border border-white/20 bg-black/30 p-4 backdrop-blur-md">
                    <p className="text-sm font-semibold text-white sm:text-base">
                      {bn
                        ? "সহজ সার্ভিস, বিশ্বস্ত সমাধান"
                        : "Easy Service. Trusted Solutions."}
                    </p>

                    <p className="mt-1 text-xs text-white/80">
                      {bn
                        ? "আপনার প্রয়োজন, আমাদের দায়িত্ব।"
                        : "Your needs, our responsibility."}
                    </p>
                  </div>
                </div>

              </div>

            </div>
          </section>


          {/* =========================
              MISSION
          ========================== */}
          <section className="mt-10 md:mt-14">

            <div className="grid items-center gap-8 lg:grid-cols-2">

              {/* Mission Content */}
              <div>

                <span className="text-xs font-semibold uppercase tracking-wider bg-primary rounded-full px-4 py-1 text-white">
                  {bn ? "আমাদের লক্ষ্য" : "Our Mission"}
                </span>

                <h2 className="mt-2 font-heading text-2xl font-bold text-foreground sm:text-3xl">
                  {bn
                    ? "প্রযুক্তির মাধ্যমে হোম সার্ভিসকে আরও সহজ করা"
                    : "Making Home Services Easier Through Technology"}
                </h2>

                <p className="mt-4 text-sm leading-7 text-muted-foreground sm:text-base">
                  {bn
                    ? "প্রযুক্তির মাধ্যমে ঘরোয়া সার্ভিসকে সহজ, নিরাপদ ও স্বচ্ছ করা। আমরা চাই প্রতিটি গ্রাহক তাদের ঘরে বসে একটি ক্লিকেই দক্ষ, প্রশিক্ষিত ও বিশ্বস্ত সার্ভিসম্যানের সার্ভিস পান।"
                    : "Making home services easy, safe, and transparent through technology. We want every customer to access skilled, trained, and trusted service providers from the comfort of their home with just one click."}
                </p>

                {/* Mission points */}
                <div className="mt-6 space-y-3">

                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                      ✓
                    </div>

                    <div>
                      <h3 className="text-sm font-semibold text-foreground">
                        {bn ? "বিশ্বস্ত সার্ভিস প্রোভাইডার" : "Trusted Service Providers"}
                      </h3>

                      <p className="mt-1 text-xs leading-5 text-muted-foreground">
                        {bn
                          ? "দক্ষ ও যাচাইকৃত সার্ভিস প্রোভাইডারের মাধ্যমে সেবা।"
                          : "Get services from skilled and verified service providers."}
                      </p>
                    </div>
                  </div>


                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                      ✓
                    </div>

                    <div>
                      <h3 className="text-sm font-semibold text-foreground">
                        {bn ? "স্বচ্ছ ও ন্যায্য মূল্য" : "Transparent & Fair Pricing"}
                      </h3>

                      <p className="mt-1 text-xs leading-5 text-muted-foreground">
                        {bn
                          ? "সার্ভিসের আগে পরিষ্কার মূল্য ও তথ্য জানার সুবিধা।"
                          : "Clear pricing and service information before booking."}
                      </p>
                    </div>
                  </div>


                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                      ✓
                    </div>

                    <div>
                      <h3 className="text-sm font-semibold text-foreground">
                        {bn ? "দ্রুত ও সহজ বুকিং" : "Fast & Easy Booking"}
                      </h3>

                      <p className="mt-1 text-xs leading-5 text-muted-foreground">
                        {bn
                          ? "একটি প্ল্যাটফর্ম থেকেই আপনার প্রয়োজনীয় সার্ভিস বুক করুন।"
                          : "Book the service you need from one convenient platform."}
                      </p>
                    </div>
                  </div>

                </div>

              </div>


              {/* Mission Visual */}
              <div className="relative overflow-hidden rounded-lg border border-border bg-gradient-to-br from-primary/10 via-card to-primary/5 p-6 sm:p-8">

                <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-primary/10 blur-2xl" />
                <div className="absolute -bottom-16 -left-16 h-40 w-40 rounded-full bg-primary/10 blur-2xl" />

                <div className="relative">

                  <div className="flex h-14 w-14 items-center justify-center">
                    <img src={home} alt="" />
                  </div>

                  <h3 className="mt-6 font-heading text-xl font-bold text-foreground sm:text-2xl">
                    {bn
                      ? "এক প্ল্যাটফর্মে আপনার প্রয়োজনীয় সার্ভিস"
                      : "Your Essential Services in One Platform"}
                  </h3>

                  <p className="mt-3 text-sm leading-6 text-muted-foreground">
                    {bn
                      ? "AC সার্ভিসিং, ইলেকট্রিশিয়ান, প্লাম্বিং, ক্লিনিং, কম্পিউটার রিপেয়ারসহ বিভিন্ন ধরনের হোম সার্ভিস এখন সহজেই পাওয়া যায়।"
                      : "From AC servicing, electricians and plumbing to cleaning and computer repair, find a wide range of home services in one place."}
                  </p>

                  <div className="mt-6 grid grid-cols-2 gap-3">

                    <div className="rounded-2xl bg-background/80 p-4">
                      <p className="text-lg font-bold text-primary">
                        {bn ? "দ্রুত" : "Fast"}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {bn ? "সার্ভিস রেসপন্স" : "Service Response"}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-background/80 p-4">
                      <p className="text-lg font-bold text-primary">
                        {bn ? "নিরাপদ" : "Safe"}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {bn ? "সার্ভিস অভিজ্ঞতা" : "Service Experience"}
                      </p>
                    </div>

                  </div>

                </div>
              </div>

            </div>

          </section>


          {/* =========================
              VALUES
          ========================== */}
          <section className="mt-14 md:mt-20">

            <div className="mx-auto max-w-2xl text-center">

              <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                {bn ? "আমরা যা বিশ্বাস করি" : "What We Believe"}
              </span>

              <h2 className="mt-2 font-heading text-2xl font-bold text-foreground sm:text-3xl">
                {bn ? "আমাদের মূল্যবোধ" : "Our Values"}
              </h2>

              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                {bn
                  ? "আমাদের প্রতিটি সিদ্ধান্ত ও সার্ভিসের পেছনে এই মূল্যবোধগুলো কাজ করে।"
                  : "These values guide every decision we make and every service we provide."}
              </p>

            </div>


            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">

              {values.map((v, i) => (
                <div
                  key={i}
                  className="group rounded-2xl border border-border bg-card p-5 text-center transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg"
                >

                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 transition-colors group-hover:bg-primary group-hover:text-white">
                    <v.icon className="h-6 w-6 text-primary transition-colors group-hover:text-primary-foreground" />
                  </div>

                  <h3 className="mt-4 text-sm font-semibold text-foreground sm:text-base">
                    {bn ? v.title_bn : v.title_en}
                  </h3>

                  <p className="mt-2 text-xs leading-5 text-muted-foreground sm:text-sm">
                    {bn ? v.desc_bn : v.desc_en}
                  </p>

                </div>
              ))}

            </div>

          </section>


          {/* =========================
              OUR STORY
          ========================== */}
          <section className="mt-14 md:mt-20">

            <div className="overflow-hidden rounded-lg border border-border bg-card">

              <div className="grid lg:grid-cols-[0.8fr_1.2fr]">

                {/* Story visual */}
                <div className="relative min-h-[280px] lg:min-h-full">

                  <img
                    src={simpleIdeaImage}
                    alt={bn ? "Shondhaan এর গল্প" : "Our Story"}
                    className="absolute inset-0 h-full w-full object-cover"
                  />

                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

                  <div className="absolute bottom-6 left-6 right-6">

                    <p className="text-xs font-semibold uppercase tracking-wider text-white/70">
                      {bn ? "আমাদের যাত্রা" : "Our Journey"}
                    </p>

                    <p className="mt-1 text-2xl font-bold text-white">
                      {bn
                        ? "একটি সহজ ধারণা থেকে"
                        : "From a Simple Idea"}
                    </p>

                  </div>

                </div>


                {/* Story content */}
                <div className="p-6 sm:p-8 md:p-10 lg:p-12">

                  <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                    {bn ? "আমাদের গল্প" : "Our Story"}
                  </span>

                  <h2 className="mt-2 font-heading text-2xl font-bold text-foreground sm:text-3xl">
                    {bn
                      ? "প্রতিটি ঘরের জন্য একটি নির্ভরযোগ্য সমাধান"
                      : "A Reliable Solution for Every Home"}
                  </h2>

                  <p className="mt-5 text-sm leading-7 text-muted-foreground sm:text-base">
                    {bn
                      ? "Shondhaan শুরু হয়েছিল একটি সহজ ধারণা থেকে — ঘরের প্রতিটি সমস্যার জন্য একটি নির্ভরযোগ্য সমাধান তৈরি করা। আজ আমরা ঢাকা, চট্টগ্রাম, সিলেট সহ বাংলাদেশের প্রধান শহরগুলোতে হাজার হাজার পরিবারকে সার্ভিস দিচ্ছি। AC সার্ভিসিং থেকে হোম ক্লিনিং, ইলেকট্রিক্যাল থেকে প্লাম্বিং — আমাদের প্রশিক্ষিত দল সবসময় আপনার পাশে আছে।"
                      : "Shondhaan started with a simple idea — creating a reliable solution for every household problem. Today we serve thousands of families across major cities in Bangladesh including Dhaka, Chittagong, and Sylhet. From AC servicing to home cleaning, electrical to plumbing — our trained team is always by your side."}
                  </p>


                  {/* Story stats */}
                  <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">

                    <div className="rounded-2xl bg-muted/50 p-4">
                      <p className="text-xl font-bold text-primary">
                        100+
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {bn ? "সার্ভিস" : "Services"}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-muted/50 p-4">
                      <p className="text-xl font-bold text-primary">
                        1000+
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {bn ? "সার্ভিস প্রোভাইডার" : "Service Providers"}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-muted/50 p-4">
                      <p className="text-xl font-bold text-primary">
                        24/7
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {bn ? "সাপোর্ট" : "Support"}
                      </p>
                    </div>

                  </div>

                </div>

              </div>

            </div>

          </section>


          {/* =========================
              CTA
          ========================== */}
          <section className="mt-10 md:mt-14">

            <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-blue-900 via-green-700 to-green-800 px-6 py-10 text-center sm:px-10 md:py-14">

              <div className="absolute -left-20 -top-20 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
              <div className="absolute -bottom-20 -right-20 h-48 w-48 rounded-full bg-white/10 blur-2xl" />

              <div className="relative mx-auto max-w-2xl">

                <h2 className="font-heading text-2xl font-bold text-white sm:text-3xl">
                  {bn
                    ? "আপনার সার্ভিস প্রয়োজন?"
                    : "Need a Home Service?"}
                </h2>

                <p className="mt-3 text-sm leading-6 text-white sm:text-base">
                  {bn
                    ? "আপনার প্রয়োজনীয় সার্ভিস খুঁজে নিন এবং সহজেই বুক করুন।"
                    : "Find the service you need and book it easily from Shondhaan."}
                </p>

                  <a href="/all-services">
                    <button
                      type="button"
                      className="mt-6 rounded-xl bg-background px-6 py-3 text-sm font-semibold text-foreground shadow-sm transition hover:scale-[1.02] hover:shadow-md hover:bg-primary hover:text-white"
                      >
                      {bn ? "সার্ভিস দেখুন" : "Explore Services"}
                    </button>
                  </a>

              </div>

            </div>

          </section>

        </div>

      <Footer />
      <div className="h-16 md:hidden" />
    </div>
  );
};

export default AboutUs;

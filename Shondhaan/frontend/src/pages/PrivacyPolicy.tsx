import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSEO } from "@/hooks/useSEO";

const PrivacyPolicy = () => {
  const { language } = useLanguage();
  const bn = language === "bn";

  useSEO({
    title: bn ? "গোপনীয়তা নীতি" : "Privacy Policy",
    description: bn
      ? "Shondhaan কীভাবে আপনার তথ্য সংগ্রহ, ব্যবহার ও সুরক্ষা করে — আমাদের গোপনীয়তা নীতি পড়ুন।"
      : "How Shondhaan collects, uses and protects your information — read our privacy policy.",
    canonical: "/privacy",
    locale: bn ? "bn_BD" : "en_US",
  });

  // Place this above the return statement (or in a separate constants file).
// All text is copied verbatim from the original hardcoded sections — nothing reworded.

const privacySections = [
  {
    id: "information-collection",
    title_bn: "১. তথ্য সংগ্রহ",
    title_en: "1. Information Collection",
    body_bn:
      "আমরা আপনার নাম, ফোন নম্বর, ইমেইল, ঠিকানা এবং লোকেশন তথ্য সংগ্রহ করি সার্ভিস প্রদানের জন্য। এছাড়া ওয়েবসাইট ব্যবহারের তথ্য (cookies, IP address) স্বয়ংক্রিয়ভাবে সংগ্রহ হতে পারে।",
    body_en:
      "We collect your name, phone number, email, address, and location information to provide services. Website usage data (cookies, IP address) may also be collected automatically.",
  },
  {
    id: "use-of-information",
    title_bn: "২. তথ্য ব্যবহার",
    title_en: "2. Use of Information",
    body_bn:
      "আপনার তথ্য শুধুমাত্র সার্ভিস প্রদান, বুকিং নিশ্চিতকরণ, কাস্টমার সাপোর্ট এবং সার্ভিসের মান উন্নয়নে ব্যবহৃত হয়। আপনার অনুমতি ছাড়া বিপণনের জন্য ব্যবহৃত হবে না।",
    body_en:
      "Your information is used solely for service delivery, booking confirmation, customer support, and service improvement. It will not be used for marketing without your consent.",
  },
  {
    id: "data-security",
    title_bn: "৩. তথ্য সুরক্ষা",
    title_en: "3. Data Security",
    body_bn:
      "আমরা আপনার ব্যক্তিগত তথ্য সুরক্ষিত রাখতে শিল্প-মানের নিরাপত্তা ব্যবস্থা ব্যবহার করি। তবে ইন্টারনেটে ১০০% নিরাপত্তা নিশ্চিত করা সম্ভব নয়।",
    body_en:
      "We use industry-standard security measures to protect your personal data. However, 100% security on the internet cannot be guaranteed.",
  },
  {
    id: "third-party-sharing",
    title_bn: "৪. তৃতীয় পক্ষের সাথে শেয়ার",
    title_en: "4. Third-Party Sharing",
    body_bn:
      "আমরা আপনার তথ্য তৃতীয় পক্ষের কাছে বিক্রি করি না। শুধুমাত্র সার্ভিস প্রদানকারী (সার্ভিসম্যান) এবং পেমেন্ট প্রসেসরের সাথে প্রয়োজনীয় তথ্য শেয়ার করা হয়।",
    body_en:
      "We do not sell your data to third parties. We only share necessary information with service providers and payment processors.",
  },
  {
    id: "cookies",
    title_bn: "৫. কুকিজ",
    title_en: "5. Cookies",
    body_bn:
      "আমাদের ওয়েবসাইট কুকিজ ব্যবহার করে আপনার অভিজ্ঞতা উন্নত করতে। আপনি ব্রাউজার সেটিংস থেকে কুকিজ নিষ্ক্রিয় করতে পারেন, তবে কিছু ফিচার কাজ নাও করতে পারে।",
    body_en:
      "Our website uses cookies to improve your experience. You can disable cookies in your browser settings, but some features may not work properly.",
  },
  {
    id: "your-rights",
    title_bn: "৬. আপনার অধিকার",
    title_en: "6. Your Rights",
    body_bn:
      "আপনি যেকোনো সময় আপনার ব্যক্তিগত তথ্য দেখতে, সংশোধন করতে বা মুছে ফেলতে অনুরোধ করতে পারেন। এজন্য আমাদের কাস্টমার সাপোর্টে যোগাযোগ করুন।",
    body_en:
      "You can request to view, modify, or delete your personal data at any time. Contact our customer support for this.",
  },
  {
    id: "contact",
    title_bn: "৭. যোগাযোগ",
    title_en: "7. Contact",
    body_bn:
      "গোপনীয়তা নীতি সম্পর্কে কোনো প্রশ্ন থাকলে আমাদের সাথে যোগাযোগ করুন: info@yessbangla.xyz",
    body_en:
      "For any questions about this privacy policy, contact us at: info@yessbangla.xyz",
  },
];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-[44px] mt-10 md:mt-0 md:pt-[50px]" />

      <div className="app-container px-6">
        <div className="rounded-lg text-center mx-auto py-6 bg-gradient-to-br from-blue-900 via-green-700 to-green-800">
          <h1 className="font-heading text-2xl md:text-4xl font-bold text-white">
             {bn ? "গোপনীয়তা নীতি" : "Privacy Policy"}
          </h1>
          <p className="mt-2 text-sm text-white">
            {bn ? "সর্বশেষ আপডেট: ১৪ আগস্ট, ২০২৬" : "Last updated: August 14, 2026"}
          </p>
        </div>
      </div>

      <div className="app-container">
        <div className="mt-8 md:mb-6 grid gap-8 md:grid-cols-[220px_1fr] lg:grid-cols-[260px_1fr]">

          {/* ── Table of contents — sticky on desktop, collapsible on mobile ── */}
          <aside className="md:sticky md:top-20 md:self-start">
            {/* Mobile: collapsible */}
            <details className="md:hidden rounded-xl border border-border bg-card p-4 group">
              <summary className="text-sm font-semibold text-foreground cursor-pointer list-none flex items-center justify-between">
                {bn ? "সূচিপত্র" : "Table of Contents"}
                <span className="text-xs text-muted-foreground transition-transform group-open:rotate-180">▼</span>
              </summary>
              <nav className="mt-3 space-y-1">
                {privacySections.map((s) => (
                  <a
                    key={s.id}
                    href={`#${s.id}`}
                    className="block px-2 py-1.5 rounded-lg text-sm text-muted-foreground hover:text-primary hover:bg-muted/60 transition-colors"
                  >
                    {bn ? s.title_bn : s.title_en}
                  </a>
                ))}
              </nav>
            </details>

            {/* Desktop: persistent sidebar */}
            <nav className="hidden md:block rounded-xl border border-border bg-card p-3">
              <p className="px-2 pt-1.5 pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {bn ? "সূচিপত্র" : "Table of Contents"}
              </p>
              <div className="space-y-0.5">
                {privacySections.map((s) => (
                  <a
                    key={s.id}
                    href={`#${s.id}`}
                    className="block px-2.5 py-2 rounded-lg text-sm text-muted-foreground hover:text-primary hover:bg-muted/60 transition-colors"
                  >
                    {bn ? s.title_bn : s.title_en}
                  </a>
                ))}
              </div>
            </nav>
          </aside>

          {/* ── Sections ── */}
          <div className="space-y-4">
            {privacySections.map((s) => (
              <section
                key={s.id}
                id={s.id}
                className="scroll-mt-24 rounded-xl border border-border bg-card p-5 md:p-6"
              >
                <h2 className="text-base md:text-lg font-semibold text-foreground mb-2.5">
                  {bn ? s.title_bn : s.title_en}
                </h2>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {bn ? s.body_bn : s.body_en}
                </p>
              </section>
            ))}

            {/* Contact callout */}
            <div className="rounded-xl border border-border bg-primary/5 p-5 md:p-6 text-center sm:text-left sm:flex sm:items-center sm:justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-foreground">
                  {bn ? "গোপনীয়তা নীতি সম্পর্কে প্রশ্ন আছে?" : "Have a question about this privacy policy?"}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">info@yessbangla.xyz</p>
              </div>
              <a
                href="mailto:info@yessbangla.xyz"
                className="mt-3 sm:mt-0 inline-flex shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-medium px-4 py-2 hover:opacity-90 transition-opacity"
              >
                {bn ? "ইমেইল করুন" : "Email Us"}
              </a>
            </div>
          </div>
        </div>
      </div>

      <Footer />
      <div className="h-16 md:hidden" />
    </div>
  );
};

export default PrivacyPolicy;

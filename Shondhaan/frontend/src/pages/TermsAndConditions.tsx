import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSEO } from "@/hooks/useSEO";

const TermsAndConditions = () => {
  const { language } = useLanguage();
  const bn = language === "bn";

  useSEO({
    title: bn ? "শর্তাবলী" : "Terms & Conditions",
    description: bn
      ? "Shondhaan ব্যবহারের শর্তাবলী — সার্ভিস ব্যবহারের নিয়ম, দায়বদ্ধতা ও আইনি বিষয়াবলী।"
      : "Shondhaan terms of use — rules, responsibilities and legal terms governing the platform.",
    canonical: "/terms",
    locale: bn ? "bn_BD" : "en_US",
  });

  // Place this above the return statement (or in a separate constants file).
// All text is copied verbatim from the original hardcoded sections — nothing reworded.

const termsSections = [
  {
    id: "terms-of-use",
    title_bn: "১. সার্ভিস ব্যবহারের শর্ত",
    title_en: "1. Terms of Use",
    body_bn:
      "Shondhaan প্ল্যাটফর্ম ব্যবহার করে আপনি এই শর্তাবলী মেনে চলতে সম্মত হচ্ছেন। আমাদের সার্ভিস ব্যবহার করতে আপনার বয়স কমপক্ষে ১৮ বছর হতে হবে।",
    body_en:
      "By using the Shondhaan platform, you agree to comply with these terms. You must be at least 18 years old to use our services.",
  },
  {
    id: "account-registration",
    title_bn: "২. অ্যাকাউন্ট নিবন্ধন",
    title_en: "2. Account Registration",
    body_bn:
      "সার্ভিস বুক করতে আপনাকে একটি অ্যাকাউন্ট তৈরি করতে হবে। আপনার অ্যাকাউন্টের তথ্য সঠিক ও আপডেট রাখা আপনার দায়িত্ব। আপনার অ্যাকাউন্টের নিরাপত্তা আপনার দায়িত্ব।",
    body_en:
      "You must create an account to book services. You are responsible for keeping your account information accurate and up to date. You are responsible for your account security.",
  },
  {
    id: "booking-cancellation",
    title_bn: "৩. সার্ভিস বুকিং ও ক্যানসেলেশন",
    title_en: "3. Service Booking & Cancellation",
    body_bn:
      "বুকিং কনফার্ম হওয়ার পর নির্ধারিত সময়ের কমপক্ষে ২ ঘন্টা আগে বিনামূল্যে ক্যানসেল করা যাবে। এর পরে ক্যানসেল করলে ক্যানসেলেশন চার্জ প্রযোজ্য হবে। ইমার্জেন্সি সার্ভিসে অতিরিক্ত ৩০% চার্জ যুক্ত হবে।",
    body_en:
      "After booking confirmation, you can cancel free of charge at least 2 hours before the scheduled time. Cancellation charges apply after that. Emergency services carry an additional 30% charge.",
  },
  {
    id: "payment",
    title_bn: "৪. পেমেন্ট",
    title_en: "4. Payment",
    body_bn:
      "সার্ভিস সম্পন্ন হওয়ার পর ক্যাশ অন ডেলিভারি বা অনলাইন পেমেন্ট (bKash, Nagad) এর মাধ্যমে পেমেন্ট করতে হবে। মূল্য পরিবর্তনের অধিকার Shondhaan সংরক্ষণ করে।",
    body_en:
      "Payment is due after service completion via cash on delivery or online payment (bKash, Nagad). Shondhaan reserves the right to change prices.",
  },
  {
    id: "guarantee-liability",
    title_bn: "৫. গ্যারান্টি ও দায়বদ্ধতা",
    title_en: "5. Guarantee & Liability",
    body_bn:
      "সার্ভিসের মান সম্পর্কে কোনো অভিযোগ থাকলে ৭ দিনের মধ্যে জানাতে হবে। আমরা বিনামূল্যে পুনরায় সার্ভিস দেব অথবা রিফান্ড প্রদান করব। তবে ক্লায়েন্টের অবহেলায় কোনো ক্ষতি হলে Shondhaan দায়ী থাকবে না।",
    body_en:
      "Any complaints about service quality must be reported within 7 days. We will provide a free re-service or refund. However, Shondhaan is not liable for damages caused by client negligence.",
  },
  {
    id: "changes",
    title_bn: "৬. পরিবর্তন",
    title_en: "6. Changes",
    body_bn:
      "Shondhaan যেকোনো সময় এই শর্তাবলী পরিবর্তন করার অধিকার রাখে। পরিবর্তন হলে ওয়েবসাইটে আপডেট করা হবে।",
    body_en:
      "Shondhaan reserves the right to modify these terms at any time. Updates will be posted on the website.",
  },
  {
    id: "contact",
    title_bn: "৭. যোগাযোগ",
    title_en: "7. Contact",
    body_bn:
      "শর্তাবলী সম্পর্কে কোনো প্রশ্ন থাকলে আমাদের সাথে যোগাযোগ করুন: info@yessbangla.xyz",
    body_en:
      "For any questions about these terms, contact us at: info@yessbangla.xyz",
  },
];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="mt-8 pt-[44px] md:mt-[0px]" />
      <div className="app-container px-6">
        <div className="rounded-lg text-center mx-auto py-6 bg-gradient-to-br from-primary to-emerald-500">
          <h1 className="font-heading text-2xl md:text-4xl font-bold text-white">
            {bn ? "শর্তাবলী" : "Terms & Conditions"}
          </h1>
          <p className="mt-2 text-sm text-white">
            {bn ? "সর্বশেষ আপডেট: ১৪ আগস্ট, ২০২৬" : "Last updated: August 14, 2026"}
          </p>
        </div>
      </div>

      <div className="app-container">

        <div className="mt-8 grid gap-8 md:grid-cols-[220px_1fr] lg:grid-cols-[260px_1fr]">

          {/* ── Table of contents — sticky on desktop, collapsible on mobile ── */}
          <aside className="md:sticky md:top-20 md:self-start">
            {/* Mobile: collapsible */}
            <details className="md:hidden rounded-xl border border-border bg-card p-4 group">
              <summary className="text-sm font-semibold text-foreground cursor-pointer list-none flex items-center justify-between">
                {bn ? "সূচিপত্র" : "Table of Contents"}
                <span className="text-xs text-muted-foreground transition-transform group-open:rotate-180">▼</span>
              </summary>
              <nav className="mt-3 space-y-1">
                {termsSections.map((s) => (
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
                {termsSections.map((s) => (
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
          <div className="space-y-4 mb-6">
            {termsSections.map((s) => (
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
                  {bn ? "শর্তাবলী সম্পর্কে প্রশ্ন আছে?" : "Have a question about these terms?"}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">info@yessbangla.xyz</p>
              </div>
              <a
                href="mailto:info@yessbangla.xyz"
                className="mt-3 sm:mt-0 inline-flex shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-900 via-green-700 to-green-800 text-white text-sm font-medium px-4 py-2 hover:opacity-90 transition-opacity"
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

export default TermsAndConditions;

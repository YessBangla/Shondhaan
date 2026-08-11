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

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-[44px] md:pt-[104px]" />

      <div className="app-container py-8 md:py-14">
        <h1 className="font-heading text-2xl md:text-4xl font-bold text-foreground text-center">
          {bn ? "শর্তাবলী" : "Terms & Conditions"}
        </h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          {bn ? "সর্বশেষ আপডেট: ১ জানুয়ারি, ২০২৫" : "Last updated: January 1, 2025"}
        </p>

        <div className="mt-8 space-y-6 text-sm leading-relaxed text-muted-foreground">
          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">{bn ? "১. সার্ভিস ব্যবহারের শর্ত" : "1. Terms of Use"}</h2>
            <p>{bn
              ? "Shondhaan প্ল্যাটফর্ম ব্যবহার করে আপনি এই শর্তাবলী মেনে চলতে সম্মত হচ্ছেন। আমাদের সার্ভিস ব্যবহার করতে আপনার বয়স কমপক্ষে ১৮ বছর হতে হবে।"
              : "By using the Shondhaan platform, you agree to comply with these terms. You must be at least 18 years old to use our services."}</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">{bn ? "২. অ্যাকাউন্ট নিবন্ধন" : "2. Account Registration"}</h2>
            <p>{bn
              ? "সার্ভিস বুক করতে আপনাকে একটি অ্যাকাউন্ট তৈরি করতে হবে। আপনার অ্যাকাউন্টের তথ্য সঠিক ও আপডেট রাখা আপনার দায়িত্ব। আপনার অ্যাকাউন্টের নিরাপত্তা আপনার দায়িত্ব।"
              : "You must create an account to book services. You are responsible for keeping your account information accurate and up to date. You are responsible for your account security."}</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">{bn ? "৩. সার্ভিস বুকিং ও ক্যানসেলেশন" : "3. Service Booking & Cancellation"}</h2>
            <p>{bn
              ? "বুকিং কনফার্ম হওয়ার পর নির্ধারিত সময়ের কমপক্ষে ২ ঘন্টা আগে বিনামূল্যে ক্যানসেল করা যাবে। এর পরে ক্যানসেল করলে ক্যানসেলেশন চার্জ প্রযোজ্য হবে। ইমার্জেন্সি সার্ভিসে অতিরিক্ত ৩০% চার্জ যুক্ত হবে।"
              : "After booking confirmation, you can cancel free of charge at least 2 hours before the scheduled time. Cancellation charges apply after that. Emergency services carry an additional 30% charge."}</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">{bn ? "৪. পেমেন্ট" : "4. Payment"}</h2>
            <p>{bn
              ? "সার্ভিস সম্পন্ন হওয়ার পর ক্যাশ অন ডেলিভারি বা অনলাইন পেমেন্ট (bKash, Nagad) এর মাধ্যমে পেমেন্ট করতে হবে। মূল্য পরিবর্তনের অধিকার Shondhaan সংরক্ষণ করে।"
              : "Payment is due after service completion via cash on delivery or online payment (bKash, Nagad). Shondhaan reserves the right to change prices."}</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">{bn ? "৫. গ্যারান্টি ও দায়বদ্ধতা" : "5. Guarantee & Liability"}</h2>
            <p>{bn
              ? "সার্ভিসের মান সম্পর্কে কোনো অভিযোগ থাকলে ৭ দিনের মধ্যে জানাতে হবে। আমরা বিনামূল্যে পুনরায় সার্ভিস দেব অথবা রিফান্ড প্রদান করব। তবে ক্লায়েন্টের অবহেলায় কোনো ক্ষতি হলে Shondhaan দায়ী থাকবে না।"
              : "Any complaints about service quality must be reported within 7 days. We will provide a free re-service or refund. However, Shondhaan is not liable for damages caused by client negligence."}</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">{bn ? "৬. পরিবর্তন" : "6. Changes"}</h2>
            <p>{bn
              ? "Shondhaan যেকোনো সময় এই শর্তাবলী পরিবর্তন করার অধিকার রাখে। পরিবর্তন হলে ওয়েবসাইটে আপডেট করা হবে।"
              : "Shondhaan reserves the right to modify these terms at any time. Updates will be posted on the website."}</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">{bn ? "৭. যোগাযোগ" : "7. Contact"}</h2>
            <p>{bn
              ? "শর্তাবলী সম্পর্কে কোনো প্রশ্ন থাকলে আমাদের সাথে যোগাযোগ করুন: info@yessbangla.xyz"
              : "For any questions about these terms, contact us at: info@yessbangla.xyz"}</p>
          </section>
        </div>
      </div>

      <Footer />
      <div className="h-16 md:hidden" />
    </div>
  );
};

export default TermsAndConditions;

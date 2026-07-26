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

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-[44px] md:pt-[104px]" />

      <div className="app-container py-8 md:py-14">
        <h1 className="font-heading text-2xl md:text-4xl font-bold text-foreground text-center">
          {bn ? "গোপনীয়তা নীতি" : "Privacy Policy"}
        </h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          {bn ? "সর্বশেষ আপডেট: ১ জানুয়ারি, ২০২৫" : "Last updated: January 1, 2025"}
        </p>

        <div className="mt-8 space-y-6 text-sm leading-relaxed text-muted-foreground">
          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">{bn ? "১. তথ্য সংগ্রহ" : "1. Information Collection"}</h2>
            <p>{bn
              ? "আমরা আপনার নাম, ফোন নম্বর, ইমেইল, ঠিকানা এবং লোকেশন তথ্য সংগ্রহ করি সেবা প্রদানের জন্য। এছাড়া ওয়েবসাইট ব্যবহারের তথ্য (cookies, IP address) স্বয়ংক্রিয়ভাবে সংগ্রহ হতে পারে।"
              : "We collect your name, phone number, email, address, and location information to provide services. Website usage data (cookies, IP address) may also be collected automatically."}</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">{bn ? "২. তথ্য ব্যবহার" : "2. Use of Information"}</h2>
            <p>{bn
              ? "আপনার তথ্য শুধুমাত্র সার্ভিস প্রদান, বুকিং নিশ্চিতকরণ, কাস্টমার সাপোর্ট এবং সার্ভিসের মান উন্নয়নে ব্যবহৃত হয়। আপনার অনুমতি ছাড়া বিপণনের জন্য ব্যবহৃত হবে না।"
              : "Your information is used solely for service delivery, booking confirmation, customer support, and service improvement. It will not be used for marketing without your consent."}</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">{bn ? "৩. তথ্য সুরক্ষা" : "3. Data Security"}</h2>
            <p>{bn
              ? "আমরা আপনার ব্যক্তিগত তথ্য সুরক্ষিত রাখতে শিল্প-মানের নিরাপত্তা ব্যবস্থা ব্যবহার করি। তবে ইন্টারনেটে ১০০% নিরাপত্তা নিশ্চিত করা সম্ভব নয়।"
              : "We use industry-standard security measures to protect your personal data. However, 100% security on the internet cannot be guaranteed."}</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">{bn ? "৪. তৃতীয় পক্ষের সাথে শেয়ার" : "4. Third-Party Sharing"}</h2>
            <p>{bn
              ? "আমরা আপনার তথ্য তৃতীয় পক্ষের কাছে বিক্রি করি না। শুধুমাত্র সার্ভিস প্রদানকারী (সার্ভিসম্যান) এবং পেমেন্ট প্রসেসরের সাথে প্রয়োজনীয় তথ্য শেয়ার করা হয়।"
              : "We do not sell your data to third parties. We only share necessary information with service providers and payment processors."}</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">{bn ? "৫. কুকিজ" : "5. Cookies"}</h2>
            <p>{bn
              ? "আমাদের ওয়েবসাইট কুকিজ ব্যবহার করে আপনার অভিজ্ঞতা উন্নত করতে। আপনি ব্রাউজার সেটিংস থেকে কুকিজ নিষ্ক্রিয় করতে পারেন, তবে কিছু ফিচার কাজ নাও করতে পারে।"
              : "Our website uses cookies to improve your experience. You can disable cookies in your browser settings, but some features may not work properly."}</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">{bn ? "৬. আপনার অধিকার" : "6. Your Rights"}</h2>
            <p>{bn
              ? "আপনি যেকোনো সময় আপনার ব্যক্তিগত তথ্য দেখতে, সংশোধন করতে বা মুছে ফেলতে অনুরোধ করতে পারেন। এজন্য আমাদের কাস্টমার সাপোর্টে যোগাযোগ করুন।"
              : "You can request to view, modify, or delete your personal data at any time. Contact our customer support for this."}</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">{bn ? "৭. যোগাযোগ" : "7. Contact"}</h2>
            <p>{bn
              ? "গোপনীয়তা নীতি সম্পর্কে কোনো প্রশ্ন থাকলে আমাদের সাথে যোগাযোগ করুন: info@yessbangla.xyz"
              : "For any questions about this privacy policy, contact us at: info@yessbangla.xyz"}</p>
          </section>
        </div>
      </div>

      <Footer />
      <div className="h-16 md:hidden" />
    </div>
  );
};

export default PrivacyPolicy;

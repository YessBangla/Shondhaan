import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useSEO } from "@/hooks/useSEO";

const faqData = [
  {
    q_bn: "Shondhaan কী?",
    q_en: "What is Shondhaan?",
    a_bn: "Shondhaan একটি অনলাইন হোম সার্ভিস প্ল্যাটফর্ম যেখানে আপনি AC সার্ভিসিং, ক্লিনিং, ইলেকট্রিক্যাল, প্লাম্বিং, সেলুন সহ বিভিন্ন সার্ভিস ঘরে বসে বুক করতে পারেন।",
    a_en: "Shondhaan is an online home service platform where you can book AC servicing, cleaning, electrical, plumbing, salon and many other services from home.",
  },
  {
    q_bn: "কিভাবে সার্ভিস বুক করতে পারি?",
    q_en: "How can I book a service?",
    a_bn: "যেকোনো সার্ভিসে ক্লিক করুন, প্যাকেজ নির্বাচন করুন, তারিখ ও সময় দিন এবং বুক করুন। বুকিং কনফার্মেশন ফোন/ইমেইলে পাবেন।",
    a_en: "Click any service, select a package, choose date & time, and book. You'll receive a booking confirmation via phone/email.",
  },
  {
    q_bn: "পেমেন্ট কিভাবে করব?",
    q_en: "How do I pay?",
    a_bn: "সার্ভিস সম্পন্ন হওয়ার পর ক্যাশ অন ডেলিভারি অথবা অনলাইন পেমেন্ট (bKash, Nagad) এর মাধ্যমে পেমেন্ট করতে পারবেন।",
    a_en: "You can pay via cash on delivery or online payment (bKash, Nagad) after the service is completed.",
  },
  {
    q_bn: "সার্ভিস ক্যানসেল করা যাবে?",
    q_en: "Can I cancel a service?",
    a_bn: "হ্যাঁ, নির্ধারিত সময়ের কমপক্ষে ২ ঘন্টা আগে ক্যানসেল করতে পারবেন। এর পরে ক্যানসেলেশন চার্জ প্রযোজ্য হতে পারে।",
    a_en: "Yes, you can cancel at least 2 hours before the scheduled time. Cancellation charges may apply after that.",
  },
  {
    q_bn: "ইমার্জেন্সি সার্ভিস পাওয়া যায়?",
    q_en: "Is emergency service available?",
    a_bn: "হ্যাঁ, আমরা ইমার্জেন্সি সার্ভিস প্রদান করি। তবে এতে অতিরিক্ত ৩০% চার্জ প্রযোজ্য।",
    a_en: "Yes, we provide emergency services with an additional 30% charge.",
  },
  {
    q_bn: "কোন কোন শহরে সার্ভিস পাওয়া যায়?",
    q_en: "In which cities is the service available?",
    a_bn: "বর্তমানে আমরা ঢাকা, চট্টগ্রাম, সিলেট, রাজশাহী, খুলনা সহ বাংলাদেশের প্রধান শহরগুলোতে সার্ভিস দিচ্ছি।",
    a_en: "Currently we serve in major cities of Bangladesh including Dhaka, Chittagong, Sylhet, Rajshahi, and Khulna.",
  },
  {
    q_bn: "সার্ভিসম্যান কি প্রশিক্ষিত?",
    q_en: "Are the service providers trained?",
    a_bn: "হ্যাঁ, আমাদের সকল সার্ভিসম্যান প্রশিক্ষিত, ভেরিফাইড এবং অভিজ্ঞ। আমরা ব্যাকগ্রাউন্ড চেক করে তাদের নিয়োগ দিই।",
    a_en: "Yes, all our service providers are trained, verified, and experienced. We conduct background checks before hiring.",
  },
  {
    q_bn: "সার্ভিসের পর সমস্যা হলে কী করব?",
    q_en: "What if there's an issue after the service?",
    a_bn: "সার্ভিসের পর যেকোনো সমস্যা হলে আমাদের কাস্টমার সাপোর্টে যোগাযোগ করুন। আমরা ৭ দিনের মধ্যে বিনামূল্যে সমাধান দেব।",
    a_en: "Contact our customer support for any issues after service. We provide free resolution within 7 days.",
  },
];

const FAQ = () => {
  const { language } = useLanguage();
  const bn = language === "bn";

  useSEO({
    title: bn ? "সচরাচর জিজ্ঞাসা" : "Frequently Asked Questions",
    description: bn
      ? "Shondhaan সম্পর্কে সাধারণ প্রশ্ন ও উত্তর — বুকিং, পেমেন্ট, ক্যানসেল, ইমার্জেন্সি সার্ভিস ও আরও।"
      : "Common questions about Shondhaan — booking, payment, cancellation, emergency service & more.",
    canonical: "/faq",
    locale: bn ? "bn_BD" : "en_US",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqData.map((f) => ({
        "@type": "Question",
        name: bn ? f.q_bn : f.q_en,
        acceptedAnswer: {
          "@type": "Answer",
          text: bn ? f.a_bn : f.a_en,
        },
      })),
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-[44px] md:pt-[35px]" />

      <div className="app-container py-8 md:py-14">
        <h1 className="font-heading text-2xl md:text-4xl font-bold text-foreground text-center">
          {bn ? "সচরাচর জিজ্ঞাসা" : "Frequently Asked Questions"}
        </h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          {bn ? "আপনার সাধারণ প্রশ্নের উত্তর এখানে পাবেন" : "Find answers to your common questions here"}
        </p>

        <Accordion type="single" collapsible className="mt-8 space-y-2">
          {faqData.map((faq, i) => (
            <AccordionItem key={i} value={`faq-${i}`} className="rounded-xl border border-border bg-card px-4">
              <AccordionTrigger className="text-left text-sm md:text-base font-medium text-foreground hover:no-underline">
                {bn ? faq.q_bn : faq.q_en}
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                {bn ? faq.a_bn : faq.a_en}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>

      <Footer />
      <div className="h-16 md:hidden" />
    </div>
  );
};

export default FAQ;

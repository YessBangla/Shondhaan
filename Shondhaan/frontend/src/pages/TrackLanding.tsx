import { useState, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Route as RouteIcon,
  Search,
  Phone,
  Hash,
  FileText,
  PhoneCall,
  CheckCircle2,
  Truck,
  ShieldCheck,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Input } from "@/components/ui/input";
import { useSEO } from "@/hooks/useSEO";

type Mode = "token" | "phone";

const TrackLanding = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const bn = language === "bn";

  useSEO({
    title: bn ? "বুকিং ট্র্যাক করুন" : "Track Your Booking",
    description: bn
      ? "১৬-ডিজিট টোকেন বা ফোন নম্বর দিয়ে আপনার Shondhaan বুকিং লাইভ ট্র্যাক করুন।"
      : "Track your Shondhaan booking live using a 16-digit token or phone number.",
    canonical: "/track",
    locale: bn ? "bn_BD" : "en_US",
  });

  const [mode, setMode] = useState<Mode>("token");
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;

    if (mode === "token") {
      navigate(`/track/${trimmed}`);
      return;
    }

    // phone lookup -> latest tracking_token for that phone
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("service_requests")
      .select("tracking_token, created_at")
      .eq("customer_phone", trimmed)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setLoading(false);

    if (error || !data?.tracking_token) {
      toast.error(bn ? "এই নম্বরে কোনো রিকোয়েস্ট পাওয়া যায়নি" : "No request found for this number");
      return;
    }
    navigate(`/track/${data.tracking_token}`);
  };

  const steps = [
    {
      icon: FileText,
      title: bn ? "রিকোয়েস্ট গৃহীত" : "Request Received",
      desc: bn ? "আপনার সার্ভিস রিকোয়েস্ট সিস্টেমে নথিভুক্ত হয়েছে।" : "Your request is logged in the system.",
    },
    {
      icon: PhoneCall,
      title: bn ? "যোগাযোগ" : "Contacted",
      desc: bn ? "প্রতিনিধি আপনার সাথে যোগাযোগ করেছে।" : "A representative reached out to you.",
    },
    {
      icon: Truck,
      title: bn ? "সার্ভিস চলমান" : "In Progress",
      desc: bn ? "সার্ভিসকর্মী ঘটনাস্থলে কাজ করছেন।" : "The service is being delivered.",
    },
    {
      icon: CheckCircle2,
      title: bn ? "সম্পন্ন" : "Completed",
      desc: bn ? "সার্ভিস সফলভাবে সম্পন্ন হয়েছে।" : "Service completed successfully.",
    },
    {
      icon: ShieldCheck,
      title: bn ? "পেমেন্ট নিশ্চিত" : "Payment Confirmed",
      desc: bn ? "পেমেন্ট গ্রহণ ও যাচাই করা হয়েছে।" : "Payment received and verified.",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 pt-28 md:pt-32 pb-12 px-4">
        <div className="mx-auto max-w-2xl">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="rounded-2xl border border-border/70 bg-card/80 backdrop-blur-sm p-6 md:p-8 shadow-sm"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <RouteIcon className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-foreground">
                  {bn ? "সার্ভিস ট্র্যাক করুন" : "Track Your Service"}
                </h1>
                <p className="text-xs md:text-sm text-muted-foreground">
                  {bn
                    ? "টোকেন আইডি অথবা ফোন নম্বর দিয়ে অগ্রগতি দেখুন।"
                    : "Enter your token ID or phone number to see progress."}
                </p>
              </div>
            </div>

            {/* Mode tabs */}
            <div className="grid grid-cols-2 gap-1 rounded-xl bg-secondary p-1 mb-3">
              <button
                type="button"
                onClick={() => setMode("token")}
                className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium transition-colors ${
                  mode === "token" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
                }`}
              >
                <Hash className="h-4 w-4" />
                {bn ? "টোকেন আইডি" : "Token ID"}
              </button>
              <button
                type="button"
                onClick={() => setMode("phone")}
                className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium transition-colors ${
                  mode === "phone" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
                }`}
              >
                <Phone className="h-4 w-4" />
                {bn ? "ফোন নম্বর" : "Phone Number"}
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex gap-2">
              <Input
                value={value}
                onChange={(e) => setValue(e.target.value)}
                inputMode={mode === "phone" ? "tel" : "text"}
                placeholder={
                  mode === "token"
                    ? bn
                      ? "যেমন: YS-251029-1234"
                      : "e.g. YS-251029-1234"
                    : bn
                    ? "যেমন: 01XXXXXXXXX"
                    : "e.g. 01XXXXXXXXX"
                }
                className="h-11 flex-1"
              />
              <button
                type="submit"
                disabled={!value.trim() || loading}
                className="flex h-11 items-center gap-1.5 rounded-md bg-primary px-4 text-sm font-semibold text-white disabled:opacity-50 transition-opacity"
              >
                <Search className="h-4 w-4" />
                {bn ? "খুঁজুন" : "Track"}
              </button>
            </form>

            <p className="mt-3 text-[11px] text-muted-foreground">
              {bn
                ? "টোকেন আইডি আপনার রিকোয়েস্ট কনফার্মেশন SMS/পেইজে পাবেন।"
                : "You will find the token ID in your request confirmation SMS/page."}
            </p>
          </motion.div>

          {/* Timeline preview */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="mt-6 rounded-2xl border border-border/70 bg-card/60 p-6 md:p-7"
          >
            <h2 className="text-sm md:text-base font-semibold text-foreground mb-5">
              {bn ? "সার্ভিস প্রক্রিয়া কেমন এগোয়" : "How tracking progresses"}
            </h2>
            <ol className="relative space-y-5">
              <span
                aria-hidden
                className="absolute left-[18px] top-2 bottom-2 w-px bg-gradient-to-b from-primary/40 via-border to-border"
              />
              {steps.map((s, i) => {
                const Icon = s.icon;
                return (
                  <li key={i} className="relative flex gap-4">
                    <div className="relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-background text-muted-foreground">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="pt-1">
                      <p className="text-sm font-semibold text-foreground">{s.title}</p>
                      <p className="text-xs text-muted-foreground">{s.desc}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </motion.div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default TrackLanding;

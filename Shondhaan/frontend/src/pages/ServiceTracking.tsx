import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  MapPin, Phone, User, FileText, Clock, CheckCircle, AlertCircle,
  Loader2, CreditCard, ArrowLeft, Copy, ExternalLink, Search, Home
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useLanguage } from "@/contexts/LanguageContext";

interface TrackingData {
  id: string;
  customer_name: string;
  customer_phone: string;
  division: string;
  district: string;
  thana: string | null;
  detail_area: string | null;
  service_description: string;
  status: string;
  payment_status: string;
  payment_amount: number;
  created_at: string;
  first_response_at: string | null;
  resolved_at: string | null;
  service_completed_at: string | null;
  payment_confirmed_at: string | null;
  tracking_token: string;
  assigned_rep_id: string | null;
  area_representatives: {
    name: string;
    phone: string;
  } | null;
}

const statusSteps = [
  { key: "pending", label: "রিকোয়েস্ট গৃহীত", icon: FileText },
  { key: "contacted", label: "যোগাযোগ হয়েছে", icon: Phone },
  { key: "resolved", label: "সার্ভিস সম্পন্ন", icon: CheckCircle },
];

const paymentStatusMap: Record<string, { label: string; className: string }> = {
  unpaid: { label: "পেমেন্ট বাকি", className: "bg-red-100 text-red-800" },
  partial: { label: "আংশিক পেমেন্ট", className: "bg-yellow-100 text-yellow-800" },
  paid: { label: "পেমেন্ট সম্পন্ন", className: "bg-green-100 text-green-800" },
};

const ServiceTracking = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const bn = language === "bn";
  const [data, setData] = useState<TrackingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const fetchTracking = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    const { data: result, error } = await (supabase as any)
      .from("service_requests")
      .select("*, area_representatives(name, phone)")
      .eq("tracking_token", token)
      .single();

    if (error || !result) {
      setNotFound(true);
    } else {
      setData(result);
    }
    setLoading(false);
  }, [token]);

  useEffect(() => {
    fetchTracking();
  }, [fetchTracking]);

  // Realtime subscription for instant updates
  useEffect(() => {
    if (notFound || !data?.id) return;

    const channel = supabase
      .channel(`track-${data.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "service_requests",
          filter: `id=eq.${data.id}`,
        },
        (payload: any) => {
          setData(payload.new as TrackingData);
          toast.info("📢 সার্ভিসর তথ্য আপডেট হয়েছে!");
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [data?.id, notFound]);

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("লিংক কপি হয়েছে!");
  };

  const getCurrentStep = () => {
    if (!data) return 0;
    if (data.status === "resolved" || data.service_completed_at) return 2;
    if (data.status === "contacted") return 1;
    return 0;
  };

  const isCompleted = data?.status === "resolved" && data?.payment_status === "paid";

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex min-h-[60vh] items-center justify-center pt-[44px] md:pt-[104px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (notFound || !data) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-[44px] md:pt-[104px] flex items-center justify-center min-h-[70vh] px-4">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="w-full max-w-md rounded-3xl border border-border bg-card/80 backdrop-blur-xl p-6 md:p-8 text-center shadow-sm"
          >
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
              <AlertCircle className="h-8 w-8" strokeWidth={2} />
            </div>
            <h1 className="font-heading text-xl font-bold text-foreground">
              {bn ? "ট্র্যাকিং পাওয়া যায়নি" : "Tracking not found"}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {bn
                ? "এই টোকেনে কোনো রিকোয়েস্ট খুঁজে পাওয়া যায়নি। অনুগ্রহ করে চেক করে আবার চেষ্টা করুন।"
                : "We couldn't find a request with this token. Please double-check and try again."}
            </p>

            {token && (
              <div className="mt-4 rounded-xl border border-border bg-secondary/60 px-3 py-2 text-left">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  {bn ? "চেষ্টা করা টোকেন" : "Tried token"}
                </p>
                <p className="mt-0.5 truncate font-mono text-sm text-foreground">{token}</p>
              </div>
            )}

            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
              <button
                onClick={() => navigate("/track")}
                className="press inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold border border-primary text-white hover:text-accent shadow-md hover:bg-primary/90"
              >
                <Search className="h-4 w-4" />
                {bn ? "অন্য টোকেন/ফোন দিন" : "Try another token/phone"}
              </button>
              <button
                onClick={() => navigate("/")}
                className="press inline-flex items-center justify-center gap-1.5 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-secondary"
              >
                <Home className="h-4 w-4" />
                {bn ? "হোমে ফিরুন" : "Back to home"}
              </button>
            </div>

            <p className="mt-4 text-[11px] text-muted-foreground">
              {bn
                ? "টোকেন আইডি আপনার রিকোয়েস্ট কনফার্মেশন SMS/পেইজে পাওয়া যাবে।"
                : "You'll find the token ID in your request confirmation SMS/page."}
            </p>
          </motion.div>
        </main>
        <Footer />
        <div className="h-16 md:hidden" />
      </div>
    );
  }

  const currentStep = getCurrentStep();
  const paymentInfo = paymentStatusMap[data.payment_status] || paymentStatusMap.unpaid;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-[44px] md:pt-[104px]" />

      <div className="mx-auto max-w-2xl px-4 py-6 md:py-10">
        <button onClick={() => navigate(-1)} className="mb-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> পেছনে যান
        </button>

        {/* Header Card */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-border bg-card p-5 mb-4">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <h1 className="font-heading text-lg md:text-xl font-bold text-foreground">📋 সার্ভিস ট্র্যাকিং</h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                আইডি: #{data.id.slice(0, 8).toUpperCase()}
              </p>
            </div>
            <button onClick={copyLink}
              className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary">
              <Copy className="h-3.5 w-3.5" /> লিংক কপি
            </button>
          </div>

          {/* Status Badge */}
          <div className="flex flex-wrap gap-2 mb-4">
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
              data.status === "resolved" ? "bg-green-100 text-green-800" :
              data.status === "contacted" ? "bg-blue-100 text-blue-800" :
              data.status === "rejected" ? "bg-red-100 text-red-800" :
              "bg-yellow-100 text-yellow-800"
            }`}>
              {data.status === "pending" ? "অপেক্ষমাণ" :
               data.status === "contacted" ? "যোগাযোগ হয়েছে" :
               data.status === "resolved" ? "সার্ভিস সম্পন্ন" : "বাতিল"}
            </span>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${paymentInfo.className}`}>
              💰 {paymentInfo.label}
            </span>
          </div>

          {/* Progress Steps */}
          {data.status !== "rejected" && (
            <div className="flex items-center gap-0 mb-4">
              {statusSteps.map((step, i) => {
                const StepIcon = step.icon;
                const isActive = i <= currentStep;
                const isLast = i === statusSteps.length - 1;
                return (
                  <div key={step.key} className="flex items-center flex-1">
                    <div className="flex flex-col items-center flex-1">
                      <div className={`flex h-9 w-9 items-center justify-center rounded-full border-2 transition-colors ${
                        isActive ? "border-primary bg-primary text-white" : "border-muted bg-background text-muted-foreground"
                      }`}>
                        <StepIcon className="h-4 w-4" />
                      </div>
                      <p className={`text-[10px] mt-1 text-center font-medium ${isActive ? "text-primary" : "text-muted-foreground"}`}>
                        {step.label}
                      </p>
                    </div>
                    {!isLast && (
                      <div className={`h-0.5 flex-1 -mt-4 ${i < currentStep ? "bg-primary" : "bg-muted"}`} />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>

        {/* Service Details */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="rounded-2xl border border-border bg-card p-5 mb-4">
          <h2 className="text-sm font-bold text-foreground mb-3 flex items-center gap-1.5">
            <FileText className="h-4 w-4 text-primary" /> সার্ভিসর বিবরণ
          </h2>
          <p className="text-sm text-foreground bg-secondary/50 rounded-lg p-3 leading-relaxed mb-3">
            {data.service_description}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 shrink-0" /> {data.customer_name}
            </span>
            <span className="flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5 shrink-0" /> {data.customer_phone}
            </span>
            <span className="flex items-center gap-1.5 sm:col-span-2">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              {[data.detail_area, data.thana, data.district, data.division].filter(Boolean).join(", ")}
            </span>
          </div>

          {/* Assigned Representative */}
          {data.area_representatives && (
            <div className="mt-4 pt-3 border-t border-border/50">
              <h3 className="text-xs font-semibold text-muted-foreground mb-2">🧑‍💼 সার্ভিস প্রদানকারী প্রতিনিধি</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <span className="flex items-center gap-1.5 text-foreground">
                  <User className="h-3.5 w-3.5 shrink-0 text-primary" /> {data.area_representatives.name}
                </span>
                <a href={`tel:${data.area_representatives.phone}`} className="flex items-center gap-1.5 text-primary hover:underline">
                  <Phone className="h-3.5 w-3.5 shrink-0" /> {data.area_representatives.phone}
                </a>
              </div>
            </div>
          )}
        </motion.div>

        {/* Payment & Timeline */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="rounded-2xl border border-border bg-card p-5 mb-4">
          <h2 className="text-sm font-bold text-foreground mb-3 flex items-center gap-1.5">
            <CreditCard className="h-4 w-4 text-primary" /> পেমেন্ট ও টাইমলাইন
          </h2>

          {data.payment_amount > 0 && (
            <div className="rounded-xl bg-secondary/50 p-3 mb-3">
              <p className="text-xs text-muted-foreground">সার্ভিসর মূল্য</p>
              <p className="text-xl font-bold text-foreground">৳{data.payment_amount.toLocaleString("bn-BD")}</p>
            </div>
          )}

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between py-1.5 border-b border-border/50">
              <span className="text-muted-foreground flex items-center gap-1.5"><Clock className="h-3 w-3" /> রিকোয়েস্ট পাঠানো</span>
              <span className="text-foreground font-medium">{new Date(data.created_at).toLocaleString("bn-BD")}</span>
            </div>
            {data.first_response_at && (
              <div className="flex items-center justify-between py-1.5 border-b border-border/50">
                <span className="text-muted-foreground flex items-center gap-1.5"><Phone className="h-3 w-3" /> প্রথম রেসপন্স</span>
                <span className="text-foreground font-medium">{new Date(data.first_response_at).toLocaleString("bn-BD")}</span>
              </div>
            )}
            {data.service_completed_at && (
              <div className="flex items-center justify-between py-1.5 border-b border-border/50">
                <span className="text-muted-foreground flex items-center gap-1.5"><CheckCircle className="h-3 w-3" /> সার্ভিস সম্পন্ন</span>
                <span className="text-foreground font-medium">{new Date(data.service_completed_at).toLocaleString("bn-BD")}</span>
              </div>
            )}
            {data.payment_confirmed_at && (
              <div className="flex items-center justify-between py-1.5">
                <span className="text-muted-foreground flex items-center gap-1.5"><CreditCard className="h-3 w-3" /> পেমেন্ট নিশ্চিত</span>
                <span className="text-green-600 font-medium">{new Date(data.payment_confirmed_at).toLocaleString("bn-BD")}</span>
              </div>
            )}
          </div>
        </motion.div>

        {/* Completion message */}
        {isCompleted && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="rounded-2xl border border-green-200 bg-green-50 p-5 text-center dark:border-green-900/40 dark:bg-green-900/10">
            <CheckCircle className="h-10 w-10 mx-auto text-green-600 mb-2" />
            <h3 className="text-sm font-bold text-green-800 dark:text-green-200">সার্ভিস ও পেমেন্ট সম্পন্ন!</h3>
            <p className="text-xs text-green-700 dark:text-green-300 mt-1">আপনার সার্ভিস সফলভাবে সম্পন্ন হয়েছে। ধন্যবাদ!</p>
          </motion.div>
        )}

        {/* Active notice */}
        {!isCompleted && data.status !== "rejected" && (
          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-center dark:border-blue-900/40 dark:bg-blue-900/10">
            <p className="text-xs text-blue-800 dark:text-blue-200">
              🔴 এই পেজটি রিয়েলটাইমে আপডেট হয়। সার্ভিস সম্পন্ন ও পেমেন্ট নিশ্চিত না হওয়া পর্যন্ত এই লিংকটি সক্রিয় থাকবে।
            </p>
          </div>
        )}
      </div>

      <Footer />
      <div className="h-16 md:hidden" />
    </div>
  );
};

export default ServiceTracking;

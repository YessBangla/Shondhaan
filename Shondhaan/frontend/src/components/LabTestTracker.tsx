import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, FileText, Download, Clock, CheckCircle2, FlaskConical, Truck, TestTube2, AlertCircle, Phone } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";

interface LabTestTrackerProps {
  bn: boolean;
}

type TrackingStatus = "collected" | "processing" | "completed" | "delivered";

const statusSteps: { key: TrackingStatus; labelBn: string; labelEn: string; icon: typeof Clock }[] = [
  { key: "collected", labelBn: "স্যাম্পল সংগ্রহ", labelEn: "Sample Collected", icon: TestTube2 },
  { key: "processing", labelBn: "পরীক্ষা চলছে", labelEn: "Processing", icon: FlaskConical },
  { key: "completed", labelBn: "রিপোর্ট তৈরি", labelEn: "Report Ready", icon: FileText },
  { key: "delivered", labelBn: "ডেলিভারি সম্পন্ন", labelEn: "Delivered", icon: Truck },
];

interface LabReport {
  id: string;
  tracking_id: string;
  test_name: string;
  test_name_en: string | null;
  status: string;
  sample_date: string;
  expected_date: string | null;
  report_file_url: string | null;
  report_ready: boolean;
  customer_name: string | null;
  customer_phone: string | null;
}

const LabTestTracker = ({ bn }: LabTestTrackerProps) => {
  const { user } = useAuth();
  const [trackingId, setTrackingId] = useState("");
  const [searchResult, setSearchResult] = useState<LabReport | null>(null);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);

  // Fetch user's own reports
  const { data: myReports = [] } = useQuery({
    queryKey: ["my-lab-reports", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("lab_test_reports")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return (data || []) as LabReport[];
    },
    enabled: !!user,
    staleTime: 30_000,
  });

  const handleSearch = async () => {
    const id = trackingId.trim();
    if (!id) {
      toast.error(bn ? "ট্র্যাকিং আইডি লিখুন" : "Enter tracking ID");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("lab_test_reports")
        .select("*")
        .eq("tracking_id", id)
        .maybeSingle();
      if (error) throw error;
      setSearchResult(data as LabReport | null);
      setSearched(true);
      if (!data) {
        toast.error(bn ? "কোনো রিপোর্ট পাওয়া যায়নি" : "No report found");
      }
    } catch {
      toast.error(bn ? "অনুসন্ধানে সমস্যা হয়েছে" : "Search failed");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (report: LabReport) => {
    if (!report.report_ready || !report.report_file_url) {
      toast.info(bn ? "রিপোর্ট এখনও প্রস্তুত হয়নি" : "Report is not ready yet");
      return;
    }

    try {
      // If it's a storage path, get signed URL
      if (report.report_file_url.startsWith("lab-reports/")) {
        const { data, error } = await supabase.storage
          .from("lab-reports")
          .createSignedUrl(report.report_file_url.replace("lab-reports/", ""), 300);
        if (error) throw error;
        if (data?.signedUrl) {
          window.open(data.signedUrl, "_blank");
          toast.success(bn ? "রিপোর্ট ডাউনলোড হচ্ছে..." : "Downloading report...");
        }
      } else {
        // Direct URL
        window.open(report.report_file_url, "_blank");
        toast.success(bn ? "রিপোর্ট ডাউনলোড হচ্ছে..." : "Downloading report...");
      }
    } catch {
      toast.error(bn ? "ডাউনলোডে সমস্যা হয়েছে" : "Download failed");
    }
  };

  const getStatusIndex = (status: string) => statusSteps.findIndex((s) => s.key === status);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    try {
      const d = new Date(dateStr);
      if (bn) {
        return d.toLocaleDateString("bn-BD", { day: "numeric", month: "long", year: "numeric" });
      }
      return d.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
    } catch {
      return dateStr;
    }
  };

  const renderReport = (report: LabReport) => (
    <motion.div
      key={report.id}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="rounded-xl border border-border bg-background p-4 space-y-4"
    >
      {/* Test Info */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-bold text-foreground">
            {bn ? report.test_name : (report.test_name_en || report.test_name)}
          </p>
          <p className="text-xs text-muted-foreground font-mono mt-0.5">{report.tracking_id}</p>
        </div>
        {report.report_ready && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="h-3 w-3" />
            {bn ? "রিপোর্ট প্রস্তুত" : "Report Ready"}
          </span>
        )}
      </div>

      {/* Timeline */}
      <div className="flex items-center justify-between gap-1">
        {statusSteps.map((step, i) => {
          const currentIdx = getStatusIndex(report.status);
          const isActive = i <= currentIdx;
          const Icon = step.icon;
          return (
            <div key={step.key} className="flex flex-1 flex-col items-center gap-1.5 relative">
              <div className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
                isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}>
                <Icon className="h-4 w-4" />
              </div>
              <span className={`text-[10px] text-center leading-tight ${isActive ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                {bn ? step.labelBn : step.labelEn}
              </span>
              {i < statusSteps.length - 1 && (
                <div className={`absolute top-4 left-[calc(50%+16px)] w-[calc(100%-32px)] h-0.5 ${
                  i < currentIdx ? "bg-primary" : "bg-muted"
                }`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Dates */}
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="rounded-lg bg-muted/50 p-2.5">
          <p className="text-muted-foreground">{bn ? "স্যাম্পল সংগ্রহ" : "Sample Date"}</p>
          <p className="font-semibold text-foreground mt-0.5">{formatDate(report.sample_date)}</p>
        </div>
        <div className="rounded-lg bg-muted/50 p-2.5">
          <p className="text-muted-foreground">{bn ? "প্রত্যাশিত রিপোর্ট" : "Expected Report"}</p>
          <p className="font-semibold text-foreground mt-0.5">{formatDate(report.expected_date)}</p>
        </div>
      </div>

      {/* Download Button */}
      <Button
        onClick={() => handleDownload(report)}
        disabled={!report.report_ready}
        className="w-full gap-2"
        variant={report.report_ready ? "default" : "outline"}
      >
        {report.report_ready ? (
          <>
            <Download className="h-4 w-4" />
            {bn ? "রিপোর্ট ডাউনলোড করুন (PDF)" : "Download Report (PDF)"}
          </>
        ) : (
          <>
            <Clock className="h-4 w-4" />
            {bn ? "রিপোর্ট প্রক্রিয়াধীন..." : "Report in progress..."}
          </>
        )}
      </Button>

      {/* Help for not-ready */}
      {!report.report_ready && (
        <div className="flex items-start gap-2 rounded-lg bg-amber-500/10 p-3">
          <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-700 dark:text-amber-300">
            <p className="font-medium">{bn ? "রিপোর্ট এখনও তৈরি হয়নি" : "Report not ready yet"}</p>
            <p className="mt-0.5 opacity-80">
              {bn
                ? "রিপোর্ট প্রস্তুত হলে আপনাকে SMS ও নোটিফিকেশন পাঠানো হবে।"
                : "You'll receive an SMS & notification when your report is ready."}
            </p>
          </div>
        </div>
      )}
    </motion.div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border bg-card p-5 space-y-5"
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
          <FlaskConical className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="font-heading text-base font-bold text-foreground">
            {bn ? "রিপোর্ট ট্র্যাকিং ও ডাউনলোড" : "Report Tracking & Download"}
          </h3>
          <p className="text-xs text-muted-foreground">
            {bn ? "আপনার ট্র্যাকিং আইডি দিয়ে রিপোর্ট খুঁজুন" : "Find your report using tracking ID"}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="flex gap-2">
        <Input
          placeholder={bn ? "ট্র্যাকিং আইডি (যেমন: LT-2026-0001)" : "Tracking ID (e.g. LT-2026-0001)"}
          value={trackingId}
          onChange={(e) => setTrackingId(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          className="text-sm"
        />
        <Button onClick={handleSearch} size="sm" className="shrink-0 gap-1.5" disabled={loading}>
          <Search className="h-4 w-4" />
          {loading ? (bn ? "খুঁজছি..." : "Searching...") : (bn ? "খুঁজুন" : "Search")}
        </Button>
      </div>

      {/* My Reports (logged-in users) */}
      {user && myReports.length > 0 && !searched && (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {bn ? "আমার রিপোর্টসমূহ" : "My Reports"}
          </p>
          {myReports.map((r) => (
            <button
              key={r.id}
              onClick={() => { setTrackingId(r.tracking_id); setSearchResult(r); setSearched(true); }}
              className="w-full flex items-center justify-between rounded-lg border border-border p-3 hover:bg-muted/50 transition-colors text-left"
            >
              <div>
                <p className="text-sm font-medium text-foreground">{bn ? r.test_name : (r.test_name_en || r.test_name)}</p>
                <p className="text-xs text-muted-foreground font-mono">{r.tracking_id}</p>
              </div>
              <div className="flex items-center gap-1.5">
                {r.report_ready ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
                    <CheckCircle2 className="h-3 w-3" />
                    {bn ? "প্রস্তুত" : "Ready"}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-300">
                    <Clock className="h-3 w-3" />
                    {bn ? "প্রক্রিয়াধীন" : "Processing"}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* No reports hint for non-logged in */}
      {!user && !searched && (
        <div className="rounded-lg bg-muted/50 p-3 text-center">
          <p className="text-xs text-muted-foreground">
            {bn
              ? "লগইন করলে আপনার সকল রিপোর্ট এখানে দেখতে পাবেন। অথবা ট্র্যাকিং আইডি দিয়ে খুঁজুন।"
              : "Log in to see all your reports here, or search by tracking ID."}
          </p>
        </div>
      )}

      {/* Search Result */}
      <AnimatePresence mode="wait">
        {searched && searchResult && renderReport(searchResult)}

        {searched && !searchResult && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-xl border border-dashed border-border p-6 text-center space-y-2"
          >
            <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto" />
            <p className="text-sm text-muted-foreground">
              {bn ? "এই আইডিতে কোনো রিপোর্ট পাওয়া যায়নি" : "No report found with this ID"}
            </p>
            <p className="text-xs text-muted-foreground">
              {bn ? "সঠিক ট্র্যাকিং আইডি দিন অথবা হেল্পলাইনে কল করুন" : "Enter correct ID or call helpline"}
            </p>
            <Button variant="outline" size="sm" className="gap-1.5 mt-2">
              <Phone className="h-3.5 w-3.5" />
              {bn ? "হেল্পলাইন: 09678-123456" : "Helpline: 09678-123456"}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Clear search */}
      {searched && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-xs"
          onClick={() => { setSearched(false); setSearchResult(null); setTrackingId(""); }}
        >
          {bn ? "নতুন অনুসন্ধান" : "New Search"}
        </Button>
      )}
    </motion.div>
  );
};

export default LabTestTracker;

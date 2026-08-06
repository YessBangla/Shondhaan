import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { FileSearch, MapPin, Clock, CheckCircle2, AlertCircle, Loader2, Copy, ExternalLink, Search, X, Filter } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface ServiceRequest {
  id: string;
  service_description: string;
  division: string;
  district: string;
  thana: string | null;
  detail_area: string | null;
  status: string;
  tracking_token: string | null;
  payment_status: string;
  payment_amount: number | null;
  created_at: string;
  first_response_at: string | null;
  resolved_at: string | null;
  customer_name: string;
  customer_phone: string;
}

const statusConfig: Record<string, { label: string; labelEn: string; icon: React.ReactNode; color: string }> = {
  pending: { label: "অপেক্ষমাণ", labelEn: "Pending", icon: <Clock className="h-3.5 w-3.5" />, color: "text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400" },
  assigned: { label: "এসাইন করা হয়েছে", labelEn: "Assigned", icon: <Loader2 className="h-3.5 w-3.5" />, color: "text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400" },
  in_progress: { label: "চলমান", labelEn: "In Progress", icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />, color: "text-purple-600 bg-purple-100 dark:bg-purple-900/30 dark:text-purple-400" },
  resolved: { label: "সমাধান হয়েছে", labelEn: "Resolved", icon: <CheckCircle2 className="h-3.5 w-3.5" />, color: "text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400" },
  cancelled: { label: "বাতিল", labelEn: "Cancelled", icon: <AlertCircle className="h-3.5 w-3.5" />, color: "text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400" },
};

const timelineSteps = ["pending", "assigned", "in_progress", "resolved"];

interface Props {
  userPhone: string;
}

const ServiceRequestsTab = ({ userPhone }: Props) => {
  const { language } = useLanguage();
  const bn = language === "bn";
  const navigate = useNavigate();
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    if (!userPhone) { setLoading(false); return; }
    const fetch = async () => {
      const { data } = await supabase
        .from("service_requests")
        .select("*")
        .eq("customer_phone", userPhone)
        .order("created_at", { ascending: false });
      if (data) setRequests(data as ServiceRequest[]);
      setLoading(false);
    };
    fetch();
  }, [userPhone]);

  const copyToken = (token: string) => {
    navigator.clipboard.writeText(token);
    toast.success(bn ? "টোকেন কপি হয়েছে" : "Token copied");
  };

  const filtered = useMemo(() => {
    let result = requests;
    if (statusFilter !== "all") {
      result = result.filter(r => r.status === statusFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(r =>
        r.service_description.toLowerCase().includes(q) ||
        r.district.toLowerCase().includes(q) ||
        r.division.toLowerCase().includes(q) ||
        (r.thana && r.thana.toLowerCase().includes(q)) ||
        (r.tracking_token && r.tracking_token.toLowerCase().includes(q))
      );
    }
    return result;
  }, [requests, statusFilter, searchQuery]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: requests.length };
    requests.forEach(r => { counts[r.status] = (counts[r.status] || 0) + 1; });
    return counts;
  }, [requests]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="text-center py-12">
        <FileSearch className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
        <p className="text-muted-foreground text-sm">{bn ? "কোনো সার্ভিস রিকোয়েস্ট নেই" : "No service requests"}</p>
        <p className="text-xs text-muted-foreground/60 mt-1">{bn ? "হোমপেজ থেকে সার্ভিস রিকোয়েস্ট পাঠান" : "Send a service request from homepage"}</p>
      </div>
    );
  }

  const filterButtons = [
    { key: "all", label: bn ? "সব" : "All" },
    { key: "pending", label: bn ? "অপেক্ষমাণ" : "Pending" },
    { key: "assigned", label: bn ? "এসাইন" : "Assigned" },
    { key: "in_progress", label: bn ? "চলমান" : "Active" },
    { key: "resolved", label: bn ? "সমাধান" : "Resolved" },
    { key: "cancelled", label: bn ? "বাতিল" : "Cancelled" },
  ];

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={bn ? "সেবা, জেলা বা টোকেন দিয়ে খুঁজুন..." : "Search by service, district or token..."}
          className="w-full rounded-lg border border-input bg-background pl-9 pr-8 py-2.5 text-sm outline-none focus:ring-1 focus:ring-ring"
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2">
            <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
          </button>
        )}
      </div>

      {/* Status Filter Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        {filterButtons.map(fb => {
          const count = statusCounts[fb.key] || 0;
          if (fb.key !== "all" && count === 0) return null;
          return (
            <button
              key={fb.key}
              onClick={() => setStatusFilter(fb.key)}
              className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-medium border transition-all ${
                statusFilter === fb.key
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-muted-foreground border-border hover:border-primary/40"
              }`}
            >
              {fb.label} {count > 0 && <span className="ml-0.5 opacity-70">({count})</span>}
            </button>
          );
        })}
      </div>

      {/* Results count */}
      {(searchQuery || statusFilter !== "all") && (
        <p className="text-[11px] text-muted-foreground">
          {filtered.length} {bn ? "টি রিকোয়েস্ট পাওয়া গেছে" : "requests found"}
        </p>
      )}

      {/* List */}
      {filtered.length === 0 ? (
        <div className="text-center py-8">
          <Search className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
          <p className="text-xs text-muted-foreground">{bn ? "কোনো রিকোয়েস্ট মিলেনি" : "No matching requests"}</p>
        </div>
      ) : (
      filtered.map((req, i) => {
        const cfg = statusConfig[req.status] || statusConfig.pending;
        const currentStep = timelineSteps.indexOf(req.status);
        const isCancelled = req.status === "cancelled";

        return (
          <motion.div
            key={req.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            className="rounded-xl border border-border bg-card p-4 shadow-sm"
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground line-clamp-2">{req.service_description}</p>
                <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3 shrink-0" />
                  <span className="truncate">{req.district}, {req.division}</span>
                </div>
              </div>
              <span className={`shrink-0 ml-2 rounded-full px-2.5 py-0.5 text-[10px] font-medium flex items-center gap-1 ${cfg.color}`}>
                {cfg.icon} {bn ? cfg.label : cfg.labelEn}
              </span>
            </div>

            {/* Timeline */}
            {!isCancelled && (
              <div className="mb-3">
                <div className="flex items-center gap-0.5">
                  {timelineSteps.map((step, idx) => (
                    <div key={step} className="flex-1">
                      <div className={`h-1.5 rounded-full transition-all ${idx <= currentStep ? "bg-primary" : "bg-muted"}`} />
                    </div>
                  ))}
                </div>
                <div className="flex justify-between mt-1">
                  {timelineSteps.map((step) => {
                    const s = statusConfig[step];
                    return (
                      <span key={step} className="text-[7px] text-muted-foreground leading-tight text-center">
                        {bn ? s.label : s.labelEn}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Payment & Meta */}
            <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {new Date(req.created_at).toLocaleDateString("bn-BD")}
              </span>
              {req.payment_amount && req.payment_amount > 0 && (
                <span className="font-medium text-foreground">৳{req.payment_amount}</span>
              )}
              <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-medium ${
                req.payment_status === "paid" 
                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" 
                  : "bg-muted text-muted-foreground"
              }`}>
                {req.payment_status === "paid" ? (bn ? "পেইড" : "Paid") : (bn ? "আনপেইড" : "Unpaid")}
              </span>
            </div>

            {/* Token & Actions */}
            {req.tracking_token && (
              <div className="flex items-center gap-2 pt-2 border-t border-border">
                <span className="text-[10px] text-muted-foreground font-mono truncate">
                  {req.tracking_token.slice(0, 12)}...
                </span>
                <button
                  onClick={() => copyToken(req.tracking_token!)}
                  className="text-[10px] text-muted-foreground hover:text-primary flex items-center gap-0.5"
                >
                  <Copy className="h-3 w-3" /> {bn ? "কপি" : "Copy"}
                </button>
                <button
                  onClick={() => navigate(`/track/${req.tracking_token}`)}
                  className="text-[10px] text-primary font-medium hover:underline flex items-center gap-0.5 ml-auto"
                >
                  <ExternalLink className="h-3 w-3" /> {bn ? "ট্র্যাক করুন" : "Track"}
                </button>
              </div>
            )}
          </motion.div>
        );
      })
      )}
    </div>
  );
};

export default ServiceRequestsTab;

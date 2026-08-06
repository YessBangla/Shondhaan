import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ChevronLeft, MapPin, Phone, User, FileText, Clock, RefreshCw,
  Bell, CheckCircle, AlertCircle, Filter, BarChart3, TrendingUp, Zap, Download,
  Wallet, Receipt, BadgeDollarSign, Banknote, Send, XCircle, MessageSquare
} from "lucide-react";
import CategoryFilterDropdown from "@/components/CategoryFilterDropdown";
import PanelSidebarTabs from "@/components/PanelSidebarTabs";
import { useCmsCategories, useCmsServices } from "@/hooks/useCmsData";
import { Button } from "@/components/ui/button";
import AccountsSection from "@/components/AccountsSection";
import RepLeaderboard from "@/components/RepLeaderboard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Assignment {
  id: string;
  division: string;
  district: string;
  thana: string | null;
}

interface ServiceRequest {
  id: string;
  customer_name: string;
  customer_phone: string;
  division: string;
  district: string;
  thana: string | null;
  detail_area: string | null;
  service_description: string;
  status: string;
  created_at: string;
  first_response_at: string | null;
  resolved_at: string | null;
  assigned_rep_id: string | null;
}

const statusOptions = [
  { value: "pending", label: "অপেক্ষমাণ", className: "bg-yellow-100 text-yellow-800" },
  { value: "contacted", label: "যোগাযোগ হয়েছে", className: "bg-blue-100 text-blue-800" },
  { value: "resolved", label: "সমাধান হয়েছে", className: "bg-green-100 text-green-800" },
  { value: "rejected", label: "বাতিল", className: "bg-red-100 text-red-800" },
];

function formatDuration(ms: number): string {
  if (ms < 60000) return `${Math.round(ms / 1000)} সেকেন্ড`;
  if (ms < 3600000) return `${Math.round(ms / 60000)} মিনিট`;
  if (ms < 86400000) return `${(ms / 3600000).toFixed(1)} ঘন্টা`;
  return `${(ms / 86400000).toFixed(1)} দিন`;
}

const RepresentativePanel = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRep, setIsRep] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [newRequestCount, setNewRequestCount] = useState(0);
  const [showStats, setShowStats] = useState(true);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showEarnings, setShowEarnings] = useState(false);
  const [showWithdrawal, setShowWithdrawal] = useState(false);
  const [earnings, setEarnings] = useState<any[]>([]);
  const [earningsLoading, setEarningsLoading] = useState(false);
  const [divisionFilter, setDivisionFilter] = useState("all");
  const [districtFilter, setDistrictFilter] = useState("all");
  const [thanaFilter, setThanaFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  // Withdrawal states
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [withdrawalForm, setWithdrawalForm] = useState({ amount: "", method: "bkash", account_number: "", account_name: "", note: "" });
  const [submittingWithdrawal, setSubmittingWithdrawal] = useState(false);
  const [withdrawalLoading, setWithdrawalLoading] = useState(false);

  const { data: categories = [] } = useCmsCategories();
  const { data: cmsServices = [] } = useCmsServices();

  useEffect(() => {
    if (!authLoading && !user) navigate("/main-login");
  }, [user, authLoading, navigate]);

  const checkRole = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
    const roles = data?.map(r => r.role) || [];
    if (!roles.includes("representative") && !roles.includes("admin")) {
      toast.error("আপনার প্রতিনিধি অ্যাক্সেস নেই");
      navigate("/");
      return;
    }
    setIsRep(true);
  }, [user, navigate]);

  const fetchAssignments = useCallback(async () => {
    if (!user) return;
    const { data } = await (supabase as any)
      .from("area_representatives")
      .select("id, division, district, thana")
      .eq("user_id", user.id)
      .eq("is_active", true);
    if (data) setAssignments(data);
    return data as Assignment[] | null;
  }, [user]);

  const fetchRequests = useCallback(async (areas?: Assignment[] | null) => {
    const myAreas = areas || assignments;
    if (myAreas.length === 0) { setRequests([]); setLoading(false); return; }

    const filters = myAreas.map(a => {
      let f = `division.eq.${a.division},district.eq.${a.district}`;
      if (a.thana) f += `,thana.eq.${a.thana}`;
      return `and(${f})`;
    });

    const { data } = await supabase
      .from("service_requests")
      .select("*")
      .or(filters.join(","))
      .order("created_at", { ascending: false });

    if (data) setRequests(data as any);
    setLoading(false);
  }, [assignments]);

  useEffect(() => {
    if (user) {
      checkRole();
      fetchAssignments().then(areas => fetchRequests(areas));
    }
  }, [user, checkRole, fetchAssignments, fetchRequests]);

  // Realtime subscription
  useEffect(() => {
    if (!isRep || assignments.length === 0) return;
    const channel = supabase
      .channel("rep-requests")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "service_requests" }, (payload: any) => {
        const newReq = payload.new as ServiceRequest;
        const isMyArea = assignments.some(a =>
          a.division === newReq.division && a.district === newReq.district && (!a.thana || a.thana === newReq.thana)
        );
        if (isMyArea) {
          setRequests(prev => [newReq, ...prev]);
          setNewRequestCount(c => c + 1);
          toast.success("🔔 নতুন সার্ভিস রিকোয়েস্ট এসেছে!", {
            description: `${newReq.customer_name} - ${newReq.service_description.slice(0, 50)}`,
          });
          try {
            const audio = new Audio("data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdH+Jj4eCb2JhaHyHjYl+bmNocoGMj4Z6b2psgIqQjIJ2cW12g4yRjYN4c3B2goyRi4F2cnF3goyPiH92c3V6hI2OiH94dHZ6hIuMhXt2dHd8hYuKg3p2dXl+homIgHp3d3uBhoeEfnl4en6DhoWCfXp5fICDhIOAfHt7foCChIJ/fXt8f4KDgn9+fX1/gYKCgH9+fn+BgYGAgH9/f4CBgYCAgH+AgICAgICAgICAgICA");
            audio.volume = 0.5;
            audio.play().catch(() => {});
          } catch {}
        }
      })
      .subscribe();
    return () => { channel.unsubscribe(); };
  }, [isRep, assignments]);

  const updateStatus = async (id: string, status: string) => {
    setUpdatingId(id);
    const updateData: any = { status };
    // Assign self as rep on first action
    if (user) updateData.assigned_rep_id = user.id;
    const { error } = await supabase.from("service_requests").update(updateData).eq("id", id);
    if (!error) {
      setRequests(prev => prev.map(r => r.id === id ? { ...r, ...updateData } : r));
      toast.success("স্ট্যাটাস আপডেট হয়েছে");
    } else {
      toast.error("আপডেট করতে সমস্যা হয়েছে");
    }
    setUpdatingId(null);
  };

  const fetchEarnings = useCallback(async () => {
    if (!user) return;
    setEarningsLoading(true);
    const { data } = await (supabase as any)
      .from("rep_earnings")
      .select("*")
      .eq("rep_id", user.id)
      .order("created_at", { ascending: false });
    if (data) setEarnings(data);
    setEarningsLoading(false);
  }, [user]);

  // Realtime earnings subscription
  useEffect(() => {
    if (!user || !isRep) return;
    const channel = supabase
      .channel("rep-earnings")
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "rep_earnings",
        filter: `rep_id=eq.${user.id}`,
      }, (payload: any) => {
        setEarnings(prev => [payload.new, ...prev]);
        toast.success("💰 নতুন আয় যোগ হয়েছে!", {
          description: `৳${payload.new.rep_earning.toLocaleString("bn-BD")} প্রাপ্তি`,
        });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, isRep]);

  const fetchWithdrawals = useCallback(async () => {
    if (!user) return;
    setWithdrawalLoading(true);
    const { data } = await (supabase as any)
      .from("withdrawal_requests")
      .select("*")
      .eq("rep_id", user.id)
      .order("created_at", { ascending: false });
    if (data) setWithdrawals(data);
    setWithdrawalLoading(false);
  }, [user]);

  useEffect(() => {
    if (user && isRep) fetchWithdrawals();
  }, [user, isRep, fetchWithdrawals]);

  // Realtime withdrawal updates
  useEffect(() => {
    if (!user || !isRep) return;
    const channel = supabase
      .channel("rep-withdrawals")
      .on("postgres_changes", { event: "*", schema: "public", table: "withdrawal_requests", filter: `rep_id=eq.${user.id}` }, () => {
        fetchWithdrawals();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, isRep, fetchWithdrawals]);

  const submitWithdrawal = async () => {
    if (!user) return;
    const amount = parseFloat(withdrawalForm.amount);
    if (!amount || amount <= 0) { toast.error("সঠিক পরিমাণ লিখুন"); return; }
    if (!withdrawalForm.account_number.trim()) { toast.error("অ্যাকাউন্ট নম্বর লিখুন"); return; }

    setSubmittingWithdrawal(true);
    const { error } = await (supabase as any)
      .from("withdrawal_requests")
      .insert({
        rep_id: user.id,
        amount,
        method: withdrawalForm.method,
        account_number: withdrawalForm.account_number.trim(),
        account_name: withdrawalForm.account_name.trim() || null,
        note: withdrawalForm.note.trim() || null,
      });

    if (!error) {
      toast.success("উইথড্রয়াল রিকোয়েস্ট পাঠানো হয়েছে!");
      setWithdrawalForm({ amount: "", method: "bkash", account_number: "", account_name: "", note: "" });
      fetchWithdrawals();
    } else {
      toast.error("রিকোয়েস্ট পাঠাতে সমস্যা হয়েছে");
    }
    setSubmittingWithdrawal(false);
  };

  const refreshAll = async () => {
    setLoading(true);
    setNewRequestCount(0);
    const areas = await fetchAssignments();
    await fetchRequests(areas);
  };

  // Performance stats
  const stats = useMemo(() => {
    const myRequests = user ? requests.filter(r => r.assigned_rep_id === user.id) : [];
    const total = requests.length;
    const handled = myRequests.length;
    const resolved = myRequests.filter(r => r.status === "resolved").length;
    const pending = requests.filter(r => r.status === "pending").length;

    // Avg response time (created_at → first_response_at)
    const responseTimes = myRequests
      .filter(r => r.first_response_at)
      .map(r => new Date(r.first_response_at!).getTime() - new Date(r.created_at).getTime());
    const avgResponseTime = responseTimes.length > 0
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      : 0;

    // Avg resolution time (created_at → resolved_at)
    const resolveTimes = myRequests
      .filter(r => r.resolved_at)
      .map(r => new Date(r.resolved_at!).getTime() - new Date(r.created_at).getTime());
    const avgResolveTime = resolveTimes.length > 0
      ? resolveTimes.reduce((a, b) => a + b, 0) / resolveTimes.length
      : 0;

    // Today's stats
    const today = new Date().toDateString();
    const todayHandled = myRequests.filter(r => new Date(r.first_response_at || r.created_at).toDateString() === today).length;

    // Resolution rate
    const resolutionRate = handled > 0 ? Math.round((resolved / handled) * 100) : 0;

    return { total, handled, resolved, pending, avgResponseTime, avgResolveTime, todayHandled, resolutionRate };
  }, [requests, user]);

  const divisions = [...new Set(requests.map(r => r.division))].sort();
  const availableDistricts = [...new Set(
    requests.filter(r => divisionFilter === "all" || r.division === divisionFilter).map(r => r.district)
  )].sort();
  const availableThanas = [...new Set(
    requests.filter(r => (divisionFilter === "all" || r.division === divisionFilter) && (districtFilter === "all" || r.district === districtFilter) && r.thana).map(r => r.thana!)
  )].sort();

  const categoryServiceKeywords = useMemo(() => {
    if (categoryFilter === "all") return null;
    const slugs = cmsServices
      .filter(s => s.category_id === categoryFilter)
      .flatMap(s => [s.title.toLowerCase(), (s.title_en || "").toLowerCase(), s.slug.toLowerCase()])
      .filter(Boolean);
    const cat = categories.find(c => c.id === categoryFilter);
    if (cat) slugs.push(cat.name.toLowerCase(), (cat.name_en || "").toLowerCase());
    return slugs;
  }, [categoryFilter, cmsServices, categories]);

  const locationFiltered = requests.filter(r => {
    if (divisionFilter !== "all" && r.division !== divisionFilter) return false;
    if (districtFilter !== "all" && r.district !== districtFilter) return false;
    if (thanaFilter !== "all" && r.thana !== thanaFilter) return false;
    if (categoryServiceKeywords) {
      const desc = r.service_description.toLowerCase();
      if (!categoryServiceKeywords.some(kw => kw && desc.includes(kw))) return false;
    }
    return true;
  });

  const filtered = filterStatus === "all" ? locationFiltered : locationFiltered.filter(r => r.status === filterStatus);

  if (authLoading || (!isRep && user)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      
      <div className="pt-[44px] md:pt-[104px]" />

      <div className="mx-auto max-w-7xl px-4 py-6 md:py-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <h1 className="font-heading text-lg md:text-xl font-bold text-foreground flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" /> প্রতিনিধি প্যানেল
              {newRequestCount > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-bold text-destructive-foreground animate-pulse">
                  {newRequestCount}
                </span>
              )}
            </h1>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="text-xs gap-1.5" onClick={() => navigate("/internal")}>
              <MessageSquare className="h-3.5 w-3.5" /> <span className="hidden sm:inline">চ্যাট হাব</span>
            </Button>
            <button onClick={refreshAll} className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium text-foreground hover:bg-secondary">
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          <PanelSidebarTabs
            items={[
              { value: "requests", label: "রিকোয়েস্ট", icon: <FileText className="h-4 w-4" />, group: "অপারেশন" },
              { value: "performance", label: "পারফরম্যান্স", icon: <TrendingUp className="h-4 w-4" /> },
              { value: "leaderboard", label: "লিডারবোর্ড", icon: <BarChart3 className="h-4 w-4" /> },
              { value: "accounts", label: "একাউন্টস", icon: <Wallet className="h-4 w-4" />, group: "ফিনান্স" },
              { value: "withdrawal", label: "উইথড্রয়াল", icon: <Banknote className="h-4 w-4" /> },
            ]}
            defaultValue="requests"
            panelTitle="প্রতিনিধি"
            panelIcon={<MapPin className="h-4 w-4" />}
            hero={{
              title: "এলাকা ভিত্তিক ম্যানেজমেন্ট",
              subtitle: "কমিশন, কাস্টমার ও বুকিং — আপনার অঞ্চলের সম্পূর্ণ ওভারভিউ।",
              badge: { label: "প্রতিনিধি প্যানেল" },
              gradient: "from-teal-500 via-cyan-600 to-emerald-700",
            }}
          >
            {(activeTab) => {
              if (activeTab === "requests") return (
                <div className="p-4">
                  {/* Assigned areas */}
                  <div className="rounded-xl border border-border bg-card p-3 mb-4">
                    <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5" /> আপনার দায়িত্বপ্রাপ্ত এলাকা
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {assignments.length === 0 ? (
                        <p className="text-xs text-muted-foreground">কোনো এলাকা অ্যাসাইন করা হয়নি</p>
                      ) : assignments.map(a => (
                        <span key={a.id} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary">
                          <MapPin className="h-3 w-3" />
                          {a.thana ? `${a.thana}, ${a.district}` : `${a.district}, ${a.division}`}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Quick Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
                    {statusOptions.map(s => {
                      const count = locationFiltered.filter(r => r.status === s.value).length;
                      return (
                        <button key={s.value} onClick={() => setFilterStatus(filterStatus === s.value ? "all" : s.value)}
                          className={`rounded-xl border p-2.5 text-left transition-all ${filterStatus === s.value ? "border-primary ring-1 ring-primary" : "border-border hover:border-primary/40"}`}>
                          <p className="text-xl font-bold text-foreground">{count}</p>
                          <p className={`mt-0.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${s.className}`}>{s.label}</p>
                        </button>
                      );
                    })}
                  </div>

                  {/* Location & Category filters */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    <CategoryFilterDropdown value={categoryFilter} onChange={setCategoryFilter} />
                    <select value={divisionFilter} onChange={e => { setDivisionFilter(e.target.value); setDistrictFilter("all"); setThanaFilter("all"); }}
                      className="rounded-lg border border-input bg-background px-2.5 py-1.5 text-xs font-medium outline-none focus:ring-1 focus:ring-ring">
                      <option value="all">সব বিভাগ</option>
                      {divisions.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                    <select value={districtFilter} onChange={e => { setDistrictFilter(e.target.value); setThanaFilter("all"); }}
                      className="rounded-lg border border-input bg-background px-2.5 py-1.5 text-xs font-medium outline-none focus:ring-1 focus:ring-ring">
                      <option value="all">সব জেলা</option>
                      {availableDistricts.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                    {availableThanas.length > 0 && (
                      <select value={thanaFilter} onChange={e => setThanaFilter(e.target.value)}
                        className="rounded-lg border border-input bg-background px-2.5 py-1.5 text-xs font-medium outline-none focus:ring-1 focus:ring-ring">
                        <option value="all">সব থানা</option>
                        {availableThanas.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    )}
                    {(filterStatus !== "all" || divisionFilter !== "all" || districtFilter !== "all" || thanaFilter !== "all" || categoryFilter !== "all") && (
                      <button onClick={() => { setFilterStatus("all"); setDivisionFilter("all"); setDistrictFilter("all"); setThanaFilter("all"); setCategoryFilter("all"); }} className="text-xs text-primary hover:underline">
                        ✕ ফিল্টার মুছুন
                      </button>
                    )}
                  </div>

                  {/* Export */}
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs text-muted-foreground">মোট: {filtered.length} টি রিকোয়েস্ট</p>
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => {
                        if (!filtered.length) { toast.error("এক্সপোর্ট করার মতো ডেটা নেই"); return; }
                        const headers = ["গ্রাহক,ফোন,বিভাগ,জেলা,থানা,বিবরণ,স্ট্যাটাস,তারিখ"];
                        const rows = filtered.map(r =>
                          `"${r.customer_name}","${r.customer_phone}","${r.division}","${r.district}","${r.thana || "—"}","${r.service_description.replace(/"/g, '""')}","${statusOptions.find(o => o.value === r.status)?.label || r.status}","${new Date(r.created_at).toLocaleDateString("bn-BD")}"`
                        );
                        const csv = "\uFEFF" + headers.join("\n") + "\n" + rows.join("\n");
                        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
                        const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `rep-requests-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
                        toast.success("CSV ডাউনলোড হয়েছে");
                      }} className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-[10px] font-medium text-foreground hover:bg-secondary">
                        <Download className="h-3 w-3" /> CSV
                      </button>
                    </div>
                  </div>

                  {/* Requests list */}
                  {loading ? (
                    <div className="py-12 text-center text-muted-foreground">লোড হচ্ছে...</div>
                  ) : filtered.length === 0 ? (
                    <div className="py-12 text-center">
                      <AlertCircle className="h-10 w-10 text-muted-foreground/40 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">আপনার এলাকায় কোনো রিকোয়েস্ট নেই</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filtered.map(r => {
                        const s = statusOptions.find(o => o.value === r.status) || statusOptions[0];
                        return (
                          <motion.div key={r.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                            className="rounded-xl border border-border bg-card p-3 space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
                                  <User className="h-3.5 w-3.5" /> {r.customer_name}
                                </p>
                                <a href={`tel:${r.customer_phone}`} className="text-xs text-primary flex items-center gap-1.5 hover:underline">
                                  <Phone className="h-3.5 w-3.5" /> {r.customer_phone}
                                </a>
                              </div>
                              <select value={r.status} onChange={e => updateStatus(r.id, e.target.value)} disabled={updatingId === r.id}
                                className={`rounded-lg border border-input px-2 py-1 text-xs font-medium outline-none ${s.className} disabled:opacity-50`}>
                                {statusOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                              </select>
                            </div>
                            <p className="text-xs text-foreground flex items-start gap-1.5">
                              <FileText className="h-3.5 w-3.5 shrink-0 mt-0.5" /> {r.service_description}
                            </p>
                            <div className="flex flex-wrap gap-1.5 mt-1">
                              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary border border-primary/20">
                                📍 {r.division}
                              </span>
                              <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-foreground">
                                🏙️ {r.district}
                              </span>
                              {r.thana && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-[10px] font-medium text-accent-foreground">
                                  📌 {r.thana}
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-muted-foreground/60">
                              {new Date(r.created_at).toLocaleDateString("bn-BD")} {new Date(r.created_at).toLocaleTimeString("bn-BD", { hour: "2-digit", minute: "2-digit" })}
                            </p>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );

              if (activeTab === "performance") return (
                <div className="p-4">
                  <div className="rounded-xl border border-border bg-card p-4">
                    <h2 className="text-sm font-bold text-foreground mb-3 flex items-center gap-1.5">
                      <TrendingUp className="h-4 w-4 text-primary" /> আপনার পারফরম্যান্স
                    </h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
                      <div className="rounded-lg bg-primary/5 border border-primary/10 p-3 text-center">
                        <p className="text-2xl font-bold text-primary">{stats.handled}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">হ্যান্ডেল করেছেন</p>
                      </div>
                      <div className="rounded-lg bg-green-500/5 border border-green-500/10 p-3 text-center">
                        <p className="text-2xl font-bold text-green-600">{stats.resolved}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">সমাধান করেছেন</p>
                      </div>
                      <div className="rounded-lg bg-yellow-500/5 border border-yellow-500/10 p-3 text-center">
                        <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">অপেক্ষমাণ</p>
                      </div>
                      <div className="rounded-lg bg-blue-500/5 border border-blue-500/10 p-3 text-center">
                        <p className="text-2xl font-bold text-blue-600">{stats.todayHandled}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">আজ হ্যান্ডেল</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      <div className="rounded-lg border border-border p-2.5 flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 shrink-0">
                          <Zap className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-foreground">{stats.avgResponseTime > 0 ? formatDuration(stats.avgResponseTime) : "—"}</p>
                          <p className="text-[10px] text-muted-foreground">গড় রেসপন্স টাইম</p>
                        </div>
                      </div>
                      <div className="rounded-lg border border-border p-2.5 flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500/10 shrink-0">
                          <Clock className="h-4 w-4 text-green-600" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-foreground">{stats.avgResolveTime > 0 ? formatDuration(stats.avgResolveTime) : "—"}</p>
                          <p className="text-[10px] text-muted-foreground">গড় সমাধান সময়</p>
                        </div>
                      </div>
                      <div className="rounded-lg border border-border p-2.5 flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/10 shrink-0">
                          <CheckCircle className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-foreground">{stats.resolutionRate}%</p>
                          <p className="text-[10px] text-muted-foreground">সমাধান হার</p>
                        </div>
                      </div>
                    </div>
                    <div className="mt-3">
                      <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                        <span>মোট এলাকার রিকোয়েস্ট: {stats.total}</span>
                        <span>আপনি হ্যান্ডেল করেছেন: {stats.handled}</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full bg-primary transition-all duration-500"
                          style={{ width: `${stats.total > 0 ? (stats.handled / stats.total) * 100 : 0}%` }} />
                      </div>
                    </div>
                  </div>
                </div>
              );

              if (activeTab === "leaderboard") return (
                <div className="p-4">
                  <RepLeaderboard currentUserId={user?.id} compact />
                </div>
              );

              if (activeTab === "accounts") return (
                <div className="p-4">
                  {user && <AccountsSection userId={user.id} role="representative" />}
                </div>
              );

              if (activeTab === "withdrawal") return (
                <div className="p-4 space-y-4">
                  {/* Withdrawal Form */}
                  <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                    <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                      <Send className="h-4 w-4 text-primary" /> নতুন উইথড্রয়াল রিকোয়েস্ট
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-medium text-muted-foreground mb-1 block">পরিমাণ (৳)</label>
                        <input type="number" placeholder="১০০০" value={withdrawalForm.amount}
                          onChange={e => setWithdrawalForm(p => ({ ...p, amount: e.target.value }))}
                          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground" />
                      </div>
                      <div>
                        <label className="text-[10px] font-medium text-muted-foreground mb-1 block">মাধ্যম</label>
                        <select value={withdrawalForm.method}
                          onChange={e => setWithdrawalForm(p => ({ ...p, method: e.target.value }))}
                          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground">
                          <option value="bkash">বিকাশ</option>
                          <option value="nagad">নগদ</option>
                          <option value="rocket">রকেট</option>
                          <option value="bank">ব্যাংক ট্রান্সফার</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-medium text-muted-foreground mb-1 block">অ্যাকাউন্ট নম্বর</label>
                        <input type="text" placeholder="01XXXXXXXXX" value={withdrawalForm.account_number}
                          onChange={e => setWithdrawalForm(p => ({ ...p, account_number: e.target.value }))}
                          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground" />
                      </div>
                      <div>
                        <label className="text-[10px] font-medium text-muted-foreground mb-1 block">অ্যাকাউন্ট নাম (ঐচ্ছিক)</label>
                        <input type="text" placeholder="নাম" value={withdrawalForm.account_name}
                          onChange={e => setWithdrawalForm(p => ({ ...p, account_name: e.target.value }))}
                          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground" />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-medium text-muted-foreground mb-1 block">নোট (ঐচ্ছিক)</label>
                      <input type="text" placeholder="অতিরিক্ত তথ্য..." value={withdrawalForm.note}
                        onChange={e => setWithdrawalForm(p => ({ ...p, note: e.target.value }))}
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground" />
                    </div>
                    <button onClick={submitWithdrawal} disabled={submittingWithdrawal}
                      className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                      <Send className="h-3.5 w-3.5" /> {submittingWithdrawal ? "পাঠানো হচ্ছে..." : "রিকোয়েস্ট পাঠান"}
                    </button>
                  </div>

                  {/* Withdrawal History */}
                  <div className="rounded-xl border border-border bg-card p-4">
                    <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-1.5">
                      <FileText className="h-4 w-4 text-primary" /> উইথড্রয়াল হিস্ট্রি
                    </h3>
                    {withdrawalLoading ? (
                      <p className="text-xs text-muted-foreground text-center py-4">লোড হচ্ছে...</p>
                    ) : withdrawals.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-6">কোনো উইথড্রয়াল রিকোয়েস্ট নেই</p>
                    ) : (
                      <div className="space-y-2">
                        {withdrawals.map((w: any) => (
                          <div key={w.id} className="rounded-lg border border-border p-3 flex items-center justify-between">
                            <div>
                              <p className="text-xs font-semibold text-foreground">৳{w.amount.toLocaleString("bn-BD")}</p>
                              <p className="text-[10px] text-muted-foreground">
                                {w.method === "bkash" ? "বিকাশ" : w.method === "nagad" ? "নগদ" : w.method === "rocket" ? "রকেট" : "ব্যাংক"} • {w.account_number}
                              </p>
                              <p className="text-[10px] text-muted-foreground">{new Date(w.created_at).toLocaleDateString("bn-BD")}</p>
                              {w.admin_note && <p className="text-[10px] text-muted-foreground mt-0.5">📝 {w.admin_note}</p>}
                            </div>
                            <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                              w.status === "pending" ? "bg-yellow-100 text-yellow-800" :
                              w.status === "approved" ? "bg-blue-100 text-blue-800" :
                              w.status === "completed" ? "bg-green-100 text-green-800" :
                              "bg-red-100 text-red-800"
                            }`}>
                              {w.status === "pending" ? "অপেক্ষমাণ" : w.status === "approved" ? "অনুমোদিত" : w.status === "completed" ? "সম্পন্ন" : "প্রত্যাখ্যাত"}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );

              return null;
            }}
          </PanelSidebarTabs>
        </div>
      </div>

      
      <div className="h-16 md:hidden" />
    </div>
  );
};

export default RepresentativePanel;

import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ChevronLeft, RefreshCw, Eye, MapPinCheck, Users, TrendingUp,
  Clock, CheckCircle, AlertTriangle, BarChart3, MessageSquare
} from "lucide-react";
import CategoryFilterDropdown from "@/components/CategoryFilterDropdown";
import { useCmsCategories, useCmsServices } from "@/hooks/useCmsData";
import { Button } from "@/components/ui/button";
import PanelSidebarTabs from "@/components/PanelSidebarTabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import NotificationBell from "@/components/NotificationBell";
import RepLeaderboard from "@/components/RepLeaderboard";
import AccountsSection from "@/components/AccountsSection";

interface Rep {
  id: string;
  user_id: string;
  name: string;
  phone: string;
  division: string;
  district: string;
  thana: string | null;
  is_active: boolean;
}

interface ServiceRequest {
  id: string;
  customer_name: string;
  customer_phone: string;
  division: string;
  district: string;
  thana: string | null;
  service_description: string;
  status: string;
  created_at: string;
  assigned_rep_id: string | null;
  first_response_at: string | null;
  resolved_at: string | null;
}

const SupervisorPanel = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [isSupervisor, setIsSupervisor] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reps, setReps] = useState<Rep[]>([]);
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [selectedRep, setSelectedRep] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState("all");

  const { data: categories = [] } = useCmsCategories();
  const { data: cmsServices = [] } = useCmsServices();

  useEffect(() => {
    if (!authLoading && !user) navigate("/main-login");
  }, [user, authLoading, navigate]);

  const checkRole = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
    const roles = data?.map(r => r.role) || [];
    if (!roles.includes("supervisor") && !roles.includes("admin")) {
      toast.error("সুপারভাইজার অ্যাক্সেস নেই");
      navigate("/");
      return;
    }
    setIsSupervisor(true);
  }, [user, navigate]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [repsRes, reqsRes] = await Promise.all([
      supabase.from("area_representatives").select("*").order("name"),
      supabase.from("service_requests").select("*").order("created_at", { ascending: false }),
    ]);
    if (repsRes.data) setReps(repsRes.data as Rep[]);
    if (reqsRes.data) setRequests(reqsRes.data as ServiceRequest[]);
    setLoading(false);
  }, []);

  useEffect(() => { checkRole(); }, [checkRole]);
  useEffect(() => { if (isSupervisor) fetchData(); }, [isSupervisor, fetchData]);

  const repStats = useMemo(() => {
    return reps.map(rep => {
      const repRequests = requests.filter(r => r.assigned_rep_id === rep.id);
      const resolved = repRequests.filter(r => r.status === "resolved").length;
      const pending = requests.filter(r =>
        r.division === rep.division && r.district === rep.district && r.status === "pending"
      ).length;
      const responseTimes = repRequests
        .filter(r => r.first_response_at)
        .map(r => new Date(r.first_response_at!).getTime() - new Date(r.created_at).getTime());
      const avgResponse = responseTimes.length > 0 ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length : 0;
      return {
        ...rep,
        handled: repRequests.length,
        resolved,
        pending,
        avgResponseMs: avgResponse,
        rate: repRequests.length > 0 ? Math.round((resolved / repRequests.length) * 100) : 0,
      };
    });
  }, [reps, requests]);

  const formatTime = (ms: number) => {
    if (ms === 0) return "—";
    if (ms < 60000) return `${Math.round(ms / 1000)}s`;
    if (ms < 3600000) return `${Math.round(ms / 60000)}m`;
    return `${(ms / 3600000).toFixed(1)}h`;
  };

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

  const filteredRequests = useMemo(() => {
    let result = selectedRep
      ? requests.filter(r => r.assigned_rep_id === selectedRep)
      : requests;
    if (categoryServiceKeywords) {
      result = result.filter(r => {
        const desc = r.service_description.toLowerCase();
        return categoryServiceKeywords.some(kw => kw && desc.includes(kw));
      });
    }
    return result;
  }, [selectedRep, requests, categoryServiceKeywords]);

  const overallStats = useMemo(() => ({
    totalReps: reps.length,
    activeReps: reps.filter(r => r.is_active).length,
    totalRequests: requests.length,
    pendingRequests: requests.filter(r => r.status === "pending").length,
    resolvedRequests: requests.filter(r => r.status === "resolved").length,
  }), [reps, requests]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isSupervisor) {
    return (
      <div className="min-h-screen bg-background">
        
        <div className="pt-[44px] md:pt-[104px] flex flex-col items-center justify-center min-h-[60vh] px-4">
          <Eye className="h-16 w-16 text-muted-foreground mb-4" />
          <h1 className="font-heading text-xl font-bold text-foreground mb-2">অ্যাক্সেস নেই</h1>
          <p className="text-muted-foreground text-sm mb-4">এই পেজটি শুধুমাত্র সুপারভাইজারদের জন্য।</p>
          <button onClick={() => navigate("/")} className="rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground">হোমে ফিরুন</button>
        </div>
        <div className="h-16 md:hidden" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      
      <div className="pt-[44px] md:pt-[104px]" />

      <div className="mx-auto max-w-5xl px-4 py-6 md:py-10">
        <button onClick={() => navigate(-1)} className="mb-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-4 w-4" /> পেছনে যান
        </button>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-heading text-xl md:text-2xl font-bold text-foreground flex items-center gap-2">
              <Eye className="h-6 w-6 text-primary" /> সুপারভাইজার প্যানেল
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">প্রতিনিধি: {reps.length} • রিকোয়েস্ট: {requests.length}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="text-xs gap-1.5" onClick={() => navigate("/internal")}>
              <MessageSquare className="h-3.5 w-3.5" /> চ্যাট হাব
            </Button>
            <NotificationBell />
            <button onClick={fetchData} className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium text-foreground hover:bg-secondary">
              <RefreshCw className="h-3.5 w-3.5" /> রিফ্রেশ
            </button>
          </div>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          <div className="rounded-xl border border-border bg-card p-3">
            <p className="text-2xl font-bold text-foreground">{overallStats.totalReps}</p>
            <p className="text-xs text-muted-foreground">মোট প্রতিনিধি</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-3">
            <p className="text-2xl font-bold text-green-600">{overallStats.activeReps}</p>
            <p className="text-xs text-muted-foreground">সক্রিয়</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-3">
            <p className="text-2xl font-bold text-foreground">{overallStats.totalRequests}</p>
            <p className="text-xs text-muted-foreground">মোট রিকোয়েস্ট</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-3">
            <p className="text-2xl font-bold text-yellow-600">{overallStats.pendingRequests}</p>
            <p className="text-xs text-muted-foreground">অপেক্ষমাণ</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-3">
            <p className="text-2xl font-bold text-green-600">{overallStats.resolvedRequests}</p>
            <p className="text-xs text-muted-foreground">সমাধান</p>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          <PanelSidebarTabs
            items={[
              { value: "reps", label: "প্রতিনিধি পারফরম্যান্স", icon: <Users className="h-4 w-4" />, group: "মনিটরিং" },
              { value: "leaderboard", label: "লিডারবোর্ড", icon: <BarChart3 className="h-4 w-4" /> },
              { value: "requests", label: "রিকোয়েস্ট মনিটর", icon: <AlertTriangle className="h-4 w-4" />, group: "অপারেশন" },
              { value: "accounts", label: "একাউন্টস", icon: <TrendingUp className="h-4 w-4" />, group: "ফিনান্স" },
            ]}
            defaultValue="reps"
            panelTitle="সুপারভাইজার"
            panelIcon={<Eye className="h-4 w-4" />}
            hero={{
              title: "মাঠ পর্যায়ের সুপারভিশন",
              subtitle: "সেবা ও দল তত্ত্বাবধান, কোয়ালিটি অডিট ও পারফরম্যান্স মনিটরিং।",
              badge: { label: "সুপারভাইজার প্যানেল" },
              gradient: "from-sky-500 via-blue-600 to-cyan-700",
            }}
          >
            {(activeTab) => {
              if (activeTab === "reps") return (
                <div className="p-4 space-y-2">
                  {repStats.length === 0 ? (
                    <div className="py-12 text-center text-muted-foreground">কোনো প্রতিনিধি নেই</div>
                  ) : repStats.map(rep => (
                    <motion.div key={rep.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                      className="rounded-xl border border-border bg-card p-4 hover:border-primary/30 transition-colors cursor-pointer"
                      onClick={() => setSelectedRep(selectedRep === rep.user_id ? null : rep.user_id)}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold ${rep.is_active ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground"}`}>{rep.name.charAt(0)}</div>
                          <div>
                            <p className="text-sm font-semibold text-foreground">{rep.name}</p>
                            <p className="text-[10px] text-muted-foreground">{rep.thana ? `${rep.thana}, ` : ""}{rep.district}, {rep.division}</p>
                          </div>
                        </div>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${rep.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>{rep.is_active ? "সক্রিয়" : "নিষ্ক্রিয়"}</span>
                      </div>
                      <div className="grid grid-cols-4 gap-2 text-center">
                        <div className="rounded-lg bg-secondary/50 p-2"><p className="text-lg font-bold text-foreground">{rep.handled}</p><p className="text-[9px] text-muted-foreground">হ্যান্ডেল</p></div>
                        <div className="rounded-lg bg-secondary/50 p-2"><p className="text-lg font-bold text-green-600">{rep.resolved}</p><p className="text-[9px] text-muted-foreground">সমাধান</p></div>
                        <div className="rounded-lg bg-secondary/50 p-2"><p className="text-lg font-bold text-yellow-600">{rep.pending}</p><p className="text-[9px] text-muted-foreground">অপেক্ষমাণ</p></div>
                        <div className="rounded-lg bg-secondary/50 p-2"><p className="text-lg font-bold text-foreground">{rep.rate}%</p><p className="text-[9px] text-muted-foreground">সমাধান হার</p></div>
                      </div>
                      <div className="mt-2 flex items-center gap-2 text-[10px] text-muted-foreground"><Clock className="h-3 w-3" /> গড় রেসপন্স: {formatTime(rep.avgResponseMs)}<span className="mx-1">•</span>📞 {rep.phone}</div>
                    </motion.div>
                  ))}
                </div>
              );
              if (activeTab === "leaderboard") return <div className="p-4"><RepLeaderboard currentUserId={user?.id} /></div>;
              if (activeTab === "requests") return (
                <div className="p-4">
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    {selectedRep && <button onClick={() => setSelectedRep(null)} className="text-xs text-primary hover:underline">← সব রিকোয়েস্ট</button>}
                    <CategoryFilterDropdown value={categoryFilter} onChange={setCategoryFilter} />
                    {categoryFilter !== "all" && <button onClick={() => setCategoryFilter("all")} className="text-xs text-primary hover:underline">✕ ক্যাটেগরি মুছুন</button>}
                  </div>
                  <div className="space-y-2">
                    {filteredRequests.length === 0 ? (
                      <div className="py-12 text-center text-muted-foreground">কোনো রিকোয়েস্ট নেই</div>
                    ) : filteredRequests.slice(0, 50).map((r, i) => {
                      const statusMap: Record<string, { label: string; cls: string }> = { pending: { label: "অপেক্ষমাণ", cls: "bg-yellow-100 text-yellow-800" }, contacted: { label: "যোগাযোগ", cls: "bg-blue-100 text-blue-800" }, resolved: { label: "সমাধান", cls: "bg-green-100 text-green-800" }, rejected: { label: "বাতিল", cls: "bg-red-100 text-red-800" } };
                      const s = statusMap[r.status] || statusMap.pending;
                      return (
                        <motion.div key={r.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }} className="rounded-xl border border-border bg-card p-3">
                          <div className="flex items-start justify-between mb-1.5">
                            <div><p className="text-sm font-medium text-foreground">{r.customer_name}</p><p className="text-[10px] text-muted-foreground">{r.division}, {r.district}{r.thana ? `, ${r.thana}` : ""}</p></div>
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${s.cls}`}>{s.label}</span>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-1">{r.service_description}</p>
                          <p className="text-[9px] text-muted-foreground/60 mt-1">{new Date(r.created_at).toLocaleDateString("bn-BD")} • {r.customer_phone}</p>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              );
              if (activeTab === "accounts") return <div className="p-4">{user && <AccountsSection userId={user.id} role="admin" />}</div>;
              return null;
            }}
          </PanelSidebarTabs>
        </div>
      </div>

      
      <div className="h-16 md:hidden" />
    </div>
  );
};

export default SupervisorPanel;

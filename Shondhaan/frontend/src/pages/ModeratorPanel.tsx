import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ChevronLeft, Star, MessageSquare, RefreshCw, Trash2, ShieldCheck,
  TrendingUp, AlertTriangle, Eye, Filter, Download, Image
} from "lucide-react";
import ServiceImageManager from "@/components/admin/ServiceImageManager";
import NotificationBell from "@/components/NotificationBell";
import { Button } from "@/components/ui/button";
import PanelSidebarTabs from "@/components/PanelSidebarTabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Review {
  id: string;
  service_slug: string;
  reviewer_name: string;
  rating: number;
  comment: string | null;
  user_id: string;
  created_at: string;
}

interface ContactMessage {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  message: string;
  created_at: string;
}

const ModeratorPanel = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [isMod, setIsMod] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterRating, setFilterRating] = useState("all");
  const [expandedMsg, setExpandedMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate("/main-login");
  }, [user, authLoading, navigate]);

  const checkRole = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
    const roles = data?.map(r => r.role) || [];
    if (!roles.includes("moderator") && !roles.includes("admin")) {
      toast.error("আপনার মডারেটর অ্যাক্সেস নেই");
      navigate("/");
      return;
    }
    setIsMod(true);
  }, [user, navigate]);

  const fetchReviews = useCallback(async () => {
    const { data } = await supabase.from("service_reviews").select("*").order("created_at", { ascending: false });
    if (data) setReviews(data);
  }, []);

  const fetchMessages = useCallback(async () => {
    const { data } = await supabase.from("contact_messages").select("*").order("created_at", { ascending: false });
    if (data) setMessages(data);
  }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchReviews(), fetchMessages()]);
    setLoading(false);
  }, [fetchReviews, fetchMessages]);

  useEffect(() => {
    if (user) {
      checkRole();
      fetchAll();
    }
  }, [user, checkRole, fetchAll]);

  const deleteReview = async (id: string) => {
    if (!confirm("এই রিভিউটি মুছে ফেলতে চান?")) return;
    const { error } = await supabase.from("service_reviews").delete().eq("id", id);
    if (!error) {
      setReviews(prev => prev.filter(r => r.id !== id));
      toast.success("রিভিউ মুছে ফেলা হয়েছে");
    } else {
      toast.error("মুছতে সমস্যা হয়েছে");
    }
  };

  const filteredReviews = filterRating === "all" ? reviews : reviews.filter(r => r.rating === parseInt(filterRating));

  // Stats
  const stats = useMemo(() => {
    const avgRating = reviews.length > 0 ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) : 0;
    const lowRatingCount = reviews.filter(r => r.rating <= 2).length;
    const highRatingCount = reviews.filter(r => r.rating >= 4).length;
    const todayReviews = reviews.filter(r => new Date(r.created_at).toDateString() === new Date().toDateString()).length;
    const todayMessages = messages.filter(m => new Date(m.created_at).toDateString() === new Date().toDateString()).length;
    return { avgRating, lowRatingCount, highRatingCount, todayReviews, todayMessages };
  }, [reviews, messages]);

  // CSV export
  const exportReviewsCSV = () => {
    const headers = ["নাম", "সেবা", "রেটিং", "মন্তব্য", "তারিখ"];
    const rows = filteredReviews.map(r => [
      r.reviewer_name, r.service_slug, r.rating.toString(),
      `"${(r.comment || "").replace(/"/g, '""')}"`,
      new Date(r.created_at).toLocaleDateString("bn-BD")
    ]);
    const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `reviews_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    toast.success("CSV ডাউনলোড হয়েছে");
  };

  if (authLoading || (!isMod && user)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isMod && !user) return null;

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
              <ShieldCheck className="h-6 w-6 text-primary" /> মডারেটর প্যানেল
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">রিভিউ: {reviews.length} • মেসেজ: {messages.length}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="text-xs gap-1.5" onClick={() => navigate("/internal")}>
              <MessageSquare className="h-3.5 w-3.5" /> চ্যাট হাব
            </Button>
            <NotificationBell />
            <button onClick={fetchAll} className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium text-foreground hover:bg-secondary">
              <RefreshCw className="h-3.5 w-3.5" /> রিফ্রেশ
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          <div className="rounded-xl border border-border bg-card p-3">
            <p className="text-2xl font-bold text-foreground">{reviews.length}</p>
            <p className="text-xs text-muted-foreground">মোট রিভিউ</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-3">
            <p className="text-2xl font-bold text-yellow-600">⭐ {stats.avgRating.toFixed(1)}</p>
            <p className="text-xs text-muted-foreground">গড় রেটিং</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-3">
            <p className="text-2xl font-bold text-red-600">{stats.lowRatingCount}</p>
            <p className="text-xs text-muted-foreground">নিম্ন রেটিং (≤2)</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-3">
            <p className="text-2xl font-bold text-foreground">{messages.length}</p>
            <p className="text-xs text-muted-foreground">মোট মেসেজ</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-3">
            <p className="text-2xl font-bold text-primary">{stats.todayReviews + stats.todayMessages}</p>
            <p className="text-xs text-muted-foreground">আজকের এন্ট্রি</p>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          <PanelSidebarTabs
            items={[
              { value: "reviews", label: "রিভিউ মডারেশন", icon: <Star className="h-4 w-4" />, group: "কন্টেন্ট" },
              { value: "messages", label: "কন্টাক্ট মেসেজ", icon: <MessageSquare className="h-4 w-4" /> },
              { value: "images", label: "সেবার ছবি", icon: <Image className="h-4 w-4" />, group: "CMS" },
            ]}
            defaultValue="reviews"
            panelTitle="মডারেটর"
            panelIcon={<ShieldCheck className="h-4 w-4" />}
            hero={{
              title: "মডারেশন ও কোয়ালিটি কন্ট্রোল",
              subtitle: "রিভিউ, রিপোর্ট ও কনটেন্ট মডারেশন — প্ল্যাটফর্মকে নিরাপদ রাখুন।",
              badge: { label: "মডারেটর প্যানেল" },
              gradient: "from-purple-500 via-violet-600 to-purple-700",
            }}
          >
            {(activeTab) => {
              if (activeTab === "reviews") return (
                <div className="p-4">
                  {loading ? (
                    <div className="py-12 text-center text-muted-foreground">লোড হচ্ছে...</div>
                  ) : (
                    <>
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                        <div className="flex flex-wrap gap-1.5">
                          {["all", "5", "4", "3", "2", "1"].map(v => (
                            <button key={v} onClick={() => setFilterRating(v)}
                              className={`rounded-lg px-3 py-1.5 text-[11px] font-medium transition-colors ${filterRating === v ? "bg-primary text-primary-foreground" : "border border-border text-foreground hover:bg-secondary"}`}>
                              {v === "all" ? `সব (${reviews.length})` : `${v} ⭐ (${reviews.filter(r => r.rating === parseInt(v)).length})`}
                            </button>
                          ))}
                        </div>
                        <button onClick={exportReviewsCSV} className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-[11px] font-medium text-foreground hover:bg-secondary">
                          <Download className="h-3.5 w-3.5" /> CSV
                        </button>
                      </div>
                      {stats.lowRatingCount > 0 && (
                        <div className="mb-4 flex items-center gap-2 rounded-xl border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-900/40 dark:bg-yellow-900/10">
                          <AlertTriangle className="h-4 w-4 text-yellow-600 shrink-0" />
                          <p className="text-xs text-yellow-800 dark:text-yellow-200">
                            <span className="font-semibold">{stats.lowRatingCount}টি</span> রিভিউতে ≤2 রেটিং — মনোযোগ প্রয়োজন
                          </p>
                        </div>
                      )}
                      <div className="space-y-2">
                        {filteredReviews.length === 0 ? (
                          <div className="text-center py-12"><Star className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" /><p className="text-muted-foreground text-sm">কোনো রিভিউ নেই</p></div>
                        ) : filteredReviews.map((r, i) => (
                          <motion.div key={r.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
                            className={`rounded-xl border bg-card p-3 ${r.rating <= 2 ? "border-red-200 dark:border-red-900/40" : "border-border"}`}>
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="text-sm font-medium text-foreground">{r.reviewer_name}</p>
                                  <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-muted-foreground">{r.service_slug}</span>
                                </div>
                                <div className="flex items-center gap-0.5 mt-1">
                                  {Array.from({ length: 5 }).map((_, idx) => (
                                    <Star key={idx} className={`h-3 w-3 ${idx < r.rating ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground/20"}`} />
                                  ))}
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className="text-[10px] text-muted-foreground">{new Date(r.created_at).toLocaleDateString("bn-BD")}</span>
                                <button onClick={() => deleteReview(r.id)} className="rounded-lg p-1.5 text-destructive hover:bg-destructive/10 transition-colors" title="মুছুন">
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                            {r.comment && <p className="text-xs text-foreground mt-2 bg-secondary/50 rounded-lg p-2.5 leading-relaxed">{r.comment}</p>}
                          </motion.div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              );
              if (activeTab === "messages") return (
                <div className="p-4">
                  {loading ? (
                    <div className="py-12 text-center text-muted-foreground">লোড হচ্ছে...</div>
                  ) : messages.length === 0 ? (
                    <div className="text-center py-12"><MessageSquare className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" /><p className="text-muted-foreground text-sm">কোনো মেসেজ নেই</p></div>
                  ) : (
                    <div className="space-y-2">
                      {messages.map((m, i) => (
                        <motion.div key={m.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
                          className="rounded-xl border border-border bg-card p-3 cursor-pointer hover:border-primary/30 transition-colors"
                          onClick={() => setExpandedMsg(expandedMsg === m.id ? null : m.id)}>
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground">{m.name}</p>
                              <p className="text-xs text-muted-foreground truncate">{m.email}{m.phone ? ` • ${m.phone}` : ""}</p>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="text-[10px] text-muted-foreground">{new Date(m.created_at).toLocaleDateString("bn-BD")}</span>
                              <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                            </div>
                          </div>
                          <p className={`text-xs text-foreground mt-2 bg-secondary/50 rounded-lg p-2.5 leading-relaxed ${expandedMsg !== m.id ? "line-clamp-2" : ""}`}>
                            {m.message}
                          </p>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              );
              if (activeTab === "images") return <div className="p-4"><ServiceImageManager /></div>;
              return null;
            }}
          </PanelSidebarTabs>
        </div>
      </div>

      
      <div className="h-16 md:hidden" />
    </div>
  );
};

export default ModeratorPanel;

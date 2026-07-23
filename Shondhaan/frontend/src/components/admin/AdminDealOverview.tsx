import { useState, useEffect, useCallback } from "react";
import { Handshake, AlertTriangle, Eye, CheckCircle, Ban, Search, RefreshCw, Flag } from "lucide-react";
import { motion } from "framer-motion";

// Same base URL / helper convention as AdminDealManagement.tsx
const API_BASE = "http://localhost:4000/api";

async function apiFetch(path: string, options?: RequestInit) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || `Request failed (${res.status})`);
  return data;
}

const AdminDealOverview = () => {
  const [listings, setListings] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, active: 0, sold: 0, pending: 0, reported: 0, totalViews: 0 });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [tab, setTab] = useState<"listings" | "reports">("listings");
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [listData, reportData] = await Promise.all([
        apiFetch(`/deal/listings`),
        apiFetch(`/deal/reports`),
      ]);

      let all: any[] = listData.data || listData;
      all = [...all].sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
      let allReports: any[] = reportData.data || reportData;

      // API doesn't embed the listing title on the report the way the old
      // Supabase `select("*, deal_listings(title)")` did, so stitch it in
      // client-side from the listings we just fetched.
      const listingMap = new Map(all.map((l: any) => [l.id, l]));
      allReports = allReports.map((r: any) => ({
        ...r,
        deal_listings: r.deal_listings || (listingMap.has(r.listing_id) ? { title: listingMap.get(r.listing_id).title } : null),
      }));

      setListings(all);
      setReports(allReports);
      setStats({
        total: all.length,
        active: all.filter(l => l.status === "active").length,
        sold: all.filter(l => l.status === "sold").length,
        pending: all.filter(l => l.status === "pending").length,
        reported: allReports.filter(r => r.status === "pending").length,
        totalViews: all.reduce((sum, l) => sum + (l.views_count || 0), 0),
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleListingStatus = async (id: string, status: string) => {
    try {
      await apiFetch(`/deal/listings/${id}`, { method: "PUT", body: JSON.stringify({ status }) });
      setListings(prev => prev.map(l => l.id === id ? { ...l, status } : l));
    } catch (err) {
      console.error(err);
    }
  };

  const handleReportResolve = async (id: string, adminNote: string) => {
    try {
      await apiFetch(`/deal/reports/${id}`, {
        method: "PUT",
        body: JSON.stringify({ status: "resolved", admin_note: adminNote, resolved_at: new Date().toISOString() }),
      });
      setReports(prev => prev.map(r => r.id === id ? { ...r, status: "resolved" } : r));
    } catch (err) {
      console.error(err);
    }
  };

  const filteredListings = listings
    .filter(l => statusFilter === "all" || l.status === statusFilter)
    .filter(l => !search || l.title?.toLowerCase().includes(search.toLowerCase()));

  const statCards = [
    { label: "মোট বিজ্ঞাপন", value: stats.total, icon: Handshake, color: "text-primary", bg: "bg-primary/10" },
    { label: "অ্যাক্টিভ", value: stats.active, icon: CheckCircle, color: "text-green-600", bg: "bg-green-500/10" },
    { label: "বিক্রিত", value: stats.sold, icon: Eye, color: "text-blue-600", bg: "bg-blue-500/10" },
    { label: "অপেক্ষমাণ", value: stats.pending, icon: AlertTriangle, color: "text-yellow-600", bg: "bg-yellow-500/10" },
    { label: "রিপোর্ট", value: stats.reported, icon: Flag, color: "text-red-600", bg: "bg-red-500/10" },
    { label: "মোট ভিউ", value: stats.totalViews.toLocaleString("bn-BD"), icon: Eye, color: "text-indigo-600", bg: "bg-indigo-500/10" },
  ];

  if (loading) return <div className="py-8 text-center text-muted-foreground">লোড হচ্ছে...</div>;

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-heading text-lg font-bold text-foreground flex items-center gap-2">
          <Handshake className="h-5 w-5 text-primary" /> ইয়েস ডিল ম্যানেজমেন্ট
        </h3>
        <button onClick={fetchData} className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium text-foreground hover:bg-secondary">
          <RefreshCw className="h-3.5 w-3.5" /> রিফ্রেশ
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {statCards.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
            className="rounded-xl border border-border bg-card p-3 shadow-sm">
            <div className="flex items-center gap-3">
              <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${s.bg}`}>
                <s.icon className={`h-4 w-4 ${s.color}`} />
              </div>
              <div>
                <p className="text-lg font-bold text-foreground">{s.value}</p>
                <p className="text-[10px] text-muted-foreground">{s.label}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="flex gap-2 border-b border-border pb-2">
        <button onClick={() => setTab("listings")}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${tab === "listings" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"}`}>
          বিজ্ঞাপন ({stats.total})
        </button>
        <button onClick={() => setTab("reports")}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${tab === "reports" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"}`}>
          রিপোর্ট ({stats.reported})
        </button>
      </div>

      {tab === "listings" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="বিজ্ঞাপন খুঁজুন..."
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-input bg-background text-sm outline-none focus:ring-1 focus:ring-ring" />
            </div>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              className="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none">
              <option value="all">সব</option>
              <option value="active">অ্যাক্টিভ</option>
              <option value="pending">অপেক্ষমাণ</option>
              <option value="sold">বিক্রিত</option>
              <option value="inactive">নিষ্ক্রিয়</option>
            </select>
          </div>

          {filteredListings.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">কোনো বিজ্ঞাপন পাওয়া যায়নি</div>
          ) : (
            <div className="space-y-3">
              {filteredListings.slice(0, 50).map(l => {
                const images = Array.isArray(l.images) ? l.images : [];
                return (
                  <div key={l.id} className="rounded-xl border border-border bg-card p-4 shadow-sm">
                    <div className="flex gap-3">
                      {images[0] && (
                        <img src={images[0] as string} alt="" className="h-16 w-16 rounded-lg object-cover shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold text-foreground truncate">{l.title}</p>
                            <p className="text-xs text-primary font-bold">৳{l.price.toLocaleString("bn-BD")}</p>
                          </div>
                          <select value={l.status} onChange={e => handleListingStatus(l.id, e.target.value)}
                            className="rounded-lg border border-input bg-background px-2 py-1 text-xs outline-none">
                            <option value="active">অ্যাক্টিভ</option>
                            <option value="pending">অপেক্ষমাণ</option>
                            <option value="sold">বিক্রিত</option>
                            <option value="inactive">নিষ্ক্রিয়</option>
                          </select>
                        </div>
                        <div className="mt-1 flex gap-3 text-[10px] text-muted-foreground">
                          <span>{l.location_division} • {l.location_district}</span>
                          <span>👀 {l.views_count || 0}</span>
                          <span>{new Date(l.created_at).toLocaleDateString("bn-BD")}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {tab === "reports" && (
        <div className="space-y-3">
          {reports.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">কোনো রিপোর্ট নেই</div>
          ) : reports.map(r => (
            <div key={r.id} className={`rounded-xl border p-4 shadow-sm ${r.status === "pending" ? "border-red-200 bg-red-50/50 dark:border-red-900 dark:bg-red-950/20" : "border-border bg-card"}`}>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <p className="text-sm font-semibold text-foreground">{r.deal_listings?.title || "বিজ্ঞাপন"}</p>
                  <p className="text-xs text-red-600 font-medium">কারণ: {r.reason}</p>
                  {r.details && <p className="text-xs text-muted-foreground mt-0.5">{r.details}</p>}
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${r.status === "pending" ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"}`}>
                  {r.status === "pending" ? "অমীমাংসিত" : "সমাধান"}
                </span>
              </div>
              {r.status === "pending" && (
                <div className="flex gap-2 mt-2">
                  <button onClick={() => handleReportResolve(r.id, "পর্যালোচনা করা হয়েছে")}
                    className="rounded-lg bg-green-100 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-200">
                    সমাধান করুন
                  </button>
                  <button onClick={() => { handleReportResolve(r.id, "বিজ্ঞাপন সরানো হয়েছে"); handleListingStatus(r.listing_id, "inactive"); }}
                    className="rounded-lg bg-red-100 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-200">
                    বিজ্ঞাপন সরান
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminDealOverview;
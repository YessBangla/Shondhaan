import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  TrendingUp, TrendingDown, Calendar, DollarSign, Users, Inbox, LifeBuoy,
  AlertTriangle, CheckCircle2, Sparkles, ArrowUpRight, Activity, Clock,
  ShieldCheck, Wallet, ScrollText, RefreshCw,
  Briefcase, Tag, Wrench, ShoppingCart
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type Snapshot = {
  snapshot_date: string;
  new_bookings: number;
  completed_bookings: number;
  cancelled_bookings: number;
  total_revenue: number;
  new_users: number;
  new_deals: number;
  open_disputes: number;
  pending_approvals: number;
};

type Alert = {
  type: string; label: string; count: number; href: string; tone: "amber" | "rose" | "sky" | "orange";
};

type TabId = "jobs" | "deals" | "service" | "mart";

// Map your API endpoints based on the active tab
const apiBaseUrls: Record<TabId, string> = {
  service: "http://localhost:3000/api/bookings",
  jobs: "http://localhost:3000/api/jobs", // Change if your jobs endpoint is different
  deals: "http://localhost:3000/api/deals", // Change if your deals endpoint is different
  mart: "http://localhost:3000/api/mart-products" // Change if your mart endpoint is different
};

// Safe API fetcher wrapper
const apiFetch = async (url: string) => {
  const res = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      // Add your auth headers here if needed, e.g., Authorization: `Bearer ${token}`
    },
  });

  // Prevent crashes if the server returns an HTML page (like a 404) instead of JSON
  const contentType = res.headers.get("content-type");
  if (!contentType || !contentType.includes("application/json")) {
    console.warn(`Non-JSON response from ${url}`);
    return null; 
  }

  if (!res.ok) throw new Error(`API Error: ${res.status}`);
  return res.json();
};

interface AdminSmartDashboardProps {
  defaultTab?: TabId;
}

const AdminSmartDashboard = ({ defaultTab = "service" }: AdminSmartDashboardProps) => {
  const [activeTab, setActiveTab] = useState<TabId>(defaultTab);
  const [today, setToday] = useState<Snapshot | null>(null);
  const [history, setHistory] = useState<Snapshot[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [now, setNow] = useState(() => new Date());

  const tabs = [
    { id: "service" as TabId, label: "Service", icon: Wrench },
    { id: "jobs" as TabId, label: "Jobs", icon: Briefcase },
    { id: "deals" as TabId, label: "Deals", icon: Tag },
    { id: "mart" as TabId, label: "Mart", icon: ShoppingCart },
  ];

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const load = async (category: TabId) => {
    setLoading(true);
    try {
      const baseApiUrl = apiBaseUrls[category];

      // Fetch the main data for the active tab (e.g. /api/bookings)
      // Assuming this endpoint returns an array of items or snapshots. 
      // Adjust the URL below if you have a specific stats endpoint like /api/bookings/stats
      const mainDataRes = await apiFetch(`${baseApiUrl}?status=pending&count=true`);
      const pendingBookings = mainDataRes?.count ?? 0;

      // If you have a snapshots endpoint, define it here. Otherwise, we mock it empty for now.
      // Example: const snapsData = await apiFetch(`http://localhost:3000/api/snapshots?limit=7&category=${category}`);
      // For now, we leave history empty so the chart shows "Not enough data" until you connect the stats API
      const snapsData = null; 
      const all = (Array.isArray(snapsData) ? snapsData : snapsData?.data ?? []) as Snapshot[];
      
      setToday(all[0] ?? null);
      setHistory(all.slice().reverse());

      // Fetch alert counts concurrently
      // Using catch(() => ({ count: 0 })) so if an alert endpoint doesn't exist, it just shows 0
      const [
        approvalsRes, 
        disputesRes, 
        lowStockRes
      ] = await Promise.all([
        apiFetch(`http://localhost:3000/api/approval-queue?status=pending&count=true&category=${category}`).catch(() => ({ count: 0 })),
        apiFetch(`http://localhost:3000/api/disputes?status=open,in_progress,escalated&count=true&category=${category}`).catch(() => ({ count: 0 })),
        apiFetch(`http://localhost:3000/api/mart-products?low_stock=true&count=true&category=${category}`).catch(() => ({ count: 0 })),
      ]);

      const pendingApprovals = approvalsRes?.count ?? 0;
      const openDisputes = disputesRes?.count ?? 0;
      const lowStockProducts = lowStockRes?.count ?? 0;

      const list: Alert[] = [];
      if (pendingApprovals > 0) list.push({ type: "approval", label: "অপেক্ষমাণ অনুমোদন", count: pendingApprovals, href: "/admin/approval-queue", tone: "amber" });
      if (openDisputes > 0) list.push({ type: "dispute", label: "খোলা অভিযোগ", count: openDisputes, href: "/admin/disputes", tone: "rose" });
      if (pendingBookings > 0) list.push({ type: "booking", label: "অপেক্ষমাণ বুকিং", count: pendingBookings, href: "/admin/bookings", tone: "sky" });
      if (lowStockProducts > 0) list.push({ type: "stock", label: "কম স্টক প্রোডাক্ট", count: lowStockProducts, href: "/admin/mart-overview", tone: "orange" });
      
      setAlerts(list);
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Reload data whenever the active tab changes
  useEffect(() => {
    load(activeTab);
  }, [activeTab]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await load(activeTab);
  };

  const trend = (key: keyof Snapshot) => {
    if (history.length < 2 || !today) return 0;
    const prev = history[history.length - 2]?.[key] as number;
    const curr = today[key] as number;
    if (!prev) return 0;
    return Math.round(((curr - prev) / prev) * 100);
  };

  const stats = today
    ? [
        { label: "আজকের নতুন বুকিং", key: "new_bookings", value: today.new_bookings, icon: Calendar, color: "sky", t: trend("new_bookings") },
        { label: "আজকের রেভিনিউ", key: "total_revenue", value: `৳${(today.total_revenue ?? 0).toLocaleString("bn-BD")}`, icon: DollarSign, color: "emerald", t: trend("total_revenue") },
        { label: "নতুন ইউজার", key: "new_users", value: today.new_users, icon: Users, color: "violet", t: trend("new_users") },
        { label: "সম্পন্ন বুকিং", key: "completed_bookings", value: today.completed_bookings, icon: CheckCircle2, color: "amber", t: trend("completed_bookings") },
      ]
    : [];

  const tones: Record<Alert["tone"], { bg: string; ring: string; text: string; dot: string; icon: any }> = {
    amber: { bg: "bg-amber-50 dark:bg-amber-500/10", ring: "ring-amber-500/30", text: "text-amber-700 dark:text-amber-300", dot: "bg-amber-500", icon: Inbox },
    rose:  { bg: "bg-rose-50 dark:bg-rose-500/10", ring: "ring-rose-500/30", text: "text-rose-700 dark:text-rose-300", dot: "bg-rose-500", icon: LifeBuoy },
    sky:   { bg: "bg-sky-50 dark:bg-sky-500/10",  ring: "ring-sky-500/30", text: "text-sky-700 dark:text-sky-300",  dot: "bg-sky-500", icon: Calendar },
    orange:{ bg: "bg-orange-50 dark:bg-orange-500/10", ring: "ring-orange-500/30", text: "text-orange-700 dark:text-orange-300", dot: "bg-orange-500", icon: AlertTriangle },
  };

  const accentMap: Record<string, { from: string; to: string; soft: string; text: string }> = {
    sky:     { from: "from-sky-500", to: "to-blue-600", soft: "bg-sky-500/10", text: "text-sky-600" },
    emerald: { from: "from-emerald-500", to: "to-green-600", soft: "bg-emerald-500/10", text: "text-emerald-600" },
    violet:  { from: "from-violet-500", to: "to-purple-600", soft: "bg-violet-500/10", text: "text-violet-600" },
    amber:   { from: "from-amber-500", to: "to-orange-600", soft: "bg-amber-500/10", text: "text-amber-600" },
  };

  const chartData = useMemo(
    () =>
      history.map((h) => ({
        date: new Date(h.snapshot_date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        bookings: h.new_bookings || 0,
        revenue: Number(h.total_revenue || 0),
      })),
    [history]
  );

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-12 rounded-2xl bg-muted/40 animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[0,1,2,3].map((i) => <div key={i} className="h-28 rounded-2xl bg-muted/40 animate-pulse" />)}
        </div>
        <div className="h-72 rounded-2xl bg-muted/40 animate-pulse" />
      </div>
    );
  }
  
  return (
    <div className="space-y-5">
      {/* === CATEGORY TABS === */}
      <div className="flex items-center gap-2 p-1 bg-muted/40 rounded-xl border border-border/60 w-full md:w-fit overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex-1 md:flex-none inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap",
              activeTab === tab.id 
                ? "bg-card text-foreground shadow-sm border border-border/60" 
                : "text-muted-foreground hover:text-foreground hover:bg-card/50"
            )}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* === KPI CARDS === */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {stats.map((s, i) => {
          const acc = accentMap[s.color];
          const sparkData = history.map((h) => ({ v: Number(h[s.key as keyof Snapshot] || 0) }));
          const positive = s.t >= 0;
          return (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: i * 0.05 }}
              className="relative overflow-hidden rounded-2xl border border-border/60 bg-card p-4 hover:shadow-md hover:border-border transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <div className={cn("h-9 w-9 rounded-xl flex items-center justify-center", acc.soft)}>
                  <s.icon className={cn("h-4 w-4", acc.text)} />
                </div>
                {s.t !== 0 && (
                  <span
                    className={cn(
                      "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                      positive ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-600"
                    )}
                  >
                    {positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {Math.abs(s.t)}%
                  </span>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground font-medium">{s.label}</p>
              <p className="text-2xl font-bold tracking-tight text-foreground mt-1">{s.value}</p>
              {/* sparkline */}
              {sparkData.length > 1 && (
                <div className="h-8 -mx-1 mt-2 opacity-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={sparkData} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
                      <defs>
                        <linearGradient id={`spark-${s.color}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="currentColor" stopOpacity={0.4} />
                          <stop offset="100%" stopColor="currentColor" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <Area
                        type="monotone" dataKey="v" stroke="currentColor" strokeWidth={1.5}
                        fill={`url(#spark-${s.color})`} className={acc.text} isAnimationActive={false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* === ALERTS + CHART (2-COL) === */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Trend chart */}
        <div className="lg:col-span-2 rounded-2xl border border-border/60 bg-card p-4 md:p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-foreground capitalize">{activeTab} - গত ৭ দিনের পারফরম্যান্স</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">নতুন বুকিং vs রেভিনিউ</p>
            </div>
            <div className="flex items-center gap-3 text-[11px]">
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-primary" /> বুকিং</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500" /> রেভিনিউ</span>
            </div>
          </div>
          <div className="h-56">
            {chartData.length > 1 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 5, right: 10, bottom: 0, left: -20 }}>
                  <defs>
                    <linearGradient id="g-bookings" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="g-revenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="rgb(16,185,129)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="rgb(16,185,129)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 12, fontSize: 11, padding: "8px 10px",
                    }}
                  />
                  <Area type="monotone" dataKey="bookings" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#g-bookings)" />
                  <Area type="monotone" dataKey="revenue" stroke="rgb(16,185,129)" strokeWidth={2} fill="url(#g-revenue)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                পর্যাপ্ত ডাটা নেই — কাল আবার দেখুন।
              </div>
            )}
          </div>
        </div>

        {/* Priority alerts */}
        <div className="rounded-2xl border border-border/60 bg-card p-4 md:p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
              </div>
              <h3 className="text-sm font-bold text-foreground">প্রায়োরিটি অ্যালার্ট</h3>
            </div>
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">{alerts.length}</span>
          </div>
          {alerts.length === 0 ? (
            <div className="py-10 text-center">
              <div className="h-12 w-12 rounded-full bg-emerald-500/10 mx-auto flex items-center justify-center mb-2">
                <CheckCircle2 className="h-6 w-6 text-emerald-500" />
              </div>
              <p className="text-sm font-medium text-foreground">সবকিছু ঠিকঠাক</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">এই মুহূর্তে কোনো জরুরি অ্যালার্ট নেই।</p>
            </div>
          ) : (
            <div className="space-y-2">
              {alerts.map((a) => {
                const t = tones[a.tone];
                const Ico = t.icon;
                return (
                  <Link
                    key={a.type}
                    to={a.href}
                    className={cn(
                      "group flex items-center gap-3 rounded-xl px-3 py-2.5 ring-1 transition-all hover:translate-x-0.5",
                      t.bg, t.ring
                    )}
                  >
                    <div className={cn("h-8 w-8 shrink-0 rounded-lg flex items-center justify-center bg-card/70", t.text)}>
                      <Ico className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-semibold text-foreground truncate">{a.label}</p>
                      <p className="text-[10px] text-muted-foreground">এখনই দেখুন →</p>
                    </div>
                    <span className={cn("text-base font-bold tabular-nums", t.text)}>{a.count}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* === QUICK ACTIONS === */}
      <div>
        <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" /> দ্রুত একশন
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { to: "/admin/approval-queue", icon: Inbox, label: "অনুমোদন কিউ", desc: "অপেক্ষমাণ আইটেম", tint: "text-sky-600 bg-sky-500/10" },
            { to: "/admin/disputes", icon: LifeBuoy, label: "অভিযোগ", desc: "সমাধান প্রয়োজন", tint: "text-rose-600 bg-rose-500/10" },
            { to: "/admin/payment-ledger", icon: Wallet, label: "পেমেন্ট লেজার", desc: "লেনদেন ট্র্যাক", tint: "text-emerald-600 bg-emerald-500/10" },
            { to: "/admin/audit-logs", icon: ScrollText, label: "অডিট লগ", desc: "সিস্টেম অ্যাক্টিভিটি", tint: "text-violet-600 bg-violet-500/10" },
          ].map((q) => (
            <Link
              key={q.to}
              to={q.to}
              className="group rounded-2xl border border-border/60 bg-card p-3.5 hover:border-primary/40 hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between mb-2">
                <div className={cn("h-9 w-9 rounded-xl flex items-center justify-center", q.tint)}>
                  <q.icon className="h-4 w-4" />
                </div>
                <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-transform" />
              </div>
              <p className="text-[13px] font-semibold text-foreground">{q.label}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{q.desc}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* === FOOTER STAT STRIP === */}
      {today && (
        <div className="rounded-2xl border border-border/60 bg-gradient-to-r from-muted/30 via-card to-muted/30 p-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          {[
            { label: "মোট নতুন ডিল", value: today.new_deals ?? 0, icon: TrendingUp },
            { label: "বাতিল বুকিং", value: today.cancelled_bookings ?? 0, icon: Calendar },
            { label: "খোলা অভিযোগ", value: today.open_disputes ?? 0, icon: LifeBuoy },
            { label: "অপেক্ষমাণ অনুমোদন", value: today.pending_approvals ?? 0, icon: ShieldCheck },
          ].map((m) => (
            <div key={m.label} className="flex items-center gap-2.5 justify-center md:justify-start">
              <div className="h-8 w-8 rounded-lg bg-card flex items-center justify-center text-muted-foreground border border-border/60">
                <m.icon className="h-3.5 w-3.5" />
              </div>
              <div className="text-left">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{m.label}</p>
                <p className="text-base font-bold text-foreground tabular-nums">{m.value}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminSmartDashboard;
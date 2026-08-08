import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  TrendingUp, TrendingDown, Wallet, ShoppingBag, Users, AlertTriangle,
  Activity, ArrowUpRight, Sparkles, Crown, Zap,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { INDIVIDUAL_API_BASE_URL } from "@/lib/api";
import NeedsAttentionWidget from "@/components/admin/NeedsAttentionWidget";
import DateRangeToggle, { DateRange } from "@/components/admin/DateRangeToggle";
import LiveActivityFeed from "@/components/admin/LiveActivityFeed";
import SavedFiltersMenu from "@/components/admin/SavedFiltersMenu";

// Convert latin digits to Bengali numerals for a localized feel
const toBn = (n: number | string) => String(n).replace(/[0-9]/g, (d) => "০১২৩৪৫৬৭৮৯"[Number(d)]);
const fmtCurrency = (n: number) => `৳${toBn(Math.round(n).toLocaleString("en-US"))}`;

interface KPI {
  key: string;
  label: string;
  value: string;
  delta?: number;
  icon: React.ReactNode;
  gradient: string;
  ring: string;
}

interface DailyPoint {
  date: string;
  revenue: number;
  bookings: number;
}

interface ActivityItem {
  id: string;
  title: string;
  meta: string;
  type: "booking" | "user" | "deal" | "alert";
  ts: string;
}

const SuperAdminOverview = () => {
  const [kpis, setKpis] = useState<KPI[]>([]);
  const [series, setSeries] = useState<DailyPoint[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [topServices, setTopServices] = useState<{ title: string; orders: number; revenue: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<DateRange>("today");
  const [totalUsers, setTotalUsers] = useState(0);
  const [openDisputes, setOpenDisputes] = useState(0);
  const [todayBookingsCount, setTodayBookingsCount] = useState(0);
  const [todayRevenueAmount, setTodayRevenueAmount] = useState(0);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        // 30-day snapshot range
        const from = new Date();
        from.setDate(from.getDate() - 29);
        const fromIso = from.toISOString().slice(0, 10);

        const [snapsRes, todayBookingsRes, usersRes, disputesRes, recentBookingsRes, recentUsersRes, recentDealsRes, servicesRes] = await Promise.all([
          supabase.from("daily_stats_snapshot").select("snapshot_date,total_revenue,new_bookings,new_users,new_deals,open_disputes").gte("snapshot_date", fromIso).order("snapshot_date", { ascending: true }),
          supabase.from("bookings").select("id,package_price,status,created_at").gte("created_at", new Date(Date.now() - 24 * 3600 * 1000).toISOString()),
          supabase.from("profiles").select("user_id", { count: "exact", head: true }),
          supabase.from("disputes").select("id", { count: "exact", head: true }).in("status", ["open", "in_progress", "escalated"]),
          supabase.from("bookings").select("id,service_title,customer_name,package_price,status,created_at").order("created_at", { ascending: false }).limit(4),
          supabase.from("profiles").select("user_id,display_name,created_at").order("created_at", { ascending: false }).limit(3),
          supabase.from("deal_listings").select("id,title,price,created_at").order("created_at", { ascending: false }).limit(3),
          fetch(`${INDIVIDUAL_API_BASE_URL}/api/services`).then((res) => res.json()).catch(() => ({ data: [] })),
        ]);

        if (!alive) return;

        const snaps = snapsRes.data || [];
        const points: DailyPoint[] = snaps.map((s: any) => ({
          date: s.snapshot_date,
          revenue: Number(s.total_revenue) || 0,
          bookings: Number(s.new_bookings) || 0,
        }));

        // Pad series to last 14 days for a smooth chart even with sparse data
        const padded: DailyPoint[] = [];
        for (let i = 13; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          const key = d.toISOString().slice(0, 10);
          const found = points.find((p) => p.date === key);
          padded.push(found || { date: key, revenue: 0, bookings: 0 });
        }
        setSeries(padded);

        // Today vs yesterday delta from snapshots
        const last = snaps[snaps.length - 1];
        const prev = snaps[snaps.length - 2];
        const todayBookings = (todayBookingsRes.data || []).length;
        const todayRevenue = (todayBookingsRes.data || [])
          .filter((b: any) => b.status !== "cancelled")
          .reduce((s: number, b: any) => s + (Number(b.package_price) || 0), 0);
        const _totalUsers = usersRes.count || 0;
        const _openDisputes = disputesRes.count || 0;
        setTotalUsers(_totalUsers);
        setOpenDisputes(_openDisputes);
        setTodayBookingsCount(todayBookings);
        setTodayRevenueAmount(todayRevenue);

        const revenueDelta = prev?.total_revenue ? ((Number(last?.total_revenue || 0) - Number(prev.total_revenue)) / Number(prev.total_revenue)) * 100 : 0;
        const bookingsDelta = prev?.new_bookings ? ((Number(last?.new_bookings || 0) - Number(prev.new_bookings)) / Number(prev.new_bookings)) * 100 : 0;

        // KPI seed (today). Range-aware values are computed in useMemo below.
        setKpis([
          { key: "revenue",  label: "রেভিনিউ",       value: fmtCurrency(todayRevenue),                 delta: revenueDelta,  icon: <Wallet className="h-4 w-4" />,         gradient: "from-emerald-500 to-green-600", ring: "ring-emerald-500/20" },
          { key: "bookings", label: "বুকিং",         value: toBn(todayBookings),                       delta: bookingsDelta, icon: <ShoppingBag className="h-4 w-4" />,    gradient: "from-blue-500 to-indigo-600",   ring: "ring-blue-500/20" },
          { key: "users",    label: "মোট ইউজার",    value: toBn(_totalUsers.toLocaleString("en-US")),  icon: <Users className="h-4 w-4" />,                                gradient: "from-purple-500 to-violet-600", ring: "ring-purple-500/20" },
          { key: "alerts",   label: "খোলা অভিযোগ",  value: toBn(_openDisputes),                       icon: <AlertTriangle className="h-4 w-4" />,                        gradient: "from-amber-500 to-orange-600",  ring: "ring-amber-500/20" },
        ]);

        // Activity feed
        const acts: ActivityItem[] = [
          ...(recentBookingsRes.data || []).map((b: any) => ({
            id: `b-${b.id}`,
            title: `নতুন বুকিং: ${b.service_title}`,
            meta: `${b.customer_name} • ${fmtCurrency(b.package_price || 0)}`,
            type: "booking" as const,
            ts: b.created_at,
          })),
          ...(recentUsersRes.data || []).map((u: any) => ({
            id: `u-${u.user_id}`,
            title: `নতুন ইউজার: ${u.display_name || "অজানা"}`,
            meta: "প্রোফাইল তৈরি হয়েছে",
            type: "user" as const,
            ts: u.created_at,
          })),
          ...(recentDealsRes.data || []).map((d: any) => ({
            id: `d-${d.id}`,
            title: `নতুন ডিল: ${d.title}`,
            meta: fmtCurrency(d.price || 0),
            type: "deal" as const,
            ts: d.created_at,
          })),
        ].sort((a, b) => +new Date(b.ts) - +new Date(a.ts)).slice(0, 8);
        setActivity(acts);

        const serviceRows = (Array.isArray(servicesRes) ? servicesRes : servicesRes.data || servicesRes.services || [])
          .sort((a: any, b: any) => (Number(b.total_orders) || 0) - (Number(a.total_orders) || 0))
          .slice(0, 5);
        const tops = serviceRows.map((s: any) => ({
          title: s.title,
          orders: Number(s.total_orders) || 0,
          revenue: (Number(s.total_orders) || 0) * 1500, // rough estimate
        }));
        setTopServices(tops);
      } catch (e) {
        console.warn("[SuperAdminOverview] failed:", e);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  // Re-derive KPI values from series + range without re-querying.
  const rangedKpis = useMemo<KPI[]>(() => {
    if (!kpis.length) return kpis;
    const days = range === "today" ? 1 : range === "7d" ? 7 : 30;
    const slice = series.slice(-days);
    const half = slice.slice(0, Math.max(1, Math.floor(slice.length / 2)));
    const recent = slice.slice(-Math.max(1, Math.ceil(slice.length / 2)));
    const sumR = (arr: DailyPoint[]) => arr.reduce((s, p) => s + p.revenue, 0);
    const sumB = (arr: DailyPoint[]) => arr.reduce((s, p) => s + p.bookings, 0);
    const rangeRevenue = days === 1 ? todayRevenueAmount : sumR(slice);
    const rangeBookings = days === 1 ? todayBookingsCount : sumB(slice);
    const revDelta = days === 1 ? kpis[0]?.delta : (sumR(half) > 0 ? ((sumR(recent) - sumR(half)) / sumR(half)) * 100 : 0);
    const bkDelta  = days === 1 ? kpis[1]?.delta : (sumB(half) > 0 ? ((sumB(recent) - sumB(half)) / sumB(half)) * 100 : 0);
    const labelPrefix = range === "today" ? "আজকের" : range === "7d" ? "৭ দিনের" : "৩০ দিনের";
    return [
      { ...kpis[0], label: `${labelPrefix} রেভিনিউ`, value: fmtCurrency(rangeRevenue),  delta: revDelta },
      { ...kpis[1], label: `${labelPrefix} বুকিং`,    value: toBn(rangeBookings),         delta: bkDelta },
      kpis[2],
      kpis[3],
    ];
  }, [kpis, range, series, todayRevenueAmount, todayBookingsCount]);

  return (
    <div className="p-4 md:p-5 space-y-5">
      {/* === Premium gradient hero === */}
      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-primary via-emerald-600 to-teal-700 text-primary-foreground p-5 md:p-6 shadow-lg"
      >
        <div aria-hidden className="absolute inset-0 opacity-30" style={{
          backgroundImage:
            "radial-gradient(circle at 20% 0%, rgba(255,255,255,.35) 0, transparent 40%), radial-gradient(circle at 80% 100%, rgba(0,0,0,.25) 0, transparent 40%)",
        }} />
        <div className="relative flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0 flex-1">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur px-2.5 py-1 text-[10px] font-semibold mb-2.5 ring-1 ring-white/25">
              <Crown className="h-3 w-3" /> সুপার অ্যাডমিন কন্ট্রোল রুম
            </div>
            <h2 className="text-xl md:text-2xl font-heading font-bold leading-tight">
              স্বাগতম, পুরো সিস্টেম এক নজরে
            </h2>
            <p className="text-[13px] text-primary-foreground/85 mt-1.5 max-w-xl">
              রিয়েল-টাইম মেট্রিক, ট্রেন্ড, এবং প্রতিটি প্ল্যাটফর্মের অ্যাকটিভিটি — Linear-class কন্ট্রোল।
            </p>
            {/* <div className="flex items-center gap-1.5 mt-3 text-[11px] text-primary-foreground/85">
              <span className="inline-flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 animate-pulse" />
                লাইভ
              </span>
              <span className="opacity-60">•</span>
              <span>{toBn(new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }))}</span>
              <span className="opacity-60">•</span>
              <span>সব সিস্টেম স্বাভাবিক</span>
            </div> */}
          </div>
          <div className="hidden md:flex h-16 w-16 rounded-2xl bg-white/15 backdrop-blur items-center justify-center ring-1 ring-white/25 shrink-0">
            <Sparkles className="h-7 w-7" />
          </div>
        </div>
      </motion.div>

      {/* === Needs your attention === */}
      <NeedsAttentionWidget basePath="/super-admin" />

      {/* === KPI header with date range === */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-[14px] font-bold text-foreground leading-tight">মূল মেট্রিক</h3>
          <p className="text-[10.5px] text-muted-foreground leading-tight mt-0.5">নির্বাচিত সময়সীমার সারাংশ</p>
        </div>
        <div className="flex items-center gap-2">
          <SavedFiltersMenu<{ range: DateRange }>
            scope="super_admin_overview"
            currentState={{ range }}
            onApply={(s) => s?.range && setRange(s.range)}
            hasActiveFilters={range !== "today"}
          />
          <DateRangeToggle value={range} onChange={setRange} />
        </div>
      </div>

      {/* === KPI Strip === */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {(loading ? Array.from({ length: 4 }) : rangedKpis).map((k: any, i) => (
          <motion.div
            key={k?.key || i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className={cn(
              "group relative overflow-hidden rounded-2xl border border-border/60 bg-card p-3.5 shadow-sm hover:shadow-md transition-shadow",
              loading && "animate-pulse"
            )}
          >
            {!loading && (
              <>
                <div className="flex items-center justify-between">
                  <div className={cn("h-8 w-8 rounded-xl bg-gradient-to-br text-white flex items-center justify-center ring-1", k.gradient, k.ring)}>
                    {k.icon}
                  </div>
                  {typeof k.delta === "number" && k.delta !== 0 && (
                    <span className={cn(
                      "inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-md",
                      k.delta > 0 ? "bg-emerald-500/10 text-emerald-600" : "bg-red-500/10 text-red-600"
                    )}>
                      {k.delta > 0 ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
                      {toBn(Math.abs(k.delta).toFixed(1))}%
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground mt-2.5">{k.label}</p>
                <p className="text-lg md:text-xl font-bold text-foreground tabular-nums leading-tight">{k.value}</p>
                <div className={cn("absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity", k.gradient)} />
              </>
            )}
            {loading && <div className="h-16" />}
          </motion.div>
        ))}
      </div>

      {/* === Chart + Top services === */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Revenue trend */}
        <div className="lg:col-span-2 rounded-2xl border border-border/60 bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-bold text-foreground inline-flex items-center gap-1.5">
                <Activity className="h-4 w-4 text-primary" /> রেভিনিউ ও বুকিং ট্রেন্ড
              </h3>
              <p className="text-[10px] text-muted-foreground mt-0.5">গত ১৪ দিনের পারফরম্যান্স</p>
            </div>
            <span className="text-[10px] font-semibold text-primary bg-primary/10 px-2 py-1 rounded-md inline-flex items-center gap-1">
              <Zap className="h-2.5 w-2.5" /> লাইভ
            </span>
          </div>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  tickFormatter={(d) => toBn(new Date(d).getDate())}
                  axisLine={false} tickLine={false}
                />
                <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={40} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 12, fontSize: 11,
                  }}
                  labelFormatter={(d) => new Date(d).toLocaleDateString("bn-BD")}
                  formatter={(v: number, name) => [name === "revenue" ? fmtCurrency(v) : toBn(v), name === "revenue" ? "রেভিনিউ" : "বুকিং"]}
                />
                <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#rev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top services */}
        <div className="rounded-2xl border border-border/60 bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-foreground">টপ সার্ভিস</h3>
            <span className="text-[10px] text-muted-foreground">অর্ডার অনুসারে</span>
          </div>
          <div className="space-y-2">
            {(topServices.length ? topServices : Array.from({ length: 5 })).map((s: any, i) => (
              <div key={i} className="flex items-center gap-2.5 rounded-xl bg-secondary/40 px-2.5 py-2">
                <div className={cn(
                  "h-7 w-7 rounded-lg flex items-center justify-center text-[11px] font-bold",
                  i === 0 ? "bg-gradient-to-br from-amber-400 to-orange-500 text-white" :
                  i === 1 ? "bg-gradient-to-br from-slate-300 to-slate-400 text-slate-900" :
                  i === 2 ? "bg-gradient-to-br from-orange-300 to-orange-500 text-white" :
                  "bg-secondary text-muted-foreground"
                )}>
                  {toBn(i + 1)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-semibold text-foreground truncate">{s?.title || "—"}</p>
                  <p className="text-[10px] text-muted-foreground">{toBn(s?.orders ?? 0)} অর্ডার</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* === Live activity (realtime) === */}
      <LiveActivityFeed />
    </div>
  );
};

function timeAgo(iso: string): string {
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return `${toBn(Math.floor(diff))} সেকেন্ড`;
  if (diff < 3600) return `${toBn(Math.floor(diff / 60))} মিনিট আগে`;
  if (diff < 86400) return `${toBn(Math.floor(diff / 3600))} ঘণ্টা আগে`;
  return `${toBn(Math.floor(diff / 86400))} দিন আগে`;
}

export default SuperAdminOverview;

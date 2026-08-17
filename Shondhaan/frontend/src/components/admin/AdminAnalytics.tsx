import { useState, useEffect, useCallback, useMemo } from "react";
import { getMySqlAuth } from "@/lib/mysqlAuth";
import { useAuth } from "@/contexts/AuthContext";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, AreaChart, Area, ReferenceLine
} from "recharts";
import { RefreshCw, TrendingUp, DollarSign, ShoppingCart, MapPin, Users, Calendar, ArrowUpRight, ArrowDownRight, Wallet, Receipt, Download, Package, Handshake, Eye, Briefcase, UserCheck, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

interface PackageDef {
  id: number;
  name: string;
  price: number;
  is_active: number;
}

interface Booking {
  id: string;
  created_at: string;
  package_price: number;
  status: string;
  service_title: string;
  customer_address: string;
  is_emergency: boolean;
}

interface ServiceRequest {
  id: string;
  created_at: string;
  division: string;
  district: string;
  status: string;
  payment_amount: number;
  payment_status: string;
  commission_amount: number;
  rep_earning: number;
  assigned_rep_id: string | null;
}

interface RepEarning {
  id: string;
  created_at: string;
  total_amount: number;
  commission_amount: number;
  rep_earning: number;
  receipt_number: string;
  rep_id: string;
}

interface AreaRep {
  id: string;
  name: string;
  user_id: string;
}

interface MartOrder {
  id: string;
  created_at: string;
  total: number;
  subtotal: number;
  status: string;
  payment_method: string;
  payment_status: string;
  shipping_division: string | null;
}

interface DealListingStat {
  id: string;
  created_at: string | null;
  status: string | null;
  views_count: number | null;
  inquiries_count: number | null;
  is_featured: boolean | null;
  price: number;
}

interface PackageTransaction {
  id: number;
  package_id: number;
  amount: number;
  status: string;
  created_at: string;
  employer_user_id: number;
  package_name: string | null;
}

interface JobProfileRecord {
  id: number;
  created_at: string;
}

interface JobStatsResponse {
  packageTransactions: PackageTransaction[];
  jobseekerProfiles: JobProfileRecord[];
  employerProfiles: JobProfileRecord[];
}

const JOBS_API_URL = (import.meta.env.VITE_JOBS_API_URL || "http://localhost:5050").replace(/\/+$/, "");

const COLORS = [
  "hsl(var(--primary))", "hsl(142, 71%, 45%)", "hsl(38, 92%, 50%)",
  "hsl(0, 84%, 60%)", "hsl(262, 83%, 58%)", "hsl(199, 89%, 48%)",
  "hsl(330, 81%, 60%)", "hsl(172, 66%, 50%)"
];

const statusLabels: Record<string, string> = {
  pending: "অপেক্ষমাণ", confirmed: "নিশ্চিত", completed: "সম্পন্ন",
  cancelled: "বাতিল", contacted: "যোগাযোগ", resolved: "সমাধান", rejected: "বাতিল",
  processing: "প্রসেসিং", shipped: "শিপড", delivered: "ডেলিভার্ড",
  active: "সক্রিয়", sold: "বিক্রিত", expired: "মেয়াদোত্তীর্ণ",
  success: "সফল", failed: "ব্যর্থ"
};

const bnMonths = ["জানু", "ফেব্রু", "মার্চ", "এপ্রিল", "মে", "জুন", "জুলাই", "আগ", "সেপ্টে", "অক্টো", "নভে", "ডিসে"];

function toBnNum(n: number): string {
  return n.toLocaleString("bn-BD");
}

function exportCSV(data: Record<string, any>[], filename: string) {
  if (!data.length) { toast.error("এক্সপোর্টের জন্য কোনো ডেটা নেই"); return; }
  const headers = Object.keys(data[0]);
  const csv = "\uFEFF" + headers.join(",") + "\n" + data.map(row => headers.map(h => `"${row[h] ?? ""}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  toast.success("CSV ফাইল ডাউনলোড হচ্ছে");
}

const AdminAnalytics = () => {
  const { user } = useAuth();
  const mysqlRole = getMySqlAuth()?.user?.type;
  const isServiceAdmin =
    mysqlRole === "service_admin" ||
    user?.user_metadata?.role === "service_admin" ||
    user?.role === "service_admin";

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [repEarnings, setRepEarnings] = useState<RepEarning[]>([]);
  const [areaReps, setAreaReps] = useState<AreaRep[]>([]);
  const [martOrders, setMartOrders] = useState<MartOrder[]>([]);
  const [dealListings, setDealListings] = useState<DealListingStat[]>([]);
  const [packageTransactions, setPackageTransactions] = useState<PackageTransaction[]>([]);
  const [jobseekerProfiles, setJobseekerProfiles] = useState<JobProfileRecord[]>([]);
  const [employerProfiles, setEmployerProfiles] = useState<JobProfileRecord[]>([]);
  const [packagesCatalog, setPackagesCatalog] = useState<PackageDef[]>([]);
  const [jobStatsError, setJobStatsError] = useState<string | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<"7d" | "30d" | "6m" | "1y">("30d");

  // New state to hold data directly from the chart endpoints
  const [stats, setStats] = useState({
    totalRevenue: 0, totalBookings: 0, totalRequests: 0, emergencyCount: 0,
    revenueGrowth: 0, bookingGrowth: 0
  });
  const [revenueTrendData, setRevenueTrendData] = useState<any[]>([]);

  const highestPackage = useMemo(() => {
    const active = packagesCatalog.filter(p => p.is_active === 1 || p.is_active === undefined);
    if (active.length === 0) return null;
    return active.reduce((max, p) => (p.price > max.price ? p : max), active[0]);
  }, [packagesCatalog]);

  const fetchData = useCallback(async (currentPeriod: string) => {
    setLoading(true);
    try {
      // 1. Fetch Service Admin Dashboard Data from REST API
      const base = "http://localhost:3000/api/service-admin/dashboard";
      const [statsRes, recentRes, bChartRes, rChartRes] = await Promise.all([
        fetch(`${base}/stats?period=${currentPeriod}`).then(r => r.json()).catch(() => null),
        fetch(`${base}/recent-bookings?period=${currentPeriod}`).then(r => r.json()).catch(() => []),
        fetch(`${base}/booking-chart?period=${currentPeriod}`).then(r => r.json()).catch(() => []),
        fetch(`${base}/revenue-chart?period=${currentPeriod}`).then(r => r.json()).catch(() => []),
      ]);

      // Map Stats
      const s = statsRes?.data || statsRes;
      if (s) {
        setStats({
          totalRevenue: s.totalRevenue ?? 0,
          totalBookings: s.totalBookings ?? 0,
          totalRequests: s.totalRequests ?? 0,
          emergencyCount: s.emergencyCount ?? 0,
          revenueGrowth: s.revenueGrowth ?? 0,
          bookingGrowth: s.bookingGrowth ?? 0,
        });
      }

      // Map Recent Bookings (fallback for lists and distributions)
      const rb = Array.isArray(recentRes) ? recentRes : (recentRes?.data || []);
      setBookings(rb);

      // Map Charts
      const bc = Array.isArray(bChartRes) ? bChartRes : (bChartRes?.data || []);
      const rc = Array.isArray(rChartRes) ? rChartRes : (rChartRes?.data || []);

      const chartMap: Record<string, any> = {};
      
      // Updated to map 'total' to 'bookings'
      bc.forEach((item: any) => {
        const date = item.date || item.snapshot_date;
        if (date) chartMap[date] = { date, bookings: Number(item.total || item.bookings || item.count || 0), revenue: 0 };
      });
      
      rc.forEach((item: any) => {
        const date = item.date || item.snapshot_date;
        if (date) {
          if (!chartMap[date]) chartMap[date] = { date, bookings: 0, revenue: 0 };
          chartMap[date].revenue = Number(item.revenue || item.total || item.amount || 0);
        }
      });

      const mergedChart = Object.keys(chartMap).map(date => ({
        originalDate: new Date(date),
        name: new Date(date).toLocaleDateString("bn-BD", { day: "numeric", month: "short" }),
        রেভিনিউ: chartMap[date].revenue,
        বুকিং: chartMap[date].bookings,
      })).sort((a, b) => a.originalDate.getTime() - b.originalDate.getTime());

      setRevenueTrendData(mergedChart);

      if (!isServiceAdmin) {
        // 2. Fetch Jobs Data (Separate backend)
        setJobStatsError(null);
        const auth = getMySqlAuth();
        const token = auth?.token || null;
        const [jobStatsRes, packagesRes] = await Promise.all([
          fetch(`${JOBS_API_URL}/api/admin/job-stats`, {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          }),
          fetch(`${JOBS_API_URL}/api/packages/admin/all`, {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          }),
        ]);

        if (!jobStatsRes.ok) throw new Error(`জব স্ট্যাটস লোড ব্যর্থ (${jobStatsRes.status})`);
        const jobData: JobStatsResponse = await jobStatsRes.json();
        setPackageTransactions(jobData.packageTransactions || []);
        setJobseekerProfiles(jobData.jobseekerProfiles || []);
        setEmployerProfiles(jobData.employerProfiles || []);

        if (packagesRes.ok) {
          const pkgData: PackageDef[] = await packagesRes.json();
          setPackagesCatalog(pkgData || []);
        }
      } else {
        setPackageTransactions([]);
        setJobseekerProfiles([]);
        setEmployerProfiles([]);
        setPackagesCatalog([]);
        setJobStatsError(null);
      }

      // 3. Reset states we no longer have endpoints for (to prevent old data from showing)
      setRequests([]);
      setRepEarnings([]);
      setAreaReps([]);
      setMartOrders([]);
      setDealListings([]);

    } catch (err: any) {
      console.error("Analytics fetch failed:", err);
      setJobStatsError(err?.message || "ডেটা লোড করা যায়নি");
    } finally {
      setLoading(false);
    }
  }, [isServiceAdmin]);

  useEffect(() => { 
    fetchData(period); 
  }, [fetchData, period]);

  const cutoff = useMemo(() => {
    const now = new Date();
    if (period === "7d") return new Date(now.getTime() - 7 * 86400000);
    if (period === "30d") return new Date(now.getTime() - 30 * 86400000);
    if (period === "6m") return new Date(now.getFullYear(), now.getMonth() - 6, 1);
    return new Date(now.getFullYear() - 1, now.getMonth(), 1);
  }, [period]);

  const filteredBookings = useMemo(() => bookings.filter(b => new Date(b.created_at) >= cutoff), [bookings, cutoff]);
  const filteredPackageTxns = useMemo(() => packageTransactions.filter(t => new Date(t.created_at) >= cutoff), [packageTransactions, cutoff]);
  const filteredJobseekers = useMemo(() => jobseekerProfiles.filter(p => new Date(p.created_at) >= cutoff), [jobseekerProfiles, cutoff]);
  const filteredEmployers = useMemo(() => employerProfiles.filter(p => new Date(p.created_at) >= cutoff), [employerProfiles, cutoff]);

  // Calculate missing distributions from the recent bookings array
  const statusDist = useMemo(() => {
    const map = new Map<string, number>();
    filteredBookings.forEach(b => map.set(b.status, (map.get(b.status) || 0) + 1));
    return Array.from(map.entries()).map(([status, count]) => ({ name: statusLabels[status] || status, value: count }));
  }, [filteredBookings]);

  const topServices = useMemo(() => {
    const map = new Map<string, { count: number; revenue: number }>();

    filteredBookings.forEach(b => {
      const serviceName = String(b?.service_title ?? "Unknown service").trim() || "Unknown service";
      const entry = map.get(serviceName) || { count: 0, revenue: 0 };
      entry.count++;
      entry.revenue += Number(b?.package_price ?? 0);
      map.set(serviceName, entry);
    });

    return Array.from(map.entries())
      .sort(([, a], [, b]) => b.count - a.count)
      .slice(0, 8)
      .map(([name, val]) => ({
        name: String(name ?? "Unknown service").length > 15 ? String(name ?? "Unknown service").slice(0, 15) + "…" : String(name ?? "Unknown service"),
        বুকিং: val.count,
        রেভিনিউ: val.revenue,
      }));
  }, [filteredBookings]);

  const jobStats = useMemo(() => {
    const successTxns = filteredPackageTxns.filter(t => t.status === "success");
    const packageIncome = successTxns.reduce((s, t) => s + Number(t.amount || 0), 0);
    const totalPurchases = successTxns.length;
    const jobseekerCount = filteredJobseekers.length;
    const employerCount = filteredEmployers.length;
    return { packageIncome, totalPurchases, jobseekerCount, employerCount };
  }, [filteredPackageTxns, filteredJobseekers, filteredEmployers]);

  const jobPackageTrend = useMemo(() => {
    const useMonthly = period === "6m" || period === "1y";
    const map = new Map<string, { income: number; count: number }>();
    filteredPackageTxns.filter(t => t.status === "success").forEach(t => {
      const d = new Date(t.created_at);
      const key = useMonthly ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}` : d.toISOString().slice(0, 10);
      const entry = map.get(key) || { income: 0, count: 0 };
      entry.income += Number(t.amount || 0);
      entry.count++;
      map.set(key, entry);
    });
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([key, val]) => {
      const label = useMonthly ? bnMonths[parseInt(key.split("-")[1]) - 1] + " " + key.split("-")[0].slice(2) : new Date(key).toLocaleDateString("bn-BD", { day: "numeric", month: "short" });
      return { name: label, আয়: val.income, ক্রয়: val.count };
    });
  }, [filteredPackageTxns, period]);

  const jobIncomeByPackage = useMemo(() => {
    const map = new Map<string, number>();
    filteredPackageTxns.filter(t => t.status === "success").forEach(t => {
      const key = t.package_name || `প্যাকেজ #${t.package_id}`;
      map.set(key, (map.get(key) || 0) + Number(t.amount || 0));
    });
    return Array.from(map.entries())
      .sort(([, a], [, b]) => b - a)
      .map(([name, income]) => ({
        name: name.length > 15 ? name.slice(0, 15) + "…" : name,
        আয়: Math.round(income),
      }));
  }, [filteredPackageTxns]);

  const jobUserTrend = useMemo(() => {
    const useMonthly = period === "6m" || period === "1y";
    const map = new Map<string, { jobseeker: number; employer: number }>();
    filteredJobseekers.forEach(p => {
      const d = new Date(p.created_at);
      const key = useMonthly ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}` : d.toISOString().slice(0, 10);
      const entry = map.get(key) || { jobseeker: 0, employer: 0 };
      entry.jobseeker++;
      map.set(key, entry);
    });
    filteredEmployers.forEach(p => {
      const d = new Date(p.created_at);
      const key = useMonthly ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}` : d.toISOString().slice(0, 10);
      const entry = map.get(key) || { jobseeker: 0, employer: 0 };
      entry.employer++;
      map.set(key, entry);
    });
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([key, val]) => {
      const label = useMonthly ? bnMonths[parseInt(key.split("-")[1]) - 1] + " " + key.split("-")[0].slice(2) : new Date(key).toLocaleDateString("bn-BD", { day: "numeric", month: "short" });
      return { name: label, জবসিকার: val.jobseeker, নিয়োগকর্তা: val.employer };
    });
  }, [filteredJobseekers, filteredEmployers, period]);

  const jobTxnStatusDist = useMemo(() => {
    const map = new Map<string, number>();
    filteredPackageTxns.forEach(t => map.set(t.status, (map.get(t.status) || 0) + 1));
    return Array.from(map.entries()).map(([status, count]) => ({ name: statusLabels[status] || status, value: count }));
  }, [filteredPackageTxns]);

  const exportBookingReport = () => exportCSV(filteredBookings.map(b => ({
    সার্ভিস: b.service_title, মূল্য: b.package_price, স্ট্যাটাস: b.status, তারিখ: b.created_at.slice(0, 10), জরুরি: b.is_emergency ? "হ্যাঁ" : "না"
  })), "booking_report");

  const exportJobPackageReport = () => exportCSV(filteredPackageTxns.map(t => ({
    লেনদেন_আইডি: t.id, প্যাকেজ: t.package_name || `#${t.package_id}`, পরিমাণ: t.amount,
    স্ট্যাটাস: statusLabels[t.status] || t.status, নিয়োগকর্তা_আইডি: t.employer_user_id, তারিখ: t.created_at.slice(0, 10)
  })), "job_package_report");

  if (loading) return <div className="py-12 text-center text-muted-foreground">অ্যানালিটিক্স লোড হচ্ছে...</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="font-heading text-lg font-bold text-foreground">📊 অ্যানালিটিক্স ড্যাশবোর্ড</h3>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-border overflow-hidden">
            {(["7d", "30d", "6m", "1y"] as const).map(p => (
              <button key={p} onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 text-[11px] font-medium transition-colors ${period === p ? "bg-primary text-white" : "text-muted-foreground hover:bg-secondary"}`}>
                {p === "7d" ? "৭ দিন" : p === "30d" ? "৩০ দিন" : p === "6m" ? "৬ মাস" : "১ বছর"}
              </button>
            ))}
          </div>
          <button onClick={() => fetchData(period)} className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary">
            <RefreshCw className="h-3.5 w-3.5" /> রিফ্রেশ
          </button>
        </div>
      </div>

      <Tabs defaultValue="service" className="space-y-4">
        <TabsList className="w-full justify-start overflow-x-auto flex-nowrap h-auto p-1">
          <TabsTrigger value="service" className="text-xs"><ShoppingCart className="h-3.5 w-3.5 mr-1" /> সার্ভিস ও বুকিং</TabsTrigger>
          {!isServiceAdmin && (
            <TabsTrigger value="job" className="text-xs"><Briefcase className="h-3.5 w-3.5 mr-1" /> সন্ধান জব</TabsTrigger>
          )}
        </TabsList>

        {/* ── সার্ভিস ও বুকিং ── */}
        <TabsContent value="service" className="space-y-4">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={exportBookingReport}><Download className="h-3.5 w-3.5 mr-1" /> CSV এক্সপোর্ট</Button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <SummaryCard icon={DollarSign} label="মোট রেভিনিউ" value={`৳${toBnNum(stats.totalRevenue)}`} growth={stats.revenueGrowth} color="text-primary" bgColor="bg-primary/10" />
            <SummaryCard icon={ShoppingCart} label="মোট বুকিং" value={toBnNum(stats.totalBookings)} growth={stats.bookingGrowth} color="text-green-600" bgColor="bg-green-500/10" />
            <SummaryCard icon={MapPin} label="সার্ভিস রিকোয়েস্ট" value={toBnNum(stats.totalRequests)} color="text-blue-600" bgColor="bg-blue-500/10" />
            <SummaryCard icon={Users} label="জরুরি বুকিং" value={toBnNum(stats.emergencyCount)} color="text-red-600" bgColor="bg-red-500/10" />
          </div>
          
          <ChartCard title="রেভিনিউ ও বুকিং ট্রেন্ড" icon={TrendingUp}>
            {revenueTrendData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={revenueTrendData.map(({ originalDate, ...rest }) => rest)}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: "11px" }} />
                  <Area type="monotone" dataKey="রেভিনিউ" stroke="hsl(var(--primary))" fill="url(#colorRevenue)" strokeWidth={2} />
                  <Line type="monotone" dataKey="বুকিং" stroke="hsl(142, 71%, 45%)" strokeWidth={2} dot={{ r: 3 }} />
                </AreaChart>
              </ResponsiveContainer>
            ) : <EmptyChart />}
          </ChartCard>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ChartCard title="বুকিং স্ট্যাটাস" icon={ShoppingCart}>
              {statusDist.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={statusDist} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={{ stroke: "hsl(var(--muted-foreground))" }}>
                      {statusDist.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
              ) : <EmptyChart />}
            </ChartCard>

            <ChartCard title="জনপ্রিয় সার্ভিসসমূহ" icon={ShoppingCart}>
              {topServices.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={topServices} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={100} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: "11px" }} />
                    <Bar dataKey="বুকিং" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <EmptyChart />}
            </ChartCard>
          </div>
        </TabsContent>

        {/* Hide other tabs completely from service_admin to save rendering power and enforce role boundaries */}
        {!isServiceAdmin && (
          <>
            {/* ── সন্ধান জব ── */}
            <TabsContent value="job" className="space-y-4">
              {jobStatsError ? (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-700">
                  জব স্ট্যাটস লোড করা যায়নি: {jobStatsError}। ({JOBS_API_URL}/api/admin/job-stats থেকে ডেটা আনার চেষ্টা করা হয়েছে)
                </div>
              ) : (
                <>
                  <div className="flex justify-end">
                    <Button variant="outline" size="sm" onClick={exportJobPackageReport}><Download className="h-3.5 w-3.5 mr-1" /> CSV এক্সপোর্ট</Button>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <SummaryCard icon={DollarSign} label="প্যাকেজ আয়" value={`৳${toBnNum(jobStats.packageIncome)}`} color="text-primary" bgColor="bg-primary/10" />
                    <SummaryCard icon={Package} label="প্যাকেজ ক্রয়" value={toBnNum(jobStats.totalPurchases)} color="text-green-600" bgColor="bg-green-500/10" />
                    <SummaryCard icon={UserCheck} label="জব সিকার প্রোফাইল" value={toBnNum(jobStats.jobseekerCount)} color="text-blue-600" bgColor="bg-blue-500/10" />
                    <SummaryCard icon={Building2} label="নিয়োগকর্তা" value={toBnNum(jobStats.employerCount)} color="text-orange-600" bgColor="bg-orange-500/10" />
                  </div>

                  {/* সর্বোচ্চ মূল্যের প্যাকেজ (ক্যাটালগ থেকে, লেনদেন থেকে নয়) */}
                  {highestPackage && (
                    <div className="rounded-xl border border-border bg-card p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 shrink-0">
                          <Package className="h-5 w-5 text-purple-600" />
                        </div>
                        <div>
                          <p className="text-[11px] text-muted-foreground">সর্বোচ্চ মূল্যের প্যাকেজ (ক্যাটালগ)</p>
                          <p className="text-sm font-bold text-foreground">{highestPackage.name}</p>
                        </div>
                      </div>
                      <p className="text-lg font-bold text-purple-600">৳{toBnNum(highestPackage.price)}</p>
                    </div>
                  )}

                  <ChartCard title="প্যাকেজ আয় ও ক্রয়ের ট্রেন্ড" icon={TrendingUp}>
                    {jobPackageTrend.length > 0 ? (
                      <ResponsiveContainer width="100%" height={280}>
                        <AreaChart data={jobPackageTrend}>
                          <defs>
                            <linearGradient id="colorJobIncome" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                          <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                          <Tooltip contentStyle={tooltipStyle} />
                          <Legend wrapperStyle={{ fontSize: "11px" }} />
                          <Area type="monotone" dataKey="আয়" stroke="hsl(var(--primary))" fill="url(#colorJobIncome)" strokeWidth={2} />
                          <Line type="monotone" dataKey="ক্রয়" stroke="hsl(142, 71%, 45%)" strokeWidth={2} dot={{ r: 3 }} />
                          {highestPackage && (
                            <ReferenceLine
                              y={highestPackage.price}
                              stroke="hsl(0, 84%, 60%)"
                              strokeDasharray="4 4"
                              label={{ value: `সর্বোচ্চ প্যাকেজ ৳${toBnNum(highestPackage.price)}`, fontSize: 10, fill: "hsl(0, 84%, 60%)", position: "insideTopRight" }}
                            />
                          )}
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : <EmptyChart />}
                  </ChartCard>

                  <ChartCard title="প্যাকেজ অনুযায়ী আয়" icon={Package}>
                    {jobIncomeByPackage.length > 0 ? (
                      <ResponsiveContainer width="100%" height={Math.max(240, jobIncomeByPackage.length * 40)}>
                        <BarChart data={jobIncomeByPackage} layout="vertical" margin={{ left: 10 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis type="number" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                          <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={110} stroke="hsl(var(--muted-foreground))" />
                          <Tooltip contentStyle={tooltipStyle} />
                          <Bar dataKey="আয়" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : <EmptyChart />}
                  </ChartCard>

                  <ChartCard title="জবসিকার ও নিয়োগকর্তা নিবন্ধন ট্রেন্ড" icon={Users}>
                    {jobUserTrend.length > 0 ? (
                      <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={jobUserTrend}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                          <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                          <Tooltip contentStyle={tooltipStyle} />
                          <Legend wrapperStyle={{ fontSize: "11px" }} />
                          <Bar dataKey="জবসিকার" fill="hsl(199, 89%, 48%)" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="নিয়োগকর্তা" fill="hsl(38, 92%, 50%)" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : <EmptyChart />}
                  </ChartCard>

                  <ChartCard title="প্যাকেজ লেনদেন স্ট্যাটাস" icon={Receipt}>
                    {jobTxnStatusDist.length > 0 ? (
                      <ResponsiveContainer width="100%" height={240}>
                        <PieChart>
                          <Pie data={jobTxnStatusDist} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={{ stroke: "hsl(var(--muted-foreground))" }}>
                            {jobTxnStatusDist.map((_, i) => <Cell key={i} fill={COLORS[(i + 4) % COLORS.length]} />)}
                          </Pie>
                          <Tooltip contentStyle={tooltipStyle} />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : <EmptyChart />}
                  </ChartCard>
                </>
              )}
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
};

// --- Sub-components & constants ---

const tooltipStyle = { background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" };

function SummaryCard({ icon: Icon, label, value, growth, color, bgColor }: {
  icon: any; label: string; value: string; growth?: number; color: string; bgColor: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${bgColor} shrink-0`}>
          <Icon className={`h-5 w-5 ${color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] text-muted-foreground">{label}</p>
          <p className="text-lg font-bold text-foreground leading-tight">{value}</p>
        </div>
      </div>
      {growth !== undefined && growth !== 0 && (
        <div className={`mt-2 flex items-center gap-1 text-[10px] font-medium ${growth > 0 ? "text-green-600" : "text-red-500"}`}>
          {growth > 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
          {growth > 0 ? "+" : ""}{growth}% আগের সময়ের তুলনায়
        </div>
      )}
    </div>
  );
}

function ChartCard({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <h4 className="text-sm font-bold text-foreground mb-4 flex items-center gap-1.5">
        <Icon className="h-4 w-4 text-primary" /> {title}
      </h4>
      {children}
    </div>
  );
}

function EmptyChart() {
  return <p className="py-12 text-center text-xs text-muted-foreground">এই সময়ের জন্য কোনো ডেটা নেই</p>;
}

export default AdminAnalytics;
import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, AreaChart, Area
} from "recharts";
import { RefreshCw, TrendingUp, DollarSign, ShoppingCart, MapPin, Users, Calendar, ArrowUpRight, ArrowDownRight, Wallet, Receipt, Download, Package, Handshake, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

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

const COLORS = [
  "hsl(var(--primary))", "hsl(142, 71%, 45%)", "hsl(38, 92%, 50%)",
  "hsl(0, 84%, 60%)", "hsl(262, 83%, 58%)", "hsl(199, 89%, 48%)",
  "hsl(330, 81%, 60%)", "hsl(172, 66%, 50%)"
];

const statusLabels: Record<string, string> = {
  pending: "অপেক্ষমাণ", confirmed: "নিশ্চিত", completed: "সম্পন্ন",
  cancelled: "বাতিল", contacted: "যোগাযোগ", resolved: "সমাধান", rejected: "বাতিল",
  processing: "প্রসেসিং", shipped: "শিপড", delivered: "ডেলিভার্ড",
  active: "সক্রিয়", sold: "বিক্রিত", expired: "মেয়াদোত্তীর্ণ"
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
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [repEarnings, setRepEarnings] = useState<RepEarning[]>([]);
  const [areaReps, setAreaReps] = useState<AreaRep[]>([]);
  const [martOrders, setMartOrders] = useState<MartOrder[]>([]);
  const [dealListings, setDealListings] = useState<DealListingStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<"7d" | "30d" | "6m" | "1y">("30d");

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [{ data: bData }, { data: rData }, { data: eData }, { data: repData }, { data: mData }, { data: dData }] = await Promise.all([
      supabase.from("bookings").select("id, created_at, package_price, status, service_title, customer_address, is_emergency").order("created_at", { ascending: false }),
      (supabase as any).from("service_requests").select("id, created_at, division, district, status, payment_amount, payment_status, commission_amount, rep_earning, assigned_rep_id").order("created_at", { ascending: false }),
      (supabase as any).from("rep_earnings").select("id, created_at, total_amount, commission_amount, rep_earning, receipt_number, rep_id").order("created_at", { ascending: false }),
      supabase.from("area_representatives").select("id, name, user_id"),
      supabase.from("mart_orders").select("id, created_at, total, subtotal, status, payment_method, payment_status, shipping_division").order("created_at", { ascending: false }),
      supabase.from("deal_listings").select("id, created_at, status, views_count, inquiries_count, is_featured, price").order("created_at", { ascending: false }),
    ]);
    if (bData) setBookings(bData);
    if (rData) setRequests(rData as any);
    if (eData) setRepEarnings(eData as any);
    if (repData) setAreaReps(repData as any);
    if (mData) setMartOrders(mData as MartOrder[]);
    if (dData) setDealListings(dData as DealListingStat[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const cutoff = useMemo(() => {
    const now = new Date();
    if (period === "7d") return new Date(now.getTime() - 7 * 86400000);
    if (period === "30d") return new Date(now.getTime() - 30 * 86400000);
    if (period === "6m") return new Date(now.getFullYear(), now.getMonth() - 6, 1);
    return new Date(now.getFullYear() - 1, now.getMonth(), 1);
  }, [period]);

  const filteredBookings = useMemo(() => bookings.filter(b => new Date(b.created_at) >= cutoff), [bookings, cutoff]);
  const filteredRequests = useMemo(() => requests.filter(r => new Date(r.created_at) >= cutoff), [requests, cutoff]);
  const filteredEarnings = useMemo(() => repEarnings.filter(e => new Date(e.created_at) >= cutoff), [repEarnings, cutoff]);
  const filteredMartOrders = useMemo(() => martOrders.filter(o => new Date(o.created_at) >= cutoff), [martOrders, cutoff]);
  const filteredDealListings = useMemo(() => dealListings.filter(d => d.created_at && new Date(d.created_at) >= cutoff), [dealListings, cutoff]);

  // Summary stats
  const stats = useMemo(() => {
    const totalRevenue = filteredBookings.reduce((sum, b) => sum + b.package_price, 0);
    const totalBookings = filteredBookings.length;
    const totalRequests = filteredRequests.length;
    const emergencyCount = filteredBookings.filter(b => b.is_emergency).length;
    const periodMs = new Date().getTime() - cutoff.getTime();
    const prevCutoff = new Date(cutoff.getTime() - periodMs);
    const prevBookings = bookings.filter(b => { const d = new Date(b.created_at); return d >= prevCutoff && d < cutoff; });
    const prevRevenue = prevBookings.reduce((sum, b) => sum + b.package_price, 0);
    const revenueGrowth = prevRevenue > 0 ? Math.round(((totalRevenue - prevRevenue) / prevRevenue) * 100) : 0;
    const bookingGrowth = prevBookings.length > 0 ? Math.round(((totalBookings - prevBookings.length) / prevBookings.length) * 100) : 0;
    return { totalRevenue, totalBookings, totalRequests, emergencyCount, revenueGrowth, bookingGrowth };
  }, [filteredBookings, filteredRequests, bookings, cutoff]);

  const commissionStats = useMemo(() => {
    const paidRequests = filteredRequests.filter(r => r.payment_status === "paid");
    const totalServiceRevenue = paidRequests.reduce((s, r) => s + (r.payment_amount || 0), 0);
    const totalCommission = paidRequests.reduce((s, r) => s + (r.commission_amount || 0), 0);
    const totalRepEarnings = paidRequests.reduce((s, r) => s + (r.rep_earning || 0), 0);
    const totalEarningRecords = filteredEarnings.length;
    return { totalServiceRevenue, totalCommission, totalRepEarnings, totalEarningRecords };
  }, [filteredRequests, filteredEarnings]);

  // Mart stats
  const martStats = useMemo(() => {
    const totalMartRevenue = filteredMartOrders.reduce((s, o) => s + o.total, 0);
    const totalMartOrders = filteredMartOrders.length;
    const deliveredOrders = filteredMartOrders.filter(o => o.status === "delivered").length;
    const cancelledOrders = filteredMartOrders.filter(o => o.status === "cancelled").length;
    return { totalMartRevenue, totalMartOrders, deliveredOrders, cancelledOrders };
  }, [filteredMartOrders]);

  // Deal stats
  const dealStats = useMemo(() => {
    const totalListings = filteredDealListings.length;
    const activeListings = filteredDealListings.filter(d => d.status === "active").length;
    const totalViews = filteredDealListings.reduce((s, d) => s + (d.views_count || 0), 0);
    const totalInquiries = filteredDealListings.reduce((s, d) => s + (d.inquiries_count || 0), 0);
    const featuredCount = filteredDealListings.filter(d => d.is_featured).length;
    return { totalListings, activeListings, totalViews, totalInquiries, featuredCount };
  }, [filteredDealListings]);

  // Commission trend
  const commissionTrend = useMemo(() => {
    const useMonthly = period === "6m" || period === "1y";
    const map = new Map<string, { commission: number; repEarning: number; total: number }>();
    filteredRequests.filter(r => r.payment_status === "paid").forEach(r => {
      const d = new Date(r.created_at);
      const key = useMonthly ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}` : d.toISOString().slice(0, 10);
      const entry = map.get(key) || { commission: 0, repEarning: 0, total: 0 };
      entry.commission += r.commission_amount || 0;
      entry.repEarning += r.rep_earning || 0;
      entry.total += r.payment_amount || 0;
      map.set(key, entry);
    });
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([key, val]) => {
      const label = useMonthly ? bnMonths[parseInt(key.split("-")[1]) - 1] + " " + key.split("-")[0].slice(2) : new Date(key).toLocaleDateString("bn-BD", { day: "numeric", month: "short" });
      return { name: label, কমিশন: val.commission, প্রতিনিধি_আয়: val.repEarning, মোট: val.total };
    });
  }, [filteredRequests, period]);

  // Revenue trend
  const revenueTrend = useMemo(() => {
    const useMonthly = period === "6m" || period === "1y";
    const map = new Map<string, { revenue: number; count: number }>();
    filteredBookings.forEach(b => {
      const d = new Date(b.created_at);
      const key = useMonthly ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}` : d.toISOString().slice(0, 10);
      const entry = map.get(key) || { revenue: 0, count: 0 };
      entry.revenue += b.package_price;
      entry.count++;
      map.set(key, entry);
    });
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([key, val]) => {
      const label = useMonthly ? bnMonths[parseInt(key.split("-")[1]) - 1] + " " + key.split("-")[0].slice(2) : new Date(key).toLocaleDateString("bn-BD", { day: "numeric", month: "short" });
      return { name: label, রেভিনিউ: val.revenue, বুকিং: val.count };
    });
  }, [filteredBookings, period]);

  // Mart order trend
  const martOrderTrend = useMemo(() => {
    const useMonthly = period === "6m" || period === "1y";
    const map = new Map<string, { revenue: number; count: number }>();
    filteredMartOrders.forEach(o => {
      const d = new Date(o.created_at);
      const key = useMonthly ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}` : d.toISOString().slice(0, 10);
      const entry = map.get(key) || { revenue: 0, count: 0 };
      entry.revenue += o.total;
      entry.count++;
      map.set(key, entry);
    });
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([key, val]) => {
      const label = useMonthly ? bnMonths[parseInt(key.split("-")[1]) - 1] + " " + key.split("-")[0].slice(2) : new Date(key).toLocaleDateString("bn-BD", { day: "numeric", month: "short" });
      return { name: label, রেভিনিউ: val.revenue, অর্ডার: val.count };
    });
  }, [filteredMartOrders, period]);

  // Mart payment method breakdown
  const martPaymentMethods = useMemo(() => {
    const map = new Map<string, number>();
    filteredMartOrders.forEach(o => map.set(o.payment_method, (map.get(o.payment_method) || 0) + 1));
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [filteredMartOrders]);

  // Mart order status distribution
  const martStatusDist = useMemo(() => {
    const map = new Map<string, number>();
    filteredMartOrders.forEach(o => map.set(o.status, (map.get(o.status) || 0) + 1));
    return Array.from(map.entries()).map(([status, count]) => ({ name: statusLabels[status] || status, value: count }));
  }, [filteredMartOrders]);

  // Deal listing trend
  const dealListingTrend = useMemo(() => {
    const useMonthly = period === "6m" || period === "1y";
    const map = new Map<string, { count: number; views: number }>();
    filteredDealListings.forEach(d => {
      const dt = new Date(d.created_at!);
      const key = useMonthly ? `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}` : dt.toISOString().slice(0, 10);
      const entry = map.get(key) || { count: 0, views: 0 };
      entry.count++;
      entry.views += d.views_count || 0;
      map.set(key, entry);
    });
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([key, val]) => {
      const label = useMonthly ? bnMonths[parseInt(key.split("-")[1]) - 1] + " " + key.split("-")[0].slice(2) : new Date(key).toLocaleDateString("bn-BD", { day: "numeric", month: "short" });
      return { name: label, বিজ্ঞাপন: val.count, ভিউ: val.views };
    });
  }, [filteredDealListings, period]);

  // Booking status distribution
  const statusDist = useMemo(() => {
    const map = new Map<string, number>();
    filteredBookings.forEach(b => map.set(b.status, (map.get(b.status) || 0) + 1));
    return Array.from(map.entries()).map(([status, count]) => ({ name: statusLabels[status] || status, value: count }));
  }, [filteredBookings]);

  // Top services
  const topServices = useMemo(() => {
    const map = new Map<string, { count: number; revenue: number }>();
    filteredBookings.forEach(b => {
      const entry = map.get(b.service_title) || { count: 0, revenue: 0 };
      entry.count++;
      entry.revenue += b.package_price;
      map.set(b.service_title, entry);
    });
    return Array.from(map.entries()).sort(([, a], [, b]) => b.count - a.count).slice(0, 8).map(([name, val]) => ({ name: name.length > 15 ? name.slice(0, 15) + "…" : name, বুকিং: val.count, রেভিনিউ: val.revenue }));
  }, [filteredBookings]);

  // Area-wise requests
  const areaData = useMemo(() => {
    const map = new Map<string, number>();
    filteredRequests.forEach(r => map.set(r.division, (map.get(r.division) || 0) + 1));
    return Array.from(map.entries()).sort(([, a], [, b]) => b - a).map(([name, value]) => ({ name, value }));
  }, [filteredRequests]);

  // District breakdown
  const districtData = useMemo(() => {
    const map = new Map<string, number>();
    filteredRequests.forEach(r => map.set(r.district, (map.get(r.district) || 0) + 1));
    return Array.from(map.entries()).sort(([, a], [, b]) => b - a).slice(0, 10).map(([name, রিকোয়েস্ট]) => ({ name, রিকোয়েস্ট }));
  }, [filteredRequests]);

  // Request status distribution
  const reqStatusDist = useMemo(() => {
    const map = new Map<string, number>();
    filteredRequests.forEach(r => map.set(r.status, (map.get(r.status) || 0) + 1));
    return Array.from(map.entries()).map(([status, count]) => ({ name: statusLabels[status] || status, value: count }));
  }, [filteredRequests]);

  // Rep-wise earnings breakdown
  const repBreakdown = useMemo(() => {
    const repMap = new Map<string, { name: string; earning: number; commission: number; total: number; count: number }>();
    filteredEarnings.forEach(e => {
      const rep = areaReps.find(r => r.id === e.rep_id || r.user_id === e.rep_id);
      const repName = rep?.name || e.rep_id?.slice(0, 8) || "অজানা";
      const entry = repMap.get(repName) || { name: repName, earning: 0, commission: 0, total: 0, count: 0 };
      entry.earning += e.rep_earning;
      entry.commission += e.commission_amount;
      entry.total += e.total_amount;
      entry.count++;
      repMap.set(repName, entry);
    });
    return Array.from(repMap.values()).sort((a, b) => b.earning - a.earning).map(v => ({
      name: v.name.length > 12 ? v.name.slice(0, 12) + "…" : v.name,
      আয়: Math.round(v.earning), কমিশন: Math.round(v.commission), লেনদেন: v.count,
    }));
  }, [filteredEarnings, areaReps]);

  // Export handlers
  const exportBookingReport = () => exportCSV(filteredBookings.map(b => ({
    সার্ভিস: b.service_title, মূল্য: b.package_price, স্ট্যাটাস: b.status, তারিখ: b.created_at.slice(0, 10), জরুরি: b.is_emergency ? "হ্যাঁ" : "না"
  })), "booking_report");

  const exportRequestReport = () => exportCSV(filteredRequests.map(r => ({
    বিভাগ: r.division, জেলা: r.district, স্ট্যাটাস: r.status, পেমেন্ট: r.payment_amount, কমিশন: r.commission_amount, প্রতিনিধি_আয়: r.rep_earning, তারিখ: r.created_at.slice(0, 10)
  })), "request_report");

  const exportMartReport = () => exportCSV(filteredMartOrders.map(o => ({
    অর্ডার_আইডি: o.id.slice(0, 8), মোট: o.total, স্ট্যাটাস: o.status, পেমেন্ট_মেথড: o.payment_method, পেমেন্ট_স্ট্যাটাস: o.payment_status, তারিখ: o.created_at.slice(0, 10)
  })), "mart_order_report");

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
                className={`px-3 py-1.5 text-[11px] font-medium transition-colors ${period === p ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"}`}>
                {p === "7d" ? "৭ দিন" : p === "30d" ? "৩০ দিন" : p === "6m" ? "৬ মাস" : "১ বছর"}
              </button>
            ))}
          </div>
          <button onClick={fetchData} className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary">
            <RefreshCw className="h-3.5 w-3.5" /> রিফ্রেশ
          </button>
        </div>
      </div>

      <Tabs defaultValue="service" className="space-y-4">
        <TabsList className="w-full justify-start overflow-x-auto flex-nowrap h-auto p-1">
          <TabsTrigger value="service" className="text-xs"><ShoppingCart className="h-3.5 w-3.5 mr-1" /> সার্ভিস ও বুকিং</TabsTrigger>
          <TabsTrigger value="commission" className="text-xs"><Wallet className="h-3.5 w-3.5 mr-1" /> কমিশন ও আয়</TabsTrigger>
          <TabsTrigger value="mart" className="text-xs"><Package className="h-3.5 w-3.5 mr-1" /> সন্ধান মার্ট</TabsTrigger>
          <TabsTrigger value="deal" className="text-xs"><Handshake className="h-3.5 w-3.5 mr-1" /> সন্ধান ডিল</TabsTrigger>
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
            {revenueTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={revenueTrend}>
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

            <ChartCard title="রিকোয়েস্ট স্ট্যাটাস" icon={MapPin}>
              {reqStatusDist.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={reqStatusDist} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={{ stroke: "hsl(var(--muted-foreground))" }}>
                      {reqStatusDist.map((_, i) => <Cell key={i} fill={COLORS[(i + 3) % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
              ) : <EmptyChart />}
            </ChartCard>
          </div>

          <ChartCard title="জনপ্রিয় সার্ভিসসমূহ" icon={ShoppingCart}>
            {topServices.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ChartCard title="বিভাগভিত্তিক রিকোয়েস্ট" icon={MapPin}>
              {areaData.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={areaData} cx="50%" cy="50%" outerRadius={85} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={{ stroke: "hsl(var(--muted-foreground))" }}>
                      {areaData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
              ) : <EmptyChart />}
            </ChartCard>

            <ChartCard title="শীর্ষ ১০ জেলা (রিকোয়েস্ট)" icon={MapPin}>
              {districtData.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={districtData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-30} textAnchor="end" height={50} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="রিকোয়েস্ট" fill="hsl(199, 89%, 48%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <EmptyChart />}
            </ChartCard>
          </div>
        </TabsContent>

        {/* ── কমিশন ও আয় ── */}
        <TabsContent value="commission" className="space-y-4">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={exportRequestReport}><Download className="h-3.5 w-3.5 mr-1" /> CSV এক্সপোর্ট</Button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <SummaryCard icon={Wallet} label="সার্ভিস রেভিনিউ" value={`৳${toBnNum(commissionStats.totalServiceRevenue)}`} color="text-primary" bgColor="bg-primary/10" />
            <SummaryCard icon={Receipt} label="কোম্পানি কমিশন" value={`৳${toBnNum(commissionStats.totalCommission)}`} color="text-green-600" bgColor="bg-green-500/10" />
            <SummaryCard icon={DollarSign} label="প্রতিনিধি আয়" value={`৳${toBnNum(commissionStats.totalRepEarnings)}`} color="text-orange-600" bgColor="bg-orange-500/10" />
            <SummaryCard icon={Receipt} label="মোট রশিদ" value={toBnNum(commissionStats.totalEarningRecords)} color="text-blue-600" bgColor="bg-blue-500/10" />
          </div>

          <ChartCard title="কমিশন ও প্রতিনিধি আয়ের ট্রেন্ড" icon={Wallet}>
            {commissionTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={commissionTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: "11px" }} />
                  <Bar dataKey="কমিশন" fill="hsl(142, 71%, 45%)" radius={[4, 4, 0, 0]} stackId="a" />
                  <Bar dataKey="প্রতিনিধি_আয়" fill="hsl(38, 92%, 50%)" radius={[4, 4, 0, 0]} stackId="a" />
                </BarChart>
              </ResponsiveContainer>
            ) : <EmptyChart />}
          </ChartCard>

          <ChartCard title="প্রতিনিধিভিত্তিক আয়ের ব্রেকডাউন" icon={Users}>
            {repBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height={Math.max(280, repBreakdown.length * 40)}>
                <BarChart data={repBreakdown} layout="vertical" margin={{ left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={100} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: "11px" }} />
                  <Bar dataKey="আয়" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="কমিশন" fill="hsl(0, 84%, 60%)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <EmptyChart />}
          </ChartCard>
        </TabsContent>

        {/* ── সন্ধান মার্ট ── */}
        <TabsContent value="mart" className="space-y-4">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={exportMartReport}><Download className="h-3.5 w-3.5 mr-1" /> CSV এক্সপোর্ট</Button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <SummaryCard icon={DollarSign} label="মার্ট রেভিনিউ" value={`৳${toBnNum(martStats.totalMartRevenue)}`} color="text-primary" bgColor="bg-primary/10" />
            <SummaryCard icon={Package} label="মোট অর্ডার" value={toBnNum(martStats.totalMartOrders)} color="text-green-600" bgColor="bg-green-500/10" />
            <SummaryCard icon={ShoppingCart} label="ডেলিভার্ড" value={toBnNum(martStats.deliveredOrders)} color="text-blue-600" bgColor="bg-blue-500/10" />
            <SummaryCard icon={Users} label="বাতিল" value={toBnNum(martStats.cancelledOrders)} color="text-red-600" bgColor="bg-red-500/10" />
          </div>

          <ChartCard title="মার্ট অর্ডার ও রেভিনিউ ট্রেন্ড" icon={TrendingUp}>
            {martOrderTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={martOrderTrend}>
                  <defs>
                    <linearGradient id="colorMart" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(262, 83%, 58%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(262, 83%, 58%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: "11px" }} />
                  <Area type="monotone" dataKey="রেভিনিউ" stroke="hsl(262, 83%, 58%)" fill="url(#colorMart)" strokeWidth={2} />
                  <Line type="monotone" dataKey="অর্ডার" stroke="hsl(38, 92%, 50%)" strokeWidth={2} dot={{ r: 3 }} />
                </AreaChart>
              </ResponsiveContainer>
            ) : <EmptyChart />}
          </ChartCard>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ChartCard title="অর্ডার স্ট্যাটাস" icon={Package}>
              {martStatusDist.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={martStatusDist} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={{ stroke: "hsl(var(--muted-foreground))" }}>
                      {martStatusDist.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
              ) : <EmptyChart />}
            </ChartCard>

            <ChartCard title="পেমেন্ট মেথড ব্রেকডাউন" icon={Wallet}>
              {martPaymentMethods.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={martPaymentMethods} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={{ stroke: "hsl(var(--muted-foreground))" }}>
                      {martPaymentMethods.map((_, i) => <Cell key={i} fill={COLORS[(i + 2) % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
              ) : <EmptyChart />}
            </ChartCard>
          </div>
        </TabsContent>

        {/* ── সন্ধান ডিল ── */}
        <TabsContent value="deal" className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <SummaryCard icon={Handshake} label="মোট বিজ্ঞাপন" value={toBnNum(dealStats.totalListings)} color="text-primary" bgColor="bg-primary/10" />
            <SummaryCard icon={Eye} label="সক্রিয় বিজ্ঞাপন" value={toBnNum(dealStats.activeListings)} color="text-green-600" bgColor="bg-green-500/10" />
            <SummaryCard icon={Eye} label="মোট ভিউ" value={toBnNum(dealStats.totalViews)} color="text-blue-600" bgColor="bg-blue-500/10" />
            <SummaryCard icon={Users} label="মোট ইনকোয়্যারি" value={toBnNum(dealStats.totalInquiries)} color="text-orange-600" bgColor="bg-orange-500/10" />
          </div>

          <ChartCard title="বিজ্ঞাপন ও ভিউ ট্রেন্ড" icon={TrendingUp}>
            {dealListingTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={dealListingTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: "11px" }} />
                  <Bar dataKey="বিজ্ঞাপন" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="ভিউ" fill="hsl(38, 92%, 50%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <EmptyChart />}
          </ChartCard>
        </TabsContent>
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

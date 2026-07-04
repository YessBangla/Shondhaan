import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Package, ShoppingCart, Store, TrendingUp, Eye, Ban, Truck, RotateCcw, Search, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";

interface MartStats {
  totalProducts: number;
  totalOrders: number;
  totalShops: number;
  pendingOrders: number;
  shippedOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  returnRequests: number;
  totalRevenue: number;
}

const AdminMartOverview = () => {
  const [stats, setStats] = useState<MartStats>({
    totalProducts: 0, totalOrders: 0, totalShops: 0, pendingOrders: 0,
    shippedOrders: 0, deliveredOrders: 0, cancelledOrders: 0, returnRequests: 0, totalRevenue: 0,
  });
  const [orders, setOrders] = useState<any[]>([]);
  const [shops, setShops] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"orders" | "shops" | "products">("orders");

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [ordersRes, shopsRes, productsRes] = await Promise.all([
      supabase.from("mart_orders").select("*").order("created_at", { ascending: false }),
      supabase.from("mart_shops").select("*").order("created_at", { ascending: false }),
      supabase.from("mart_products").select("id", { count: "exact", head: true }),
    ]);

    const allOrders = ordersRes.data || [];
    const allShops = shopsRes.data || [];

    setOrders(allOrders);
    setShops(allShops);
    setStats({
      totalProducts: productsRes.count || 0,
      totalOrders: allOrders.length,
      totalShops: allShops.length,
      pendingOrders: allOrders.filter(o => o.status === "pending").length,
      shippedOrders: allOrders.filter(o => o.status === "shipped").length,
      deliveredOrders: allOrders.filter(o => o.status === "delivered").length,
      cancelledOrders: allOrders.filter(o => o.status === "cancelled").length,
      returnRequests: allOrders.filter(o => o.return_requested_at).length,
      totalRevenue: allOrders.filter(o => o.payment_status === "paid").reduce((sum, o) => sum + (o.total || 0), 0),
    });
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleOrderStatus = async (orderId: string, newStatus: string) => {
    const updates: any = { status: newStatus };
    if (newStatus === "delivered") updates.estimated_delivery_date = new Date().toISOString();
    const { error } = await supabase.from("mart_orders").update(updates).eq("id", orderId);
    if (!error) setOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...updates } : o));
  };

  const handleShopVerify = async (shopId: string, verified: boolean) => {
    const { error } = await supabase.from("mart_shops").update({ is_verified: verified }).eq("id", shopId);
    if (!error) setShops(prev => prev.map(s => s.id === shopId ? { ...s, is_verified: verified } : s));
  };

  const filteredOrders = orders
    .filter(o => statusFilter === "all" || o.status === statusFilter)
    .filter(o => !search || o.order_number?.includes(search) || o.customer_name?.toLowerCase().includes(search.toLowerCase()) || o.customer_phone?.includes(search));

  const statCards = [
    { label: "মোট পণ্য", value: stats.totalProducts, icon: Package, color: "text-primary", bg: "bg-primary/10" },
    { label: "মোট অর্ডার", value: stats.totalOrders, icon: ShoppingCart, color: "text-blue-600", bg: "bg-blue-500/10" },
    { label: "মোট শপ", value: stats.totalShops, icon: Store, color: "text-purple-600", bg: "bg-purple-500/10" },
    { label: "মোট আয়", value: `৳${stats.totalRevenue.toLocaleString("bn-BD")}`, icon: TrendingUp, color: "text-green-600", bg: "bg-green-500/10" },
    { label: "অপেক্ষমাণ", value: stats.pendingOrders, icon: Eye, color: "text-yellow-600", bg: "bg-yellow-500/10" },
    { label: "শিপড", value: stats.shippedOrders, icon: Truck, color: "text-indigo-600", bg: "bg-indigo-500/10" },
    { label: "বাতিল", value: stats.cancelledOrders, icon: Ban, color: "text-red-600", bg: "bg-red-500/10" },
    { label: "রিটার্ন", value: stats.returnRequests, icon: RotateCcw, color: "text-orange-600", bg: "bg-orange-500/10" },
  ];

  const statusOptions = [
    { value: "all", label: "সব" },
    { value: "pending", label: "অপেক্ষমাণ" },
    { value: "confirmed", label: "নিশ্চিত" },
    { value: "processing", label: "প্রক্রিয়াধীন" },
    { value: "shipped", label: "শিপড" },
    { value: "delivered", label: "ডেলিভার্ড" },
    { value: "cancelled", label: "বাতিল" },
  ];

  const getStatusBadge = (status: string) => {
    const map: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-800",
      confirmed: "bg-blue-100 text-blue-800",
      processing: "bg-indigo-100 text-indigo-800",
      shipped: "bg-purple-100 text-purple-800",
      delivered: "bg-green-100 text-green-800",
      cancelled: "bg-red-100 text-red-800",
    };
    return map[status] || "bg-secondary text-muted-foreground";
  };

  if (loading) return <div className="py-8 text-center text-muted-foreground">লোড হচ্ছে...</div>;

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-heading text-lg font-bold text-foreground flex items-center gap-2">
          <ShoppingCart className="h-5 w-5 text-primary" /> ইয়েস মার্ট ম্যানেজমেন্ট
        </h3>
        <button onClick={fetchData} className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium text-foreground hover:bg-secondary">
          <RefreshCw className="h-3.5 w-3.5" /> রিফ্রেশ
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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

      {/* Sub Tabs */}
      <div className="flex gap-2 border-b border-border pb-2">
        {([["orders", "অর্ডার"], ["shops", "শপ"], ["products", "পণ্য"]] as const).map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${tab === key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"}`}>
            {label} {key === "orders" && `(${stats.totalOrders})`}
            {key === "shops" && `(${stats.totalShops})`}
            {key === "products" && `(${stats.totalProducts})`}
          </button>
        ))}
      </div>

      {/* Orders Tab */}
      {tab === "orders" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="অর্ডার নম্বর, নাম বা ফোন খুঁজুন..."
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-input bg-background text-sm outline-none focus:ring-1 focus:ring-ring" />
            </div>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              className="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring">
              {statusOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          {filteredOrders.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">কোনো অর্ডার পাওয়া যায়নি</div>
          ) : (
            <div className="space-y-3">
              {filteredOrders.slice(0, 50).map(o => (
                <div key={o.id} className="rounded-xl border border-border bg-card p-4 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                    <div>
                      <p className="text-sm font-semibold text-foreground">#{o.order_number}</p>
                      <p className="text-xs text-muted-foreground">{o.customer_name} • {o.customer_phone}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium ${getStatusBadge(o.status)}`}>
                        {statusOptions.find(s => s.value === o.status)?.label || o.status}
                      </span>
                      <select value={o.status} onChange={e => handleOrderStatus(o.id, e.target.value)}
                        className="rounded-lg border border-input bg-background px-2 py-1 text-xs outline-none">
                        {statusOptions.filter(s => s.value !== "all").map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
                    <span>মোট: ৳{o.total.toLocaleString("bn-BD")}</span>
                    <span>পেমেন্ট: {o.payment_method}</span>
                    <span>ঠিকানা: {o.shipping_address?.slice(0, 40)}</span>
                    <span>{new Date(o.created_at).toLocaleDateString("bn-BD")}</span>
                  </div>
                  {o.return_requested_at && (
                    <div className="mt-2 rounded-lg bg-orange-50 dark:bg-orange-950/30 p-2 text-xs text-orange-700 dark:text-orange-400">
                      ⚠️ রিটার্ন রিকোয়েস্ট: {o.return_reason || "কারণ উল্লেখ নেই"}
                    </div>
                  )}
                  {o.cancel_reason && (
                    <div className="mt-2 rounded-lg bg-red-50 dark:bg-red-950/30 p-2 text-xs text-red-700 dark:text-red-400">
                      ❌ বাতিলের কারণ: {o.cancel_reason}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Shops Tab */}
      {tab === "shops" && (
        <div className="space-y-3">
          {shops.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">কোনো শপ নেই</div>
          ) : shops.map(s => (
            <div key={s.id} className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  {s.logo_url ? (
                    <img src={s.logo_url} alt={s.name} className="h-10 w-10 rounded-lg object-cover" />
                  ) : (
                    <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center">
                      <Store className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-semibold text-foreground">{s.name}</p>
                    <p className="text-xs text-muted-foreground">{s.division} • {s.district}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${s.is_verified ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}`}>
                    {s.is_verified ? "ভেরিফাইড" : "আনভেরিফাইড"}
                  </span>
                  <button onClick={() => handleShopVerify(s.id, !s.is_verified)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium ${s.is_verified ? "bg-red-50 text-red-600 hover:bg-red-100" : "bg-green-50 text-green-600 hover:bg-green-100"}`}>
                    {s.is_verified ? "আনভেরিফাই" : "ভেরিফাই"}
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                <span>পণ্য: {s.total_products}</span>
                <span>অর্ডার: {s.total_orders}</span>
                <span>রেটিং: {s.rating || 0}⭐</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Products Tab - Summary */}
      {tab === "products" && (
        <div className="text-center py-12">
          <Package className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground mb-1">মোট {stats.totalProducts} টি পণ্য রয়েছে</p>
          <p className="text-xs text-muted-foreground">পণ্য ম্যানেজমেন্টের জন্য প্রতিটি শপের নিজস্ব প্যানেল ব্যবহার করুন</p>
        </div>
      )}
    </div>
  );
};

export default AdminMartOverview;

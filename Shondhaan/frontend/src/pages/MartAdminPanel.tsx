import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Package, ShoppingCart, Users, Search,
  BarChart3, DollarSign, Loader2, MessageCircle, Eye, 
  Shield, Store, FolderTree, Image, Tag, RotateCcw, ImageIcon, Trash2, AlertTriangle,
  Wallet
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import ImageUploader from "@/components/admin/ImageUploader";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { getMySqlAuth } from "@/lib/mysqlAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import NotificationBell from "@/components/NotificationBell";
import PanelSidebarTabs from "@/components/PanelSidebarTabs";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer
} from "recharts";
import MartCategoryManager from "@/components/mart/MartCategoryManager";
import MartBannerManager from "@/components/mart/MartBannerManager";
import MartCouponManager from "@/components/mart/MartCouponManager";
import MartReturnManager from "@/components/mart/MartReturnManager";

const orderStatusMap: Record<string, { label: string; color: string }> = {
  pending: { label: "অপেক্ষমাণ", color: "bg-yellow-100 text-yellow-800" },
  confirmed: { label: "নিশ্চিত", color: "bg-blue-100 text-blue-800" },
  processing: { label: "প্রস্তুত হচ্ছে", color: "bg-indigo-100 text-indigo-800" },
  shipped: { label: "শিপড", color: "bg-cyan-100 text-cyan-800" },
  delivered: { label: "ডেলিভারি সম্পন্ন", color: "bg-green-100 text-green-800" },
  cancelled: { label: "বাতিল", color: "bg-red-100 text-red-800" },
};

const txStatusMap: Record<string, string> = {
  paid: "bg-green-100 text-green-800",
  unpaid: "bg-yellow-100 text-yellow-800",
  failed: "bg-red-100 text-red-800",
  cancelled: "bg-gray-100 text-gray-800",
  initiated: "bg-blue-100 text-blue-800",
};

const COLORS = ["#16a34a", "#059669", "#0d9488", "#0891b2", "#2563eb", "#7c3aed"];

const MartAdminPanel = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const bn = language === "bn";
  const API_BASE_URL = import.meta.env.VITE_MART_API_BASE_URL || import.meta.env.VITE_API_BASE || "http://localhost:8081";
  // FIX: getMySqlAuth() may return an object whose `.user` is undefined —
  // `.user.type` alone would throw and crash the whole page.
  const mysqlRole = getMySqlAuth()?.user?.type;
  const isSignedIn = Boolean(user || mysqlRole);

  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [searchProduct, setSearchProduct] = useState("");
  const [searchOrder, setSearchOrder] = useState("");
  const [filterOrderStatus, setFilterOrderStatus] = useState("all");
  const [filterProductStatus, setFilterProductStatus] = useState("all");
  const [editingImageProduct, setEditingImageProduct] = useState<any | null>(null);
  const [newImageUrl, setNewImageUrl] = useState("");

  // Transactions (MySQL-backed, separate from the Supabase data above)
  const [transactions, setTransactions] = useState<any[]>([]);
  const [txLoading, setTxLoading] = useState(false);
  const [txSearch, setTxSearch] = useState("");
  const [txStatus, setTxStatus] = useState("all");
  const [txPage, setTxPage] = useState(1);
  const [txTotalPages, setTxTotalPages] = useState(1);

  useEffect(() => {
    if (!authLoading && !isSignedIn) navigate("/mart/login", { replace: true });
  }, [isSignedIn, authLoading, navigate]);

  const checkRole = useCallback(async () => {
    const roles = mysqlRole ? [mysqlRole] : [];
    if (user) {
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
      roles.push(...(data?.map(r => r.role) || []));
    }
    const allowed = ["admin", "super_admin", "mart_admin"];
    setHasAccess(roles.some((rl) => allowed.includes(rl)));
    setLoading(false);
  }, [user, mysqlRole]);

  const fetchAll = useCallback(async () => {
    const { data: prods } = await supabase.from("mart_products").select("*").order("created_at", { ascending: false });
    if (prods) setProducts(prods);
    const { data: ords } = await supabase.from("mart_orders").select("*").order("created_at", { ascending: false });
    if (ords) setOrders(ords);
    const { data: vRoles } = await supabase.from("user_roles").select("user_id").eq("role", "mart_vendor");
    if (vRoles) {
      const vendorIds = vRoles.map(v => v.user_id);
      if (vendorIds.length > 0) {
        const { data: profiles } = await supabase.from("profiles").select("*").in("user_id", vendorIds);
        if (profiles) setVendors(profiles);
      }
    }
  }, []);

  // NOTE: assumes a relative /api/transactions route proxied to your Node/Express
  // server, with no auth header required. If your other MySQL calls use a full
  // base URL (VITE_API_URL) or send an Authorization/Bearer token, tell me and
  // I'll update just this function.
const fetchTransactions = useCallback(async () => {
  setTxLoading(true);
  try {
    const params = new URLSearchParams({ page: String(txPage), limit: "20" });
    if (txStatus !== "all") params.set("status", txStatus);
    if (txSearch) params.set("search", txSearch);

    const auth = getMySqlAuth();
    const token = auth?.token;

    const res = await fetch(`${API_BASE_URL}/api/transactions?${params.toString()}`, {
      credentials: "include", // matches the cookie-based pattern used elsewhere in mysqlAuth.ts
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    setTransactions(json.data || []);
    setTxTotalPages(json.pagination?.totalPages || 1);
  } catch (e) {
    console.error("fetchTransactions error:", e);
    toast.error(bn ? "লেনদেন লোড ব্যর্থ" : "Failed to load transactions");
    setTransactions([]);
  } finally {
    setTxLoading(false);
  }
  }, [API_BASE_URL, txPage, txStatus, txSearch, bn]);

  useEffect(() => { checkRole(); }, [checkRole]);
  useEffect(() => { if (hasAccess) fetchAll(); }, [hasAccess, fetchAll]);
  useEffect(() => { if (hasAccess) fetchTransactions(); }, [hasAccess, fetchTransactions]);

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    const { error } = await supabase.from("mart_orders").update({ status: newStatus }).eq("id", orderId);
    if (!error) {
      toast.success(bn ? "অর্ডার আপডেট হয়েছে" : "Order updated");
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
    }
  };

  const toggleProductActive = async (id: string, current: boolean) => {
    const { error } = await supabase.from("mart_products").update({ is_active: !current }).eq("id", id);
    if (!error) {
      setProducts(prev => prev.map(p => p.id === id ? { ...p, is_active: !current } : p));
      toast.success(bn ? "আপডেট হয়েছে" : "Updated");
    }
  };

  const openImageEditor = (product: any) => {
    setEditingImageProduct(product);
    setNewImageUrl(product.image_url || "");
  };

  const saveProductImage = async () => {
    if (!editingImageProduct) return;
    const { error } = await supabase
      .from("mart_products")
      .update({ image_url: newImageUrl || null })
      .eq("id", editingImageProduct.id);
    if (error) {
      toast.error(bn ? "আপডেট ব্যর্থ" : "Update failed");
      return;
    }
    setProducts(prev => prev.map(p => p.id === editingImageProduct.id ? { ...p, image_url: newImageUrl || null } : p));
    toast.success(bn ? "ছবি আপডেট হয়েছে" : "Image updated");
    setEditingImageProduct(null);
    setNewImageUrl("");
  };

  const removeProductImage = async (id: string) => {
    const { error } = await supabase.from("mart_products").update({ image_url: null }).eq("id", id);
    if (error) {
      toast.error(bn ? "মুছতে ব্যর্থ" : "Failed");
      return;
    }
    setProducts(prev => prev.map(p => p.id === id ? { ...p, image_url: null } : p));
    toast.success(bn ? "ছবি মুছে ফেলা হয়েছে" : "Image removed");
  };

  if (authLoading || loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6">
        <Shield className="h-16 w-16 text-muted-foreground/40" />
        <h2 className="text-xl font-bold text-foreground">{bn ? "অ্যাক্সেস নেই" : "Access Denied"}</h2>
        <p className="text-muted-foreground text-center">{bn ? "শুধুমাত্র অ্যাডমিন অ্যাক্সেস পাবেন।" : "Admin access only."}</p>
        <Button onClick={() => navigate("/")}>{bn ? "হোমে যান" : "Go Home"}</Button>
      </div>
    );
  }

  const filteredProducts = products.filter(p => {
    const matchSearch = p.name.includes(searchProduct) || (p.name_en || "").toLowerCase().includes(searchProduct.toLowerCase());
    const matchStatus = filterProductStatus === "all" || (filterProductStatus === "active" ? p.is_active : !p.is_active);
    return matchSearch && matchStatus;
  });

  const filteredOrders = orders.filter(o => {
    const matchSearch = o.customer_name?.includes(searchOrder) || o.order_number?.includes(searchOrder);
    const matchStatus = filterOrderStatus === "all" || o.status === filterOrderStatus;
    return matchSearch && matchStatus;
  });

  const totalRevenue = orders.filter(o => o.status === "delivered").reduce((s: number, o: any) => s + (o.total || 0), 0);

  const statusData = Object.entries(orderStatusMap).map(([k, v]) => ({
    name: v.label, value: orders.filter(o => o.status === k).length,
  })).filter(d => d.value > 0);

  // FIX: value is now lowercase "package" so it actually matches the
  // activeTab === "package" check below (was "Package" vs "package").
  const sidebarItems = [
    { value: "orders", label: bn ? "অর্ডার" : "Orders", icon: <ShoppingCart />, group: bn ? "ড্যাশবোর্ড" : "Dashboard" },
    { value: "returns", label: bn ? "রিটার্ন/রিফান্ড" : "Returns", icon: <RotateCcw />, group: bn ? "ড্যাশবোর্ড" : "Dashboard" },
    { value: "products", label: bn ? "পণ্য" : "Products", icon: <Package />, group: bn ? "ড্যাশবোর্ড" : "Dashboard" },
    { value: "vendors", label: bn ? "ভেন্ডর/শপ" : "Vendors", icon: <Store />, group: bn ? "ড্যাশবোর্ড" : "Dashboard" },
    { value: "package", label: bn ? "প্যাকেজ" : "Package", icon: <Package />, group: bn ? "ফাইন্যান্স" : "Finance" },
    { value: "wallet", label: bn ? "ওয়ালেট" : "Wallet", icon: <Wallet />, group: bn ? "ফাইন্যান্স" : "Finance" },
    { value: "withdrawals", label: bn ? "উইথড্রয়াল" : "Withdrawals", icon: <DollarSign />, group: bn ? "ফাইন্যান্স" : "Finance" },
    { value: "transactions", label: bn ? "লেনদেন" : "Transactions", icon: <DollarSign />, group: bn ? "ফাইন্যান্স" : "Finance" },
    { value: "categories", label: bn ? "ক্যাটেগরি" : "Categories", icon: <FolderTree />, group: bn ? "CMS ম্যানেজমেন্ট" : "CMS" },
    { value: "banners", label: bn ? "ব্যানার" : "Banners", icon: <Image />, group: bn ? "CMS ম্যানেজমেন্ট" : "CMS" },
    { value: "coupons", label: bn ? "কুপন" : "Coupons", icon: <Tag />, group: bn ? "CMS ম্যানেজমেন্ট" : "CMS" },
    { value: "analytics", label: bn ? "রিপোর্ট" : "Analytics", icon: <BarChart3 />, group: bn ? "পরিসংখ্যান" : "Analytics" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-7xl mx-auto px-4 py-6 pb-28 md:pb-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-foreground flex items-center gap-2">
              🏪 {bn ? "মার্ট অ্যাডমিন প্যানেল" : "Mart Admin Panel"}
            </h1>
            <p className="text-sm text-muted-foreground">{bn ? "সকল ভেন্ডর, পণ্য ও অর্ডার ম্যানেজ করুন" : "Manage all vendors, products & orders"}</p>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <Button variant="outline" size="sm" onClick={() => navigate("/internal")}>
              <MessageCircle className="h-4 w-4 mr-1" />{bn ? "চ্যাট" : "Chat"}
            </Button>
          </div>
        </div>

        <Card className="border-border/50 overflow-hidden">
          <PanelSidebarTabs
            items={sidebarItems}
            defaultValue="orders"
            panelTitle={bn ? "মার্ট অ্যাডমিন" : "Mart Admin"}
            hero={{
              title: bn ? "সন্ধান মার্ট কন্ট্রোল" : "Yess Mart Control",
              subtitle: bn ? "ভেন্ডর, পণ্য, অর্ডার ও ডেলিভারি — এক অ্যাডমিন ভিউ।" : "Vendors, products, orders & delivery — one admin view.",
              badge: { label: bn ? "মার্ট অ্যাডমিন" : "Mart Admin" },
              gradient: "from-emerald-500 via-teal-600 to-emerald-700",
            }}
            panelIcon={<Store className="h-5 w-5" />}
          >
            {(activeTab) => (
              <div className="p-4 md:p-6">
                {/* Stats — lives inside the content pane so it sits beside the sidebar */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                  {[
                    { icon: DollarSign, label: bn ? "মোট রেভিনিউ" : "Revenue", value: `৳${totalRevenue.toLocaleString("bn-BD")}`, color: "text-green-600", bg: "bg-green-50" },
                    { icon: ShoppingCart, label: bn ? "মোট অর্ডার" : "Orders", value: orders.length, color: "text-blue-600", bg: "bg-blue-50" },
                    { icon: Package, label: bn ? "মোট পণ্য" : "Products", value: products.length, color: "text-purple-600", bg: "bg-purple-50" },
                    { icon: Store, label: bn ? "মোট ভেন্ডর" : "Vendors", value: vendors.length, color: "text-amber-600", bg: "bg-amber-50" },
                  ].map((stat, i) => (
                    <Card key={i} className="border-border/50">
                      <CardContent className="p-4 flex items-center gap-3">
                        <div className={`${stat.bg} p-2 rounded-lg`}><stat.icon className={`h-5 w-5 ${stat.color}`} /></div>
                        <div>
                          <p className="text-sm text-muted-foreground">{stat.label}</p>
                          <p className="text-lg font-bold text-foreground">{stat.value}</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Orders */}
                {activeTab === "orders" && (
                  <div className="space-y-4">
                    <div className="flex flex-col md:flex-row gap-3">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input placeholder={bn ? "অর্ডার খুঁজুন..." : "Search..."} value={searchOrder} onChange={e => setSearchOrder(e.target.value)} className="pl-9" />
                      </div>
                      <Select value={filterOrderStatus} onValueChange={setFilterOrderStatus}>
                        <SelectTrigger className="w-full md:w-48"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">{bn ? "সকল" : "All"}</SelectItem>
                          {Object.entries(orderStatusMap).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-3">
                      {filteredOrders.map(order => (
                        <Card key={order.id} className="border-border/50">
                          <CardContent className="p-4">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-bold text-foreground">{order.order_number}</span>
                                  <Badge className={`${orderStatusMap[order.status]?.color} text-xs`}>{orderStatusMap[order.status]?.label || order.status}</Badge>
                                  <Badge variant="outline" className="text-[10px]">{order.payment_status}</Badge>
                                </div>
                                <p className="text-sm text-foreground">{order.customer_name} • {order.customer_phone}</p>
                                <p className="text-xs text-muted-foreground">{order.shipping_address}</p>
                              </div>
                              <div className="flex items-center gap-3">
                                <p className="text-lg font-bold text-primary">৳{order.total.toLocaleString("bn-BD")}</p>
                                <Select value={order.status} onValueChange={(v) => updateOrderStatus(order.id, v)}>
                                  <SelectTrigger className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    {Object.entries(orderStatusMap).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                      {filteredOrders.length === 0 && (
                        <div className="py-12 text-center text-muted-foreground">
                          <ShoppingCart className="h-12 w-12 mx-auto mb-3 opacity-30" />
                          <p>{bn ? "কোনো অর্ডার নেই" : "No orders"}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Products */}
                {activeTab === "products" && (
                  <div className="space-y-4">
                    <div className="flex flex-col md:flex-row gap-3">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input placeholder={bn ? "পণ্য খুঁজুন..." : "Search..."} value={searchProduct} onChange={e => setSearchProduct(e.target.value)} className="pl-9" />
                      </div>
                      <Select value={filterProductStatus} onValueChange={setFilterProductStatus}>
                        <SelectTrigger className="w-full md:w-40"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">{bn ? "সকল" : "All"}</SelectItem>
                          <SelectItem value="active">{bn ? "সক্রিয়" : "Active"}</SelectItem>
                          <SelectItem value="inactive">{bn ? "নিষ্ক্রিয়" : "Inactive"}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="overflow-x-auto rounded-lg border border-border/50">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/50">
                          <tr>
                            <th className="text-left p-3 font-medium">{bn ? "পণ্য" : "Product"}</th>
                            <th className="text-right p-3 font-medium">{bn ? "মূল্য" : "Price"}</th>
                            <th className="text-right p-3 font-medium">{bn ? "স্টক" : "Stock"}</th>
                            <th className="text-center p-3 font-medium">{bn ? "স্ট্যাটাস" : "Status"}</th>
                            <th className="text-center p-3 font-medium">{bn ? "অ্যাকশন" : "Action"}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredProducts.map(p => (
                            <tr key={p.id} className="border-t border-border/30 hover:bg-muted/30">
                              <td className="p-3">
                                <div className="flex items-center gap-2">
                                  <div className={`w-8 h-8 rounded bg-muted overflow-hidden shrink-0 ${!p.image_url ? "ring-2 ring-yellow-400" : ""}`}>
                                    {p.image_url ? <img src={p.image_url} alt="" className="w-full h-full object-cover" /> : <span className="flex items-center justify-center w-full h-full text-yellow-600 bg-yellow-50"><AlertTriangle className="h-3.5 w-3.5" /></span>}
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="font-medium text-foreground text-xs truncate max-w-[200px]">{p.name}</span>
                                    {!p.image_url && (
                                      <span className="text-[10px] text-yellow-700 font-medium">⚠ {bn ? "ছবি নেই" : "No image"}</span>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="p-3 text-right">৳{p.price}</td>
                              <td className="p-3 text-right">{p.stock || 0}</td>
                              <td className="p-3 text-center">
                                <Badge variant={p.is_active ? "default" : "secondary"} className="text-[10px] cursor-pointer" onClick={() => toggleProductActive(p.id, !!p.is_active)}>
                                  {p.is_active ? "✓" : "✗"}
                                </Badge>
                              </td>
                              <td className="p-3 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <Button variant="ghost" size="icon" className="h-7 w-7" title={bn ? "ছবি এডিট" : "Edit image"} onClick={() => openImageEditor(p)}>
                                    <ImageIcon className="h-3.5 w-3.5" />
                                  </Button>
                                  {p.image_url && (
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" title={bn ? "ছবি মুছুন" : "Remove image"} onClick={() => removeProductImage(p.id)}>
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  )}
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigate(`/mart/product/${p.slug}`)}><Eye className="h-3.5 w-3.5" /></Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Returns */}
                {activeTab === "returns" && <MartReturnManager />}

                {/* Package — placeholder until package/plan table is confirmed */}
                {activeTab === "package" && (
                  <div className="py-12 text-center text-muted-foreground">
                    <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p>{bn ? "প্যাকেজ ম্যানেজমেন্ট শীঘ্রই আসছে" : "Package management coming soon"}</p>
                  </div>
                )}

                {/* Wallet — placeholder until wallet table is confirmed */}
                {activeTab === "wallet" && (
                  <div className="py-12 text-center text-muted-foreground">
                    <Wallet className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p>{bn ? "ওয়ালেট ডেটা শীঘ্রই আসছে" : "Wallet data coming soon"}</p>
                  </div>
                )}

                {/* Withdrawals — placeholder until withdrawal table is confirmed */}
                {activeTab === "withdrawals" && (
                  <div className="py-12 text-center text-muted-foreground">
                    <DollarSign className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p>{bn ? "উইথড্রয়াল রিকোয়েস্ট শীঘ্রই আসছে" : "Withdrawal requests coming soon"}</p>
                  </div>
                )}

                {/* Transactions — live MySQL data */}
                {activeTab === "transactions" && (
                  <div className="space-y-4">
                    <div className="flex flex-col md:flex-row gap-3">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder={bn ? "ট্রান্স আইডি বা অর্ডার নম্বর..." : "Transaction ID or order #..."}
                          value={txSearch}
                          onChange={(e) => { setTxSearch(e.target.value); setTxPage(1); }}
                          className="pl-9"
                        />
                      </div>
                      <Select value={txStatus} onValueChange={(v) => { setTxStatus(v); setTxPage(1); }}>
                        <SelectTrigger className="w-full md:w-44"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">{bn ? "সকল" : "All"}</SelectItem>
                          <SelectItem value="paid">{bn ? "পরিশোধিত" : "Paid"}</SelectItem>
                          <SelectItem value="unpaid">{bn ? "অপরিশোধিত" : "Unpaid"}</SelectItem>
                          <SelectItem value="failed">{bn ? "ব্যর্থ" : "Failed"}</SelectItem>
                          <SelectItem value="cancelled">{bn ? "বাতিল" : "Cancelled"}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {txLoading ? (
                      <div className="py-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
                    ) : (
                      <>
                        <div className="overflow-x-auto rounded-lg border border-border/50">
                          <table className="w-full text-sm">
                            <thead className="bg-muted/50">
                              <tr>
                                <th className="text-left p-3 font-medium">{bn ? "ট্রান্স আইডি" : "Transaction ID"}</th>
                                <th className="text-left p-3 font-medium">{bn ? "অর্ডার" : "Order"}</th>
                                <th className="text-left p-3 font-medium">{bn ? "ব্যবহারকারী" : "User"}</th>
                                <th className="text-left p-3 font-medium">{bn ? "বিবরণ" : "Details"}</th>
                                <th className="text-left p-3 font-medium">{bn ? "গেটওয়ে" : "Gateway"}</th>
                                <th className="text-right p-3 font-medium">{bn ? "পরিমাণ" : "Amount"}</th>
                                <th className="text-center p-3 font-medium">{bn ? "স্ট্যাটাস" : "Status"}</th>
                                <th className="text-left p-3 font-medium">{bn ? "তারিখ" : "Date"}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {transactions.map((tx) => (
                                <tr key={tx.id} className="border-t border-border/30 hover:bg-muted/30">
                                  <td className="p-3 font-mono text-xs">{tx.transaction_id}</td>
                                  <td className="p-3">{tx.order_number || "—"}</td>
                                  <td className="p-3">{tx.user_name || "—"}</td>
                                  <td className="p-3 text-sm text-muted-foreground">{tx.package_details || "—"}</td>
                                  <td className="p-3 capitalize">{tx.gateway}</td>
                                  <td className="p-3 text-right font-bold">{tx.currency} {Number(tx.amount || 0).toLocaleString("bn-BD")}</td>
                                  <td className="p-3 text-center">
                                    <Badge className={txStatusMap[tx.payment_status] || "bg-gray-100 text-gray-800"}>
                                      {tx.payment_status}
                                    </Badge>
                                  </td>
                                  <td className="p-3 text-xs text-muted-foreground">
                                    {tx.created_at ? new Date(tx.created_at).toLocaleString("bn-BD") : "—"}
                                  </td>
                                </tr>
                              ))}
                              {transactions.length === 0 && (
                                <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">{bn ? "কোনো লেনদেন নেই" : "No transactions"}</td></tr>
                              )}
                            </tbody>
                          </table>
                        </div>

                        {txTotalPages > 1 && (
                          <div className="flex items-center justify-center gap-2">
                            <Button variant="outline" size="sm" disabled={txPage <= 1} onClick={() => setTxPage(p => Math.max(1, p - 1))}>
                              {bn ? "আগের" : "Prev"}
                            </Button>
                            <span className="text-sm text-muted-foreground">{txPage} / {txTotalPages}</span>
                            <Button variant="outline" size="sm" disabled={txPage >= txTotalPages} onClick={() => setTxPage(p => Math.min(txTotalPages, p + 1))}>
                              {bn ? "পরের" : "Next"}
                            </Button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* Categories */}
                {activeTab === "categories" && <MartCategoryManager />}

                {/* Vendors */}
                {activeTab === "vendors" && (
                  <div className="space-y-4">
                    {vendors.length === 0 ? (
                      <div className="py-12 text-center text-muted-foreground">
                        <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
                        <p>{bn ? "কোনো ভেন্ডর নেই" : "No vendors"}</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {vendors.map(v => {
                          const vendorProducts = products.filter(p => p.vendor_id === v.user_id);
                          return (
                            <Card key={v.id} className="border-border/50">
                              <CardContent className="p-4">
                                <div className="flex items-center gap-3 mb-3">
                                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xl font-bold">
                                    {(v.display_name || "V")[0].toUpperCase()}
                                  </div>
                                  <div>
                                    <p className="font-bold text-foreground">{v.display_name || (bn ? "ভেন্ডর" : "Vendor")}</p>
                                    <p className="text-xs text-muted-foreground">{v.phone || "—"}</p>
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-center">
                                  <div className="bg-muted/50 rounded-lg p-2">
                                    <p className="text-lg font-bold text-foreground">{vendorProducts.length}</p>
                                    <p className="text-[10px] text-muted-foreground">{bn ? "পণ্য" : "Products"}</p>
                                  </div>
                                  <div className="bg-muted/50 rounded-lg p-2">
                                    <p className="text-lg font-bold text-foreground">{vendorProducts.filter(p => p.is_active).length}</p>
                                    <p className="text-[10px] text-muted-foreground">{bn ? "সক্রিয়" : "Active"}</p>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Banners */}
                {activeTab === "banners" && <MartBannerManager />}

                {/* Coupons */}
                {activeTab === "coupons" && <MartCouponManager />}

                {/* Analytics */}
                {activeTab === "analytics" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="border-border/50">
                      <CardHeader><CardTitle className="text-base">{bn ? "অর্ডার স্ট্যাটাস" : "Order Status"}</CardTitle></CardHeader>
                      <CardContent>
                        {statusData.length > 0 ? (
                          <ResponsiveContainer width="100%" height={250}>
                            <PieChart>
                              <Pie data={statusData} cx="50%" cy="50%" innerRadius={50} outerRadius={90} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                                {statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                              </Pie>
                              <Tooltip />
                            </PieChart>
                          </ResponsiveContainer>
                        ) : <p className="text-center py-8 text-muted-foreground">{bn ? "ডেটা নেই" : "No data"}</p>}
                      </CardContent>
                    </Card>
                    <Card className="border-border/50">
                      <CardHeader><CardTitle className="text-base">{bn ? "ভেন্ডর অনুযায়ী পণ্য" : "Products by Vendor"}</CardTitle></CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {vendors.map((v) => {
                            const count = products.filter(p => p.vendor_id === v.user_id).length;
                            return (
                              <div key={v.id} className="flex items-center justify-between">
                                <span className="text-sm text-foreground">{v.display_name || "Vendor"}</span>
                                <Badge variant="secondary">{count} {bn ? "পণ্য" : "products"}</Badge>
                              </div>
                            );
                          })}
                          {vendors.length === 0 && <p className="text-center py-4 text-muted-foreground">{bn ? "ডেটা নেই" : "No data"}</p>}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>
            )}
          </PanelSidebarTabs>
        </Card>
      </motion.div>

      <Dialog open={!!editingImageProduct} onOpenChange={(o) => { if (!o) { setEditingImageProduct(null); setNewImageUrl(""); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{bn ? "পণ্যের ছবি আপডেট" : "Update Product Image"}</DialogTitle>
          </DialogHeader>
          {editingImageProduct && (
            <div className="space-y-3">
              <p className="text-sm text-foreground font-medium truncate">{editingImageProduct.name}</p>
              <p className="text-xs text-muted-foreground font-mono">{editingImageProduct.slug}</p>
              <ImageUploader
                value={newImageUrl}
                onChange={setNewImageUrl}
                folder="mart-products"
                label={bn ? "নতুন ছবি" : "New image"}
              />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditingImageProduct(null); setNewImageUrl(""); }}>
              {bn ? "বাতিল" : "Cancel"}
            </Button>
            <Button onClick={saveProductImage}>{bn ? "সেভ করুন" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MartAdminPanel;
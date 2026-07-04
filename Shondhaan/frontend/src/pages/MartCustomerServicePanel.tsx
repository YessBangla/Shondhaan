import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Headphones, ShoppingCart, Search, Loader2,
  MessageCircle, Phone, MapPin, Clock, AlertTriangle,
  Package, XCircle, Eye, RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { hasStaffRoleAccess } from "@/lib/roleAccess";
import { toast } from "sonner";
import NotificationBell from "@/components/NotificationBell";
import PanelSidebarTabs from "@/components/PanelSidebarTabs";

const orderStatusMap: Record<string, { label: string; color: string }> = {
  pending: { label: "অপেক্ষমাণ", color: "bg-yellow-100 text-yellow-800" },
  confirmed: { label: "নিশ্চিত", color: "bg-blue-100 text-blue-800" },
  processing: { label: "প্রসেসিং", color: "bg-indigo-100 text-indigo-800" },
  shipped: { label: "শিপড", color: "bg-cyan-100 text-cyan-800" },
  delivered: { label: "ডেলিভার্ড", color: "bg-green-100 text-green-800" },
  cancelled: { label: "বাতিল", color: "bg-red-100 text-red-800" },
};

const MartCustomerServicePanel = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const bn = language === "bn";

  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [csNote, setCsNote] = useState("");

  useEffect(() => {
    if (!authLoading && !user) navigate("/main-login", { replace: true });
  }, [user, authLoading, navigate]);

  const checkRole = useCallback(async () => {
    if (!user) return;
    setHasAccess(await hasStaffRoleAccess(user.id, ["mart_cs"]));
    setLoading(false);
  }, [user]);

  const fetchOrders = useCallback(async () => {
    const { data } = await supabase.from("mart_orders").select("*").order("created_at", { ascending: false });
    if (data) setOrders(data);
  }, []);

  useEffect(() => { checkRole(); }, [checkRole]);
  useEffect(() => { if (hasAccess) fetchOrders(); }, [hasAccess, fetchOrders]);

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    const { error } = await supabase.from("mart_orders").update({ status: newStatus }).eq("id", orderId);
    if (!error) {
      toast.success(bn ? "অর্ডার আপডেট হয়েছে" : "Order updated");
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
      if (selectedOrder?.id === orderId) setSelectedOrder((prev: any) => ({ ...prev, status: newStatus }));
    }
  };

  const addNote = async (orderId: string) => {
    if (!csNote.trim()) return;
    const { error } = await supabase.from("mart_orders").update({ notes: csNote }).eq("id", orderId);
    if (!error) {
      toast.success(bn ? "নোট সেভ হয়েছে" : "Note saved");
      setCsNote("");
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, notes: csNote } : o));
    }
  };

  if (authLoading || loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6">
        <Headphones className="h-16 w-16 text-muted-foreground/40" />
        <h2 className="text-xl font-bold text-foreground">{bn ? "অ্যাক্সেস নেই" : "Access Denied"}</h2>
        <p className="text-muted-foreground text-center">{bn ? "কাস্টমার সার্ভিস অ্যাক্সেস প্রয়োজন।" : "CS access required."}</p>
        <Button onClick={() => navigate("/")}>{bn ? "হোমে যান" : "Go Home"}</Button>
      </div>
    );
  }

  const filteredOrders = orders.filter(o => {
    const matchSearch = o.customer_name?.includes(search) || o.order_number?.includes(search) || o.customer_phone?.includes(search);
    const matchStatus = filterStatus === "all" || o.status === filterStatus;
    return (!search || matchSearch) && matchStatus;
  });

  const pendingCount = orders.filter(o => o.status === "pending").length;
  const issueCount = orders.filter(o => o.status === "cancelled").length;
  const activeCount = orders.filter(o => !["delivered", "cancelled"].includes(o.status)).length;
  const returnRequests = orders.filter(o => o.return_requested_at);

  const sidebarItems = [
    { value: "orders", label: bn ? "সকল অর্ডার" : "All Orders", icon: <ShoppingCart />, group: bn ? "অর্ডার ম্যানেজমেন্ট" : "Orders" },
    { value: "issues", label: bn ? `বাতিল/সমস্যা (${issueCount})` : `Issues (${issueCount})`, icon: <AlertTriangle />, group: bn ? "সমস্যা" : "Issues" },
    { value: "returns", label: bn ? `রিটার্ন (${returnRequests.length})` : `Returns (${returnRequests.length})`, icon: <Package /> },
  ];

  const getDisplayOrders = (tab: string) => {
    if (tab === "issues") return filteredOrders.filter(o => o.status === "cancelled");
    if (tab === "returns") return filteredOrders.filter(o => o.return_requested_at);
    return filteredOrders;
  };

  return (
    <div className="min-h-screen bg-background">
      
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-7xl mx-auto px-4 py-6 pb-28 md:pb-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-foreground flex items-center gap-2">
              🎧 {bn ? "কাস্টমার সার্ভিস প্যানেল" : "Customer Service Panel"}
            </h1>
            <p className="text-sm text-muted-foreground">{bn ? "কাস্টমার অভিযোগ ও অর্ডার সমস্যা সমাধান করুন" : "Handle customer issues & order problems"}</p>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <Button variant="outline" size="sm" onClick={() => navigate("/internal")}>
              <MessageCircle className="h-4 w-4 mr-1" />{bn ? "চ্যাট" : "Chat"}
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { label: bn ? "অপেক্ষমাণ" : "Pending", value: pendingCount, color: "text-amber-600", bg: "bg-amber-50", icon: Clock },
            { label: bn ? "সক্রিয় অর্ডার" : "Active", value: activeCount, color: "text-blue-600", bg: "bg-blue-50", icon: ShoppingCart },
            { label: bn ? "রিটার্ন রিকোয়েস্ট" : "Returns", value: returnRequests.length, color: "text-orange-600", bg: "bg-orange-50", icon: Package },
            { label: bn ? "বাতিল/সমস্যা" : "Issues", value: issueCount, color: "text-red-600", bg: "bg-red-50", icon: AlertTriangle },
          ].map((stat, i) => (
            <Card key={i} className="border-border/50">
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`${stat.bg} p-2 rounded-lg`}><stat.icon className={`h-5 w-5 ${stat.color}`} /></div>
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-xl font-bold text-foreground">{stat.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="border-border/50 overflow-hidden">
          <PanelSidebarTabs
            items={sidebarItems}
            defaultValue="orders"
            panelTitle={bn ? "CS মেনু" : "CS Menu"}
            panelIcon={<Headphones className="h-5 w-5" />}
          >
            {(activeTab) => {
              const displayOrders = getDisplayOrders(activeTab);
              return (
                <div className="p-4 md:p-6">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* Orders List */}
                    <div className="lg:col-span-2 space-y-4">
                      <div className="flex flex-col md:flex-row gap-3">
                        <div className="relative flex-1">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input placeholder={bn ? "অর্ডার/কাস্টমার খুঁজুন..." : "Search..."} value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
                        </div>
                        <Select value={filterStatus} onValueChange={setFilterStatus}>
                          <SelectTrigger className="w-full md:w-48"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">{bn ? "সকল" : "All"}</SelectItem>
                            {Object.entries(orderStatusMap).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <Button variant="outline" size="icon" onClick={fetchOrders}><RefreshCw className="h-4 w-4" /></Button>
                      </div>
                      <div className="space-y-2 max-h-[600px] overflow-y-auto">
                        {displayOrders.map(order => {
                          const sc = orderStatusMap[order.status];
                          const isSelected = selectedOrder?.id === order.id;
                          return (
                            <Card key={order.id} className={`border-border/50 cursor-pointer transition-colors ${isSelected ? "ring-2 ring-primary" : "hover:bg-muted/30"}`} onClick={() => setSelectedOrder(order)}>
                              <CardContent className="p-3">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="font-bold text-foreground text-sm">{order.order_number}</span>
                                      {sc && <Badge className={`${sc.color} text-[10px]`}>{sc.label}</Badge>}
                                    </div>
                                    <p className="text-xs text-foreground mt-1">{order.customer_name} • {order.customer_phone}</p>
                                  </div>
                                  <p className="font-bold text-primary">৳{order.total.toLocaleString("bn-BD")}</p>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                        {displayOrders.length === 0 && (
                          <div className="py-12 text-center text-muted-foreground">
                            <ShoppingCart className="h-12 w-12 mx-auto mb-3 opacity-30" />
                            <p>{bn ? "কোনো অর্ডার নেই" : "No orders"}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Order Detail Panel */}
                    <div>
                      {selectedOrder ? (
                        <Card className="border-border/50 sticky top-4">
                          <CardContent className="p-4 space-y-4">
                            <div className="flex items-center justify-between">
                              <h3 className="font-bold text-foreground">{selectedOrder.order_number}</h3>
                              <Badge className={`${orderStatusMap[selectedOrder.status]?.color} text-xs`}>{orderStatusMap[selectedOrder.status]?.label}</Badge>
                            </div>
                            <div className="space-y-2 text-sm">
                              <p><span className="font-medium">{bn ? "কাস্টমার:" : "Customer:"}</span> {selectedOrder.customer_name}</p>
                              <p className="flex items-center gap-2"><Phone className="h-3 w-3" />{selectedOrder.customer_phone}</p>
                              <p className="flex items-center gap-2"><MapPin className="h-3 w-3" />{selectedOrder.shipping_address}</p>
                              <p><span className="font-medium">{bn ? "মোট:" : "Total:"}</span> ৳{selectedOrder.total.toLocaleString("bn-BD")}</p>
                              <p><span className="font-medium">{bn ? "পেমেন্ট:" : "Payment:"}</span> {selectedOrder.payment_method} ({selectedOrder.payment_status})</p>
                              <p className="text-xs text-muted-foreground">{new Date(selectedOrder.created_at).toLocaleString("bn-BD")}</p>
                            </div>
                            {selectedOrder.notes && (
                              <div className="bg-muted/50 rounded-lg p-3">
                                <p className="text-xs font-medium mb-1">{bn ? "নোট:" : "Notes:"}</p>
                                <p className="text-sm text-muted-foreground">{selectedOrder.notes}</p>
                              </div>
                            )}
                            {selectedOrder.return_requested_at && (
                              <div className="bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-900/40 rounded-lg p-3">
                                <p className="text-xs font-semibold text-orange-800 dark:text-orange-200 mb-1">🔄 {bn ? "রিটার্ন রিকোয়েস্ট" : "Return Request"}</p>
                                <p className="text-sm text-orange-700 dark:text-orange-300">{selectedOrder.return_reason || (bn ? "কারণ উল্লেখ করা হয়নি" : "No reason provided")}</p>
                              </div>
                            )}
                            {selectedOrder.cancel_reason && (
                              <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/40 rounded-lg p-3">
                                <p className="text-xs font-semibold text-red-800 dark:text-red-200 mb-1">❌ {bn ? "বাতিলের কারণ" : "Cancel Reason"}</p>
                                <p className="text-sm text-red-700 dark:text-red-300">{selectedOrder.cancel_reason}</p>
                              </div>
                            )}
                            <div className="space-y-2">
                              <p className="text-xs font-medium text-muted-foreground">{bn ? "স্ট্যাটাস পরিবর্তন:" : "Change Status:"}</p>
                              <Select value={selectedOrder.status} onValueChange={(v) => updateOrderStatus(selectedOrder.id, v)}>
                                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {Object.entries(orderStatusMap).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <p className="text-xs font-medium text-muted-foreground">{bn ? "CS নোট যোগ করুন:" : "Add CS Note:"}</p>
                              <Textarea placeholder={bn ? "কাস্টমারের সমস্যার বিবরণ..." : "Issue description..."} value={csNote} onChange={e => setCsNote(e.target.value)} className="text-sm" rows={3} />
                              <Button size="sm" className="w-full" onClick={() => addNote(selectedOrder.id)} disabled={!csNote.trim()}>{bn ? "নোট সেভ করুন" : "Save Note"}</Button>
                            </div>
                            <div className="flex gap-2 pt-2 border-t border-border/30">
                              <Button variant="outline" size="sm" className="flex-1" onClick={() => window.open(`tel:${selectedOrder.customer_phone}`)}>
                                <Phone className="h-4 w-4 mr-1" />{bn ? "কল" : "Call"}
                              </Button>
                              {selectedOrder.status !== "cancelled" && (
                                <Button variant="destructive" size="sm" className="flex-1" onClick={() => updateOrderStatus(selectedOrder.id, "cancelled")}>
                                  <XCircle className="h-4 w-4 mr-1" />{bn ? "বাতিল" : "Cancel"}
                                </Button>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ) : (
                        <Card className="border-border/50">
                          <CardContent className="p-8 text-center text-muted-foreground">
                            <Eye className="h-12 w-12 mx-auto mb-3 opacity-30" />
                            <p>{bn ? "একটি অর্ডার সিলেক্ট করুন" : "Select an order"}</p>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  </div>
                </div>
              );
            }}
          </PanelSidebarTabs>
        </Card>
      </motion.div>
      
    </div>
  );
};

export default MartCustomerServicePanel;

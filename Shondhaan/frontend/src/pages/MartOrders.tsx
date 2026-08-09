import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Package, ChevronRight, ArrowLeft, Clock, CheckCircle2, Truck, XCircle, MapPin, CreditCard, Box, RotateCcw, FileText, Calendar, AlertTriangle, ExternalLink, Share2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PullToRefreshIndicator from "@/components/PullToRefreshIndicator";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import InvoiceNumberBadge from "@/components/InvoiceNumberBadge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8081";

interface MartOrder {
  id: string;
  order_number: string;
  status: string;
  payment_status: string;
  payment_method: string;
  total: number;
  subtotal: number;
  shipping_fee: number | null;
  discount: number | null;
  created_at: string;
  updated_at: string;
  customer_name: string;
  customer_phone: string;
  shipping_address: string;
  estimated_delivery_date?: string | null;
  cancel_reason?: string | null;
  return_reason?: string | null;
  items?: { product_name: string; quantity: number; unit_price: number; product_image: string | null }[];
}

type IconComponent = React.ComponentType<{ className?: string }>;

const statusConfig: Record<string, { icon: IconComponent; color: string; label: string; labelBn: string }> = {
  pending:          { icon: Clock,         color: "bg-amber-100 text-amber-700",   label: "Pending",          labelBn: "অপেক্ষমাণ"        },
  confirmed:        { icon: CheckCircle2,  color: "bg-blue-100 text-blue-700",     label: "Confirmed",        labelBn: "নিশ্চিত"           },
  processing:       { icon: Box,           color: "bg-purple-100 text-purple-700", label: "Processing",       labelBn: "প্রসেসিং"          },
  shipped:          { icon: Truck,         color: "bg-indigo-100 text-indigo-700", label: "Shipped",          labelBn: "শিপড"              },
  delivered:        { icon: CheckCircle2,  color: "bg-green-100 text-green-700",   label: "Delivered",        labelBn: "ডেলিভার্ড"         },
  cancelled:        { icon: XCircle,       color: "bg-red-100 text-red-700",       label: "Cancelled",        labelBn: "বাতিল"             },
  return_requested: { icon: RotateCcw,     color: "bg-orange-100 text-orange-700", label: "Return Requested", labelBn: "রিটার্ন অনুরোধ"   },
};

const trackingSteps = [
  { key: "pending",    icon: Clock,         labelBn: "অর্ডার গৃহীত", label: "Order Placed" },
  { key: "confirmed",  icon: CheckCircle2,  labelBn: "নিশ্চিত",      label: "Confirmed"    },
  { key: "processing", icon: Box,           labelBn: "প্যাকেজিং",    label: "Packaging"    },
  { key: "shipped",    icon: Truck,         labelBn: "শিপমেন্ট",     label: "Shipped"      },
  { key: "delivered",  icon: MapPin,        labelBn: "ডেলিভার্ড",    label: "Delivered"    },
];

const getStepIndex = (status: string) => {
  if (status === "cancelled" || status === "return_requested") return -1;
  const idx = trackingSteps.findIndex((s) => s.key === status);
  return idx === -1 ? 0 : idx;
};

const OrderTracker = ({ status, bn }: { status: string; bn: boolean }) => {
  const currentIdx  = getStepIndex(status);
  const isCancelled = status === "cancelled";
  const isReturn    = status === "return_requested";

  if (isCancelled) {
    return (
      <div className="flex items-center justify-center gap-2 py-4 text-red-500">
        <XCircle className="h-5 w-5" />
        <span className="font-semibold">{bn ? "অর্ডার বাতিল করা হয়েছে" : "Order Cancelled"}</span>
      </div>
    );
  }

  if (isReturn) {
    return (
      <div className="flex items-center justify-center gap-2 py-4 text-orange-500">
        <RotateCcw className="h-5 w-5" />
        <span className="font-semibold">{bn ? "রিটার্ন অনুরোধ করা হয়েছে" : "Return Requested"}</span>
      </div>
    );
  }

  return (
    <div className="py-4">
      <div className="flex items-center justify-between relative">
        <div className="absolute top-5 left-[10%] right-[10%] h-0.5 bg-muted-foreground/20 z-0" />
        <div
          className="absolute top-5 left-[10%] h-0.5 bg-primary z-[1] transition-all duration-700"
          style={{ width: `${currentIdx === 0 ? 0 : (currentIdx / (trackingSteps.length - 1)) * 80}%` }}
        />
        {trackingSteps.map((step, idx) => {
          const StepIcon    = step.icon;
          const isPending   = status === "pending";
          const pendingIdx  = trackingSteps.findIndex((s) => s.key === "pending");
          const confirmedIdx = trackingSteps.findIndex((s) => s.key === "confirmed");
          const isActive    = isPending
            ? idx === pendingIdx || idx === confirmedIdx
            : idx === currentIdx;
          const isDone      = !isPending ? idx < currentIdx : idx < pendingIdx;

          return (
            <div key={step.key} className="flex flex-col items-center z-10 relative" style={{ width: "20%" }}>
              <motion.div
                initial={false}
                animate={isActive ? { scale: [1, 1.2, 1] } : {}}
                transition={{ duration: 0.6, repeat: isActive ? Infinity : 0, repeatDelay: 1.5 }}
                className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors ${
                  isDone || isActive
                    ? "bg-primary border-primary text-white"
                    : "bg-background border-muted-foreground/30 text-muted-foreground/40"
                }`}
              >
                <StepIcon className="h-4 w-4" />
              </motion.div>
              <span className={`text-[10px] mt-1.5 text-center font-medium leading-tight ${
                isActive ? "text-primary" : isDone ? "text-primary/80" : "text-muted-foreground/50"
              }`}>
                {bn ? step.labelBn : step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ── Invoice generator ────────────────────────────────────────────────────────
const generateInvoice = (order: MartOrder, bn: boolean) => {
  const lines = [
    `==============================`,
    bn ? `ইনভয়েস - সন্ধান মার্ট` : `INVOICE - Yess Mart`,
    `==============================`,
    ``,
    `${bn ? "অর্ডার নম্বর" : "Order #"}: ${order.order_number}`,
    `${bn ? "তারিখ" : "Date"}: ${new Date(order.created_at).toLocaleDateString("bn-BD")}`,
    `${bn ? "গ্রাহক" : "Customer"}: ${order.customer_name}`,
    `${bn ? "ফোন" : "Phone"}: ${order.customer_phone}`,
    `${bn ? "ঠিকানা" : "Address"}: ${order.shipping_address}`,
    ``,
    `------------------------------`,
    `${bn ? "পণ্য" : "Item"}`.padEnd(25) + `${bn ? "মোট" : "Total"}`,
    `------------------------------`,
  ];

  order.items?.forEach((item) => {
    lines.push(`${item.product_name.slice(0, 22).padEnd(22)} x${item.quantity}  ৳${(item.unit_price * item.quantity).toLocaleString("bn-BD")}`);
  });

  lines.push(`------------------------------`);
  lines.push(`${(bn ? "সাবটোটাল" : "Subtotal").padEnd(25)} ৳${(order.subtotal || 0).toLocaleString("bn-BD")}`);
  if ((order.shipping_fee ?? 0) > 0)
    lines.push(`${(bn ? "ডেলিভারি ফি" : "Delivery").padEnd(25)} ৳${(order.shipping_fee || 0).toLocaleString("bn-BD")}`);
  if ((order.discount ?? 0) > 0)
    lines.push(`${(bn ? "ডিসকাউন্ট" : "Discount").padEnd(25)} -৳${(order.discount || 0).toLocaleString("bn-BD")}`);
  lines.push(`==============================`);
  lines.push(`${(bn ? "মোট" : "TOTAL").padEnd(25)} ৳${order.total.toLocaleString("bn-BD")}`);
  lines.push(`==============================`);
  lines.push(``);
  lines.push(`${bn ? "পেমেন্ট" : "Payment"}: ${order.payment_method === "cod" ? (bn ? "ক্যাশ অন ডেলিভারি" : "COD") : order.payment_method.toUpperCase()}`);
  lines.push(`${bn ? "স্ট্যাটাস" : "Status"}: ${order.payment_status === "paid" ? (bn ? "পরিশোধিত" : "Paid") : (bn ? "অপরিশোধিত" : "Unpaid")}`);
  lines.push(``);
  lines.push(bn ? "ধন্যবাদ আপনার ক্রয়ের জন্য!" : "Thank you for your purchase!");

  const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `invoice-${order.order_number}.txt`;
  a.click();
  URL.revokeObjectURL(url);
};

// ── Component ────────────────────────────────────────────────────────────────
const MartOrders = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { language } = useLanguage();
  const bn = language === "bn";
  const { user } = useAuth();

  const [orders, setOrders]             = useState<MartOrder[]>([]);
  const [loading, setLoading]           = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);
  const [filter, setFilter]             = useState("all");
  const detailRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const [dialogMode, setDialogMode]     = useState<"cancel" | "return" | null>(null);
  const [dialogOrderId, setDialogOrderId] = useState<string | null>(null);
  const [reason, setReason]             = useState("");
  const [processing, setProcessing]     = useState(false);

  // ── fetch orders ───────────────────────────────────────────────────────────
  const fetchOrders = useCallback(async () => {
    if (!user) return;
    try {
      const resp   = await fetch(`${API_BASE}/api/orders?user_id=${encodeURIComponent(user.id)}`);
      const result = await resp.json();
      if (result.success && result.orders) setOrders(result.orders);
    } catch (err) {
      console.error("Fetch orders error:", err);
      toast.error(bn ? "অর্ডার লোড ব্যর্থ" : "Failed to load orders");
    }
    setLoading(false);
  }, [user, bn]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  // ── deep-link auto-expand ──────────────────────────────────────────────────
  useEffect(() => {
    const id = searchParams.get("id");
    if (!id || orders.length === 0) return;
    const match = orders.find((o) => o.order_number === id);
    if (match) {
      setSelectedOrder(match.id);
      setTimeout(() => detailRefs.current[match.id]?.scrollIntoView({ behavior: "smooth", block: "start" }), 200);
    }
  }, [orders, searchParams]);

  const openDeepDetails = async (orderNumber: string, orderId: string) => {
    setSelectedOrder(orderId);
    setSearchParams({ id: orderNumber }, { replace: true });
    const url = `${window.location.origin}/mart/orders?id=${encodeURIComponent(orderNumber)}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: bn ? "অর্ডার ডিটেইলস" : "Order Details", url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success(bn ? "ডিটেইলস লিংক কপি হয়েছে" : "Details link copied");
      }
    } catch { /* user dismissed */ }
  };

  const { pull, refreshing } = usePullToRefresh(fetchOrders);

  // ── cancel order (via REST API) ────────────────────────────────────────────
  // Allowed before shipped: pending, confirmed, processing
  const canCancel = (status: string) => ["pending", "confirmed", "processing"].includes(status);
  const canReturn = (status: string) => status === "delivered";

  const handleCancelOrder = async () => {
    if (!dialogOrderId || !reason.trim()) {
      toast.error(bn ? "কারণ লিখুন" : "Please provide a reason");
      return;
    }
    setProcessing(true);
    try {
      const resp   = await fetch(`${API_BASE}/api/orders/${dialogOrderId}`, {
        method:  "PUT",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ status: "cancelled", cancel_reason: reason }),
      });
      const result = await resp.json();
      if (!result.success) throw new Error(result.message);

      // Update local state immediately — no refetch needed
      setOrders((prev) =>
        prev.map((o) =>
          o.id === dialogOrderId ? { ...o, status: "cancelled", cancel_reason: reason } : o
        )
      );
      toast.success(bn ? "অর্ডার বাতিল হয়েছে" : "Order cancelled");
      setDialogMode(null);
      setReason("");
    } catch (err: any) {
      toast.error(err?.message || (bn ? "বাতিল ব্যর্থ" : "Cancel failed"));
    }
    setProcessing(false);
  };

  // ── return request (via REST API) ──────────────────────────────────────────
  const handleReturnRequest = async () => {
    if (!dialogOrderId || !reason.trim()) {
      toast.error(bn ? "কারণ লিখুন" : "Please provide a reason");
      return;
    }
    setProcessing(true);
    try {
      const resp   = await fetch(`${API_BASE}/api/orders/${dialogOrderId}`, {
        method:  "PUT",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ status: "return_requested", return_reason: reason }),
      });
      const result = await resp.json();
      if (!result.success) throw new Error(result.message);

      setOrders((prev) =>
        prev.map((o) =>
          o.id === dialogOrderId ? { ...o, status: "return_requested", return_reason: reason } : o
        )
      );
      toast.success(bn ? "রিটার্ন অনুরোধ পাঠানো হয়েছে" : "Return request submitted");
      setDialogMode(null);
      setReason("");
    } catch (err: any) {
      toast.error(err?.message || (bn ? "রিটার্ন ব্যর্থ" : "Return failed"));
    }
    setProcessing(false);
  };

  const filteredOrders = filter === "all" ? orders : orders.filter((o) => o.status === filter);

  const filterTabs = [
    { key: "all",       label: "All",        labelBn: "সব"          },
    { key: "pending",   label: "Pending",    labelBn: "অপেক্ষমাণ"   },
    { key: "processing",label: "Processing", labelBn: "প্রসেসিং"    },
    { key: "shipped",   label: "Shipped",    labelBn: "শিপড"        },
    { key: "delivered", label: "Delivered",  labelBn: "ডেলিভার্ড"   },
    { key: "cancelled", label: "Cancelled",  labelBn: "বাতিল"       },
  ];

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-[44px] md:pt-[104px]" />
        <div className="text-center py-20">
          <Package className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-lg font-medium">{bn ? "অর্ডার দেখতে লগইন করুন" : "Login to view orders"}</p>
          <Button className="mt-4" onClick={() => navigate("/auth")}>{bn ? "লগইন" : "Login"}</Button>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <PullToRefreshIndicator pull={pull} refreshing={refreshing} />
      <Navbar />
      <div className="pt-[44px] md:pt-[104px]" />
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center gap-2 mb-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/mart/home")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            {bn ? "আমার অর্ডারসমূহ" : "My Orders"}
          </h1>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 overflow-x-auto pb-3 mb-4 scrollbar-none">
          {filterTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                filter === tab.key
                  ? "bg-primary text-white"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {bn ? tab.labelBn : tab.label}
              {tab.key !== "all" && (
                <span className="ml-1 opacity-70">({orders.filter((o) => o.status === tab.key).length})</span>
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => <div key={i} className="h-28 bg-muted rounded-xl animate-pulse" />)}
          </div>
        ) : filteredOrders.length > 0 ? (
          <div className="space-y-4">
            {filteredOrders.map((order) => {
              const st        = statusConfig[order.status] || statusConfig.pending;
              const StatusIcon = st.icon;
              const expanded  = selectedOrder === order.id;
              return (
                <motion.div key={order.id} layout className="bg-card border border-border/50 rounded-xl overflow-hidden shadow-sm">
                  <button className="w-full p-4 text-left" onClick={() => setSelectedOrder(expanded ? null : order.id)}>
                    <div className="flex items-center justify-between mb-2 gap-2">
                      <InvoiceNumberBadge number={order.order_number} label={bn ? "অর্ডার নং" : "Order No."} showVerify={false} />
                      <Badge className={st.color}><StatusIcon className="h-3 w-3 mr-1" />{bn ? st.labelBn : st.label}</Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        {new Date(order.created_at).toLocaleDateString("bn-BD", { day: "numeric", month: "short", year: "numeric" })}
                      </span>
                      <span className="font-bold text-primary">৳{order.total.toLocaleString("bn-BD")}</span>
                    </div>
                    {order.estimated_delivery_date && !["cancelled", "delivered", "return_requested"].includes(order.status) && (
                      <div className="flex items-center gap-1.5 mt-1.5 text-xs text-green-600">
                        <Calendar className="h-3 w-3" />
                        <span>
                          {bn ? "ডেলিভারি:" : "Delivery:"}{" "}
                          {new Date(order.estimated_delivery_date).toLocaleDateString("bn-BD", { day: "numeric", month: "short" })}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      {order.items?.slice(0, 3).map((item, i) => (
                        <div key={i} className="h-10 w-10 rounded bg-muted/50 overflow-hidden">
                          {item.product_image && <img src={item.product_image} alt="" className="w-full h-full object-cover" />}
                        </div>
                      ))}
                      {(order.items?.length || 0) > 3 && (
                        <span className="text-xs text-muted-foreground">+{(order.items?.length || 0) - 3} {bn ? "আরো" : "more"}</span>
                      )}
                      <ChevronRight className={`h-4 w-4 ml-auto text-muted-foreground transition-transform ${expanded ? "rotate-90" : ""}`} />
                    </div>
                  </button>

                  <AnimatePresence>
                    {expanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                      >
                        <div
                          ref={(el) => { detailRefs.current[order.id] = el; }}
                          className="border-t border-border/50 p-4 space-y-4 bg-muted/10 scroll-mt-24"
                        >
                          {/* Deep details link */}
                          <div className="flex items-center gap-2">
                            <div className="flex-1 min-w-0">
                              <InvoiceNumberBadge number={order.order_number} label={bn ? "অর্ডার ট্র্যাকিং নং" : "Order Tracking No."} variant="block" />
                            </div>
                            <button
                              onClick={() => openDeepDetails(order.order_number, order.id)}
                              className="shrink-0 inline-flex items-center gap-1.5 rounded-xl border border-primary/30 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/15 transition-colors"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                              <span className="hidden sm:inline">{bn ? "ডিপ ডিটেইলস" : "Deep Details"}</span>
                              <Share2 className="h-3.5 w-3.5 sm:hidden" />
                            </button>
                          </div>

                          {/* Tracking */}
                          <div>
                            <h3 className="text-sm font-semibold mb-1 flex items-center gap-1.5">
                              <Truck className="h-4 w-4 text-primary" />
                              {bn ? "অর্ডার ট্র্যাকিং" : "Order Tracking"}
                            </h3>
                            <OrderTracker status={order.status} bn={bn} />
                          </div>

                          {/* Info grid */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                            <div className="space-y-1.5">
                              <p className="flex items-center gap-1.5">
                                <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="text-muted-foreground">{bn ? "ঠিকানা:" : "Address:"}</span>
                              </p>
                              <p className="pl-5 text-foreground">{order.shipping_address}</p>
                            </div>
                            <div className="space-y-1.5">
                              <p className="flex items-center gap-1.5">
                                <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="text-muted-foreground">{bn ? "পেমেন্ট:" : "Payment:"}</span>
                                <span>{order.payment_method === "cod" ? (bn ? "ক্যাশ অন ডেলিভারি" : "COD") : order.payment_method.toUpperCase()}</span>
                              </p>
                              <p className="pl-5">
                                <Badge variant="outline" className="text-[10px]">
                                  {order.payment_status === "paid" ? (bn ? "পরিশোধিত" : "Paid") : (bn ? "অপরিশোধিত" : "Unpaid")}
                                </Badge>
                              </p>
                            </div>
                          </div>

                          {/* Cancel / Return reasons */}
                          {order.cancel_reason && (
                            <div className="bg-red-50 dark:bg-red-950/20 p-3 rounded-lg text-sm">
                              <p className="font-medium text-red-700 dark:text-red-400 flex items-center gap-1.5">
                                <AlertTriangle className="h-3.5 w-3.5" />{bn ? "বাতিলের কারণ:" : "Cancel reason:"}
                              </p>
                              <p className="text-red-600 dark:text-red-500 mt-1">{order.cancel_reason}</p>
                            </div>
                          )}
                          {order.return_reason && (
                            <div className="bg-orange-50 dark:bg-orange-950/20 p-3 rounded-lg text-sm">
                              <p className="font-medium text-orange-700 dark:text-orange-400 flex items-center gap-1.5">
                                <RotateCcw className="h-3.5 w-3.5" />{bn ? "রিটার্নের কারণ:" : "Return reason:"}
                              </p>
                              <p className="text-orange-600 dark:text-orange-500 mt-1">{order.return_reason}</p>
                            </div>
                          )}

                          {/* Items */}
                          <div>
                            <h3 className="text-sm font-semibold mb-2">{bn ? "পণ্যসমূহ" : "Items"}</h3>
                            <div className="space-y-2">
                              {order.items?.map((item, i) => (
                                <div key={i} className="flex items-center gap-3 text-sm">
                                  <div className="h-12 w-12 rounded-lg bg-muted overflow-hidden shrink-0">
                                    {item.product_image && <img src={item.product_image} alt="" className="w-full h-full object-cover" />}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="line-clamp-1 font-medium">{item.product_name}</p>
                                    <p className="text-xs text-muted-foreground">x{item.quantity} · ৳{item.unit_price.toLocaleString("bn-BD")}</p>
                                  </div>
                                  <span className="font-medium shrink-0">৳{(item.unit_price * item.quantity).toLocaleString("bn-BD")}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Price breakdown */}
                          <div className="border-t border-border/40 pt-3 text-sm space-y-1">
                            <div className="flex justify-between text-muted-foreground">
                              <span>{bn ? "সাবটোটাল" : "Subtotal"}</span>
                              <span>৳{(order.subtotal || 0).toLocaleString("bn-BD")}</span>
                            </div>
                            {(order.shipping_fee ?? 0) > 0 && (
                              <div className="flex justify-between text-muted-foreground">
                                <span>{bn ? "ডেলিভারি ফি" : "Delivery Fee"}</span>
                                <span>৳{(order.shipping_fee || 0).toLocaleString("bn-BD")}</span>
                              </div>
                            )}
                            {(order.discount ?? 0) > 0 && (
                              <div className="flex justify-between text-green-600">
                                <span>{bn ? "ডিসকাউন্ট" : "Discount"}</span>
                                <span>-৳{(order.discount || 0).toLocaleString("bn-BD")}</span>
                              </div>
                            )}
                            <div className="flex justify-between font-bold text-base pt-1 border-t border-border/30">
                              <span>{bn ? "মোট" : "Total"}</span>
                              <span className="text-primary">৳{order.total.toLocaleString("bn-BD")}</span>
                            </div>
                          </div>

                          {/* Action buttons */}
                          <div className="flex flex-wrap gap-2 pt-2">
                            <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => generateInvoice(order, bn)}>
                              <FileText className="h-3.5 w-3.5" />
                              {bn ? "ইনভয়েস ডাউনলোড" : "Download Invoice"}
                            </Button>

                            {/* Cancel — available before shipped */}
                            {canCancel(order.status) && (
                              <Button
                                variant="outline" size="sm"
                                className="gap-1.5 text-xs text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
                                onClick={() => { setDialogMode("cancel"); setDialogOrderId(order.id); setReason(""); }}
                              >
                                <XCircle className="h-3.5 w-3.5" />
                                {bn ? "অর্ডার বাতিল" : "Cancel Order"}
                              </Button>
                            )}

                            {/* Return — only after delivered */}
                            {canReturn(order.status) && (
                              <Button
                                variant="outline" size="sm"
                                className="gap-1.5 text-xs text-orange-600 hover:text-orange-700 border-orange-200 hover:border-orange-300"
                                onClick={() => { setDialogMode("return"); setDialogOrderId(order.id); setReason(""); }}
                              >
                                <RotateCcw className="h-3.5 w-3.5" />
                                {bn ? "রিটার্ন রিকোয়েস্ট" : "Return Request"}
                              </Button>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-20">
            <Package className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-lg font-medium text-muted-foreground">
              {filter === "all"
                ? (bn ? "কোনো অর্ডার নেই" : "No orders yet")
                : (bn ? "এই ক্যাটেগরিতে কোনো অর্ডার নেই" : "No orders in this category")}
            </p>
            <Button className="mt-4" onClick={() => navigate("/mart/home")}>
              {bn ? "শপিং শুরু করুন" : "Start Shopping"}
            </Button>
          </div>
        )}
      </div>

      {/* Cancel / Return Dialog */}
      <Dialog open={!!dialogMode} onOpenChange={() => { setDialogMode(null); setReason(""); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {dialogMode === "cancel"
                ? <><XCircle className="h-5 w-5 text-red-500" />{bn ? "অর্ডার বাতিল" : "Cancel Order"}</>
                : <><RotateCcw className="h-5 w-5 text-orange-500" />{bn ? "রিটার্ন রিকোয়েস্ট" : "Return Request"}</>}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {dialogMode === "cancel"
                ? (bn ? "অর্ডার বাতিলের কারণ লিখুন:" : "Please provide a reason for cancellation:")
                : (bn ? "রিটার্নের কারণ লিখুন:" : "Please provide a reason for return:")}
            </p>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={dialogMode === "cancel"
                ? (bn ? "যেমন: ভুল পণ্য অর্ডার করেছি..." : "e.g., Ordered wrong product...")
                : (bn ? "যেমন: পণ্যে সমস্যা আছে..." : "e.g., Product has defects...")}
              rows={3}
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => { setDialogMode(null); setReason(""); }}>
              {bn ? "না" : "No"}
            </Button>
            <Button
              variant={dialogMode === "cancel" ? "destructive" : "default"}
              onClick={dialogMode === "cancel" ? handleCancelOrder : handleReturnRequest}
              disabled={processing || !reason.trim()}
            >
              {processing
                ? "..."
                : dialogMode === "cancel"
                  ? (bn ? "বাতিল করুন" : "Confirm Cancel")
                  : (bn ? "রিটার্ন করুন" : "Submit Return")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="h-16 md:hidden" />
      <Footer />
    </div>
  );
};

export default MartOrders;

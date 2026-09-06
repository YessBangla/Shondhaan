import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Package, ChevronRight, Clock, CheckCircle2, Truck, XCircle,
  MapPin, CreditCard, Box, RotateCcw, FileText, Calendar,
  AlertTriangle, ShoppingBag, Phone, User, Copy, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import SwipeableOrderRow from "@/components/client/SwipeableOrderRow";

// ── Types matching backend MySQL schema exactly ────────────────────────────────
export interface MartOrderItem {
  product_id?: number;
  seller_id?: number | null;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  product_image: string | null;
}

export interface MartOrder {
  id: number | string;
  user_id: number | string;
  order_number: string;
  // status aliased from order_status in SELECT
  status: "pending" | "confirmed" | "processing" | "shipped" | "delivered" | "cancelled";
  payment_status: "pending" | "paid" | "failed";
  payment_method: "bkash" | "nagad" | "rocket" | "sslcommerz" | "wallet" | "cod";
  subtotal: number;
  shipping_fee: number;
  courier_fee: number;
  cod_fee: number;
  discount: number;
  total: number;
  coupon_code: string | null;
  notes: string | null;
  estimated_delivery_date: string | null;
  customer_name: string;
  customer_phone: string;
  shipping_address: string;
  shipping_division: string | null;
  shipping_district: string | null;
  shipping_thana: string | null;
  created_at: string;
  updated_at: string;
  // items are pre-joined from GET /orders response — never fetched separately
  items?: MartOrderItem[];
}

interface MartOrdersTabProps {
  orders: MartOrder[];
  onRefresh: () => void;
  // Pass your API base URL or axios instance; component calls PUT /:orderId
  apiBase?: string;
}

// ── Status config ──────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, {
  icon: React.ElementType;
  color: string;
  bg: string;
  label: string;
  labelBn: string;
}> = {
  pending:    { icon: Clock,        color: "text-amber-700",  bg: "bg-amber-100",  label: "Pending",    labelBn: "অপেক্ষমাণ" },
  confirmed:  { icon: CheckCircle2, color: "text-blue-700",   bg: "bg-blue-100",   label: "Confirmed",  labelBn: "নিশ্চিত" },
  processing: { icon: Box,          color: "text-purple-700", bg: "bg-purple-100", label: "Processing", labelBn: "প্রসেসিং" },
  shipped:    { icon: Truck,        color: "text-indigo-700", bg: "bg-indigo-100", label: "Shipped",    labelBn: "শিপড" },
  delivered:  { icon: CheckCircle2, color: "text-green-700",  bg: "bg-green-100",  label: "Delivered",  labelBn: "ডেলিভার্ড" },
  cancelled:  { icon: XCircle,      color: "text-red-700",    bg: "bg-red-100",    label: "Cancelled",  labelBn: "বাতিল" },
};

const PAYMENT_METHOD_LABEL: Record<string, { en: string; bn: string }> = {
  bkash:      { en: "bKash",               bn: "বিকাশ" },
  nagad:      { en: "Nagad",               bn: "নগদ" },
  rocket:     { en: "Rocket",              bn: "রকেট" },
  sslcommerz: { en: "SSLCommerz",          bn: "SSLCommerz" },
  wallet:     { en: "Shondhaan Wallet",    bn: "Shondhaan ওয়ালেট" },
  cod:        { en: "Cash on Delivery",    bn: "ক্যাশ অন ডেলিভারি" },
};

// ── Tracking timeline ──────────────────────────────────────────────────────────
const TRACKING_STEPS = [
  { key: "pending",    icon: Clock,        label: "Order Placed", labelBn: "অর্ডার গৃহীত" },
  { key: "confirmed",  icon: CheckCircle2, label: "Confirmed",    labelBn: "নিশ্চিত" },
  { key: "processing", icon: Box,          label: "Packaging",    labelBn: "প্যাকেজিং" },
  { key: "shipped",    icon: Truck,        label: "Shipped",      labelBn: "শিপমেন্ট" },
  { key: "delivered",  icon: MapPin,       label: "Delivered",    labelBn: "ডেলিভার্ড" },
] as const;

const getStepIndex = (status: string) =>
  ["cancelled"].includes(status)
    ? -1
    : Math.max(0, TRACKING_STEPS.findIndex(s => s.key === status));

const OrderTracker = ({ status, bn }: { status: string; bn: boolean }) => {
  const currentIdx = getStepIndex(status);
  const totalSegments = TRACKING_STEPS.length - 1;

  if (status === "cancelled") {
    return (
      <div className="flex items-center justify-center gap-2 py-4 text-destructive">
        <XCircle className="h-5 w-5" />
        <span className="font-semibold">{bn ? "অর্ডার বাতিল করা হয়েছে" : "Order Cancelled"}</span>
      </div>
    );
  }

  // filledPct: how far the filled bar stretches within the inner 80% track
  const filledPct = currentIdx === 0 ? 0 : (currentIdx / totalSegments) * 80;

  return (
    <div className="py-4">
      <div className="flex items-center justify-between relative">
        {/* Track background */}
        <div className="absolute top-[18px] left-[10%] right-[10%] h-0.5 bg-muted z-0" />
        {/* Track filled */}
        <div
          className="absolute top-[18px] left-[10%] h-0.5 bg-primary z-[1] transition-all duration-700"
          style={{ width: `${filledPct}%` }}
        />
        {TRACKING_STEPS.map((step, idx) => {
          const StepIcon = step.icon;
          const done   = idx <= currentIdx;
          const active = idx === currentIdx;
          return (
            <div
              key={step.key}
              className="flex flex-col items-center z-10 relative"
              style={{ width: `${100 / TRACKING_STEPS.length}%` }}
            >
              <motion.div
                initial={false}
                animate={active ? { scale: [1, 1.15, 1] } : {}}
                transition={{ duration: 0.8, repeat: active ? Infinity : 0, repeatDelay: 2 }}
                className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-colors ${
                  done
                    ? "bg-primary border-primary text-white"
                    : "bg-background border-muted text-muted-foreground/40"
                }`}
              >
                <StepIcon className="h-3.5 w-3.5" />
              </motion.div>
              <span className={`text-[9px] mt-1.5 text-center font-medium leading-tight ${
                done ? "text-primary" : "text-muted-foreground/50"
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

// ── Invoice: printable HTML window ────────────────────────────────────────────
const printInvoice = (order: MartOrder, bn: boolean) => {
  const orderItems = Array.isArray(order.items) ? order.items : [];
  const rows = orderItems.map(it => `
    <tr>
      <td style="padding:6px 0;border-bottom:1px solid #f0f0f0">${it.product_name}</td>
      <td style="text-align:center;padding:6px 4px;border-bottom:1px solid #f0f0f0">${it.quantity}</td>
      <td style="text-align:right;padding:6px 0;border-bottom:1px solid #f0f0f0">৳${it.unit_price.toLocaleString()}</td>
      <td style="text-align:right;padding:6px 0;border-bottom:1px solid #f0f0f0;font-weight:500">৳${it.total_price.toLocaleString()}</td>
    </tr>`).join("");

  const deliveryFee = Number(order.shipping_fee || 0) || Number(order.courier_fee || 0) || Number(order.cod_fee || 0);
  const feeRows = [
    deliveryFee > 0 ? `<tr><td colspan="3" class="muted">${bn ? "ডেলিভারি / COD ফি" : "Delivery / COD Fee"}</td><td style="text-align:right">৳${deliveryFee.toLocaleString()}</td></tr>` : "",
    order.discount     > 0 ? `<tr><td colspan="3" class="muted">${bn ? "ছাড়" : "Discount"}${order.coupon_code ? ` (${order.coupon_code})` : ""}</td><td style="text-align:right;color:green">-৳${order.discount.toLocaleString()}</td></tr>` : "",
  ].join("");

  const addressParts = [order.shipping_thana, order.shipping_district, order.shipping_division].filter(Boolean).join(", ");

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
  <title>Invoice ${order.order_number}</title>
  <style>
    body{font-family:sans-serif;font-size:13px;color:#111;max-width:520px;margin:32px auto;padding:0 16px}
    h1{font-size:20px;margin:0 0 4px}
    .meta{color:#666;margin-bottom:20px;font-size:12px;line-height:1.6}
    table{width:100%;border-collapse:collapse}
    th{text-align:left;font-size:11px;color:#666;padding:4px 0;border-bottom:2px solid #111}
    th:nth-child(n+2){text-align:right}
    .total-row td{padding:8px 0 2px;font-weight:600;font-size:14px}
    .muted{color:#666}
    @media print{body{margin:0}}
  </style></head><body>
  <h1>${bn ? "ইনভয়েস" : "Invoice"} — Shondhaan Mart</h1>
  <div class="meta">
    <strong>${bn ? "অর্ডার" : "Order"} #${order.order_number}</strong><br>
    ${new Date(order.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}<br>
    ${order.customer_name} · ${order.customer_phone}<br>
    ${order.shipping_address}${addressParts ? `, ${addressParts}` : ""}
  </div>
  <table>
    <thead><tr>
      <th>${bn ? "পণ্য" : "Item"}</th>
      <th>${bn ? "পরিমাণ" : "Qty"}</th>
      <th>${bn ? "একক মূল্য" : "Unit"}</th>
      <th>${bn ? "মোট" : "Total"}</th>
    </tr></thead>
    <tbody>${rows}</tbody>
    <tfoot>
      <tr><td colspan="3" class="muted" style="padding-top:10px">${bn ? "সাবটোটাল" : "Subtotal"}</td>
          <td style="text-align:right;padding-top:10px">৳${order.subtotal.toLocaleString()}</td></tr>
      ${feeRows}
      <tr class="total-row">
        <td colspan="3">${bn ? "সর্বমোট" : "Grand Total"}</td>
        <td style="text-align:right">৳${order.total.toLocaleString()}</td>
      </tr>
      <tr><td colspan="4" class="muted" style="padding-top:8px;font-size:12px">
        ${bn ? "পেমেন্ট" : "Payment"}: ${PAYMENT_METHOD_LABEL[order.payment_method]?.[bn ? "bn" : "en"] ?? order.payment_method}
        — ${order.payment_status === "paid" ? (bn ? "পরিশোধিত" : "Paid") : (bn ? "অপরিশোধিত" : "Unpaid")}
      </td></tr>
    </tfoot>
  </table>
  <p style="margin-top:24px;color:#666;font-size:12px">
    ${bn ? "ধন্যবাদ সন্ধান মার্ট থেকে কেনাকাটার জন্য!" : "Thank you for shopping at Shondhaan Mart!"}
  </p>
  <script>window.onload = () => { window.print(); }<\/script>
  </body></html>`;

  const win = window.open("", "_blank");
  if (!win) { toast.error(bn ? "পপআপ ব্লক হয়েছে" : "Popup blocked — allow popups and try again"); return; }
  win.document.write(html);
  win.document.close();
};

// ── Filter tabs config ─────────────────────────────────────────────────────────
const FILTER_TABS = [
  { key: "all",       label: "All",       labelBn: "সব" },
  { key: "pending",   label: "Pending",   labelBn: "অপেক্ষমাণ" },
  { key: "shipped",   label: "Shipped",   labelBn: "শিপড" },
  { key: "delivered", label: "Delivered", labelBn: "ডেলিভার্ড" },
  { key: "cancelled", label: "Cancelled", labelBn: "বাতিল" },
] as const;

// ── Main component ─────────────────────────────────────────────────────────────
const MartOrdersTab = ({ orders, onRefresh, apiBase = "/api" }: MartOrdersTabProps) => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const bn = language === "bn";

  const [expandedId,    setExpandedId]    = useState<number | string | null>(null);
  const [filter,        setFilter]        = useState<string>("all");
  const [dialogMode,    setDialogMode]    = useState<"cancel" | null>(null);
  const [dialogOrderId, setDialogOrderId] = useState<number | string | null>(null);
  const [reason,        setReason]        = useState("");
  const [processing,    setProcessing]    = useState(false);

  const handleExpand = (id: number | string) =>
    setExpandedId(prev => (prev === id ? null : id));

  // PUT /api/orders/:id  →  { status: "cancelled" }
  const handleCancel = async () => {
    if (!dialogOrderId || !reason.trim()) {
      toast.error(bn ? "কারণ লিখুন" : "Please provide a reason");
      return;
    }
    setProcessing(true);
    try {
      const res = await fetch(`${apiBase}/orders/${dialogOrderId}`, {
  method: "PUT",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ status: "cancelled" }),
});
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      toast.success(bn ? "অর্ডার বাতিল হয়েছে" : "Order cancelled");
      onRefresh();
      setDialogMode(null);
      setReason("");
    } catch (err: any) {
      toast.error(err?.message ?? (bn ? "ব্যর্থ হয়েছে" : "Failed"));
    }
    setProcessing(false);
  };

  const canCancel = (s: string) => ["pending", "confirmed"].includes(s);

  const filteredOrders = filter === "all"
    ? orders
    : orders.filter(o => o.status === filter);

  const totalOrders  = orders.length;
  const activeOrders = orders.filter(o => !["delivered", "cancelled"].includes(o.status)).length;
  const totalSpent   = orders
    .filter(o => o.status !== "cancelled")
     .reduce((sum, o) => sum + Number(o.total || 0), 0);

  // ── Empty state ──────────────────────────────────────────────────────────────
  if (orders.length === 0) {
    return (
      <div className="text-center py-12">
        <ShoppingBag className="h-14 w-14 mx-auto text-muted-foreground/30 mb-3" />
        <p className="text-lg font-medium text-muted-foreground">
          {bn ? "কোনো মার্ট অর্ডার নেই" : "No mart orders yet"}
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          {bn ? "সন্ধান মার্ট থেকে পণ্য কিনুন" : "Shop from Shondhaan Mart"}
        </p>
        <Button className="mt-4 bg-userprimary gap-2 text-white" onClick={() => navigate("/mart/home")}>
          <ShoppingBag className="h-4 w-4" />
          {bn ? "শপিং শুরু করুন" : "Start Shopping"}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { value: totalOrders,  label: bn ? "মোট অর্ডার" : "Total Orders", color: "text-primary" },
          { value: activeOrders, label: bn ? "চলমান" : "Active", color: "text-orange-600" },
          {
            value: totalSpent > 999
              ? `৳${(totalSpent / 1000).toFixed(1)}k`
              : `৳${totalSpent.toLocaleString()}`,
            label: bn ? "মোট খরচ" : "Total Spent",
            color: "text-foreground",
          },
        ].map((s, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-3 text-center">
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-[11px] text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {FILTER_TABS.map(tab => (
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
              <span className="ml-1 opacity-70">
                ({orders.filter(o => o.status === tab.key).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {filteredOrders.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <Package className="h-10 w-10 mx-auto mb-2 opacity-40" />
          <p>{bn ? "এই ক্যাটেগরিতে অর্ডার নেই" : "No orders in this category"}</p>
        </div>
      )}

      {/* Orders */}
      <div className="space-y-3">
        {filteredOrders.map(order => {
          const st         = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.pending;
          const StatusIcon = st.icon;
          const expanded   = expandedId === order.id;
          const orderItems = Array.isArray(order.items) ? order.items : [];

          return (
            <SwipeableOrderRow
              key={order.id}
              canCancel={canCancel(order.status)}
              cancelLabel={bn ? "বাতিল" : "CANCEL"}
              reorderLabel={bn ? "পুনরায়" : "REORDER"}
              onCancel={() => { setDialogOrderId(order.id); setDialogMode("cancel"); }}
              onReorder={() => { navigate("/mart/home"); toast.success(bn ? "মার্ট হোমে নিয়ে যাচ্ছি" : "Going to Mart"); }}
            >
              <div className="bg-card border border-border/50 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">

                {/* Tappable header row */}
                <button className="w-full p-4 text-left" onClick={() => handleExpand(order.id)}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold text-foreground">{order.order_number}</span>
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          navigator.clipboard.writeText(order.order_number);
                          toast.success(bn ? "কপি হয়েছে" : "Copied");
                        }}
                        className="text-muted-foreground hover:text-foreground"
                        aria-label="Copy order number"
                      >
                        <Copy className="h-3 w-3" />
                      </button>
                    </div>
                    <Badge className={`${st.bg} ${st.color} border-0`}>
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {bn ? st.labelBn : st.label}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {new Date(order.created_at).toLocaleDateString("bn-BD", {
                        day: "numeric", month: "short", year: "numeric",
                      })}
                    </span>
                    <span className="font-bold text-primary text-base">
                      ৳{order.total.toLocaleString("bn-BD")}
                    </span>
                  </div>

                  {/* Est. delivery pill — only for active orders */}
                  {order.estimated_delivery_date &&
                   !["cancelled", "delivered"].includes(order.status) && (
                    <div className="flex items-center gap-1.5 mt-2 text-xs text-green-600 bg-green-50 dark:bg-green-950/20 rounded-lg px-2.5 py-1.5 w-fit">
                      <Calendar className="h-3 w-3" />
                      <span className="font-medium">
                        {bn ? "আনুমানিক ডেলিভারি:" : "Est. Delivery:"}{" "}
                        {new Date(order.estimated_delivery_date).toLocaleDateString("bn-BD", {
                          day: "numeric", month: "short",
                        })}
                      </span>
                    </div>
                  )}

                  {/* Item thumbnails — from pre-loaded items[] */}
                  <div className="flex items-center gap-2 mt-2.5">
                    {orderItems.slice(0, 4).map((item, i) => (
                      <div key={i} className="h-10 w-10 rounded-lg bg-muted/50 overflow-hidden border border-border/30">
                        {item.product_image
                          ? <img src={item.product_image} alt="" className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex items-center justify-center">
                              <Package className="h-4 w-4 text-muted-foreground/40" />
                            </div>
                        }
                      </div>
                    ))}
                    {orderItems.length === 0 && (
                      <div className="h-10 w-10 rounded-lg bg-muted/50 border border-border/30 flex items-center justify-center">
                        <Package className="h-4 w-4 text-muted-foreground/40" />
                      </div>
                    )}
                    {orderItems.length > 4 && (
                      <span className="text-xs text-muted-foreground">+{orderItems.length - 4}</span>
                    )}
                    <ChevronRight className={`h-4 w-4 ml-auto text-muted-foreground transition-transform duration-200 ${expanded ? "rotate-90" : ""}`} />
                  </div>
                </button>

                {/* Expanded detail panel */}
                <AnimatePresence initial={false}>
                  {expanded && (
                    <motion.div
                      key="detail"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.28, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <div className="border-t border-border/50 p-4 space-y-5 bg-muted/5">

                        {/* Tracking */}
                        <div className="bg-card rounded-xl p-4 border border-border/30">
                          <h3 className="text-sm font-semibold mb-1 flex items-center gap-1.5">
                            <Truck className="h-4 w-4 text-primary" />
                            {bn ? "পার্সেল ট্র্যাকিং" : "Parcel Tracking"}
                          </h3>
                          <OrderTracker status={order.status} bn={bn} />
                        </div>

                        {/* Parcel details */}
                        <div className="bg-card rounded-xl p-4 border border-border/30">
                          <h3 className="text-sm font-semibold mb-3 flex items-center gap-1.5">
                            <Box className="h-4 w-4 text-primary" />
                            {bn ? "পার্সেল ডিটেইলস" : "Parcel Details"}
                          </h3>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                            <div className="space-y-2">
                              <div className="flex items-start gap-2">
                                <User className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                                <div>
                                  <p className="text-[11px] text-muted-foreground">{bn ? "প্রাপক" : "Recipient"}</p>
                                  <p className="font-medium">{order.customer_name}</p>
                                </div>
                              </div>
                              <div className="flex items-start gap-2">
                                <Phone className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                                <div>
                                  <p className="text-[11px] text-muted-foreground">{bn ? "ফোন" : "Phone"}</p>
                                  <p className="font-medium">{order.customer_phone}</p>
                                </div>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <div className="flex items-start gap-2">
                                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                                <div>
                                  <p className="text-[11px] text-muted-foreground">{bn ? "ডেলিভারি ঠিকানা" : "Delivery Address"}</p>
                                  <p className="font-medium">{order.shipping_address}</p>
                                  {/* thana / district / division — all three from schema */}
                                  {(order.shipping_thana || order.shipping_district || order.shipping_division) && (
                                    <p className="text-xs text-muted-foreground">
                                      {[order.shipping_thana, order.shipping_district, order.shipping_division]
                                        .filter(Boolean).join(", ")}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-start gap-2">
                                <CreditCard className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                                <div>
                                  <p className="text-[11px] text-muted-foreground">{bn ? "পেমেন্ট" : "Payment"}</p>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-medium">
                                      {PAYMENT_METHOD_LABEL[order.payment_method]?.[bn ? "bn" : "en"] ?? order.payment_method}
                                    </span>
                                    <Badge variant="outline" className="text-[10px]">
                                      {order.payment_status === "paid"
                                        ? (bn ? "পরিশোধিত ✅" : "Paid ✅")
                                        : order.payment_status === "failed"
                                          ? (bn ? "ব্যর্থ ❌" : "Failed ❌")
                                          : (bn ? "অপরিশোধিত" : "Unpaid")}
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                          {order.notes && (
                            <div className="mt-3 pt-3 border-t border-border/30 flex items-start gap-2 text-sm">
                              <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                              <p className="text-muted-foreground">{order.notes}</p>
                            </div>
                          )}
                        </div>

                        {/* Items list — pre-loaded, no fetch needed */}
                        <div className="bg-card rounded-xl p-4 border border-border/30">
                          <h3 className="text-sm font-semibold mb-3 flex items-center gap-1.5">
                            <Package className="h-4 w-4 text-primary" />
                            {bn ? "পণ্যসমূহ" : "Order Items"}
                            <span className="font-normal text-muted-foreground">({orderItems.length})</span>
                          </h3>
                          <div className="space-y-2.5">
                            {orderItems.length === 0 ? (
                              <div className="rounded-lg border border-border/30 bg-muted/20 p-3 text-sm text-muted-foreground">
                                {bn ? "Order items are not loaded yet" : "Order items are not loaded yet"}
                              </div>
                            ) : orderItems.map((item, i) => (
                              <div key={i} className="flex items-center gap-3 border border-border/50 rounded-lg p-2">
                                <div className="h-14 w-14 rounded-lg bg-muted overflow-hidden shrink-0 border border-border/30">
                                  {item.product_image
                                    ? <img src={item.product_image} alt="" className="w-full h-full object-cover" />
                                    : <div className="w-full h-full flex items-center justify-center">
                                        <Package className="h-5 w-5 text-muted-foreground/30" />
                                      </div>
                                  }
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium line-clamp-1">{item.product_name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {bn ? "পরিমাণ:" : "Qty:"} {item.quantity} × ৳{item.unit_price.toLocaleString("bn-BD")}
                                  </p>
                                </div>
                                <span className="font-semibold text-sm shrink-0">
                                  ৳{item.total_price.toLocaleString("bn-BD")}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Full price breakdown — all 4 fee columns from schema */}
                        <div className="bg-card rounded-xl p-4 border border-border/30 text-sm space-y-1.5">
                          <div className="flex justify-between text-muted-foreground">
                            <span>{bn ? "সাবটোটাল" : "Subtotal"}</span>
                            <span>৳{order.subtotal.toLocaleString("bn-BD")}</span>
                          </div>
                          {(Number(order.shipping_fee || 0) || Number(order.courier_fee || 0) || Number(order.cod_fee || 0)) > 0 && (
                            <div className="flex justify-between text-muted-foreground">
                              <span>{bn ? "ডেলিভারি / COD ফি" : "Delivery / COD Fee"}</span>
                              <span>৳{(Number(order.shipping_fee || 0) || Number(order.courier_fee || 0) || Number(order.cod_fee || 0)).toLocaleString("bn-BD")}</span>
                            </div>
                          )}
                          {order.discount > 0 && (
                            <div className="flex justify-between text-green-600">
                              <span>
                                {bn ? "ছাড়" : "Discount"}
                                {order.coupon_code && (
                                  <span className="ml-1 text-xs text-muted-foreground">({order.coupon_code})</span>
                                )}
                              </span>
                              <span>-৳{order.discount.toLocaleString("bn-BD")}</span>
                            </div>
                          )}
                          <div className="flex justify-between font-bold text-base pt-2 border-t border-border/30">
                            <span>{bn ? "সর্বমোট" : "Grand Total"}</span>
                            <span className="text-primary">৳{order.total.toLocaleString("bn-BD")}</span>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1.5 text-xs"
                            onClick={() => printInvoice(order, bn)}
                          >
                            <FileText className="h-3.5 w-3.5" />
                            {bn ? "ইনভয়েস" : "Invoice"}
                          </Button>
                          {canCancel(order.status) && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-1.5 text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
                              onClick={() => { setDialogMode("cancel"); setDialogOrderId(order.id); setReason(""); }}
                            >
                              <XCircle className="h-3.5 w-3.5" />
                              {bn ? "বাতিল করুন" : "Cancel Order"}
                            </Button>
                          )}
                        </div>

                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </SwipeableOrderRow>
          );
        })}
      </div>

      {/* Cancel dialog */}
      <Dialog open={dialogMode === "cancel"} onOpenChange={() => { setDialogMode(null); setReason(""); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-destructive" />
              {bn ? "অর্ডার বাতিল" : "Cancel Order"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {bn ? "অর্ডার বাতিলের কারণ লিখুন:" : "Please provide a reason for cancellation:"}
            </p>
            <Textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder={bn ? "যেমন: ভুল পণ্য অর্ডার হয়েছে..." : "e.g. Wrong product ordered..."}
              rows={3}
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => { setDialogMode(null); setReason(""); }}>
              {bn ? "না" : "No"}
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancel}
              disabled={processing || !reason.trim()}
            >
              {processing
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : (bn ? "বাতিল করুন" : "Confirm Cancel")
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default MartOrdersTab;

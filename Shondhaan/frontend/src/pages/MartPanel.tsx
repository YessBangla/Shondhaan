import React, { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Package, ShoppingCart, TrendingUp, Plus, Edit2, Trash2,
  Search, BarChart3, DollarSign, Loader2, Eye,
  ChevronDown, ChevronUp, Store, ShieldCheck, RefreshCw, LogOut,
  MapPin, PhoneCall, UserRound, Send, Clock, CheckCircle2, XCircle,
  LayoutGrid, List, CreditCard, Banknote, MessageSquareWarning,
  Tag, Percent,
} from "lucide-react";
import { MessageCircle } from "lucide-react";
import AddProductForm from "@/components/mart/AddProductForm";
import PackageLimitModal from "@/components/mart/Packagelimitmodal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { hasStaffRoleAccess } from "@/lib/roleAccess";
import {
  createMartCoupon, deleteMartCoupon,
  deleteMartProduct, getCurrentMartSeller, getMartSellerById, listMartProducts,
  listSellerMartCoupons, toPanelProduct, updateMartCoupon,
  updateMartProduct, getSellerProductAllowance, type MartCoupon, type MartSeller,
  type SellerProductAllowance,
} from "@/lib/martApi";
import { toast } from "sonner";
import PanelSidebarTabs from "@/components/PanelSidebarTabs";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import StoreSettingsTab from "./StoreSettingsTabV2";
import { Badge } from "@/components/ui/badge";
import { getMartSocket } from "@/lib/martSocket";
import { createMartSellerNotification } from "@/lib/martSellerNotifications";
import { getFullImageUrl } from "@/lib/imageUrl";

const orderStatusMap: Record<string, { label: string; color: string; dot: string }> = {
  pending:    { label: "অপেক্ষমাণ",       color: "bg-amber-50 text-amber-700 border border-amber-200",       dot: "bg-amber-400"  },
  confirmed:  { label: "নিশ্চিত",          color: "bg-blue-50 text-blue-700 border border-blue-200",          dot: "bg-blue-400"   },
  processing: { label: "প্রস্তুত হচ্ছে",   color: "bg-violet-50 text-violet-700 border border-violet-200",    dot: "bg-violet-400" },
  shipped:    { label: "শিপড",             color: "bg-cyan-50 text-cyan-700 border border-cyan-200",           dot: "bg-cyan-400"   },
  delivered:  { label: "ডেলিভারি সম্পন্ন", color: "bg-emerald-50 text-emerald-700 border border-emerald-200", dot: "bg-emerald-400"},
  cancelled:  { label: "বাতিল",            color: "bg-red-50 text-red-700 border border-red-200",             dot: "bg-red-400"    },
};

const withdrawalStatusMap: Record<string, { label: string; color: string; dot: string }> = {
  pending:  { label: "অপেক্ষমাণ",  color: "bg-amber-50 text-amber-700 border border-amber-200",   dot: "bg-amber-400"  },
  approved: { label: "অনুমোদিত",   color: "bg-blue-50 text-blue-700 border border-blue-200",       dot: "bg-blue-400"   },
  paid:     { label: "পরিশোধিত",   color: "bg-emerald-50 text-emerald-700 border border-emerald-200", dot: "bg-emerald-400" },
  rejected: { label: "বাতিল",      color: "bg-red-50 text-red-700 border border-red-200",          dot: "bg-red-400"    },
};

const COLORS = ["#10b981", "#06b6d4", "#8b5cf6", "#f59e0b", "#3b82f6"];
const LOW_STOCK_THRESHOLD = 2;
const PRODUCTS_PER_PAGE = 5;

type RequestStatus = "idle" | "sending" | "pending" | "accepted" | "declined" | "cancelled";
type ProductStockFilter = "all" | "low";
type OrderPaymentFilter = "all" | "paid";
type ProductViewMode = "list" | "grid";

interface Product {
  id: string; name: string; name_en: string | null; price: number; original_price: number | null;
  stock: number | null; total_sold: number | null; is_active: boolean | null; is_featured: boolean | null;
  image_url: string | null; unit: string | null; slug: string; category_id: string | null;
  gallery_urls?: string[] | null;
}
interface ChatConversation {
  id: number;
  product_id: number;
  user_id: number;
  user_name: string;
  product_name: string;
  product_image: string | null;
  last_message: string | null;
  last_message_at: string | null;
  unread_count: number;
}
interface MartConversationUpdatePayload {
  sellerInbox?: ChatConversation;
  message?: {
    sender_role?: "user" | "seller";
    message?: string;
  };
}
interface OrderItem {
  id?: number; order_id?: number; product_id?: number;
  product_name: string; product_image?: string;
  quantity: number; unit_price: number; total_price: number; seller_id?: number;
}

interface Order {
  id: string; order_number: string; customer_name: string; customer_phone: string;
  shipping_address: string; total: number; status: string; payment_status: string;
  shipping_division?: string | null; shipping_district?: string | null; shipping_thana?: string | null;
  created_at: string; items?: OrderItem[];
}

interface DeliverymanMatch {
  id: number; user_id: number; district: string; thana?: string | null; area: string;
  deliveryman_name?: string | null; deliveryman_phone?: string | null; deliveryman_email?: string | null;
}

interface WithdrawalRequest {
  id: number;
  seller_id: number;
  amount: number;
  method: string;
  account_number: string;
  account_name?: string | null;
  notes?: string | null;
  status: "pending" | "approved" | "rejected" | "paid";
  admin_note?: string | null;
  created_at: string;
}

const colorToken: Record<string, { bg: string; text: string; border: string }> = {
  emerald: { bg: "bg-emerald-50", text: "text-emerald-600", border: "border-emerald-200" },
  blue:    { bg: "bg-blue-50",    text: "text-blue-600",    border: "border-blue-200"    },
  violet:  { bg: "bg-violet-50",  text: "text-violet-600",  border: "border-violet-200"  },
  rose:    { bg: "bg-rose-50",    text: "text-rose-600",    border: "border-rose-200"    },
};

interface DashboardStat {
  icon: React.ComponentType<{ className?: string }>;
  label: string; value: React.ReactNode; color: keyof typeof colorToken;
  targetTab: "products" | "orders";
  productStockFilter?: ProductStockFilter; orderPaymentFilter?: OrderPaymentFilter;
}

const API_BASE =
  import.meta.env.VITE_MART_API_BASE_URL ||
  import.meta.env.VITE_API_BASE;

// ── Upload helper ────────────────────────────────────────────────────────────
const uploadImage = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64 = (reader.result as string).split(",")[1];
        const resp = await fetch(`${API_BASE}/api/sellers/upload`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ file: base64, mime: file.type, name: file.name }),
        });
        const result = await resp.json();
        if (result.success) resolve(result.url);
        else reject(new Error(result.message));
      } catch (e: any) { reject(e); }
    };
    reader.onerror = () => reject(new Error("File read failed"));
    reader.readAsDataURL(file);
  });
};

// ── Request Button ───────────────────────────────────────────────────────────
function RequestButton({ status, bn, onSend }: { status: RequestStatus; bn: boolean; onSend: () => void }) {
  if (status === "sending") return (
    <Button size="sm" disabled className="shrink-0 h-8 gap-1.5 rounded-lg text-xs bg-slate-100 text-slate-500">
      <Loader2 className="h-3.5 w-3.5 animate-spin" />{bn ? "পাঠানো হচ্ছে..." : "Sending..."}
    </Button>
  );
  if (status === "pending") return (
    <Button size="sm" disabled className="shrink-0 h-8 gap-1.5 rounded-lg text-xs bg-amber-50 text-amber-600 border border-amber-200 hover:bg-amber-50 cursor-default">
      <Clock className="h-3.5 w-3.5 animate-pulse" />{bn ? "অপেক্ষমাণ..." : "Pending..."}
    </Button>
  );
  if (status === "accepted") return (
    <Button size="sm" disabled className="shrink-0 h-8 gap-1.5 rounded-lg text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-50 cursor-default">
      <CheckCircle2 className="h-3.5 w-3.5" />{bn ? "গৃহীত হয়েছে ✓" : "Accepted ✓"}
    </Button>
  );
  if (status === "declined" || status === "cancelled") return (
    <Button size="sm" className="shrink-0 h-8 gap-1.5 rounded-lg text-xs bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100" onClick={onSend}>
      <XCircle className="h-3.5 w-3.5" />{bn ? "আবার পাঠান" : "Resend"}
    </Button>
  );
  return (
    <Button size="sm" className="shrink-0 h-8 gap-1.5 rounded-lg text-xs bg-gradient-to-r from-emerald-500 to-teal-500 hover:opacity-90 text-white" onClick={onSend}>
      <Send className="h-3.5 w-3.5" />{bn ? "রিকোয়েস্ট পাঠান" : "Send Request"}
    </Button>
  );
}

// ── KYC form default ─────────────────────────────────────────────────────────
const kycDefault = {
  bank_name: "", bank_account_name: "", bank_account_number: "",
  bank_branch: "", routing_number: "",
  mobile_banking_provider: "", mobile_banking_number: "",
  nid_front_url: "", nid_back_url: "",
  trade_license_url: "", tin_certificate_url: "",
};

const couponDefault = {
  code: "",
  description: "",
  discount_type: "fixed" as "fixed" | "percentage",
  discount_value: "",
  min_order_amount: "",
  max_discount_amount: "",
  usage_limit: "",
  expires_at: "",
  is_active: true,
};

const withdrawalDefault = {
  amount: "",
  method: "bank" as "bank" | "mobile_banking",
  account_number: "",
  account_name: "",
  notes: "",
};

function KycSellerBackendSync({
  sellerId,
  onLoaded,
}: {
  sellerId: number | null;
  onLoaded: (seller: MartSeller) => void;
}) {
  useEffect(() => {
    if (!sellerId) return;
    let cancelled = false;

    getMartSellerById(sellerId)
      .then((freshSeller) => {
        if (!cancelled) onLoaded(freshSeller);
      })
      .catch(() => {
        // Keep the currently loaded seller data if the refresh fails.
      });

    return () => {
      cancelled = true;
    };
  }, [sellerId, onLoaded]);

  return null;
}

// ════════════════════════════════════════════════════════════════════════════
const MartPanel = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate  = useNavigate();
  const { language } = useLanguage();
  const bn = language === "bn";

  const [messages, setMessages] = useState<ChatConversation[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [hasAccess, setHasAccess]     = useState(false);
  const [loading, setLoading]         = useState(true);
  const [products, setProducts]       = useState<Product[]>([]);
  const [orders, setOrders]           = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [searchProduct, setSearchProduct] = useState("");
  const [searchOrder, setSearchOrder]     = useState("");
  const [filterOrderStatus, setFilterOrderStatus] = useState("all");
  const [productStockFilter, setProductStockFilter] = useState<ProductStockFilter>("all");
  const [orderPaymentFilter, setOrderPaymentFilter] = useState<OrderPaymentFilter>("all");
  const [productViewMode, setProductViewMode] = useState<ProductViewMode>("list");
  const [productPage, setProductPage] = useState(1);
  const [showAddProduct, setShowAddProduct] = useState(false);

  // ── Package / product-limit state ──
  const [allowance, setAllowance] = useState<SellerProductAllowance | null>(null);
  const [showPackageModal, setShowPackageModal] = useState(false);

  const [sellerId, setSellerId]       = useState<number | null>(null);
  const [sellerUserId, setSellerUserId] = useState<number | null>(null);
  const [seller, setSeller]           = useState<MartSeller | null>(null);

  const [editingProduct, setEditingProduct] = useState<Record<string, unknown> | null>(null);
  const [expandedOrder, setExpandedOrder]   = useState<string | null>(null);
  const [signingOut, setSigningOut]         = useState(false);

  const [deliverymenByOrder, setDeliverymenByOrder] = useState<Record<string, DeliverymanMatch[]>>({});
  const [deliverymenLoading, setDeliverymenLoading] = useState<Record<string, boolean>>({});
  const [requestStatus, setRequestStatus] = useState<Record<string, RequestStatus>>({});
  const [requestIds, setRequestIds]       = useState<Record<string, number>>({});

  // KYC state
  const [kycForm, setKycForm]         = useState(kycDefault);
  const [kycSaving, setKycSaving]     = useState(false);
  const [kycUploading, setKycUploading] = useState<Record<string, boolean>>({});

  // Coupon state
  const [coupons, setCoupons] = useState<MartCoupon[]>([]);
  const [couponForm, setCouponForm] = useState(couponDefault);
  const [couponSaving, setCouponSaving] = useState(false);

  // Withdrawal state
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [withdrawalsLoading, setWithdrawalsLoading] = useState(false);
  const [withdrawalForm, setWithdrawalForm] = useState(withdrawalDefault);
  const [withdrawalSaving, setWithdrawalSaving] = useState(false);

  const pollRef          = useRef<ReturnType<typeof setInterval> | null>(null);
  const requestStatusRef = useRef<Record<string, RequestStatus>>({});
  const requestIdsRef    = useRef<Record<string, number>>({});

  // ── Auth guard ──
  useEffect(() => {
    if (!authLoading && !user) navigate("/main-login", { replace: true });
  }, [user, authLoading, navigate]);

  const checkRole = useCallback(async () => {
    if (!user) return;
    setHasAccess(await hasStaffRoleAccess(user.id, ["mart_vendor"]));
    setLoading(false);
  }, [user]);

  const fetchProducts = useCallback(async () => {
    if (!user) return null;
    try {
      const s = await getCurrentMartSeller();
      setSellerId(s.id);
      setSellerUserId(s.user_id ?? null);
      setSeller(s);
      const data = await listMartProducts(s.id);
      setProducts(data.map(toPanelProduct) as Product[]);
      try {
        setCoupons(await listSellerMartCoupons(s.id));
      } catch {
        setCoupons([]);
      }
      return s;
    } catch (err: any) {
      toast.error(err.message || "Could not load products");
      return null;
    }
  }, [user]);

  const fetchMessages = useCallback(async () => {
    if (!sellerUserId) return;

    setMessagesLoading(true);

    try {
      const resp = await fetch(`${API_BASE}/api/messages/inbox/seller/${sellerUserId}`);
      const result = await resp.json();

      if (!resp.ok || result.success === false) {
        throw new Error(result.message || "Could not load messages");
      }

      setMessages(result.data || []);
    } catch (err: any) {
      toast.error(err.message || "Could not load messages");
    } finally {
      setMessagesLoading(false);
    }
  }, [sellerUserId]);

  useEffect(() => {
    if (sellerUserId) {
      fetchMessages();
    }
  }, [sellerUserId, fetchMessages]);

  useEffect(() => {
    if (!sellerUserId) return;
    const socket = getMartSocket();

    socket.emit("mart:join", { seller_user_id: sellerUserId });

    const handleConversationUpdate = (payload: MartConversationUpdatePayload) => {
      if (!payload.sellerInbox) return;

      setMessages((prev) => {
        const nextRow = payload.sellerInbox!;
        const existing = prev.find((row) => Number(row.id) === Number(nextRow.id));
        const rest = prev.filter((row) => Number(row.id) !== Number(nextRow.id));
        return [{ ...existing, ...nextRow }, ...rest];
      });

      if (payload.message?.sender_role === "user") {
        const chat = payload.sellerInbox;
        void createMartSellerNotification({
          userId: sellerUserId,
          title: bn ? "নতুন কাস্টমার মেসেজ" : "New customer message",
          message:
            payload.message.message ||
            chat.last_message ||
            (bn ? "একজন কাস্টমার মেসেজ পাঠিয়েছেন" : "A customer sent you a message"),
          type: "mart_customer_message",
          productId: chat.product_id,
          actionUrl: `/mart/vendor/messages/${chat.id}`,
        });
      }
    };

    socket.on("mart:conversation:updated", handleConversationUpdate);

    return () => {
      socket.off("mart:conversation:updated", handleConversationUpdate);
    };
  }, [sellerUserId, bn]);

  const fetchOrders = useCallback(async (resolvedSeller?: MartSeller | null) => {
    if (!user) return;
    const s = resolvedSeller ?? seller;
    if (!s) { toast.error(bn ? "সেলার তথ্য পাওয়া যায়নি" : "Seller not found"); return; }
    setOrdersLoading(true);
    try {
      const vendorId = s.user_id ?? s.id;
      const resp = await fetch(`${API_BASE}/api/orders?vendor_id=${encodeURIComponent(vendorId)}`);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const result = await resp.json();
      if (result.success) setOrders(result.orders ?? []);
      else toast.error(result.message || "Could not load orders");
    } catch (err: any) {
      toast.error(err.message || "Could not load orders");
    } finally {
      setOrdersLoading(false);
    }
  }, [user, seller, bn]);

  useEffect(() => { checkRole(); }, [checkRole]);
  useEffect(() => {
    if (!hasAccess) return;
    fetchProducts().then((s) => fetchOrders(s));
  }, [hasAccess]);

  useEffect(() => { setProductPage(1); }, [searchProduct, productStockFilter]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paymentResult = params.get("package_payment");
    if (!paymentResult) return;
    if (paymentResult === "success") {
      toast.success(bn ? "প্যাকেজ পেমেন্ট সফল হয়েছে। আপনার প্যাকেজ এখন সক্রিয়।" : "Package payment successful. Your package is now active.");
    } else {
      toast.error(bn ? "পেমেন্ট সম্পন্ন হয়নি। আবার চেষ্টা করুন।" : "Payment was not completed. Please try again.");
    }
    params.delete("package_payment");
    params.delete("package_purchase_id");
    const query = params.toString();
    window.history.replaceState({}, "", `${window.location.pathname}${query ? `?${query}` : ""}`);
  }, [bn]);

  // ── Refresh product allowance whenever the seller or product count changes ──
  useEffect(() => {
    if (!sellerId) return;
    getSellerProductAllowance(sellerId)
      .then(setAllowance)
      .catch(() => {
        // Non-fatal: the "Add Product" click handler re-checks live,
        // and the backend still enforces the limit either way.
      });
  }, [sellerId, products.length]);

  // Populate KYC form when seller loads
  useEffect(() => {
    if (!seller) return;
    setKycForm({
      bank_name:               (seller as any).bank_name                || "",
      bank_account_name:       (seller as any).bank_account_name        || "",
      bank_account_number:     (seller as any).bank_account_number      || "",
      bank_branch:             (seller as any).bank_branch              || "",
      routing_number:          (seller as any).routing_number           || "",
      mobile_banking_provider: (seller as any).mobile_banking_provider  || "",
      mobile_banking_number:   (seller as any).mobile_banking_number    || "",
      nid_front_url:           (seller as any).nid_front_url            || "",
      nid_back_url:            (seller as any).nid_back_url             || "",
      trade_license_url:       (seller as any).trade_license_url        || "",
      tin_certificate_url:     (seller as any).tin_certificate_url      || "",
    });
  }, [seller]);

  // Keep refs in sync
  useEffect(() => { requestStatusRef.current = requestStatus; }, [requestStatus]);
  useEffect(() => { requestIdsRef.current    = requestIds;    }, [requestIds]);

  // ── Polling ──
  const pollPendingRequests = useCallback(async () => {
    const currentStatus = requestStatusRef.current;
    const currentIds    = requestIdsRef.current;
    const pendingKeys = Object.entries(currentStatus).filter(([, v]) => v === "pending").map(([k]) => k);
    if (pendingKeys.length === 0) return;
    const updates: Record<string, RequestStatus> = {};
    for (const key of pendingKeys) {
      const reqId = currentIds[key];
      if (!reqId) continue;
      try {
        const resp   = await fetch(`${API_BASE}/api/delivery-requests/${reqId}`);
        const result = await resp.json();
        if (result.success && result.data) {
          const s = result.data.status as RequestStatus;
          if (s !== "pending") updates[key] = s;
        }
      } catch { /* silent */ }
    }
    if (Object.keys(updates).length > 0) {
      setRequestStatus(prev => ({ ...prev, ...updates }));
      Object.entries(updates).forEach(([, s]) => {
        if (s === "accepted") toast.success(bn ? "ডেলিভারিম্যান রিকোয়েস্ট গ্রহণ করেছেন!" : "Deliveryman accepted your request!");
        if (s === "declined") toast.error(bn ? "ডেলিভারিম্যান রিকোয়েস্ট প্রত্যাখ্যান করেছেন" : "Deliveryman declined your request");
      });
    }
  }, [bn]);

  useEffect(() => {
    pollRef.current = setInterval(pollPendingRequests, 10_000);
    return () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };
  }, [pollPendingRequests]);

  // ── Add-product gate: blocks opening the form once the free/paid limit is hit ──
  const handleAddProductClick = async () => {
    let current = allowance;
    if (sellerId) {
      try {
        current = await getSellerProductAllowance(sellerId);
        setAllowance(current);
      } catch {
        // fall back to whatever we already have in state; backend still enforces the limit
      }
    }

    if (current && !current.canAdd) {
      toast.error(
        bn
          ? `প্যাকেজ না কিনে আপনি আর পণ্য যোগ করতে পারবেন না। আপনি আপনার ফ্রি ${current.freeLimit}টি পণ্যের লিমিট শেষ করেছেন। নতুন পণ্য যোগ করতে একটি প্যাকেজ কিনুন।`
          : `You cannot add a product without buying a package. You've used your ${current.freeLimit} free product slots. Buy a package to add more products.`
      );

      if (sellerUserId) {
        void createMartSellerNotification({
          userId: sellerUserId,
          title: bn ? "পণ্য যোগ করার লিমিট শেষ" : "Product limit reached",
          message: bn
            ? "প্যাকেজ না কিনে আপনি আর পণ্য যোগ করতে পারবেন না। আপনার ফ্রি ৫টি পণ্যের লিমিট শেষ হয়ে গেছে। চালিয়ে যেতে একটি প্যাকেজ কিনুন।"
            : "You cannot add more products without buying a package. You've used your 5 free product slots. Buy a package to keep adding products.",
          type: "mart_product_limit_reached",
        });
      }

      setShowPackageModal(true);
      return;
    }

    setEditingProduct(null);
    setShowAddProduct(true);
  };

  // ── KYC handlers ──
  const handleKycImageUpload = async (field: string, file: File) => {
    setKycUploading(prev => ({ ...prev, [field]: true }));
    try {
      const url = await uploadImage(file);
      setKycForm(prev => ({ ...prev, [field]: url }));
      toast.success(bn ? "ছবি আপলোড হয়েছে" : "Image uploaded");
    } catch (err: any) {
      toast.error(err.message || (bn ? "আপলোড ব্যর্থ" : "Upload failed"));
    } finally {
      setKycUploading(prev => ({ ...prev, [field]: false }));
    }
  };

  const submitKyc = async () => {
    if (!sellerId) return;
    setKycSaving(true);
    try {
      const resp = await fetch(`${API_BASE}/api/sellers/${sellerId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(kycForm),
      });
      const result = await resp.json();
      if (result.success) {
        setSeller(result.data);
        toast.success(bn ? "KYC তথ্য জমা হয়েছে। অ্যাডমিন রিভিউ করবেন।" : "KYC submitted! Admin will review.");
      } else {
        toast.error(result.message || (bn ? "জমা ব্যর্থ" : "Submission failed"));
      }
    } catch {
      toast.error(bn ? "জমা ব্যর্থ" : "Submission failed");
    } finally {
      setKycSaving(false);
    }
  };

  // ── Delivery ──
  const fetchDeliverymenForOrder = useCallback(async (order: Order) => {
    const district = String(order.shipping_district || "").trim();
    const area     = String(order.shipping_thana    || "").trim();
    if (!district) {
      setDeliverymenByOrder(prev => ({ ...prev, [order.id]: [] }));
      toast.error(bn ? "অর্ডারের জেলা পাওয়া যায়নি" : "Order district not found");
      return;
    }
    setDeliverymenLoading(prev => ({ ...prev, [order.id]: true }));
    try {
      const params = new URLSearchParams({ district });
      if (area) params.set("thana", area);
      const resp   = await fetch(`${API_BASE}/api/delivery-areas/matches?${params.toString()}`);
      const result = await resp.json().catch(() => ({}));
      if (!resp.ok || result.success === false) throw new Error(result.message || "Could not load deliverymen");
      setDeliverymenByOrder(prev => ({ ...prev, [order.id]: Array.isArray(result.data) ? result.data : [] }));
    } catch (err: any) {
      toast.error(err.message || "Could not load deliverymen");
    } finally {
      setDeliverymenLoading(prev => ({ ...prev, [order.id]: false }));
    }
  }, [bn]);

  const sendDeliveryRequest = async (order: Order, deliverymanUserId: number) => {
    const key = `${order.id}-${deliverymanUserId}`;
    if (!sellerUserId) { toast.error(bn ? "সেলার আইডি পাওয়া যায়নি" : "Seller ID not found. Please refresh."); return; }
    setRequestStatus(prev => ({ ...prev, [key]: "sending" }));
    try {
      const resp = await fetch(`${API_BASE}/api/delivery-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id: order.id, order_number: order.order_number, seller_id: sellerUserId,
          deliveryman_user_id: deliverymanUserId, customer_name: order.customer_name,
          customer_phone: order.customer_phone, shipping_address: order.shipping_address,
          shipping_division: order.shipping_division, shipping_district: order.shipping_district,
          shipping_thana: order.shipping_thana, total: order.total,
        }),
      });
      const result = await resp.json();
      if (result.already_exists) {
        try {
          const chkResp = await fetch(`${API_BASE}/api/delivery-requests?order_id=${order.id}&deliveryman_user_id=${deliverymanUserId}`);
          const chkResult = await chkResp.json();
          const existing  = chkResult.data?.[0];
          if (existing) { setRequestIds(prev => ({ ...prev, [key]: existing.id })); setRequestStatus(prev => ({ ...prev, [key]: existing.status as RequestStatus })); }
          else setRequestStatus(prev => ({ ...prev, [key]: "pending" }));
        } catch { setRequestStatus(prev => ({ ...prev, [key]: "pending" })); }
        toast.info(bn ? "রিকোয়েস্ট ইতিমধ্যে পাঠানো হয়েছে" : "Request already sent");
        return;
      }
      if (!result.success) throw new Error(result.message || "Failed");
      if (result.data?.id) setRequestIds(prev => ({ ...prev, [key]: result.data.id }));
      setRequestStatus(prev => ({ ...prev, [key]: "pending" }));
      toast.success(bn ? "ডেলিভারিম্যানকে রিকোয়েস্ট পাঠানো হয়েছে" : "Request sent! Waiting for acceptance...");
    } catch (err: any) {
      setRequestStatus(prev => ({ ...prev, [key]: "idle" }));
      toast.error(err.message || (bn ? "রিকোয়েস্ট পাঠাতে ব্যর্থ" : "Failed to send request"));
    }
  };

  // ── Withdrawal ──
  const fetchWithdrawals = useCallback(async () => {
    if (!sellerId) return;
    setWithdrawalsLoading(true);
    try {
      const resp = await fetch(`${API_BASE}/api/withdrawal-requests?seller_id=${sellerId}`);
      const result = await resp.json();
      if (!resp.ok || result.success === false) throw new Error(result.message || "Could not load withdrawal requests");
      setWithdrawals(result.data || []);
    } catch (err: any) {
      toast.error(err.message || "Could not load withdrawal requests");
    } finally {
      setWithdrawalsLoading(false);
    }
  }, [sellerId]);

  useEffect(() => {
    if (sellerId) fetchWithdrawals();
  }, [sellerId, fetchWithdrawals]);

  // Prefill account details from KYC info once loaded
  useEffect(() => {
    if (!seller) return;
    setWithdrawalForm(prev => {
      if (prev.account_number) return prev; // don't overwrite what the vendor already typed
      const bank = (seller as any).bank_account_number;
      const mobile = (seller as any).mobile_banking_number;
      return {
        ...prev,
        method: bank ? "bank" : mobile ? "mobile_banking" : prev.method,
        account_number: bank || mobile || "",
        account_name: (seller as any).bank_account_name || "",
      };
    });
  }, [seller]);

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const resp = await fetch(`${API_BASE}/api/orders/${encodeURIComponent(orderId)}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const result = await resp.json();
      if (result.success) {
        toast.success(bn ? "স্ট্যাটাস আপডেট হয়েছে" : "Status updated");
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
        if (newStatus === "shipped") { const order = orders.find(o => o.id === orderId); if (order) fetchDeliverymenForOrder({ ...order, status: newStatus }); }
        return;
      }
    } catch (err) { console.error(err); }
    toast.error(bn ? "আপডেট ব্যর্থ" : "Update failed");
  };

  const toggleOrderDetails = (orderId: string) => setExpandedOrder(prev => prev === orderId ? null : orderId);

  const handleSignOut = async () => {
    try {
      setSigningOut(true);
      await signOut();
      toast.success(bn ? "লগআউট হয়েছে" : "Logged out");
      navigate("/main-login", { replace: true });
    } catch { toast.error(bn ? "লগআউট ব্যর্থ" : "Logout failed"); }
    finally { setSigningOut(false); }
  };

  const deleteProduct = async (id: string) => {
    try {
      await deleteMartProduct(id);
      toast.success(bn ? "পণ্য মুছে গেছে" : "Product deleted");
      setProducts(p => p.filter(x => x.id !== id));
    } catch { toast.error(bn ? "মুছতে ব্যর্থ" : "Delete failed"); }
  };

  const toggleActive = async (id: string, current: boolean) => {
    const product = products.find(item => item.id === id) as any;
    if (!product) return;
    try {
      await updateMartProduct(id, {
        image: product.image_url, name_bn: product.name, name_en: product.name_en,
        gallery_urls: product.gallery_urls || [], description: product.description || null,
        sale_price: product.price, original_price: product.original_price, stock: product.stock || 0,
        status: !current ? "active" : "inactive", unit: product.unit,
        featured: product.is_featured ? 1 : 0, sold_qty: product.total_sold || 0,
        discount: product.discount || 0, is_freedelivery: product.is_freedelivery ? 1 : 0,
      });
      setProducts(prev => prev.map(p => p.id === id ? { ...p, is_active: !current } : p));
      toast.success(bn ? "আপডেট হয়েছে" : "Updated");
    } catch { toast.error(bn ? "আপডেট ব্যর্থ" : "Update failed"); }
  };

  // ── Coupons ──
  const refreshCoupons = async () => {
    if (!sellerId) return;
    setCoupons(await listSellerMartCoupons(sellerId));
  };

  const submitCoupon = async () => {
    if (!sellerId) return;
    if (!couponForm.code.trim() || !couponForm.discount_value) {
      toast.error("Coupon code and discount are required");
      return;
    }

    setCouponSaving(true);
    try {
      await createMartCoupon({
        seller_id: sellerId,
        code: couponForm.code.trim().toUpperCase(),
        description: couponForm.description.trim() || null,
        discount_type: couponForm.discount_type,
        discount_value: Number(couponForm.discount_value),
        min_order_amount: couponForm.min_order_amount ? Number(couponForm.min_order_amount) : null,
        max_discount_amount: couponForm.max_discount_amount ? Number(couponForm.max_discount_amount) : null,
        usage_limit: couponForm.usage_limit ? Number(couponForm.usage_limit) : null,
        expires_at: couponForm.expires_at || null,
        is_active: couponForm.is_active ? 1 : 0,
      });
      setCouponForm(couponDefault);
      await refreshCoupons();
      toast.success("Coupon submitted");
    } catch (err: any) {
      toast.error(err.message || "Could not save coupon");
    } finally {
      setCouponSaving(false);
    }
  };

  const toggleCouponActive = async (coupon: MartCoupon) => {
    try {
      const nextActive = coupon.is_active ? 0 : 1;
      await updateMartCoupon(coupon.id, { is_active: nextActive });
      setCoupons(prev => prev.map(item => item.id === coupon.id ? { ...item, is_active: nextActive } : item));
      toast.success(nextActive ? "Coupon activated" : "Coupon hidden");
    } catch (err: any) {
      toast.error(err.message || "Could not update coupon");
    }
  };

  const removeCoupon = async (couponId: number) => {
    try {
      await deleteMartCoupon(couponId);
      setCoupons(prev => prev.filter(item => item.id !== couponId));
      toast.success("Coupon deleted");
    } catch (err: any) {
      toast.error(err.message || "Could not delete coupon");
    }
  };

  // ── Loading / access guards ──
  if (authLoading || loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg">
          <Store className="h-6 w-6 text-white" />
        </div>
        <Loader2 className="h-5 w-5 animate-spin text-emerald-500" />
      </div>
    </div>
  );

  if (!hasAccess) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6">
      <Package className="h-12 w-12 text-slate-300" />
      <h2 className="text-xl font-bold text-slate-800">{bn ? "অ্যাক্সেস নেই" : "Access Denied"}</h2>
      <Button onClick={() => navigate("/")}>{bn ? "হোমে যান" : "Go Home"}</Button>
    </div>
  );

  // ── Derived values (order matters: dependencies must be computed first) ──
  const filteredProducts = products.filter(p => {
    const matchSearch = p.name.includes(searchProduct) || (p.name_en || "").toLowerCase().includes(searchProduct.toLowerCase());
    const matchStock  = productStockFilter === "all" || (p.stock || 0) < LOW_STOCK_THRESHOLD;
    return matchSearch && matchStock;
  });
  const productTotalPages  = Math.max(1, Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE));
  const currentProductPage = Math.min(productPage, productTotalPages);
  const productPageStart   = (currentProductPage - 1) * PRODUCTS_PER_PAGE;
  const paginatedProducts  = filteredProducts.slice(productPageStart, productPageStart + PRODUCTS_PER_PAGE);
  const productPageEnd     = Math.min(productPageStart + paginatedProducts.length, filteredProducts.length);

  const filteredOrders = orders.filter(o => {
    const q = searchOrder.toLowerCase();
    const matchSearch  = (o.customer_name || "").toLowerCase().includes(q) || (o.order_number || "").toLowerCase().includes(q) || (o.customer_phone || "").includes(q);
    const matchStatus  = filterOrderStatus === "all" || o.status === filterOrderStatus;
    const matchPayment = orderPaymentFilter === "all" || o.payment_status === orderPaymentFilter;
    return matchSearch && matchStatus && matchPayment;
  });

  // NOTE: paidOrders / totalRevenue must be computed BEFORE the withdrawal
  // balance figures below, since those depend on totalRevenue.
  const paidOrders   = orders.filter(o => o.payment_status === "paid");
  const totalRevenue = paidOrders.reduce((s, o) => s + Number(o.total), 0);
  const lowStock      = products.filter(p => (p.stock || 0) < LOW_STOCK_THRESHOLD).length;
  const statusData    = Object.entries(orderStatusMap)
    .map(([k, v]) => ({ name: v.label, value: orders.filter(o => o.status === k).length }))
    .filter(d => d.value > 0);
  const messageUnreadCount = messages.reduce((sum, chat) => sum + Number(chat.unread_count || 0), 0);

  // Withdrawal balance figures — depend on totalRevenue above.
  const paidOutTotal = withdrawals
    .filter(w => w.status === "paid" || w.status === "approved")
    .reduce((s, w) => s + Number(w.amount), 0);
  const pendingWithdrawalTotal = withdrawals
    .filter(w => w.status === "pending")
    .reduce((s, w) => s + Number(w.amount), 0);
  const availableBalance = Math.max(0, totalRevenue - paidOutTotal - pendingWithdrawalTotal);

  const submitWithdrawalRequest = async () => {
    if (!sellerId) return;

    const amountNum = Number(withdrawalForm.amount);
    if (!amountNum || amountNum <= 0) {
      toast.error(bn ? "সঠিক পরিমাণ লিখুন" : "Enter a valid amount");
      return;
    }
    if (amountNum > availableBalance) {
      toast.error(bn ? "উত্তোলনযোগ্য ব্যালেন্সের বেশি পরিমাণ" : "Amount exceeds your available balance");
      return;
    }
    if (!withdrawalForm.account_number.trim()) {
      toast.error(bn ? "একাউন্ট/নম্বর দিন" : "Enter an account/number");
      return;
    }

    setWithdrawalSaving(true);
    try {
      const resp = await fetch(`${API_BASE}/api/withdrawal-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          seller_id: sellerId,
          amount: amountNum,
          method: withdrawalForm.method,
          account_number: withdrawalForm.account_number.trim(),
          account_name: withdrawalForm.account_name.trim() || null,
          notes: withdrawalForm.notes.trim() || null,
        }),
      });
      const result = await resp.json();
      if (!resp.ok || result.success === false) throw new Error(result.message || "Could not submit request");

      toast.success(bn ? "উত্তোলন অনুরোধ পাঠানো হয়েছে। অ্যাডমিন রিভিউ করবেন।" : "Withdrawal request sent. Admin will review it.");
      setWithdrawalForm(prev => ({ ...withdrawalDefault, method: prev.method, account_number: prev.account_number, account_name: prev.account_name }));
      await fetchWithdrawals();

      if (sellerUserId) {
        void createMartSellerNotification({
          userId: sellerUserId,
          title: bn ? "উত্তোলন অনুরোধ পাঠানো হয়েছে" : "Withdrawal request sent",
          message: bn
            ? `৳${amountNum.toLocaleString()} উত্তোলনের অনুরোধ জমা দেওয়া হয়েছে।`
            : `Your withdrawal request for ৳${amountNum.toLocaleString()} has been submitted.`,
          type: "mart_withdrawal_requested",
        });
      }
    } catch (err: any) {
      toast.error(err.message || (bn ? "অনুরোধ পাঠাতে ব্যর্থ" : "Could not submit request"));
    } finally {
      setWithdrawalSaving(false);
    }
  };

  const stats: DashboardStat[] = [
    { icon: DollarSign,   label: bn ? "মোট বিক্রি"   : "Revenue",   value: `৳${totalRevenue.toLocaleString()}`, color: "emerald", targetTab: "orders",   orderPaymentFilter:  "paid" },
    { icon: ShoppingCart, label: bn ? "মোট অর্ডার"  : "Orders",    value: orders.length,                       color: "blue",    targetTab: "orders",   orderPaymentFilter:  "all"  },
    { icon: Package,      label: bn ? "মোট পণ্য"    : "Products",  value: products.length,                     color: "violet",  targetTab: "products", productStockFilter: "all"  },
    { icon: TrendingUp,   label: bn ? "স্বল্প স্টক" : "Low Stock", value: lowStock,                            color: "rose",    targetTab: "products", productStockFilter: "low"  },
  ];

  const sidebarItems = [
    { value: "offers",         label: "Offers & Coupons",                 icon: <Tag />,          group: "Marketing"       },
    { value: "dashboard",      label: bn ? "রিপোর্ট"               : "Dashboard",          icon: <BarChart3 />,    group: bn ? "পরিসংখ্যান"         : "Dashboard"       },
    { value: "products",       label: bn ? "পণ্য"                   : "Products",           icon: <Package />,      group: bn ? "পণ্য ম্যানেজমেন্ট" : "Products"        },
    { value: "orders",         label: bn ? "অর্ডার"                 : "Orders",             icon: <ShoppingCart />, group: bn ? "অর্ডার"             : "Orders"          },
    { value: "kyc",            label: bn ? "KYC ভেরিফিকেশন"        : "KYC Verification",   icon: <ShieldCheck />,  group: bn ? "ভেরিফিকেশন"         : "Verification"    },
    { value: "store settings", label: bn ? "মার্ট ভেন্ডর প্রোফাইল" : "Mart Vendor Profile", icon: <Store />,       group: bn ? "সেটিংস"             : "store settings"  },
    { value: "withdrawal-requests", label: bn ? "উত্তোলন অনুরোধ" : "Withdrawal Requests", icon: <CreditCard />, group: bn ? "আর্থিক" : "Financial" },
    { value: "logout",         label: bn ? "লগআউট"                  : "Logout",             icon: <LogOut />,       group: bn ? "অ্যাকাউন্ট"         : "Account"         },
    {
      value: "messages",
      label: bn ? "মেসেজ" : "Messages",
      icon: <MessageCircle />,
      group: bn ? "যোগাযোগ" : "Communication",
      badge: messageUnreadCount,
    },
  ];

  // ── Document upload field config ──
  const docFields = [
    { field: "nid_front_url",       label: bn ? "NID সামনের দিক"  : "NID Front Side"  },
    { field: "nid_back_url",        label: bn ? "NID পেছনের দিক"  : "NID Back Side"   },
    { field: "trade_license_url",   label: bn ? "ট্রেড লাইসেন্স"  : "Trade License"   },
    { field: "tin_certificate_url", label: bn ? "TIN সার্টিফিকেট" : "TIN Certificate" },
  ];

  // ════════════════════════════════════════════════════════════════════════════
  return (
    <>
      <PanelSidebarTabs
        items={sidebarItems}
        defaultValue="dashboard"
        panelTitle={bn ? "ভেন্ডর মেনু" : "Vendor Menu"}
        panelIcon={<Store className="h-5 w-5" />}
      >
        {(activeTab, setActiveTab) => (
          <div className="space-y-5">

            {/* ══════════════════════════════ PRODUCTS ══════════════════════════════ */}
            {activeTab === "products" && (
              <div className="space-y-4 mt-9">
                <div className="flex flex-col md:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                    <Input placeholder={bn ? "পণ্য খুঁজুন..." : "Search products..."} value={searchProduct}
                      onChange={e => setSearchProduct(e.target.value)} className="pl-10 h-9 rounded-xl border-slate-200 bg-white text-sm" />
                  </div>
                  <div className="inline-flex h-9 rounded-xl border border-slate-200 bg-white p-1">
                    <button type="button" onClick={() => setProductViewMode("list")}
                      className={`h-7 w-8 rounded-lg flex items-center justify-center transition-colors ${productViewMode === "list" ? "bg-emerald-50 text-emerald-600" : "text-slate-400 hover:text-slate-600"}`}>
                      <List className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={() => setProductViewMode("grid")}
                      className={`h-7 w-8 rounded-lg flex items-center justify-center transition-colors ${productViewMode === "grid" ? "bg-emerald-50 text-emerald-600" : "text-slate-400 hover:text-slate-600"}`}>
                      <LayoutGrid className="h-4 w-4" />
                    </button>
                  </div>
                  <Button onClick={handleAddProductClick}
                    className="h-9 gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:opacity-90 text-white rounded-xl border-0 shadow-sm text-sm">
                    <Plus className="h-4 w-4" />{bn ? "পণ্য যোগ" : "Add Product"}
                  </Button>
                </div>

                {allowance && !allowance.hasUnlimited && (
                  <div className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2 ${
                    allowance.canAdd ? "border-slate-100 bg-white" : "border-amber-200 bg-amber-50"
                  }`}>
                    <p className="text-xs font-medium text-slate-600">
                      {bn
                        ? `পণ্য ব্যবহার: ${allowance.productCount} / ${allowance.totalAllowed}`
                        : `Products used: ${allowance.productCount} / ${allowance.totalAllowed}`}
                    </p>
                    {!allowance.canAdd && (
                      <button onClick={() => setShowPackageModal(true)} className="text-xs font-semibold text-emerald-600 hover:underline">
                        {bn ? "প্যাকেজ কিনুন" : "Buy a package"}
                      </button>
                    )}
                  </div>
                )}

                {productStockFilter === "low" && (
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2">
                    <p className="text-xs font-semibold text-rose-600">
                      {bn ? `স্বল্প স্টক পণ্য (${lowStock})` : `Showing low stock products (${lowStock})`}
                    </p>
                    <button onClick={() => setProductStockFilter("all")} className="text-xs font-semibold text-rose-600 hover:underline">
                      {bn ? "সব দেখুন" : "Show all"}
                    </button>
                  </div>
                )}

                {filteredProducts.length === 0 ? (
                  <div className="py-16 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-white border border-slate-100 flex items-center justify-center mx-auto mb-3">
                      <Package className="h-7 w-7 text-slate-300" />
                    </div>
                    <p className="text-slate-400 text-sm">{bn ? "কোনো পণ্য পাওয়া যায়নি" : "No products found"}</p>
                  </div>
                ) : (
                  <div className={productViewMode === "grid" ? "grid gap-2 grid-cols-3 sm:grid-cols-4 xl:grid-cols-5" : "space-y-2"}>
                    {paginatedProducts.map((p, i) => (
                      <motion.div key={p.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                        <div className={`group rounded-xl bg-white border border-slate-100 hover:border-emerald-200 transition-all ${
                          productViewMode === "grid" ? "overflow-hidden" : "flex items-center gap-2.5 px-3 py-2"
                        }`}>
                          {/* Thumbnail */}
                          <div className={productViewMode === "grid"
                            ? "relative w-full h-24 overflow-hidden bg-slate-100"
                            : "w-10 h-10 rounded-xl overflow-hidden bg-slate-100 shrink-0"}>
                           {p.image_url
  ? <img src={getFullImageUrl(p.image_url)} alt="" className="w-full h-full object-cover" />
  : <div className="w-full h-full flex items-center justify-center text-lg">📦</div>}
                            {productViewMode === "grid" && (
                              <>
                                <span className={`absolute top-1.5 left-1.5 text-[9px] font-semibold px-1.5 py-0.5 rounded-full leading-relaxed ${
                                  p.is_active ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-500"
                                }`}>
                                  {p.is_active ? (bn ? "সক্রিয়" : "Active") : (bn ? "নিষ্ক্রিয়" : "Inactive")}
                                </span>
                                {p.is_featured && (
                                  <span className="absolute top-1.5 right-1.5 text-[9px] bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.5 rounded-full leading-relaxed">⭐</span>
                                )}
                              </>
                            )}
                          </div>

                          {/* Info */}
                          <div className={productViewMode === "grid" ? "p-1.5" : "flex-1 min-w-0"}>
                            <div className="flex items-center gap-1.5">
                              <p className="font-medium text-slate-800 text-[11px] truncate">{p.name}</p>
                              {productViewMode === "list" && p.is_featured && (
                                <span className="shrink-0 text-[9px] bg-amber-50 text-amber-600 border border-amber-200 px-1.5 py-0.5 rounded-full">⭐</span>
                              )}
                            </div>
                            {p.name_en && <p className="text-[10px] text-slate-400 truncate">{p.name_en}</p>}
                            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                              <span className="text-[11px] font-bold text-emerald-600">৳{p.price}</span>
                              {p.original_price && Number(p.original_price) > Number(p.price) && (
                                <span className="text-[10px] text-slate-400 line-through">৳{p.original_price}</span>
                              )}
                            </div>
                            <div className="flex gap-1.5 mt-0.5">
                              <span className={`text-[10px] ${(p.stock || 0) < LOW_STOCK_THRESHOLD ? "text-rose-500 font-semibold" : "text-slate-400"}`}>
                                {bn ? "স্টক:" : "Stk:"} {p.stock || 0}
                              </span>
                              <span className="text-[10px] text-slate-400">{bn ? "বিক্রি:" : "Sold:"} {p.total_sold || 0}</span>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className={productViewMode === "grid"
                            ? "flex items-center justify-end gap-0.5 border-t border-slate-100 px-2 py-1.5"
                            : "flex items-center gap-1 shrink-0"}>
                            {productViewMode === "list" && (
                              <button onClick={() => toggleActive(p.id, !!p.is_active)}
                                className={`text-[10px] font-semibold px-2 py-0.5 rounded-md transition-colors mr-1 ${
                                  p.is_active ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                                }`}>
                                {p.is_active ? (bn ? "সক্রিয়" : "Active") : (bn ? "নিষ্ক্রিয়" : "Inactive")}
                              </button>
                            )}
                            <div className="flex items-center gap-0.5">
                              <button onClick={() => { setEditingProduct(p as any); setShowAddProduct(true); }}
                                className="opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6 rounded-md flex items-center justify-center hover:bg-slate-100">
                                <Edit2 className="h-3 w-3 text-slate-500" />
                              </button>
                              <button onClick={() => navigate(`/mart/product/${p.slug}`)}
                                className="opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6 rounded-md flex items-center justify-center hover:bg-slate-100">
                                <Eye className="h-3 w-3 text-slate-500" />
                              </button>
                              <button onClick={() => deleteProduct(p.id)}
                                className="opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6 rounded-md flex items-center justify-center hover:bg-rose-50">
                                <Trash2 className="h-3 w-3 text-rose-400" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}

                {filteredProducts.length > 0 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-xl border border-slate-100 bg-white px-4 py-3">
                    <p className="text-xs text-slate-500">
                      {bn ? `${productPageStart + 1}-${productPageEnd} / ${filteredProducts.length} পণ্য`
                           : `Showing ${productPageStart + 1}-${productPageEnd} of ${filteredProducts.length} products`}
                    </p>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" className="h-8 rounded-lg border-slate-200 text-xs"
                        onClick={() => setProductPage(p => Math.max(1, p - 1))} disabled={currentProductPage === 1}>
                        {bn ? "আগের" : "Previous"}
                      </Button>
                      <span className="min-w-16 text-center text-xs font-semibold text-slate-600">{currentProductPage} / {productTotalPages}</span>
                      <Button variant="outline" size="sm" className="h-8 rounded-lg border-slate-200 text-xs"
                        onClick={() => setProductPage(p => Math.min(productTotalPages, p + 1))} disabled={currentProductPage === productTotalPages}>
                        {bn ? "পরের" : "Next"}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ══════════════════════════════ OFFERS ══════════════════════════════ */}
            {activeTab === "offers" && (
              <div className="space-y-4 mt-9">
                <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,420px)_1fr] gap-4">
                  <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center">
                        <Percent className="h-4 w-4 text-emerald-600" />
                      </div>
                      <div>
                        <h2 className="text-sm font-bold text-slate-800">Create Offer Coupon</h2>
                        <p className="text-xs text-slate-500">Active coupons appear on MartHome Coupons & Offers.</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-semibold text-slate-500 mb-1">Coupon code</label>
                        <Input
                          value={couponForm.code}
                          onChange={e => setCouponForm(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                          placeholder="SAVE100"
                          className="h-9 rounded-xl border-slate-200 font-mono text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">Discount type</label>
                        <Select
                          value={couponForm.discount_type}
                          onValueChange={(value: "fixed" | "percentage") => setCouponForm(prev => ({ ...prev, discount_type: value }))}
                        >
                          <SelectTrigger className="h-9 rounded-xl border-slate-200 bg-white text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="fixed">Fixed amount</SelectItem>
                            <SelectItem value="percentage">Percentage</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">Discount value</label>
                        <Input
                          type="number"
                          min="0"
                          value={couponForm.discount_value}
                          onChange={e => setCouponForm(prev => ({ ...prev, discount_value: e.target.value }))}
                          placeholder={couponForm.discount_type === "percentage" ? "10" : "100"}
                          className="h-9 rounded-xl border-slate-200 text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">Minimum order</label>
                        <Input
                          type="number"
                          min="0"
                          value={couponForm.min_order_amount}
                          onChange={e => setCouponForm(prev => ({ ...prev, min_order_amount: e.target.value }))}
                          placeholder="500"
                          className="h-9 rounded-xl border-slate-200 text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">Max discount</label>
                        <Input
                          type="number"
                          min="0"
                          value={couponForm.max_discount_amount}
                          onChange={e => setCouponForm(prev => ({ ...prev, max_discount_amount: e.target.value }))}
                          placeholder="Optional"
                          className="h-9 rounded-xl border-slate-200 text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">Usage limit</label>
                        <Input
                          type="number"
                          min="1"
                          value={couponForm.usage_limit}
                          onChange={e => setCouponForm(prev => ({ ...prev, usage_limit: e.target.value }))}
                          placeholder="Optional"
                          className="h-9 rounded-xl border-slate-200 text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">Expiry date</label>
                        <Input
                          type="date"
                          value={couponForm.expires_at}
                          onChange={e => setCouponForm(prev => ({ ...prev, expires_at: e.target.value }))}
                          className="h-9 rounded-xl border-slate-200 text-sm"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-xs font-semibold text-slate-500 mb-1">Offer description</label>
                        <textarea
                          value={couponForm.description}
                          onChange={e => setCouponForm(prev => ({ ...prev, description: e.target.value }))}
                          placeholder="Short text shown on the coupon card"
                          className="min-h-20 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-400"
                        />
                      </div>
                    </div>

                    <label className="flex items-center gap-2 text-sm text-slate-600">
                      <input
                        type="checkbox"
                        checked={couponForm.is_active}
                        onChange={e => setCouponForm(prev => ({ ...prev, is_active: e.target.checked }))}
                        className="h-4 w-4 rounded border-slate-300"
                      />
                      Show this coupon on MartHome
                    </label>

                    <Button
                      onClick={submitCoupon}
                      disabled={couponSaving}
                      className="w-full h-10 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white"
                    >
                      {couponSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Tag className="h-4 w-4" />}
                      Submit Coupon
                    </Button>
                  </div>

                  <div className="bg-white rounded-2xl border border-slate-100 p-5">
                    <div className="flex items-center justify-between gap-3 mb-4">
                      <div>
                        <h2 className="text-sm font-bold text-slate-800">My Coupons</h2>
                        <p className="text-xs text-slate-500">{coupons.length} submitted</p>
                      </div>
                      <Button variant="outline" size="sm" className="h-8 rounded-lg" onClick={refreshCoupons}>
                        <RefreshCw className="h-3.5 w-3.5" />
                      </Button>
                    </div>

                    {coupons.length === 0 ? (
                      <div className="py-14 text-center">
                        <Tag className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                        <p className="text-sm text-slate-400">No coupons submitted yet</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {coupons.map((coupon) => {
                          const active = !!coupon.is_active;
                          const expired = coupon.expires_at ? new Date(coupon.expires_at) < new Date() : false;
                          return (
                            <div key={coupon.id} className="rounded-xl border border-slate-100 p-3">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <p className="font-mono text-sm font-bold text-slate-800">{coupon.code}</p>
                                    <Badge className={active && !expired ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}>
                                      {expired ? "Expired" : active ? "Active" : "Hidden"}
                                    </Badge>
                                  </div>
                                  <p className="mt-1 text-sm font-semibold text-emerald-600">
                                    {coupon.discount_type === "percentage"
                                      ? `${Number(coupon.discount_value)}% off`
                                      : `BDT ${Number(coupon.discount_value)} off`}
                                  </p>
                                  {coupon.description && <p className="mt-1 text-xs text-slate-500 line-clamp-2">{coupon.description}</p>}
                                  <p className="mt-1 text-xs text-slate-400">
                                    Min BDT {Number(coupon.min_order_amount || 0)} · Used {coupon.used_count || 0}{coupon.usage_limit ? `/${coupon.usage_limit}` : ""}
                                  </p>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={() => toggleCouponActive(coupon)}>
                                    {active ? "Hide" : "Show"}
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-500" onClick={() => removeCoupon(coupon.id)}>
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ══════════════════════════════ ORDERS ══════════════════════════════ */}
            {activeTab === "orders" && (
              <div className="space-y-4 mt-9">
                <div className="flex flex-col md:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                    <Input placeholder={bn ? "অর্ডার নম্বর / নাম / ফোন..." : "Order no / name / phone..."} value={searchOrder}
                      onChange={e => setSearchOrder(e.target.value)} className="pl-10 h-9 rounded-xl border-slate-200 bg-white text-sm" />
                  </div>
                  <Select value={filterOrderStatus} onValueChange={setFilterOrderStatus}>
                    <SelectTrigger className="w-full md:w-48 h-9 rounded-xl border-slate-200 text-sm bg-white"><SelectValue /></SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="all">{bn ? "সকল স্ট্যাটাস" : "All Status"}</SelectItem>
                      {Object.entries(orderStatusMap).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm" className="h-9 gap-1.5 rounded-xl border-slate-200 shrink-0"
                    onClick={() => fetchOrders()} disabled={ordersLoading}>
                    <RefreshCw className={`h-3.5 w-3.5 ${ordersLoading ? "animate-spin" : ""}`} />
                    {bn ? "রিফ্রেশ" : "Refresh"}
                  </Button>
                </div>

                {orders.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => setOrderPaymentFilter(orderPaymentFilter === "paid" ? "all" : "paid")}
                      className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full border transition-all ${
                        orderPaymentFilter === "paid" ? "bg-emerald-50 text-emerald-700 border-emerald-200 ring-1 ring-emerald-600" : "bg-slate-50 text-slate-500 border-slate-200 hover:border-slate-300"
                      }`}>
                      {bn ? "পেইড" : "Paid"} ({paidOrders.length})
                    </button>
                    {Object.entries(orderStatusMap).map(([k, v]) => {
                      const count = orders.filter(o => o.status === k).length;
                      if (!count) return null;
                      return (
                        <button key={k} onClick={() => setFilterOrderStatus(filterOrderStatus === k ? "all" : k)}
                          className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full border transition-all ${
                            filterOrderStatus === k ? v.color + " ring-1 ring-current" : "bg-slate-50 text-slate-500 border-slate-200 hover:border-slate-300"
                          }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${v.dot}`} />{v.label} ({count})
                        </button>
                      );
                    })}
                  </div>
                )}

                {ordersLoading ? (
                  <div className="py-16 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-emerald-400 mb-2" />
                    <p className="text-slate-400 text-sm">{bn ? "অর্ডার লোড হচ্ছে..." : "Loading orders..."}</p>
                  </div>
                ) : filteredOrders.length === 0 ? (
                  <div className="py-16 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-white border border-slate-100 flex items-center justify-center mx-auto mb-3">
                      <ShoppingCart className="h-7 w-7 text-slate-300" />
                    </div>
                    <p className="text-slate-500 font-medium text-sm">
                      {orders.length === 0 ? (bn ? "এখনও কোনো অর্ডার নেই" : "No orders yet") : (bn ? "ফিল্টারে কোনো অর্ডার মেলেনি" : "No orders match this filter")}
                    </p>
                    {orders.length === 0 && <p className="text-slate-400 text-xs mt-1">{bn ? "কাস্টমার অর্ডার করলে এখানে দেখা যাবে।" : "Customer orders will appear here."}</p>}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredOrders.map((order, i) => {
                      const st = orderStatusMap[order.status];
                      const isExpanded           = expandedOrder === order.id;
                      const itemList: OrderItem[] = order.items ?? [];
                      const matchingDeliverymen  = deliverymenByOrder[order.id] || [];
                      const isDeliverymenLoading = !!deliverymenLoading[order.id];
                      return (
                        <motion.div key={order.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                          <div className="rounded-2xl bg-white border border-slate-100 hover:border-slate-200 hover:shadow-sm transition-all overflow-hidden">
                            <div className="p-4">
                              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap mb-1.5">
                                    <span className="font-bold text-slate-800 text-sm font-mono">{order.order_number}</span>
                                    {st && (
                                      <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${st.color}`}>
                                        <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />{st.label}
                                      </span>
                                    )}
                                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                                      order.payment_status === "paid" ? "bg-emerald-50 text-emerald-600 border border-emerald-200" : "bg-slate-100 text-slate-500"
                                    }`}>
                                      {order.payment_status === "paid" ? (bn ? "পেমেন্ট হয়েছে" : "Paid")
                                        : order.payment_status === "failed" ? (bn ? "পেমেন্ট ব্যর্থ" : "Failed")
                                        : (bn ? "পেমেন্ট বাকি" : "Unpaid")}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-3 flex-wrap">
                                    <div className="flex items-center gap-1.5">
                                      <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                                        <span className="text-[11px] font-bold text-emerald-700">{(order.customer_name || "?").charAt(0).toUpperCase()}</span>
                                      </div>
                                      <span className="text-sm font-semibold text-slate-700">{order.customer_name}</span>
                                    </div>
                                    <span className="text-xs text-slate-400">{order.customer_phone}</span>
                                  </div>
                                  <p className="text-xs text-slate-400 mt-1 truncate">{order.shipping_address}</p>
                                  {(order.shipping_thana || order.shipping_district || order.shipping_division) && (
                                    <p className="text-[11px] text-slate-400 mt-0.5 inline-flex items-center gap-1">
                                      <MapPin className="h-3 w-3" />
                                      {[order.shipping_thana, order.shipping_district, order.shipping_division].filter(Boolean).join(", ")}
                                    </p>
                                  )}
                                  <p className="text-[11px] text-slate-400 mt-0.5">
                                    {new Date(order.created_at).toLocaleString(bn ? "bn-BD" : "en-BD", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                                  </p>
                                </div>
                                <div className="flex items-center gap-3 shrink-0">
                                  <div className="text-right">
                                    <p className="text-xl font-extrabold text-emerald-600">৳{Number(order.total).toLocaleString()}</p>
                                    <p className="text-[10px] text-slate-400">{itemList.length} {bn ? "টি পণ্য" : "item(s)"}</p>
                                  </div>
                                  <div className="flex flex-col gap-2">
                                    <Select value={order.status} onValueChange={v => updateOrderStatus(order.id, v)}>
                                      <SelectTrigger className="w-36 h-8 text-xs rounded-xl border-slate-200 bg-slate-50"><SelectValue /></SelectTrigger>
                                      <SelectContent className="rounded-xl">
                                        {Object.entries(orderStatusMap).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                                      </SelectContent>
                                    </Select>
                                    {order.status === "shipped" && (
                                      <Button size="sm" variant="outline" className="h-8 text-xs rounded-xl border-emerald-200 text-emerald-700"
                                        onClick={() => fetchDeliverymenForOrder(order)} disabled={isDeliverymenLoading}>
                                        {isDeliverymenLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : bn ? "ডেলিভারিম্যান খুঁজুন" : "Find Deliveryman"}
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>

                            {order.status === "shipped" && (
                              <div className="mx-4 mb-4 rounded-xl border border-emerald-100 bg-emerald-50/40 p-3">
                                <div className="flex items-center justify-between gap-3 mb-2">
                                  <p className="text-xs font-bold text-emerald-800">{bn ? "ম্যাচিং ডেলিভারিম্যান" : "Matching Deliverymen"}</p>
                                  <span className="text-[11px] text-emerald-700">
                                    {[order.shipping_thana, order.shipping_district].filter(Boolean).join(", ") || (bn ? "এলাকা নেই" : "Address area missing")}
                                  </span>
                                </div>
                                {isDeliverymenLoading ? (
                                  <div className="flex items-center gap-2 text-xs text-emerald-700">
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />{bn ? "লোড হচ্ছে..." : "Loading deliverymen..."}
                                  </div>
                                ) : matchingDeliverymen.length === 0 ? (
                                  <p className="text-xs text-slate-500">{bn ? "এই এলাকায় কোনো ডেলিভারিম্যান পাওয়া যায়নি।" : "No matching deliveryman found for this district/area."}</p>
                                ) : (
                                  <div className="grid gap-2 md:grid-cols-2">
                                    {matchingDeliverymen.map(deliveryman => {
                                      const key    = `${order.id}-${deliveryman.user_id}`;
                                      const status = requestStatus[key] ?? "idle";
                                      return (
                                        <div key={`${deliveryman.user_id}-${deliveryman.thana || deliveryman.area}`}
                                          className="rounded-xl border border-white bg-white px-3 py-2 shadow-sm">
                                          <div className="flex items-center gap-2">
                                            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                                              <UserRound className="h-4 w-4" />
                                            </div>
                                            <div className="flex flex-1 items-center justify-between gap-3 min-w-0">
                                              <div className="min-w-0 flex-1">
                                                <p className="truncate text-sm font-semibold text-slate-800">
                                                  {deliveryman.deliveryman_name || `Deliveryman #${deliveryman.user_id}`}
                                                </p>
                                                <p className="text-[11px] text-slate-400">{deliveryman.thana || deliveryman.area}, {deliveryman.district}</p>
                                                {deliveryman.deliveryman_phone && (
                                                  <a href={`tel:${deliveryman.deliveryman_phone}`} className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                                                    <PhoneCall className="h-3 w-3" />{deliveryman.deliveryman_phone}
                                                  </a>
                                                )}
                                              </div>
                                              <RequestButton status={status} bn={bn} onSend={() => sendDeliveryRequest(order, deliveryman.user_id)} />
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            )}

                            <button className="w-full flex items-center justify-center gap-1.5 text-xs text-slate-400 hover:text-emerald-600 hover:bg-emerald-50/50 transition-colors py-2 border-t border-slate-100"
                              onClick={() => toggleOrderDetails(order.id)}>
                              {isExpanded
                                ? <><ChevronUp className="h-3.5 w-3.5" />{bn ? "আইটেম লুকান" : "Hide Items"}</>
                                : <><ChevronDown className="h-3.5 w-3.5" />{bn ? `${itemList.length} টি পণ্য দেখুন` : `View ${itemList.length} item(s)`}</>}
                            </button>

                            <AnimatePresence>
                              {isExpanded && (
                                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                                  <div className="px-4 pb-4 pt-2 space-y-2 bg-slate-50/60 border-t border-slate-100">
                                    {itemList.length === 0 ? (
                                      <p className="text-xs text-slate-400 text-center py-3">{bn ? "কোনো আইটেম নেই" : "No items"}</p>
                                    ) : itemList.map((item, idx) => (
                                      <div key={item.id ?? idx} className="flex items-center gap-3 bg-white rounded-xl p-3 border border-slate-100">
                                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-100 shrink-0">
                                         {item.product_image ? <img src={getFullImageUrl(item.product_image)} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-sm">📦</div>}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <p className="text-sm font-medium text-slate-700 truncate">{item.product_name}</p>
                                          <p className="text-xs text-slate-400 mt-0.5">৳{item.unit_price} × {item.quantity}</p>
                                        </div>
                                        <p className="text-sm font-bold text-slate-700 shrink-0">৳{item.total_price}</p>
                                      </div>
                                    ))}
                                    <div className="flex justify-between items-center pt-1 px-1">
                                      <span className="text-xs text-slate-400">{bn ? "মোট" : "Total"}</span>
                                      <span className="text-sm font-extrabold text-emerald-600">৳{Number(order.total).toLocaleString()}</span>
                                    </div>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ══════════════════════════════ KYC ══════════════════════════════ */}
            {activeTab === "kyc" && (
              <div className="space-y-5 mt-9">
                <KycSellerBackendSync sellerId={sellerId} onLoaded={setSeller} />

                {/* Status banner */}
                <div className={`flex items-center gap-3 rounded-2xl border p-4 ${
                  seller?.seller_verified ? "bg-emerald-50 border-emerald-100" : "bg-amber-50 border-amber-100"
                }`}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    seller?.seller_verified ? "bg-emerald-100" : "bg-amber-100"
                  }`}>
                    <ShieldCheck className={`h-5 w-5 ${seller?.seller_verified ? "text-emerald-600" : "text-amber-600"}`} />
                  </div>
                  <div>
                    <p className={`text-sm font-bold ${seller?.seller_verified ? "text-emerald-800" : "text-amber-800"}`}>
                      {seller?.seller_verified
                        ? (bn ? "আপনার অ্যাকাউন্ট ভেরিফাইড ✓" : "Your account is verified ✓")
                        : (bn ? "ভেরিফিকেশন পেন্ডিং" : "Verification pending")}
                    </p>
                    <p className={`text-xs mt-0.5 ${seller?.seller_verified ? "text-emerald-600" : "text-amber-600"}`}>
                      {seller?.seller_verified
                        ? (bn ? "আপনার KYC তথ্য যাচাই করা হয়েছে।" : "Your KYC information has been verified.")
                        : (bn ? "নিচের তথ্য পূরণ করুন এবং জমা দিন। অ্যাডমিন রিভিউ করবেন।" : "Fill the form below and submit. Admin will review.")}
                    </p>
                  </div>
                </div>

                {!seller?.seller_verified && String(seller?.kyc_admin_message || "").trim() && (
                  <div className="flex items-start gap-3 rounded-2xl border border-rose-100 bg-rose-50 p-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-rose-600">
                      <MessageSquareWarning className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-rose-800">
                        {bn ? "অ্যাডমিন বার্তা" : "Admin message"}
                      </p>
                      <p className="mt-1 whitespace-pre-wrap text-sm leading-5 text-rose-700">
                        {seller.kyc_admin_message}
                      </p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">

                  {/* ── Bank Info ── */}
                  <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-4">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
                        <CreditCard className="h-3.5 w-3.5 text-blue-500" />
                      </div>
                      <p className="text-sm font-bold text-slate-700">{bn ? "ব্যাংক তথ্য" : "Bank Information"}</p>
                    </div>

                    {[
                      { field: "bank_name",           label: bn ? "ব্যাংকের নাম"    : "Bank Name",           placeholder: "e.g. Dutch-Bangla Bank" },
                      { field: "bank_account_name",   label: bn ? "একাউন্ট নাম"     : "Account Holder Name", placeholder: bn ? "একাউন্টধারীর নাম" : "Name on account" },
                      { field: "bank_account_number", label: bn ? "একাউন্ট নম্বর"   : "Account Number",      placeholder: "0000000000" },
                      { field: "bank_branch",         label: bn ? "শাখার নাম"        : "Branch Name",         placeholder: bn ? "শাখা" : "Branch" },
                      { field: "routing_number",      label: bn ? "রাউটিং নম্বর"    : "Routing Number",      placeholder: "000000000" },
                    ].map(({ field, label, placeholder }) => (
                      <div key={field}>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">{label}</label>
                        <Input
                          value={kycForm[field as keyof typeof kycForm]}
                          onChange={e => setKycForm(prev => ({ ...prev, [field]: e.target.value }))}
                          placeholder={placeholder}
                          className="h-9 rounded-xl border-slate-200 text-sm"
                        />
                      </div>
                    ))}
                  </div>

                  {/* ── Mobile Banking + Documents ── */}
                  <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-4">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-violet-50 flex items-center justify-center">
                        <Banknote className="h-3.5 w-3.5 text-violet-500" />
                      </div>
                      <p className="text-sm font-bold text-slate-700">{bn ? "মোবাইল ব্যাংকিং" : "Mobile Banking"}</p>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">{bn ? "প্রদানকারী" : "Provider"}</label>
                      <Select
                        value={kycForm.mobile_banking_provider || "__none__"}
                        onValueChange={v => setKycForm(prev => ({ ...prev, mobile_banking_provider: v === "__none__" ? "" : v }))}
                      >
                        <SelectTrigger className="h-9 rounded-xl border-slate-200 text-sm bg-white">
                          <SelectValue placeholder={bn ? "বেছে নিন" : "Select provider"} />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="__none__">{bn ? "বেছে নিন" : "Select provider"}</SelectItem>
                          {["bKash", "Nagad", "Rocket", "Upay", "SureCash"].map(p => (
                            <SelectItem key={p} value={p}>{p}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">{bn ? "মোবাইল নম্বর" : "Mobile Number"}</label>
                      <Input
                        value={kycForm.mobile_banking_number}
                        onChange={e => setKycForm(prev => ({ ...prev, mobile_banking_number: e.target.value }))}
                        placeholder="01XXXXXXXXX"
                        className="h-9 rounded-xl border-slate-200 text-sm"
                      />
                    </div>

                    {/* Documents */}
                    <div className="pt-3 border-t border-slate-100 space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center">
                          <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                        </div>
                        <p className="text-sm font-bold text-slate-700">{bn ? "যাচাইকরণ ডকুমেন্ট" : "Verification Documents"}</p>
                      </div>

                      {docFields.map(({ field, label }) => {
                        const currentUrl  = kycForm[field as keyof typeof kycForm];
                        const isUploading = !!kycUploading[field];
                        return (
                          <div key={field} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <p className="text-xs font-semibold text-slate-600">{label}</p>
                              {currentUrl && (
                                <a href={currentUrl} target="_blank" rel="noreferrer"
                                  className="text-[10px] text-emerald-600 font-semibold hover:underline">
                                  {bn ? "দেখুন ↗" : "View ↗"}
                                </a>
                              )}
                            </div>

                            {currentUrl ? (
                              <div className="flex items-center gap-2">
                                <img src={currentUrl} alt={label} className="w-16 h-12 rounded-lg object-cover border border-slate-200 shrink-0" />
                                <label className="flex-1 cursor-pointer">
                                  <div className="h-8 rounded-lg border border-dashed border-slate-300 flex items-center justify-center text-[11px] text-slate-400 hover:border-emerald-400 hover:text-emerald-500 transition-colors">
                                    {isUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : (bn ? "পরিবর্তন করুন" : "Change")}
                                  </div>
                                  <input type="file" accept="image/*" className="hidden"
                                    onChange={e => { const f = e.target.files?.[0]; if (f) handleKycImageUpload(field, f); }} />
                                </label>
                              </div>
                            ) : (
                              <label className="cursor-pointer block">
                                <div className={`h-16 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1 transition-colors ${
                                  isUploading ? "border-emerald-300 bg-emerald-50" : "border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50"
                                }`}>
                                  {isUploading
                                    ? <Loader2 className="h-4 w-4 animate-spin text-emerald-500" />
                                    : <><Plus className="h-4 w-4 text-slate-400" /><span className="text-[11px] text-slate-400">{bn ? "ছবি আপলোড করুন" : "Upload image"}</span></>}
                                </div>
                                <input type="file" accept="image/*" className="hidden"
                                  onChange={e => { const f = e.target.files?.[0]; if (f) handleKycImageUpload(field, f); }} />
                              </label>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Submit button */}
                <div className="flex justify-end">
                  <Button onClick={submitKyc} disabled={kycSaving}
                    className="h-10 px-8 gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:opacity-90 text-white rounded-xl border-0 shadow-sm">
                    {kycSaving
                      ? <><Loader2 className="h-4 w-4 animate-spin" />{bn ? "জমা হচ্ছে..." : "Submitting..."}</>
                      : <><ShieldCheck className="h-4 w-4" />{bn ? "KYC জমা দিন" : "Submit KYC"}</>}
                  </Button>
                </div>
              </div>
            )}

            {/* ══════════════════════════════ WITHDRAWAL REQUESTS ══════════════════════════════ */}
            {activeTab === "withdrawal-requests" && (
              <div className="space-y-4 mt-9">
                <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,420px)_1fr] gap-4">

                  {/* ── Request form ── */}
                  <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center">
                        <CreditCard className="h-4 w-4 text-emerald-600" />
                      </div>
                      <div>
                        <h2 className="text-sm font-bold text-slate-800">{bn ? "উত্তোলন অনুরোধ করুন" : "Request a Withdrawal"}</h2>
                        <p className="text-xs text-slate-500">{bn ? "আপনার আয় থেকে টাকা তোলার জন্য অনুরোধ পাঠান।" : "Send a request to cash out your earnings."}</p>
                      </div>
                    </div>

                    {/* Balance summary */}
                    <div className="grid grid-cols-3 gap-2">
                      <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-3">
                        <p className="text-[10px] font-medium text-emerald-700">{bn ? "উত্তোলনযোগ্য" : "Available"}</p>
                        <p className="text-sm font-extrabold text-emerald-700 mt-0.5">৳{availableBalance.toLocaleString()}</p>
                      </div>
                      <div className="rounded-xl bg-amber-50 border border-amber-100 p-3">
                        <p className="text-[10px] font-medium text-amber-700">{bn ? "অপেক্ষমাণ" : "Pending"}</p>
                        <p className="text-sm font-extrabold text-amber-700 mt-0.5">৳{pendingWithdrawalTotal.toLocaleString()}</p>
                      </div>
                      <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
                        <p className="text-[10px] font-medium text-slate-500">{bn ? "মোট বিক্রি" : "Total Revenue"}</p>
                        <p className="text-sm font-extrabold text-slate-700 mt-0.5">৳{totalRevenue.toLocaleString()}</p>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">{bn ? "পরিমাণ (৳)" : "Amount (৳)"}</label>
                      <Input
                        type="number"
                        min="1"
                        max={availableBalance}
                        value={withdrawalForm.amount}
                        onChange={e => setWithdrawalForm(prev => ({ ...prev, amount: e.target.value }))}
                        placeholder={bn ? "যেমন ৫০০" : "e.g. 500"}
                        className="h-9 rounded-xl border-slate-200 text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">{bn ? "পদ্ধতি" : "Method"}</label>
                      <Select
                        value={withdrawalForm.method}
                        onValueChange={(v: "bank" | "mobile_banking") => setWithdrawalForm(prev => ({ ...prev, method: v }))}
                      >
                        <SelectTrigger className="h-9 rounded-xl border-slate-200 bg-white text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="bank">{bn ? "ব্যাংক" : "Bank Transfer"}</SelectItem>
                          <SelectItem value="mobile_banking">{bn ? "মোবাইল ব্যাংকিং" : "Mobile Banking"}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">
                        {withdrawalForm.method === "bank" ? (bn ? "একাউন্ট নম্বর" : "Account Number") : (bn ? "মোবাইল নম্বর" : "Mobile Number")}
                      </label>
                      <Input
                        value={withdrawalForm.account_number}
                        onChange={e => setWithdrawalForm(prev => ({ ...prev, account_number: e.target.value }))}
                        placeholder={withdrawalForm.method === "bank" ? "0000000000" : "01XXXXXXXXX"}
                        className="h-9 rounded-xl border-slate-200 text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">{bn ? "একাউন্টধারীর নাম" : "Account Holder Name"}</label>
                      <Input
                        value={withdrawalForm.account_name}
                        onChange={e => setWithdrawalForm(prev => ({ ...prev, account_name: e.target.value }))}
                        placeholder={bn ? "নাম" : "Name"}
                        className="h-9 rounded-xl border-slate-200 text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">{bn ? "নোট (ঐচ্ছিক)" : "Note (optional)"}</label>
                      <textarea
                        value={withdrawalForm.notes}
                        onChange={e => setWithdrawalForm(prev => ({ ...prev, notes: e.target.value }))}
                        placeholder={bn ? "অতিরিক্ত তথ্য..." : "Anything admin should know..."}
                        className="min-h-16 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-400"
                      />
                    </div>

                    <Button
                      onClick={submitWithdrawalRequest}
                      disabled={withdrawalSaving || availableBalance <= 0}
                      className="w-full h-10 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white disabled:opacity-50"
                    >
                      {withdrawalSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      {bn ? "উত্তোলনের অনুরোধ পাঠান" : "Send Withdrawal Request"}
                    </Button>
                    {availableBalance <= 0 && (
                      <p className="text-xs text-center text-slate-400">{bn ? "উত্তোলনযোগ্য ব্যালেন্স নেই" : "No available balance to withdraw"}</p>
                    )}
                  </div>

                  {/* ── History ── */}
                  <div className="bg-white rounded-2xl border border-slate-100 p-5">
                    <div className="flex items-center justify-between gap-3 mb-4">
                      <div>
                        <h2 className="text-sm font-bold text-slate-800">{bn ? "আমার অনুরোধসমূহ" : "My Requests"}</h2>
                        <p className="text-xs text-slate-500">{withdrawals.length} {bn ? "টি অনুরোধ" : "submitted"}</p>
                      </div>
                      <Button variant="outline" size="sm" className="h-8 rounded-lg" onClick={fetchWithdrawals} disabled={withdrawalsLoading}>
                        <RefreshCw className={`h-3.5 w-3.5 ${withdrawalsLoading ? "animate-spin" : ""}`} />
                      </Button>
                    </div>

                    {withdrawalsLoading ? (
                      <div className="py-14 text-center">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto text-emerald-400 mb-2" />
                        <p className="text-sm text-slate-400">{bn ? "লোড হচ্ছে..." : "Loading..."}</p>
                      </div>
                    ) : withdrawals.length === 0 ? (
                      <div className="py-14 text-center">
                        <CreditCard className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                        <p className="text-sm text-slate-400">{bn ? "এখনও কোনো অনুরোধ নেই" : "No withdrawal requests yet"}</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {withdrawals.map((w) => {
                          const st = withdrawalStatusMap[w.status];
                          return (
                            <div key={w.id} className="rounded-xl border border-slate-100 p-3">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <p className="text-sm font-extrabold text-emerald-600">৳{Number(w.amount).toLocaleString()}</p>
                                    {st && (
                                      <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${st.color}`}>
                                        <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />{st.label}
                                      </span>
                                    )}
                                  </div>
                                  <p className="mt-1 text-xs text-slate-500">
                                    {w.method === "bank" ? (bn ? "ব্যাংক" : "Bank") : (bn ? "মোবাইল ব্যাংকিং" : "Mobile Banking")} · {w.account_number}
                                    {w.account_name ? ` · ${w.account_name}` : ""}
                                  </p>
                                  {w.notes && <p className="mt-1 text-xs text-slate-400 line-clamp-2">{w.notes}</p>}
                                  {w.admin_note && (
                                    <p className="mt-1 text-xs text-rose-600">
                                      {bn ? "অ্যাডমিন নোট: " : "Admin note: "}{w.admin_note}
                                    </p>
                                  )}
                                  <p className="mt-1 text-[11px] text-slate-400">
                                    {new Date(w.created_at).toLocaleString(bn ? "bn-BD" : "en-BD", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                                  </p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ══════════════════════════════ DASHBOARD ══════════════════════════════ */}
            {activeTab === "dashboard" && (
              <>
                <div className="grid mt-9 grid-cols-2 xl:grid-cols-4 gap-3 mb-5">
                  {stats.map((s, i) => {
                    const c = colorToken[s.color];
                    return (
                      <button key={i} type="button"
                        onClick={() => {
                          if (s.productStockFilter) setProductStockFilter(s.productStockFilter);
                          if (s.orderPaymentFilter) setOrderPaymentFilter(s.orderPaymentFilter);
                          if (s.targetTab === "products") setSearchProduct("");
                          if (s.targetTab === "orders") { setSearchOrder(""); setFilterOrderStatus("all"); }
                          setActiveTab(s.targetTab);
                        }}
                        className={`bg-white rounded-2xl p-4 shadow-sm border ${c.border} text-left transition-all hover:shadow-md focus:outline-none focus:ring-2 focus:ring-emerald-300`}>
                        <div className={`w-9 h-9 rounded-xl ${c.bg} flex items-center justify-center mb-2`}>
                          <s.icon className={`h-4 w-4 ${c.text}`} />
                        </div>
                        <p className="text-xl font-bold text-slate-800">{s.value}</p>
                        <p className="text-xs text-slate-400 mt-1">{s.label}</p>
                      </button>
                    );
                  })}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="bg-white rounded-2xl border border-slate-100 p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center"><BarChart3 className="h-3.5 w-3.5 text-blue-500" /></div>
                      <p className="text-sm font-semibold text-slate-700">{bn ? "অর্ডার স্ট্যাটাস" : "Order Status"}</p>
                    </div>
                    {statusData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={240}>
                        <PieChart>
                          <Pie data={statusData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} dataKey="value" paddingAngle={3}
                            label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                            {statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                          </Pie>
                          <Tooltip contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }} />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : <div className="py-12 text-center text-slate-400 text-sm">{bn ? "ডেটা নেই" : "No data yet"}</div>}
                  </div>
                  <div className="bg-white rounded-2xl border border-slate-100 p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center"><TrendingUp className="h-3.5 w-3.5 text-emerald-500" /></div>
                      <p className="text-sm font-semibold text-slate-700">{bn ? "সবচেয়ে বেশি বিক্রিত পণ্য" : "Top Products"}</p>
                    </div>
                    <div className="space-y-3">
                      {[...products].sort((a, b) => (b.total_sold || 0) - (a.total_sold || 0)).slice(0, 5).map((p, i) => (
                        <div key={p.id} className="flex items-center gap-3">
                          <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                            i === 0 ? "bg-amber-100 text-amber-600" : i === 1 ? "bg-slate-100 text-slate-500" : i === 2 ? "bg-orange-50 text-orange-400" : "bg-slate-50 text-slate-400"
                          }`}>{i + 1}</div>
                          <div className="w-9 h-9 rounded-xl bg-slate-100 overflow-hidden shrink-0">
                           {p.image_url ? <img src={getFullImageUrl(p.image_url)} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-sm">📦</div>}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-700 truncate">{p.name}</p>
                            <p className="text-xs text-slate-400">৳{p.price}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-sm font-bold text-slate-700">{p.total_sold || 0}</p>
                            <p className="text-[10px] text-slate-400">{bn ? "বিক্রি" : "sold"}</p>
                          </div>
                        </div>
                      ))}
                      {products.length === 0 && <p className="text-center py-4 text-slate-400 text-sm">{bn ? "ডেটা নেই" : "No data yet"}</p>}
                    </div>
                  </div>
                </div>
              </>
            )}

            {activeTab === "messages" && (
              <div className="space-y-4 mt-9">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-slate-800">
                      {bn ? "কাস্টমার মেসেজ" : "Customer Messages"}
                    </h2>
                    <p className="text-xs text-slate-500">
                      {bn ? "কাস্টমারদের পাঠানো মেসেজ এখানে দেখাবে" : "Messages from customers will appear here"}
                    </p>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchMessages}
                    disabled={messagesLoading}
                    className="h-9 rounded-xl"
                  >
                    <RefreshCw className={`h-4 w-4 ${messagesLoading ? "animate-spin" : ""}`} />
                    {bn ? "রিফ্রেশ" : "Refresh"}
                  </Button>
                </div>

                {messagesLoading ? (
                  <div className="py-16 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-emerald-500 mb-2" />
                    <p className="text-sm text-slate-400">
                      {bn ? "মেসেজ লোড হচ্ছে..." : "Loading messages..."}
                    </p>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="py-16 text-center bg-white rounded-2xl border border-slate-100">
                    <MessageCircle className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm text-slate-400">
                      {bn ? "এখনও কোনো মেসেজ নেই" : "No messages yet"}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {messages.map((chat) => (
                      <button
                        key={chat.id}
                        onClick={() => navigate(`/mart/vendor/messages/${chat.id}`)}
                        className="w-full text-left rounded-2xl bg-white border border-slate-100 hover:border-emerald-200 hover:shadow-sm transition-all p-4"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-100 shrink-0">
                           {chat.product_image ? (
                              <img
                                src={getFullImageUrl(chat.product_image)}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                📦
                              </div>
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm font-bold text-slate-800 truncate">
                                {chat.user_name || `User ${chat.user_id}`}
                              </p>

                              {chat.unread_count > 0 && (
                                <span className="min-w-5 h-5 px-1.5 rounded-full bg-emerald-500 text-white text-[10px] font-bold flex items-center justify-center">
                                  {chat.unread_count}
                                </span>
                              )}
                            </div>

                            <p className="text-xs text-slate-500 truncate mt-0.5">
                              {chat.product_name || `Product ${chat.product_id}`}
                            </p>

                            <p className="text-sm text-slate-600 truncate mt-1">
                              {chat.last_message || ""}
                            </p>

                            {chat.last_message_at && (
                              <p className="text-[11px] text-slate-400 mt-1">
                                {new Date(chat.last_message_at).toLocaleString(
                                  bn ? "bn-BD" : "en-BD"
                                )}
                              </p>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ══════════════════════════════ LOGOUT ══════════════════════════════ */}
            {activeTab === "logout" && (
              <div className="mt-9 max-w-md rounded-2xl border border-red-100 bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-600"><LogOut className="h-5 w-5" /></div>
                  <div>
                    <h2 className="text-base font-bold text-slate-800">{bn ? "লগআউট করুন" : "Logout"}</h2>
                    <p className="text-sm text-slate-500">{bn ? "ভেন্ডর প্যানেল থেকে বের হতে নিচের বাটনে চাপুন।" : "Sign out from the vendor panel."}</p>
                  </div>
                </div>
                <Button variant="destructive" onClick={handleSignOut} disabled={signingOut} className="w-full gap-2">
                  {signingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
                  {signingOut ? (bn ? "লগআউট হচ্ছে..." : "Logging out...") : (bn ? "লগআউট" : "Logout")}
                </Button>
              </div>
            )}

            {/* ══════════════════════════════ STORE SETTINGS ══════════════════════════════ */}
            {activeTab === "store settings" && (
              <StoreSettingsTab seller={seller} sellerId={sellerId} bn={bn} onSaved={setSeller} />
            )}

          </div>
        )}
      </PanelSidebarTabs>

      <AddProductForm
        open={showAddProduct}
        onClose={() => { setShowAddProduct(false); setEditingProduct(null); }}
        onSuccess={fetchProducts}
        onLimitReached={() => {
          setShowAddProduct(false);
          setEditingProduct(null);
          setShowPackageModal(true);
        }}
        editProduct={editingProduct}
        sellerId={sellerId}
      />

      <PackageLimitModal
        open={showPackageModal}
        onClose={() => setShowPackageModal(false)}
        sellerId={sellerId}
        allowance={allowance}
        bn={bn}
      />
    </>
  );
};

export default MartPanel;
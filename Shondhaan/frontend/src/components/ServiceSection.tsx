import { useRef, useState, useEffect, useCallback, forwardRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import {
  Building2, CalendarCheck, CalendarIcon, ChevronRight, ChevronLeft, Clock,
  Star, Share2, X, Copy, Check, Eye, GitCompareArrows, Phone, User,
  Loader2, BadgeCheck, Trash2, Wallet, ShoppingBag,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCompare } from "@/contexts/CompareContext";
import { useCart } from "@/contexts/CartContext";
import type { CmsService } from "@/hooks/useCmsData";
import { useLongPress } from "@/hooks/useLongPress";
import { haptic } from "@/lib/haptics";
import { toast } from "sonner";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { INDIVIDUAL_API_BASE_URL } from "@/lib/api";
import { getMySqlAuth } from "@/lib/mysqlAuth";
import { createBooking, startBookingPayment } from "@/lib/bookingApi";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const getStaticBaseUrl = () => {
  try { return new URL(INDIVIDUAL_API_BASE_URL).origin; } catch { return INDIVIDUAL_API_BASE_URL.replace(/\/+$/, "").replace(/\/api$/, ""); }
};
const STATIC_BASE_URL = getStaticBaseUrl();
const todayInputValue = () => new Date().toISOString().slice(0, 10);

/* Central API base for wallet & referral */
const VITE_API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_CENTRAL_API_BASE_URL || "").replace(/\/+$/, "");

/* Auth headers helper */
const getServiceApiHeaders = () => {
  const auth = getMySqlAuth();
  return {
    "Content-Type": "application/json",
    ...(auth?.token ? { Authorization: `Bearer ${auth.token}` } : {}),
  };
};

const getImageSrc = (url?: string) => {
  if (!url) return "";
  if (/^https?:\/\//i.test(url) || url.startsWith("data:")) return url;
  return `${STATIC_BASE_URL}${url.startsWith("/") ? url : `/${url}`}`;
};

/* ─── Types ─── */
interface ServiceItem {
  title: string;
  image: string;
  slug?: string;
  rating?: number;
  price?: number;
  packageName?: string;
  description?: string;
  cmsService?: CmsService;
  commission_percent?: number;
  platform_fee?: number;
  service_id?: string;
}

interface ServiceSectionProps { heading: string; services: ServiceItem[]; viewAllLink?: string; }
interface SharePopupProps { slug: string; title: string; anchorRect: DOMRect; onClose: () => void; }
interface DescriptionTooltipProps { description: string; anchorRect: DOMRect; }
interface BookingModalProps { service: ServiceItem; bn: boolean; onClose: () => void; }

interface Pkg {
  id: string;
  name: string;
  name_en: string | null;
  price: number;
  discount_price: number | null;
  features: string[];
  is_popular: boolean;
  duration: string | null;
  duration_en: string | null;
}

/* ─── Design tokens ─── */
const TK = { paper: "#EEF0E9", card: "#FFFFFF", line: "#DBD9CC", brass: "#C4842E", brassDark: "#8F5E1E", brassTint: "#F6E9D6", ink: "#182620", inkSoft: "#3c4a43", muted: "#7A7F76" } as const;

/* ─── Helpers ─── */
const getPkgName = (pkg: Pkg, bn: boolean) => bn ? pkg.name : (pkg.name_en || pkg.name);
const getPkgPrice = (pkg: Pkg) => (pkg.discount_price != null && pkg.discount_price > 0 && pkg.discount_price < pkg.price) ? pkg.discount_price : pkg.price;
const getPkgDuration = (pkg: Pkg, bn: boolean) => bn ? (pkg.duration || "") : (pkg.duration_en || pkg.duration || "");

/* ─── Description Tooltip ─── */
const DescriptionTooltip = ({ description, anchorRect }: DescriptionTooltipProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0, arrow: 0 });
  useEffect(() => {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const cx = anchorRect.left + window.scrollX + anchorRect.width / 2;
    let top = anchorRect.top + window.scrollY + anchorRect.height / 2 + 68;
    let left = cx - r.width / 2;
    const m = 12;
    if (left < window.scrollX + m) left = window.scrollX + m;
    if (left + r.width > window.scrollX + window.innerWidth - m) left = window.scrollX + window.innerWidth - r.width - m;
    if (top + r.height > window.scrollY + window.innerHeight - m) top = window.scrollY + window.innerHeight - r.height - m;
    let arrow = cx - left - 4;
    if (arrow < 8) arrow = 8;
    if (arrow > r.width - 12) arrow = r.width - 12;
    setPos({ top, left, arrow });
  }, [anchorRect]);
  return createPortal(
    <motion.div ref={ref} initial={{ opacity: 0, scale: 0.95, y: -8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: -8 }} transition={{ duration: 0.15 }} className="pointer-events-none absolute z-[9998] w-[260px] max-w-[calc(100vw-16px)] rounded border border-gray bg-[aliceblue] px-3 py-2 text-xs leading-relaxed text-foreground shadow-xl" style={{ top: pos.top, left: pos.left }} role="tooltip">
      {description}
      <span className="absolute -top-1 h-2 w-2 rotate-45 border-t border-l border-border bg-[aliceblue]" style={{ left: pos.arrow }} />
    </motion.div>, document.body
  );
};

/* ═══════════════════════════════════════════════════════════════
   Booking Modal — matches service-details ticket sidebar flow
   ═══════════════════════════════════════════════════════════════ */
const BookingModal = ({ service, bn, onClose }: BookingModalProps) => {
  const navigate = useNavigate();
  const { addItem } = useCart();
  const mysqlAuth = getMySqlAuth();
  const activeUserId = mysqlAuth?.user?.id;
  const [searchParams] = useSearchParams();
  const fallbackPrice = Number(service.price || 0);
  const commissionPercent = Number(service.cmsService?.commission_percent ?? service.commission_percent ?? 0);

  /* ── Packages ── */
  const [packages, setPackages] = useState<Pkg[]>([]);
  const [selectedPkg, setSelectedPkg] = useState<Pkg | null>(null);
  const [loadingPkgs, setLoadingPkgs] = useState(true);

  const hasPackages = packages.length > 0;
  const effectivePrice = selectedPkg ? getPkgPrice(selectedPkg) : fallbackPrice;
  const commissionFee = Math.round(effectivePrice * (commissionPercent / 100));
  const selectedPackageName = selectedPkg ? getPkgName(selectedPkg, bn) : service.packageName || (bn ? "বেসিক সার্ভিস" : "Basic Service");

  /* ── Fetch packages by service_slug ── */
  useEffect(() => {
    const slug = service.slug;
    if (!slug) { setLoadingPkgs(false); return; }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${INDIVIDUAL_API_BASE_URL}/api/packages`);
        if (!res.ok) throw new Error("fetch failed");
        const json = await res.json();
        if (cancelled) return;
        const all: any[] = Array.isArray(json) ? json : Array.isArray(json?.data) ? json.data : [];
        const list: Pkg[] = all
          .filter((p) => p.is_active !== false && String(p.service_slug ?? "") === String(slug))
          .sort((a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0))
          .map((p) => ({
            id: String(p.id), name: p.name || "", name_en: p.name_en || null,
            price: Number(p.price) || 0, discount_price: p.discount_price != null ? Number(p.discount_price) : null,
            features: Array.isArray(p.features) ? p.features : [], is_popular: !!p.is_popular,
            duration: p.duration || null, duration_en: p.duration_en || null,
          }));
        setPackages(list);
        if (list.length > 0) setSelectedPkg(list.find((p) => p.is_popular) || list[0]);
      } catch { /* silent */ } finally { if (!cancelled) setLoadingPkgs(false); }
    })();
    return () => { cancelled = true; };
  }, []); // eslint-disable-line

  /* ── Form state ── */
  const [bookingDate, setBookingDate] = useState<Date | undefined>();
  const [bookingTime, setBookingTime] = useState("");
  const [bookingName, setBookingName] = useState(mysqlAuth?.user?.name || "");
  const [bookingPhone, setBookingPhone] = useState(mysqlAuth?.user?.mobile || "");
  const [bookingAddress, setBookingAddress] = useState(mysqlAuth?.user?.address || "");
  const [submitting, setSubmitting] = useState(false);

  /* ── Wallet payment ── */
  const [useWalletPayment, setUseWalletPayment] = useState(false);
  const { data: walletData } = useQuery({
    queryKey: ["user-wallet-modal", activeUserId],
    queryFn: async () => {
      if (!activeUserId) return null;
      const res = await fetch(`${VITE_API_BASE_URL}/api/wallet/balance/${activeUserId}`, { headers: getServiceApiHeaders() });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Wallet load failed");
      return json.wallet || json;
    },
    enabled: !!activeUserId, retry: 1,
  });
  const walletBalance = Number(walletData?.cash_balance || 0);

  /* ── Referral code ── */
  const [referralCode, setReferralCode] = useState("");
  const [referralValidation, setReferralValidation] = useState<{
    valid: boolean; code?: string; referrer_name?: string;
    referred_reward_type?: string; referred_reward_amount?: number;
    remaining_uses?: number; reason?: string;
  } | null>(null);
  const [validatingReferral, setValidatingReferral] = useState(false);
  const [referralSource, setReferralSource] = useState<"url" | "manual" | null>(null);

  useEffect(() => {
    const c = searchParams.get("ref") || searchParams.get("referral");
    if (c?.trim()) { setReferralCode(c.trim().toUpperCase()); setReferralSource("url"); }
  }, [searchParams]);

  const handleValidateReferral = useCallback(async () => {
    const code = referralCode.trim().toUpperCase();
    if (!code) return;
    setValidatingReferral(true); setReferralValidation(null);
    try {
      const res = await fetch(`${VITE_API_BASE_URL}/api/referral/validate/${encodeURIComponent(code)}`, { headers: getServiceApiHeaders() });
      const data = await res.json();
      setReferralValidation(data);
      if (!data.valid) {
        toast.error(
          data.reason === "INVALID_FORMAT" ? (bn ? "অবৈধ কোড ফরম্যাট" : "Invalid code format") :
          data.reason === "NOT_FOUND_OR_EXPIRED" ? (bn ? "কোডটি পাওয়া যায়নি বা মেয়াদ উত্তীর্ণ" : "Code not found or expired") :
          data.reason === "MAX_USES_REACHED" ? (bn ? "সর্বোচ্চ ব্যবহার সীমা" : "Max uses reached") :
          (bn ? "রেফারেল কোড বৈধ নয়" : "Invalid referral code")
        );
      } else {
        toast.success(bn ? `✅ ${data.referrer_name} এর রেফারেল প্রয়োগ হয়েছে!` : `✅ Referral from ${data.referrer_name} applied!`);
      }
    } catch {
      toast.error(bn ? "রেফারেল যাচাই ব্যর্থ" : "Validation failed");
    } finally { setValidatingReferral(false); }
  }, [referralCode, bn]);

  const clearReferral = () => { setReferralCode(""); setReferralValidation(null); setReferralSource(null); };

  useEffect(() => {
    if (referralSource === "url" && referralCode) handleValidateReferral();
  }, [referralSource, referralCode, handleValidateReferral]);

  /* ── Escape to close ── */
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  /* ── Time slots ── */
  const timeSlots = [
    { label: "8:00", value: "08:00" }, { label: "9:00", value: "09:00" },
    { label: "10:00", value: "10:00" }, { label: "11:00", value: "11:00" },
    { label: "12:00", value: "12:00" }, { label: "1:00", value: "13:00" },
    { label: "2:00", value: "14:00" }, { label: "3:00", value: "15:00" },
  ];

  /* ── Add to cart ── */
  const handleAddToCart = () => {
    const img = getImageSrc(service.image);
    addItem({
      serviceSlug: service.slug || "",
      serviceTitle: service.title,
      serviceImage: img,
      packageName: selectedPackageName,
      packagePrice: effectivePrice,
      originalPrice: selectedPkg ? (getPkgPrice(selectedPkg) !== selectedPkg.price ? selectedPkg.price : null) : null,
    });
    toast.success(bn ? "কার্টে যোগ হয়েছে!" : "Added to cart!");
  };

  /* ── Submit booking ── */
  const submitBooking = async () => {
    if (!activeUserId) { toast.error(bn ? "লগইন করুন" : "Login required"); navigate("/auth"); return; }
    if (hasPackages && !selectedPkg) { toast.error(bn ? "প্যাকেজ বেছে নিন" : "Select a package"); return; }
    if (!bookingDate || !bookingTime || !bookingName.trim() || !bookingPhone.trim() || !bookingAddress.trim()) {
      toast.error(bn ? "সব তথ্য পূরণ করুন" : "Fill all details"); return;
    }
    if (!/^01[3-9]\d{8}$/.test(bookingPhone.trim())) { toast.error(bn ? "সঠিক মোবাইল নম্বর দিন" : "Valid phone required"); return; }
    if (commissionFee <= 0) { toast.error(bn ? "কমিশন ফি সেট করা নেই" : "Commission fee not set"); return; }
    if (useWalletPayment && walletBalance < commissionFee) {
      toast.error(bn ? "ওয়ালেটে পর্যাপ্ত ব্যালেন্স নেই" : "Insufficient wallet balance"); return;
    }
    setSubmitting(true);
    try {
      const paymentAmount = Math.round(commissionFee);
      let walletTxId: string | null = null;

      /* Wallet debit first */
      if (useWalletPayment) {
        const wr = await fetch(`${VITE_API_BASE_URL}/api/wallet/debit`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...(mysqlAuth?.token ? { Authorization: `Bearer ${mysqlAuth.token}` } : {}) },
          body: JSON.stringify({
            user_id: String(activeUserId), amount_cash: paymentAmount, amount_coins: 0,
            module: "SERVICE", reference_id: `booking-${Date.now()}`,
            description: `${service.title} - ${selectedPackageName}`,
          }),
        });
        const wj = await wr.json();
        if (!wr.ok || !wj.success) throw new Error(wj.error || "Wallet payment failed");
        walletTxId = wj.transaction_id;
      }

      /* Create booking */
      const booking: any = await createBooking({
        user_id: String(activeUserId),
        service_id: service.cmsService?.id || service.service_id || null,
        package_id: selectedPkg?.id || null,
        service_slug: service.slug || "",
        service_title: bn ? service.title : service.cmsService?.title_en || service.title,
        package_name: selectedPackageName,
        package_price: effectivePrice,
        platform_fee_amount: paymentAmount,
        customer_name: bookingName.trim(),
        customer_phone: bookingPhone.trim(),
        customer_address: bookingAddress.trim(),
        booking_date: format(bookingDate!, "yyyy-MM-dd"),
        booking_time: bookingTime,
        status: "pending",
        payment_status: useWalletPayment ? "paid" : "unpaid",
        payment_method: useWalletPayment ? "wallet" : "gateway",
        wallet_cash_used: useWalletPayment ? paymentAmount : 0,
        wallet_coins_used: 0,
        referral_code: referralValidation?.valid ? referralValidation.code : null,
        referred_reward_type: referralValidation?.valid ? referralValidation.referred_reward_type : null,
        referred_reward_amount: referralValidation?.valid ? referralValidation.referred_reward_amount : null,
      });

      /* Wallet: update payment status on booking */
      if (useWalletPayment) {
        await fetch(`${INDIVIDUAL_API_BASE_URL}/api/bookings/${booking.id}/payment-status`, {
          method: "PUT",
          headers: getServiceApiHeaders(),
          body: JSON.stringify({
            payment_status: "paid", payment_method: "wallet",
            payment_transaction_id: walletTxId,
            wallet_cash_used: paymentAmount, wallet_coins_used: 0,
          }),
        });
        toast.success(bn ? "ওয়ালেট থেকে পেমেন্ট সফল!" : "Payment successful via wallet!");
        navigate("/my-bookings");
      } else {
        /* Gateway: redirect to ShurjoPay */
        toast.success(bn ? "ShurjoPay পেজ খোলা হচ্ছে..." : "Opening ShurjoPay...");
        const payment = await startBookingPayment(booking.id, paymentAmount);
        if (!payment.checkout_url) throw new Error("No payment link");
        window.location.href = payment.checkout_url;
      }
    } catch (err: any) {
      toast.error(err?.message || (bn ? "বুকিং ব্যর্থ" : "Booking failed"));
    } finally { setSubmitting(false); }
  };

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9998] flex items-end justify-center bg-foreground/55 backdrop-blur-sm sm:items-center sm:px-3 sm:py-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }} transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="max-h-[100dvh] sm:max-h-[calc(100vh-2rem)] w-full sm:max-w-[420px] overflow-y-auto sm:rounded-xl sm:border sm:border-border sm:shadow-2xl"
          style={{ background: TK.paper }}
          onClick={(e) => e.stopPropagation()}
          role="dialog" aria-modal="true"
        >
          {/* ── Header ── */}
          <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: TK.line, background: TK.card }}>
            <div>
              <p className="text-[9px] tracking-[.08em] uppercase font-semibold" style={{ color: TK.brassDark }}>{bn ? "দ্রুত বুকিং" : "Quick booking"}</p>
              <h3 className="text-[15px] font-semibold leading-tight" style={{ color: TK.ink }}>{service.title}</h3>
            </div>
            <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full border hover:bg-black/5 cursor-pointer" style={{ borderColor: TK.line }}>
              <X className="h-4 w-4" style={{ color: TK.muted }} />
            </button>
          </div>

          <div className="px-4 py-3 space-y-4">
            {/* ── Packages ── */}
            {loadingPkgs ? (
              <div className="flex items-center justify-center gap-2 rounded-[10px] border p-6" style={{ borderColor: TK.line, background: TK.card }}>
                <Loader2 className="h-4 w-4 animate-spin" style={{ color: "hsl(var(--primary))" }} />
                <span className="text-[11px]" style={{ color: TK.muted }}>{bn ? "প্যাকেজ লোড হচ্ছে..." : "Loading packages..."}</span>
              </div>
            ) : hasPackages ? (
              <div>
                <h3 className="text-[13px] font-semibold mb-2" style={{ color: TK.ink }}>{bn ? "প্যাকেজ বেছে নিন" : "Select a package"}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {packages.map((pkg) => {
                    const sel = selectedPkg?.id === pkg.id;
                    const hasDisc = pkg.discount_price != null && pkg.discount_price > 0 && pkg.discount_price < pkg.price;
                    const discPct = hasDisc ? Math.round(((pkg.price - pkg.discount_price!) / pkg.price) * 100) : 0;
                    const finalP = hasDisc ? pkg.discount_price! : pkg.price;
                    return (
                      <button key={pkg.id} type="button" onClick={() => { setSelectedPkg(pkg); haptic("light"); }}
                        className="relative text-left border rounded-[10px] p-3 cursor-pointer transition-all duration-200"
                        style={{
                          borderColor: sel ? "hsl(var(--primary))" : TK.line,
                          background: sel ? "linear-gradient(180deg,#fff,hsl(var(--primary)/.08) 220%)" : TK.card,
                          boxShadow: sel ? "0 4px 12px hsl(var(--primary)/.1)" : "none",
                          transform: sel ? "translateY(-1px)" : "none",
                        }}
                      >
                        {sel && <span className="absolute -top-[7px] left-2.5 rounded-full px-2 py-[2px] text-[8px] font-semibold text-white" style={{ background: "hsl(var(--primary))" }}>{bn ? "নির্বাচিত" : "Selected"}</span>}
                        {discPct > 0 && <span className="absolute -top-[7px] right-2.5 rounded-full px-1.5 py-[2px] text-[8px] font-semibold text-white" style={{ background: TK.brass }}>-{discPct}%</span>}
                        {pkg.is_popular && !sel && <span className="absolute top-1.5 right-1.5 rounded-full px-1.5 py-[1px] text-[7px] font-bold" style={{ background: TK.brassTint, color: TK.brassDark }}>★ {bn ? "জনপ্রিয়" : "Popular"}</span>}
                        <h4 className="text-[13px] font-semibold" style={{ color: TK.ink }}>{getPkgName(pkg, bn)}</h4>
                        <div className="mt-0.5 flex items-baseline gap-1">
                          <span className="font-mono text-[15px] font-medium" style={{ color: hasDisc ? "#dc2626" : "hsl(var(--primary))" }}>৳{finalP.toLocaleString(bn ? "bn-BD" : "en-US")}</span>
                          {hasDisc && <span className="text-[10px] line-through" style={{ color: TK.muted }}>৳{pkg.price.toLocaleString(bn ? "bn-BD" : "en-US")}</span>}
                        </div>
                        {getPkgDuration(pkg, bn) && <p className="mt-1 flex items-center gap-0.5 text-[10px]" style={{ color: TK.muted }}><Clock className="h-2.5 w-2.5" /> {getPkgDuration(pkg, bn)}</p>}
                        {pkg.features.length > 0 && (
                          <ul className="mt-2 space-y-0.5 pt-2" style={{ borderTop: `1px dashed ${TK.line}` }}>
                            {pkg.features.slice(0, 3).map((f) => <li key={f} className="flex items-start gap-1 text-[10px]" style={{ color: TK.inkSoft }}><span style={{ color: "hsl(var(--primary))", fontWeight: 700, fontSize: "9px" }}>✓</span> {f}</li>)}
                            {pkg.features.length > 3 && <li className="text-[9px] font-medium" style={{ color: "hsl(var(--primary))" }}>+{pkg.features.length - 3} {bn ? "আরও" : "more"}</li>}
                          </ul>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {/* ── Price block ── */}
            <div className="rounded-[10px] p-3 flex justify-between items-end text-white" style={{ background: "hsl(var(--primary))" }}>
              <div>
                <div className="text-[9px] tracking-[.08em] uppercase" style={{ color: "rgba(255,255,255,0.6)" }}>{bn ? "প্যাকেজ" : "Package"}</div>
                <div className="text-[11px] font-semibold mt-0.5 max-w-[180px] truncate">{selectedPackageName}</div>
              </div>
              <div className="text-right">
                <div className="font-mono text-[18px] font-medium">৳{effectivePrice.toLocaleString(bn ? "bn-BD" : "en-US")}</div>
                {commissionFee > 0 ? (
                  <div className="text-[9px]" style={{ color: "rgba(255,255,255,0.65)" }}>{bn ? "প্লাটফর্ম ফি" : "Platform fee"} ৳{commissionFee.toLocaleString(bn ? "bn-BD" : "en-US")} <span className="opacity-70">({commissionPercent}%)</span></div>
                ) : (
                  <div className="text-[9px] text-yellow-200">⚠ {bn ? "ফি সেট করা নেই" : "Fee not set"}</div>
                )}
              </div>
            </div>

            {/* ── Perforation ── */}
            <div className="relative" style={{ borderTop: `1px dashed ${TK.line}` }}>
              <div className="absolute -left-[22px] -top-[7px] w-[14px] h-[14px] rounded-full" style={{ background: TK.paper }} />
              <div className="absolute -right-[22px] -top-[7px] w-[14px] h-[14px] rounded-full" style={{ background: TK.paper }} />
            </div>

            {/* ── Date (Calendar Popover) ── */}
            <div>
              <label className="text-[10px] font-semibold block mb-1" style={{ color: TK.inkSoft }}>{bn ? "ভিজিটের তারিখ" : "Visit date"}</label>
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    className="w-full flex items-center gap-1.5 rounded-[7px] border bg-white px-2.5 py-2 text-[11px] text-left cursor-pointer transition-colors"
                    style={{ borderColor: TK.line, color: bookingDate ? TK.ink : TK.muted }}
                  >
                    <CalendarIcon className="h-3 w-3" style={{ color: TK.brass }} />
                    {bookingDate ? format(bookingDate, "EEE, dd MMM") : (bn ? "তারিখ বেছে নিন" : "Pick date")}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={bookingDate}
                    onSelect={setBookingDate}
                    disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* ── Time slots ── */}
            <div>
              <label className="text-[10px] font-semibold block mb-1" style={{ color: TK.inkSoft }}>{bn ? "সময়" : "Time slot"}</label>
              <div className="grid grid-cols-4 gap-1">
                {timeSlots.map((s) => (
                  <button
                    key={s.value} type="button" onClick={() => setBookingTime(s.value)}
                    className="rounded-md border bg-white py-[5px] text-[10px] font-medium font-mono cursor-pointer transition-all"
                    style={{
                      borderColor: bookingTime === s.value ? "hsl(var(--primary))" : TK.line,
                      background: bookingTime === s.value ? "hsl(var(--primary))" : "white",
                      color: bookingTime === s.value ? "white" : TK.inkSoft,
                    }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Referral Code ── */}
            {referralValidation?.valid ? (
              <div className="rounded-[10px] border p-2 flex items-center justify-between" style={{ borderColor: "#86efac", background: "#f0fdf4" }}>
                <div className="flex items-center gap-1.5 min-w-0">
                  <BadgeCheck className="h-3 w-3 shrink-0" style={{ color: "#16a34a" }} />
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold truncate" style={{ color: "#166534" }}>{referralValidation.code}</p>
                    <p className="text-[8px] truncate" style={{ color: "#16a34a" }}>
                      {bn ? `${referralValidation.referrer_name} এর রেফারেল` : `From ${referralValidation.referrer_name}`}
                      {referralValidation.referred_reward_amount != null && referralValidation.referred_reward_amount > 0 && (
                        <span className="ml-0.5 font-bold">(+৳{referralValidation.referred_reward_amount})</span>
                      )}
                    </p>
                  </div>
                </div>
                <button onClick={clearReferral} className="shrink-0 rounded p-1 cursor-pointer" style={{ color: "#16a34a" }} title={bn ? "সরান" : "Remove"}>
                  <Trash2 className="h-2.5 w-2.5" />
                </button>
              </div>
            ) : (
              <div className="flex gap-1">
                <input
                  value={referralCode}
                  onChange={(e) => { setReferralCode(e.target.value.toUpperCase()); setReferralSource("manual"); }}
                  placeholder={bn ? "রেফারেল (ঐচ্ছিক)" : "Referral (optional)"}
                  className="flex-1 rounded-[7px] border bg-white px-2 py-1.5 text-[10px] outline-none focus:ring-1"
                  style={{ borderColor: TK.line, color: TK.ink, "--tw-ring-color": "hsl(var(--primary))" } as any}
                />
                <button
                  onClick={handleValidateReferral}
                  disabled={validatingReferral || !referralCode.trim()}
                  className="rounded-[7px] px-2 text-[9px] font-semibold text-white cursor-pointer disabled:opacity-40"
                  style={{ background: "hsl(var(--primary))" }}
                >
                  {validatingReferral ? "…" : bn ? "যাচাই" : "Go"}
                </button>
              </div>
            )}

            {/* ── Name, Phone, Address ── */}
            <div className="space-y-2">
              <div className="relative">
                <User className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3" style={{ color: TK.muted }} />
                <input value={bookingName} onChange={(e) => setBookingName(e.target.value)} placeholder={bn ? "নাম" : "Name"} className="w-full rounded-[7px] border bg-white pl-7 pr-2 py-2 text-[11px] outline-none focus:ring-1" style={{ borderColor: TK.line, color: TK.ink, "--tw-ring-color": "hsl(var(--primary))" } as any} />
              </div>
              <div className="relative">
                <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3" style={{ color: TK.muted }} />
                <input
                  type="text" inputMode="numeric"
                  value={bookingPhone}
                  onChange={(e) => setBookingPhone(e.target.value.replace(/[^0-9]/g, "").slice(0, 11))}
                  onKeyDown={(e) => {
                    const allowed = ["Backspace", "Delete", "ArrowLeft", "ArrowRight", "Tab", "Home", "End"];
                    if (allowed.includes(e.key)) return;
                    if (e.metaKey || e.ctrlKey) return;
                    if (!/^\d$/.test(e.key)) e.preventDefault();
                  }}
                  onPaste={(e) => {
                    const paste = e.clipboardData.getData("text").replace(/[^0-9]/g, "").slice(0, 11);
                    e.preventDefault();
                    setBookingPhone(paste);
                  }}
                  placeholder="01XXXXXXXXX" maxLength={11}
                  className="w-full rounded-[7px] border bg-white pl-7 pr-2 py-2 text-[11px] outline-none focus:ring-1"
                  style={{ borderColor: TK.line, color: TK.ink, "--tw-ring-color": "hsl(var(--primary))" } as any}
                />
              </div>
              <div className="relative">
                <Building2 className="absolute left-2.5 top-2.5 h-3 w-3" style={{ color: TK.muted }} />
                <textarea value={bookingAddress} onChange={(e) => setBookingAddress(e.target.value)} rows={2} placeholder={bn ? "ঠিকানা" : "Address"} className="w-full rounded-[7px] border bg-white pl-7 pr-2 py-2 text-[11px] outline-none focus:ring-1 resize-none" style={{ borderColor: TK.line, color: TK.ink, "--tw-ring-color": "hsl(var(--primary))" } as any} />
              </div>

              {/* ── Wallet payment toggle ── */}
              {activeUserId && walletBalance > 0 && (
                <button
                  type="button"
                  onClick={() => setUseWalletPayment(!useWalletPayment)}
                  className="flex items-center gap-2 w-full rounded-[7px] border p-2 text-left cursor-pointer transition-colors"
                  style={{
                    borderColor: useWalletPayment ? "hsl(var(--primary))" : TK.line,
                    background: useWalletPayment ? "hsl(var(--primary)/.08)" : "white",
                  }}
                >
                  <Wallet className="h-3 w-3" style={{ color: useWalletPayment ? "hsl(var(--primary))" : TK.muted }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-semibold" style={{ color: TK.ink }}>{bn ? "ওয়ালেট পেমেন্ট" : "Pay with wallet"}</p>
                    <p className="text-[8px]" style={{ color: TK.muted }}>৳{walletBalance.toLocaleString(bn ? "bn-BD" : "en-US")}</p>
                  </div>
                  <span className="text-[10px] font-semibold" style={{ color: useWalletPayment ? "hsl(var(--primary))" : TK.muted }}>{useWalletPayment ? "✓" : "→"}</span>
                </button>
              )}
            </div>

            {/* ── Confirm booking ── */}
            <button
              type="button" onClick={submitBooking} disabled={submitting || loadingPkgs}
              className="w-full flex items-center justify-center gap-1.5 rounded-[7px] py-2.5 text-[11px] font-semibold text-white cursor-pointer transition-all disabled:opacity-60"
              style={{ background: "hsl(var(--primary))", boxShadow: "0 4px 12px hsl(var(--primary)/.2)" }}
            >
              {submitting ? (
                <div className="h-3 w-3 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              ) : (
                <CalendarCheck className="h-3 w-3" />
              )}
              {submitting ? (bn ? "প্রসেসিং…" : "Processing…") : (bn ? "বুকিং নিশ্চিত করুন" : "Confirm booking")}
            </button>

            {/* ── Add to cart ── */}
            <button
              type="button" onClick={handleAddToCart}
              className="w-full flex items-center justify-center gap-1.5 rounded-[7px] border py-2 text-[10.5px] font-semibold cursor-pointer transition-colors"
              style={{ borderColor: TK.line, color: TK.ink, background: "transparent" }}
            >
              <ShoppingBag className="h-3 w-3" />
              {bn ? "কার্টে যোগ করুন" : "Add to cart"}
            </button>

            {/* ── Barcode ── */}
            <div className="flex items-center justify-between pt-2" style={{ borderTop: `1px solid ${TK.line}` }}>
              <span className="font-mono text-[8px] tracking-[.04em]" style={{ color: TK.muted }}>
                {service.slug ? `SVC-${service.slug.slice(0, 6).toUpperCase().replace(/[^A-Z0-9]/g, "X").padEnd(6, "X")}-BD` : "SVC-QUICK"}
              </span>
              <div className="flex gap-[1.5px] h-3 items-end">
                {Array.from({ length: 20 }, () => 4 + Math.random() * 7).map((h, i) => (
                  <span key={i} className="w-[1.5px]" style={{ height: `${h}px`, background: TK.ink, opacity: 0.45 }} />
                ))}
              </div>
            </div>
          </div>

          {/* Safe area spacer for mobile bottom */}
          <div className="h-[env(safe-area-inset-bottom,0px)] sm:h-0" style={{ background: TK.paper }} />
        </motion.div>
      </motion.div>
    </AnimatePresence>, document.body
  );
};

/* ───────── Service Card Wrapper ───────── */
const ServiceCardWrapper = ({ service, onOpen, onLongPress, disableHover, imageContent, bn, onBookNow, onCompare, onShare, isInCompareList }: {
  service: ServiceItem; onOpen: (e: React.MouseEvent) => void; onLongPress: () => void; disableHover?: boolean;
  imageContent: React.ReactNode; bn: boolean; onBookNow: (e: React.MouseEvent, service: ServiceItem) => void;
  onCompare: (e: React.MouseEvent, service: ServiceItem) => void; onShare: (e: React.MouseEvent, service: ServiceItem) => void; isInCompareList: boolean;
}) => {
  const longPress = useLongPress<HTMLDivElement>(onLongPress, 480);
  const [hovered, setHovered] = useState(false);
  const [hoverRect, setHoverRect] = useState<DOMRect | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showTooltip = (e: React.MouseEvent<HTMLHeadingElement> | React.FocusEvent<HTMLHeadingElement>) => { if (disableHover || !service.description) return; if (hideTimer.current) { clearTimeout(hideTimer.current); hideTimer.current = null; } setHoverRect(e.currentTarget.getBoundingClientRect()); setHovered(true); };
  const hideTooltip = () => { if (hideTimer.current) clearTimeout(hideTimer.current); hideTimer.current = setTimeout(() => setHovered(false), 120); };
  useEffect(() => () => { if (hideTimer.current) clearTimeout(hideTimer.current); }, []);

  return (<>
    <div onClick={onOpen} {...longPress} tabIndex={0} className="group relative active:scale-[0.98] shrink-0 w-[calc(50vw-16px)] sm:w-[calc(50vw-28px)] md:max-w-[260px] md:min-w-[170px] rounded-md overflow-hidden border shadow">
      {imageContent}
      <div className="p-3 bg-background md:p-4 pointer-events-none">
        <h3 onMouseEnter={showTooltip} onMouseLeave={hideTooltip} onFocus={showTooltip} onBlur={hideTooltip} className="text-sm font-semibold text-foreground transition-colors group-hover:text-primary md:text-base line-clamp-1 pointer-events-auto cursor-help">{service.title}</h3>
        <div className="mt-1.5 flex items-center gap-1"><Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" /><span className="text-xs font-medium text-muted-foreground">{service.rating ? service.rating.toFixed(1) : "0.0"}</span></div>
        <div className="mt-2 flex items-end justify-between">
          <p className="min-w-0 text-sm font-bold text-foreground md:text-base">{service.price && service.price > 0 ? (<>৳{service.price}<span className="ml-1 text-[10px] font-normal text-muted-foreground">{bn ? "থেকে" : "from"}</span></>) : <span className="text-primary">{bn ? "বুক করুন" : "Book Now"}</span>}</p>
          <div className="flex shrink-0 items-center gap-1 pointer-events-auto">
            <button onClick={(e) => onBookNow(e, service)} className="flex h-7 items-center justify-center gap-1 rounded-full bg-primary px-2.5 text-[10px] font-semibold text-white shadow-sm shadow-primary/20 hover:bg-primary cursor-pointer"><CalendarCheck className="h-3.5 w-3.5" /><span>{bn ? "বুক" : "Book"}</span></button>
            <button onClick={(e) => onCompare(e, service)} className={`flex h-7 w-7 items-center justify-center rounded-full hover:bg-primary/10 cursor-pointer ${isInCompareList ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-primary"}`}><GitCompareArrows className="h-3.5 w-3.5" /></button>
            <button onClick={(e) => onShare(e, service)} className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:bg-primary/10 hover:text-primary cursor-pointer"><Share2 className="h-3.5 w-3.5" /></button>
          </div>
        </div>
      </div>
    </div>
    <AnimatePresence>{hovered && hoverRect && service.description && <DescriptionTooltip description={service.description} anchorRect={hoverRect} />}</AnimatePresence>
  </>);
};

/* ───────── Share Popup ───────── */
const SharePopup = forwardRef<HTMLDivElement, SharePopupProps>(({ slug, title, anchorRect, onClose }, _ref) => {
  const [copied, setCopied] = useState(false);
  const { language } = useLanguage(); const bn = language === "bn";
  const url = `${window.location.origin}/service/${slug}`;
  const text = bn ? `${title} - সার্ভিস দেখুন` : `Check out ${title}`;
  const popupRef = useRef<HTMLDivElement>(null);
  useEffect(() => { const h = (e: MouseEvent) => { if (popupRef.current && e.target instanceof Node && !popupRef.current.contains(e.target)) onClose(); }; document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h); }, [onClose]);
  const copyLink = async () => { await navigator.clipboard.writeText(url); setCopied(true); toast.success(bn ? "কপি হয়েছে!" : "Copied!"); setTimeout(() => setCopied(false), 2000); };
  const socials = [
    { name: "Facebook", color: "bg-[#1877F2]", icon: "f", href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}` },
    { name: "WhatsApp", color: "bg-[#25D366]", icon: "w", href: `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}` },
    { name: "X", color: "bg-foreground", icon: "𝕏", href: `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}` },
  ];
  return createPortal(
    <motion.div ref={popupRef} initial={{ opacity: 0, scale: 0.9, y: -5 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: -5 }} className="fixed z-[9999] w-[230px] rounded-xl bg-blue-100 p-3 shadow-xl" style={{ top: anchorRect.bottom + window.scrollY + 8, left: Math.max(8, Math.min(anchorRect.left + window.scrollX - 100, window.innerWidth - 240)), position: "absolute" }} onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center justify-between mb-2"><span className="text-xs font-semibold text-foreground">{bn ? "শেয়ার" : "Share"}</span><button onClick={onClose} className="rounded-full p-0.5 hover:bg-secondary cursor-pointer"><X className="h-3.5 w-3.5 text-muted-foreground" /></button></div>
      <div className="flex gap-2 mb-3">{socials.map((s) => <a key={s.name} href={s.href} target="_blank" rel="noopener noreferrer" className={`flex h-9 w-9 items-center justify-center rounded-full ${s.color} text-white text-sm font-bold hover:scale-110 cursor-pointer`}>{s.icon}</a>)}</div>
      <div className="flex items-center gap-1.5 rounded-lg border border-border bg-muted/50 px-2 py-1.5"><span className="flex-1 truncate text-[11px] text-muted-foreground">{url}</span><button onClick={copyLink} className="flex shrink-0 items-center gap-1 rounded-md bg-primary px-2 py-1 text-[10px] font-medium text-white hover:bg-primary/90 cursor-pointer">{copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}{copied ? (bn ? "কপি হয়েছে" : "Copied") : (bn ? "কপি" : "Copy")}</button></div>
    </motion.div>, document.body
  );
});

/* ───────── Service Section ───────── */
const ServiceSection = forwardRef<HTMLElement, ServiceSectionProps>(({ heading, services, viewAllLink }, ref) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { t, language } = useLanguage(); const bn = language === "bn";
  const { addToCompare, removeFromCompare, isInCompare, compareList } = useCompare();
  const [shareState, setShareState] = useState<{ slug: string; title: string; rect: DOMRect } | null>(null);
  const [quickMenu, setQuickMenu] = useState<ServiceItem | null>(null);
  const [bookingTarget, setBookingTarget] = useState<ServiceItem | null>(null);
  const localRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: localRef, offset: ["start end", "end start"] });
  const scale = useTransform(scrollYProgress, [1, 1, 1], [1, 1, 1]);
  const opacity = useTransform(scrollYProgress, [1, 1, 1, 1], [1, 1, 1, 1]);
  const [isDragging, setIsDragging] = useState(false);
  const dragState = useRef({ startX: 0, startScrollLeft: 0, isDown: false, dragDistance: 0 });

  useEffect(() => {
    const el = scrollRef.current; if (!el) return;
    const down = (e: MouseEvent) => { if (e.button !== 0) return; dragState.current = { startX: e.pageX - el.offsetLeft, startScrollLeft: el.scrollLeft, isDown: true, dragDistance: 0 }; setIsDragging(true); };
    const move = (e: MouseEvent) => { if (!dragState.current.isDown) return; e.preventDefault(); const w = (e.pageX - el.offsetLeft) - dragState.current.startX; dragState.current.dragDistance = Math.abs(w); el.scrollLeft = dragState.current.startScrollLeft - w; };
    const up = () => { dragState.current.isDown = false; setIsDragging(false); };
    el.addEventListener("mousedown", down); window.addEventListener("mousemove", move); window.addEventListener("mouseup", up);
    return () => { el.removeEventListener("mousedown", down); window.removeEventListener("mousemove", move); window.removeEventListener("mouseup", up); };
  }, []);

  const scroll = (d: "left" | "right") => scrollRef.current?.scrollBy({ left: d === "left" ? -280 : 280, behavior: "smooth" });
  const handleBookNow = (e: React.MouseEvent, s: ServiceItem) => { e.preventDefault(); e.stopPropagation(); if (!s.slug) return; if (!getMySqlAuth()?.user?.id) { toast.info(bn ? "লগইন করুন" : "Login to book"); navigate("/auth"); return; } haptic("medium"); setBookingTarget(s); };
  const handleShare = (e: React.MouseEvent, s: ServiceItem) => { e.preventDefault(); e.stopPropagation(); if (!s.slug) return; if (shareState?.slug === s.slug) setShareState(null); else setShareState({ slug: s.slug, title: s.title, rect: (e.currentTarget as HTMLElement).getBoundingClientRect() }); };
  const handleCompare = (e: React.MouseEvent, s: ServiceItem) => { e.preventDefault(); e.stopPropagation(); if (!s.cmsService || !s.slug) return; if (isInCompare(s.slug)) { removeFromCompare(s.slug); haptic("light"); toast.info(bn ? "তুলনা থেকে সরানো" : "Removed"); } else { if (compareList.length >= 3) { toast.warning(bn ? "সর্বোচ্চ ৩টি" : "Max 3"); return; } addToCompare(s.cmsService); haptic("medium"); toast.success(bn ? "তুলনায় যোগ" : "Added", { action: compareList.length >= 1 ? { label: bn ? "তুলনা" : "Compare", onClick: () => navigate("/compare") } : undefined }); } };
  const closeShare = useCallback(() => setShareState(null), []);

  return (
    <section ref={ref} className="py-2 md:py-6">
      <div ref={localRef}>
        <motion.div style={{ scale, opacity, transformOrigin: "center center" }} className="will-change-transform">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.5 }}>
            <div className="mb-5 flex items-center justify-between md:mb-6 md:px-0">
              <h2 className="font-heading text-xl font-bold text-foreground md:text-3xl">{heading}</h2>
              {viewAllLink && <button onClick={() => navigate(viewAllLink)} className="flex items-center gap-1 text-sm font-medium text-primary hover:text-primary/80 cursor-pointer">{t("section.viewAll")}<ChevronRight className="h-4 w-4" /></button>}
            </div>
            <div className="relative group/section">
              <button onClick={() => scroll("left")} className="absolute -left-3 top-1/2 z-10 hidden -translate-y-12/2 items-center justify-center rounded-full bg-background shadow-md border border-border h-9 w-9 text-muted-foreground hover:text-foreground opacity-0 group-hover/section:opacity-100 md:flex cursor-pointer"><ChevronLeft className="h-4 w-4" /></button>
              <button onClick={() => scroll("right")} className="absolute -right-3 top-1/2 z-10 hidden -translate-y-1/2 items-center justify-center rounded-full bg-background shadow-md border border-border h-9 w-9 text-muted-foreground hover:text-foreground opacity-0 group-hover/section:opacity-100 md:flex cursor-pointer"><ChevronRight className="h-4 w-4" /></button>
              <div ref={scrollRef} onClickCapture={(e) => { if (dragState.current.dragDistance > 5) { e.preventDefault(); e.stopPropagation(); } }} className={`flex gap-3 px-0 pb-2 overflow-x-auto md:gap-5 md:px-0 ${isDragging ? "cursor-grabbing select-none" : "cursor-grab"}`} style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
                {services.map((s) => (
                  <ServiceCardWrapper key={s.title} service={s} disableHover={isDragging}
                    imageContent={<div className="overflow-hidden bg-gradient-to-br from-blue-800/60 via-blue-400/40 to-green-600/40 pointer-events-none"><img src={getImageSrc(`${import.meta.env.VITE_SERVICE_API_BASE_URL}${s.image}`)} alt={s.title} className="aspect-[3/2] w-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" decoding="async" draggable={false} /></div>}
                    bn={bn} onOpen={(e) => { if ((e.target as HTMLElement).closest("button, a")) return; if (s.slug) navigate(`/service/${s.slug}`); }} onLongPress={() => setQuickMenu(s)} onBookNow={handleBookNow} onCompare={handleCompare} onShare={handleShare} isInCompareList={s.slug ? isInCompare(s.slug) : false} />
                ))}
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
      <AnimatePresence>{shareState && <SharePopup slug={shareState.slug} title={shareState.title} anchorRect={shareState.rect} onClose={closeShare} />}</AnimatePresence>
      {bookingTarget && <BookingModal service={bookingTarget} bn={bn} onClose={() => setBookingTarget(null)} />}
      <AnimatePresence>{quickMenu && createPortal(<>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setQuickMenu(null)} className="fixed inset-0 z-[300] bg-foreground/50 backdrop-blur-sm md:hidden" />
        <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", stiffness: 320, damping: 32 }} className="fixed bottom-0 left-0 right-0 z-[301] rounded-t-2xl border-t border-border bg-background shadow-2xl md:hidden" style={{ paddingBottom: "env(safe-area-inset-bottom,0px)" }}>
          <div className="flex justify-center pt-2.5 pb-1"><span className="h-1 w-10 rounded-full bg-muted-foreground/30" /></div>
          <div className="flex items-center gap-3 px-4 pt-1 pb-3 border-b border-border">
            <img src={getImageSrc(quickMenu.image)} alt={quickMenu.title} className="h-12 w-12 rounded-lg object-cover" draggable={false} />
            <div className="min-w-0 flex-1"><h4 className="truncate text-sm font-bold text-foreground">{quickMenu.title}</h4>{quickMenu.price ? <p className="text-xs text-muted-foreground">৳{quickMenu.price}</p> : null}</div>
            <button onClick={() => setQuickMenu(null)} className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary cursor-pointer"><X className="h-4 w-4" /></button>
          </div>
          <div className="px-2 py-2">
            <button type="button" onClick={() => { haptic("light"); if (quickMenu.slug) navigate(`/service/${quickMenu.slug}`); setQuickMenu(null); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium text-foreground hover:bg-secondary cursor-pointer"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary"><Eye className="h-4 w-4" /></span>{bn ? "বিস্তারিত" : "Details"}</button>
            <button type="button" onClick={() => { handleBookNow({ preventDefault: () => {}, stopPropagation: () => {} } as any, quickMenu); setQuickMenu(null); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium text-foreground hover:bg-secondary cursor-pointer"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary"><CalendarCheck className="h-4 w-4" /></span>{bn ? "বুক করুন" : "Book"}</button>
            <button type="button" onClick={async () => { if (!quickMenu.slug) return; haptic("light"); const url = `${window.location.origin}/service/${quickMenu.slug}`; const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void> }; if (nav.share) { try { await nav.share({ title: quickMenu.title, url }); } catch {} } else { await navigator.clipboard.writeText(url); toast.success(bn ? "কপি হয়েছে!" : "Copied!"); } setQuickMenu(null); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium text-foreground hover:bg-secondary cursor-pointer"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary"><Share2 className="h-4 w-4" /></span>{bn ? "শেয়ার" : "Share"}</button>
            <button type="button" onClick={() => { handleCompare({ preventDefault: () => {}, stopPropagation: () => {} } as any, quickMenu); setQuickMenu(null); }} disabled={!quickMenu.cmsService} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium text-foreground hover:bg-secondary disabled:opacity-50 cursor-pointer"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary"><GitCompareArrows className="h-4 w-4" /></span>{quickMenu.slug && isInCompare(quickMenu.slug) ? (bn ? "তুলনা থেকে সরান" : "Remove") : (bn ? "তুলনায় যোগ" : "Compare")}</button>
          </div>
        </motion.div>
      </>, document.body)}</AnimatePresence>
    </section>
  );
});

export default ServiceSection;
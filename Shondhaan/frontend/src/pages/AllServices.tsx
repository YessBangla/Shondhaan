import { useState, useRef, useEffect, useMemo, forwardRef, useCallback } from "react";
import type { MutableRefObject, MouseEvent } from "react";
import { createPortal } from "react-dom";
import { getServiceImage } from "@/data/serviceImages";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Star,
  Search,
  ChevronLeft,
  GitCompareArrows,
  Check,
  X,
  Copy,
  Share2,
  SlidersHorizontal,
  MapPin,
  CalendarCheck,
  CalendarIcon,
  User,
  Phone,
  Building2,
  Loader2,
  BadgeCheck,
  Trash2,
  Wallet,
  ShoppingBag,
  Clock,
} from "lucide-react";
import { useLocation } from "@/contexts/LocationContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCompare } from "@/contexts/CompareContext";
import { useCart } from "@/contexts/CartContext";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useSEO } from "@/hooks/useSEO";
import { divisions } from "@/data/locations";
import { INDIVIDUAL_API_BASE_URL } from "@/lib/api";
import { getMySqlAuth } from "@/lib/mysqlAuth";
import { createBooking, startBookingPayment } from "@/lib/bookingApi";

type ApiCategory = {
  id: string;
  name: string;
  name_en?: string;
  title?: string;
  title_en?: string;
  icon_url?: string;
  is_active?: boolean | number | string;
};

type ApiService = {
  id: string;
  slug: string;
  title: string;
  title_en?: string;
  image_url?: string;
  description?: string;
  rating?: string | number;
  total_reviews?: number;
  total_orders?: number;
  features?: string[] | string;
  available_cities?: string[] | string;
  category_id?: string | null;
  is_active?: boolean | number | string;
  sort_order?: number;
  price?: string | number;
  commission_percent?: number;
};

export const API_BASE = import.meta.env.VITE_SERVICE_API_BASE_URL + "/api";

/* Central API base for wallet & referral */
const VITE_API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_CENTRAL_API_BASE_URL || "").replace(/\/+$/, "");

const getServiceApiHeaders = () => {
  const auth = getMySqlAuth();
  return {
    "Content-Type": "application/json",
    ...(auth?.token ? { Authorization: `Bearer ${auth.token}` } : {}),
  };
};

const parseJsonArray = (value: unknown): string[] => {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : [value];
    } catch {
      return [value];
    }
  }
  return [];
};

const normalizeCity = (value: unknown) => {
  const text = String(value || "").trim().toLowerCase();
  const map: Record<string, string> = {
    ঢাকা: "dhaka", dhaka: "dhaka",
    চট্টগ্রাম: "chittagong", chittagong: "chittagong",
    sylhet: "sylhet", সিলেট: "sylhet",
    khulna: "khulna", খুলনা: "khulna",
  };
  return map[text] || text;
};

const isActive = (value: unknown) => {
  return value === true || value === 1 || value === "1" || value === undefined || value === null;
};

const getServiceImageUrl = (service: ApiService) => {
  if (!service.image_url) return getServiceImage(service.slug, undefined);
  if (/^https?:\/\//i.test(service.image_url)) return service.image_url;
  return `${import.meta.env.VITE_SERVICE_API_BASE_URL}${service.image_url}`;
};

/* ═══════════════════════════════════════════════════════════════
   Booking Modal — same flow as service-details & service-section
   ═══════════════════════════════════════════════════════════════ */

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

const getPkgName = (pkg: Pkg, bn: boolean) => bn ? pkg.name : (pkg.name_en || pkg.name);
const getPkgPrice = (pkg: Pkg) => (pkg.discount_price != null && pkg.discount_price > 0 && pkg.discount_price < pkg.price) ? pkg.discount_price : pkg.price;
const getPkgDuration = (pkg: Pkg, bn: boolean) => bn ? (pkg.duration || "") : (pkg.duration_en || pkg.duration || "");

/* Design tokens for modal */
const TK = { paper: "#EEF0E9", card: "#FFFFFF", line: "#DBD9CC", brass: "#C4842E", brassDark: "#8F5E1E", brassTint: "#F6E9D6", ink: "#182620", inkSoft: "#3c4a43", muted: "#7A7F76" };

const BookingModal = ({ service, bn, onClose }: { service: ApiService; bn: boolean; onClose: () => void }) => {
  const navigate = useNavigate();
  const { addItem } = useCart();
  const mysqlAuth = getMySqlAuth();
  const activeUserId = mysqlAuth?.user?.id;
  const [searchParams] = useSearchParams();
  const fallbackPrice = Number(service.price || 0);
  const commissionPercent = Number(service.commission_percent ?? 0);
  const serviceImageUrl = getServiceImageUrl(service);

  /* Packages */
  const [packages, setPackages] = useState<Pkg[]>([]);
  const [selectedPkg, setSelectedPkg] = useState<Pkg | null>(null);
  const [loadingPkgs, setLoadingPkgs] = useState(true);
  const hasPackages = packages.length > 0;
  const effectivePrice = selectedPkg ? getPkgPrice(selectedPkg) : fallbackPrice;
  const commissionFee = Math.round(effectivePrice * (commissionPercent / 100));
  const selectedPackageName = selectedPkg ? getPkgName(selectedPkg, bn) : (bn ? "বেসিক সার্ভিস" : "Basic Service");

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

  /* Form */
  const [bookingDate, setBookingDate] = useState<Date | undefined>();
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);
  const [bookingTime, setBookingTime] = useState("");
  const [bookingName, setBookingName] = useState(mysqlAuth?.user?.name || "");
  const [bookingPhone, setBookingPhone] = useState(mysqlAuth?.user?.mobile || "");
  const [bookingAddress, setBookingAddress] = useState(mysqlAuth?.user?.address || "");
  const [submitting, setSubmitting] = useState(false);

  /* Wallet */
  const [useWalletPayment, setUseWalletPayment] = useState(false);
  const { data: walletData } = useQuery({
    queryKey: ["user-wallet-as", activeUserId],
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

  /* Referral */
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
    } catch { toast.error(bn ? "রেফারেল যাচাই ব্যর্থ" : "Validation failed"); }
    finally { setValidatingReferral(false); }
  }, [referralCode, bn]);

  const clearReferral = () => { setReferralCode(""); setReferralValidation(null); setReferralSource(null); };

  useEffect(() => {
    if (referralSource === "url" && referralCode) handleValidateReferral();
  }, [referralSource, referralCode, handleValidateReferral]);

  /* Escape */
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  const timeSlots = [
    { label: "8:00", value: "08:00" }, { label: "9:00", value: "09:00" },
    { label: "10:00", value: "10:00" }, { label: "11:00", value: "11:00" },
    { label: "12:00", value: "12:00" }, { label: "1:00", value: "13:00" },
    { label: "2:00", value: "14:00" }, { label: "3:00", value: "15:00" },
  ];

  /* Add to cart */
  const handleAddToCart = () => {
    addItem({
      serviceSlug: service.slug || "",
      serviceTitle: bn ? service.title : service.title_en || service.title,
      serviceImage: serviceImageUrl,
      packageName: selectedPackageName,
      packagePrice: effectivePrice,
      originalPrice: selectedPkg ? (getPkgPrice(selectedPkg) !== selectedPkg.price ? selectedPkg.price : null) : null,
    });
    toast.success(bn ? "কার্টে যোগ হয়েছে!" : "Added to cart!");
  };

  /* Submit */
  const submitBooking = async () => {
    if (!activeUserId) { toast.error(bn ? "লগইন করুন" : "Login required"); navigate("/login"); return; }
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
      const booking: any = await createBooking({
        user_id: String(activeUserId), service_id: service.id || null,
        package_id: selectedPkg?.id || null, service_slug: service.slug || "",
        service_title: bn ? service.title : service.title_en || service.title,
        package_name: selectedPackageName, package_price: effectivePrice,
        platform_fee_amount: paymentAmount,
        customer_name: bookingName.trim(), customer_phone: bookingPhone.trim(),
        customer_address: bookingAddress.trim(),
        booking_date: format(bookingDate!, "yyyy-MM-dd"), booking_time: bookingTime,
        status: "pending", payment_status: useWalletPayment ? "paid" : "unpaid",
        payment_method: useWalletPayment ? "wallet" : "gateway",
        wallet_cash_used: useWalletPayment ? paymentAmount : 0, wallet_coins_used: 0,
        referral_code: referralValidation?.valid ? referralValidation.code : null,
        referred_reward_type: referralValidation?.valid ? referralValidation.referred_reward_type : null,
        referred_reward_amount: referralValidation?.valid ? referralValidation.referred_reward_amount : null,
      });

      if (useWalletPayment) {
        await fetch(`${INDIVIDUAL_API_BASE_URL}/api/bookings/${booking.id}/payment-status`, {
          method: "PUT", headers: getServiceApiHeaders(),
          body: JSON.stringify({ payment_status: "paid", payment_method: "wallet", payment_transaction_id: walletTxId, wallet_cash_used: paymentAmount, wallet_coins_used: 0 }),
        });
        toast.success(bn ? "ওয়ালেট থেকে পেমেন্ট সফল!" : "Payment successful via wallet!");
        navigate("/my-bookings");
      } else {
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
          className="max-h-[100dvh] sm:max-h-[calc(100vh-2rem)] w-full sm:max-w-[420px] sm:rounded-xl sm:border sm:border-border sm:shadow-2xl overflow-y-auto overflow-x-hidden"
          style={{ background: TK.paper }}
          onClick={(e) => e.stopPropagation()}
          role="dialog" aria-modal="true"
          >
          {/* Header */}
          <div className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: TK.line, background: TK.card }}>
            <img src={serviceImageUrl} alt={service.title} className="h-10 w-10 rounded-lg object-cover shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-[9px] tracking-[.08em] uppercase font-semibold" style={{ color: TK.brassDark }}>{bn ? "দ্রুত বুকিং" : "Quick booking"}</p>
              <h3 className="text-[15px] font-semibold leading-tight truncate" style={{ color: TK.ink }}>{bn ? service.title : service.title_en || service.title}</h3>
            </div>
            <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full border hover:bg-black/5 cursor-pointer" style={{ borderColor: TK.line }}>
              <X className="h-4 w-4" style={{ color: TK.muted }} />
            </button>
          </div>

          <div className="px-4 py-3 space-y-4">
            {/* Packages */}
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
                      <button key={pkg.id} type="button" onClick={() => setSelectedPkg(pkg)}
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

            {/* Price block */}
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

            {/* Perforation */}
            <div className="relative" style={{ borderTop: `1px dashed ${TK.line}` }}>
              <div className="absolute -left-[22px] -top-[7px] w-[14px] h-[14px] rounded-full" style={{ background: TK.paper }} />
              <div className="absolute -right-[22px] -top-[7px] w-[14px] h-[14px] rounded-full" style={{ background: TK.paper }} />
            </div>

            {/* Date (Calendar Popover) */}
            <div>
              <label className="text-[10px] font-semibold block mb-1" style={{ color: TK.inkSoft }}>{bn ? "ভিজিটের তারিখ" : "Visit date"}</label>
              <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
                <PopoverTrigger asChild>
                  <button type="button" className="w-full flex items-center gap-1.5 rounded-[7px] border bg-white px-2.5 py-2 text-[11px] text-left cursor-pointer transition-colors" style={{ borderColor: TK.line, color: bookingDate ? TK.ink : TK.muted }}>
                    <CalendarIcon className="h-3 w-3" style={{ color: TK.brass }} />
                    {bookingDate ? format(bookingDate, "EEE, dd MMM") : (bn ? "তারিখ বেছে নিন" : "Pick date")}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="z-[10000] w-auto p-0" align="start">
                  <Calendar mode="single" selected={bookingDate} onSelect={(date) => { setBookingDate(date); if (date) setDatePopoverOpen(false); }} disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))} initialFocus />
                </PopoverContent>
              </Popover>
            </div>

            {/* Time slots */}
            <div>
              <label className="text-[10px] font-semibold block mb-1" style={{ color: TK.inkSoft }}>{bn ? "সময়" : "Time slot"}</label>
              <div className="grid grid-cols-4 gap-1">
                {timeSlots.map((s) => (
                  <button key={s.value} type="button" onClick={() => setBookingTime(s.value)}
                    className="rounded-md border bg-white py-[5px] text-[10px] font-medium font-mono cursor-pointer transition-all"
                    style={{ borderColor: bookingTime === s.value ? "hsl(var(--primary))" : TK.line, background: bookingTime === s.value ? "hsl(var(--primary))" : "white", color: bookingTime === s.value ? "white" : TK.inkSoft }}
                  >{s.label}</button>
                ))}
              </div>
            </div>

            {/* Referral Code */}
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
                <button onClick={clearReferral} className="shrink-0 rounded p-1 cursor-pointer" style={{ color: "#16a34a" }} title={bn ? "সরান" : "Remove"}><Trash2 className="h-2.5 w-2.5" /></button>
              </div>
            ) : (
              <div className="flex gap-1">
                <input value={referralCode} onChange={(e) => { setReferralCode(e.target.value.toUpperCase()); setReferralSource("manual"); }} placeholder={bn ? "রেফারেল (ঐচ্ছিক)" : "Referral (optional)"} className="flex-1 rounded-[7px] border bg-white px-2 py-1.5 text-[10px] outline-none focus:ring-1" style={{ borderColor: TK.line, color: TK.ink, "--tw-ring-color": "hsl(var(--primary))" } as any} />
                <button onClick={handleValidateReferral} disabled={validatingReferral || !referralCode.trim()} className="rounded-[7px] px-2 text-[9px] font-semibold text-white cursor-pointer disabled:opacity-40" style={{ background: "hsl(var(--primary))" }}>
                  {validatingReferral ? "…" : bn ? "যাচাই" : "Go"}
                </button>
              </div>
            )}

            {/* Name, Phone, Address */}
            <div className="space-y-2">
              <div className="relative">
                <User className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3" style={{ color: TK.muted }} />
                <input value={bookingName} onChange={(e) => setBookingName(e.target.value)} placeholder={bn ? "নাম" : "Name"} className="w-full rounded-[7px] border bg-white pl-7 pr-2 py-2 text-[11px] outline-none focus:ring-1" style={{ borderColor: TK.line, color: TK.ink, "--tw-ring-color": "hsl(var(--primary))" } as any} />
              </div>
              <div className="relative">
                <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3" style={{ color: TK.muted }} />
                <input type="text" inputMode="numeric" value={bookingPhone} onChange={(e) => setBookingPhone(e.target.value.replace(/[^0-9]/g, "").slice(0, 11))}
                  onKeyDown={(e) => { const a = ["Backspace","Delete","ArrowLeft","ArrowRight","Tab","Home","End"]; if (a.includes(e.key)) return; if (e.metaKey || e.ctrlKey) return; if (!/^\d$/.test(e.key)) e.preventDefault(); }}
                  onPaste={(e) => { e.preventDefault(); setBookingPhone(e.clipboardData.getData("text").replace(/[^0-9]/g, "").slice(0, 11)); }}
                  placeholder="01XXXXXXXXX" maxLength={11}
                  className="w-full rounded-[7px] border bg-white pl-7 pr-2 py-2 text-[11px] outline-none focus:ring-1"
                  style={{ borderColor: TK.line, color: TK.ink, "--tw-ring-color": "hsl(var(--primary))" } as any}
                />
              </div>
              <div className="relative">
                <Building2 className="absolute left-2.5 top-2.5 h-3 w-3" style={{ color: TK.muted }} />
                <textarea value={bookingAddress} onChange={(e) => setBookingAddress(e.target.value)} rows={2} placeholder={bn ? "ঠিকানা" : "Address"} className="w-full rounded-[7px] border bg-white pl-7 pr-2 py-2 text-[11px] outline-none focus:ring-1 resize-none" style={{ borderColor: TK.line, color: TK.ink, "--tw-ring-color": "hsl(var(--primary))" } as any} />
              </div>
              {activeUserId && walletBalance > 0 && (
                <button type="button" onClick={() => setUseWalletPayment(!useWalletPayment)}
                  className="flex items-center gap-2 w-full rounded-[7px] border p-2 text-left cursor-pointer transition-colors"
                  style={{ borderColor: useWalletPayment ? "hsl(var(--primary))" : TK.line, background: useWalletPayment ? "hsl(var(--primary)/.08)" : "white" }}
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

            {/* Confirm */}
            <button type="button" onClick={submitBooking} disabled={submitting || loadingPkgs}
              className="w-full flex items-center justify-center gap-1.5 rounded-[7px] py-2.5 text-[11px] font-semibold text-white cursor-pointer transition-all disabled:opacity-60"
              style={{ background: "hsl(var(--primary))", boxShadow: "0 4px 12px hsl(var(--primary)/.2)" }}
            >
              {submitting ? <div className="h-3 w-3 rounded-full border-2 border-white/30 border-t-white animate-spin" /> : <CalendarCheck className="h-3 w-3" />}
              {submitting ? (bn ? "প্রসেসিং…" : "Processing…") : (bn ? "বুকিং নিশ্চিত করুন" : "Confirm booking")}
            </button>

            {/* Add to cart */}
            <button type="button" onClick={handleAddToCart}
              className="w-full flex items-center justify-center gap-1.5 rounded-[7px] border py-2 text-[10.5px] font-semibold cursor-pointer transition-colors"
              style={{ borderColor: TK.line, color: TK.ink, background: "transparent" }}
            >
              <ShoppingBag className="h-3 w-3" />
              {bn ? "কার্টে যোগ করুন" : "Add to cart"}
            </button>

            {/* Barcode */}
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
          <div className="h-[env(safe-area-inset-bottom,0px)] sm:h-0" style={{ background: TK.paper }} />
        </motion.div>
      </motion.div>
    </AnimatePresence>, document.body
  );
};

/* ──────────────────────── SharePopup ──────────────────────── */

interface SharePopupProps { slug: string; title: string; anchorRect: DOMRect; onClose: () => void; }

const SharePopup = forwardRef<HTMLDivElement, SharePopupProps>(
  ({ slug, title, anchorRect, onClose }, _ref) => {
    const [copied, setCopied] = useState(false);
    const { language } = useLanguage();
    const bn = language === "bn";
    const url = `${window.location.origin}/service/${slug}`;
    const text = bn ? `${title} - সার্ভিস দেখুন` : `Check out ${title}`;
    const popupRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      const handler = (e: MouseEvent) => {
        if (popupRef.current && e.target instanceof Node && !popupRef.current.contains(e.target)) onClose();
      };
      document.addEventListener("mousedown", handler);
      return () => document.removeEventListener("mousedown", handler);
    }, [onClose]);

    const copyLink = async () => {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success(bn ? "লিংক কপি হয়েছে!" : "Link copied!");
      setTimeout(() => setCopied(false), 2000);
    };

    const socials = [
      { name: "Facebook", color: "bg-[#1877F2]", icon: "f", href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}` },
      { name: "WhatsApp", color: "bg-[#25D366]", icon: "w", href: `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}` },
      { name: "X", color: "bg-foreground", icon: "𝕏", href: `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}` },
    ];

    const top = anchorRect.bottom + window.scrollY + 8;
    const left = Math.max(8, Math.min(anchorRect.left + window.scrollX - 100, window.innerWidth - 240));

    return createPortal(
      <motion.div ref={popupRef} initial={{ opacity: 0, scale: 0.9, y: -5 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: -5 }} transition={{ duration: 0.2 }}
        className="fixed z-[9999] w-[230px] rounded-xl bg-blue-100 p-3 shadow-xl" style={{ top, left, position: "absolute" }} onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-foreground">{bn ? "শেয়ার করুন" : "Share"}</span>
          <button onClick={onClose} className="rounded-full p-0.5 hover:bg-secondary cursor-pointer"><X className="h-3.5 w-3.5 text-muted-foreground" /></button>
        </div>
        <div className="flex gap-2 mb-3">
          {socials.map((s) => (
            <a key={s.name} href={s.href} target="_blank" rel="noopener noreferrer" className={`flex h-9 w-9 items-center justify-center rounded-full ${s.color} text-white text-sm font-bold transition-transform hover:scale-110 cursor-pointer`}>{s.icon}</a>
          ))}
        </div>
        <div className="flex items-center gap-1.5 rounded-lg border border-border bg-muted/50 px-2 py-1.5">
          <span className="flex-1 truncate text-[11px] text-muted-foreground">{url}</span>
          <button onClick={copyLink} className="flex shrink-0 items-center gap-1 rounded-md bg-primary px-2 py-1 text-[10px] font-medium text-white transition-colors hover:bg-primary/90 cursor-pointer">
            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            {copied ? (bn ? "কপি হয়েছে" : "Copied") : (bn ? "কপি" : "Copy")}
          </button>
        </div>
      </motion.div>, document.body
    );
  }
);

/* ──────────────────────── Main Page ──────────────────────── */

const AllServices = () => {
  const navigate = useNavigate();
  const { selectedCity } = useLocation();
  const { t, language } = useLanguage();
  const bn = language === "bn";

  const [searchParams, setSearchParams] = useSearchParams();

  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [services, setServices] = useState<ApiService[]>([]);
  const [loading, setLoading] = useState(true);

  const categoryFromUrl = searchParams.get("category") || "";
  const catFilterFromUrl = searchParams.get("cat") || "";

  const [activeCategory, setActiveCategory] = useState(categoryFromUrl);
  const [filterCategory, setFilterCategory] = useState(catFilterFromUrl || "all");

  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [debouncedQuery, setDebouncedQuery] = useState(searchQuery);
  const [minRating, setMinRating] = useState(Number(searchParams.get("rating")) || 0);
  const [sortBy, setSortBy] = useState(searchParams.get("sort") || "popular");
  const [showFilters, setShowFilters] = useState(false);
  const [availability, setAvailability] = useState(searchParams.get("avail") || "all");
  const [cityOverride, setCityOverride] = useState(searchParams.get("city") || "");

  /* ── Booking modal state ── */
  const [bookingTarget, setBookingTarget] = useState<ApiService | null>(null);

  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const initialScrollDone = useRef(false);

  useSEO({
    title: bn ? "সকল সার্ভিস" : "All Services",
    description: bn ? "সন্ধানের সকল হোম সার্ভিস ব্রাউজ করুন।" : "Browse all home services on Shondhaan.",
    canonical: "/all-services",
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [serviceRes, categoryRes] = await Promise.all([
          fetch(`${API_BASE}/services`), fetch(`${API_BASE}/categories`),
        ]);
        const serviceJson = await serviceRes.json();
        const categoryJson = await categoryRes.json();
        setServices(Array.isArray(serviceJson) ? serviceJson : serviceJson?.data || serviceJson?.services || []);
        setCategories(Array.isArray(categoryJson) ? categoryJson : categoryJson?.data || categoryJson?.categories || []);
      } catch (err) { console.error("❌ AllServices fetch error:", err); }
      finally { setLoading(false); }
    };
    fetchData();
  }, []);

  const activeCategories = useMemo(() => categories.filter((cat) => isActive(cat.is_active)), [categories]);
  const activeServices = useMemo(() => services.filter((service) => isActive(service.is_active)), [services]);

  const effectiveCity = cityOverride || selectedCity;

  const cityMatched = (service: ApiService) => {
    const cities = parseJsonArray(service.available_cities);
    if (!effectiveCity || cities.length === 0) return true;
    return cities.some((city) => normalizeCity(city) === normalizeCity(effectiveCity));
  };

  const filteredByCity = useMemo(() => activeServices.filter(cityMatched).sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0)), [activeServices, effectiveCity]);

  const getCatName = (cat: ApiCategory) => bn ? cat.name || cat.title || "ক্যাটেগরি" : cat.name_en || cat.title_en || cat.name || cat.title || "Category";
  const getServiceTitle = (service: ApiService) => bn ? service.title : service.title_en || service.title;

  const scrollToCategory = (catId: string, updateUrl = true) => {
    setActiveCategory(catId);
    if (updateUrl) { const next = new URLSearchParams(searchParams); next.set("category", catId); setSearchParams(next, { replace: true }); }
    setTimeout(() => {
      const el = sectionRefs.current[catId]; if (!el) return;
      const offset = window.innerWidth < 768 ? 105 : 95;
      window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - offset, behavior: "smooth" });
    }, 120);
  };

  useEffect(() => {
    if (loading) return;
    if (categoryFromUrl && !initialScrollDone.current) {
      initialScrollDone.current = true; setActiveCategory(categoryFromUrl);
      setTimeout(() => scrollToCategory(categoryFromUrl, false), 400); return;
    }
    if (!categoryFromUrl && !activeCategory && activeCategories.length > 0) setActiveCategory(activeCategories[0].id);
  }, [categoryFromUrl, loading, activeCategories.length]);

  useEffect(() => { const t = window.setTimeout(() => setDebouncedQuery(searchQuery), 200); return () => window.clearTimeout(t); }, [searchQuery]);

  const isFiltering = Boolean(debouncedQuery.trim() || filterCategory !== "all" || minRating > 0 || sortBy !== "popular" || availability !== "all" || cityOverride);

  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    debouncedQuery.trim() ? next.set("q", debouncedQuery.trim()) : next.delete("q");
    filterCategory !== "all" ? next.set("cat", filterCategory) : next.delete("cat");
    minRating > 0 ? next.set("rating", String(minRating)) : next.delete("rating");
    sortBy !== "popular" ? next.set("sort", sortBy) : next.delete("sort");
    availability !== "all" ? next.set("avail", availability) : next.delete("avail");
    cityOverride ? next.set("city", cityOverride) : next.delete("city");
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery, filterCategory, minRating, sortBy, availability, cityOverride]);

  const searchResults = useMemo(() => {
    if (!isFiltering) return null;
    const q = debouncedQuery.trim().toLowerCase();
    let list = filteredByCity.filter((service) => {
      if (filterCategory !== "all" && String(service.category_id || "") !== String(filterCategory)) return false;
      if (minRating > 0 && Number(service.rating || 0) < minRating) return false;
      const cities = parseJsonArray(service.available_cities);
      if (availability === "nationwide" && cities.length !== 0) return false;
      if (availability === "citywide" && cities.length === 0) return false;
      if (!q) return true;
      return service.title?.toLowerCase().includes(q) || service.title_en?.toLowerCase().includes(q) || service.description?.toLowerCase().includes(q);
    });
    list = [...list].sort((a, b) => sortBy === "rating" ? Number(b.rating || 0) - Number(a.rating || 0) : Number(a.sort_order || 0) - Number(b.sort_order || 0));
    return list;
  }, [isFiltering, filteredByCity, debouncedQuery, filterCategory, minRating, sortBy, availability]);

  useEffect(() => {
    if (loading || searchResults) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveCategory((prev) => (prev === visible[0].target.id ? prev : visible[0].target.id));
      }, { rootMargin: "-120px 0px -70% 0px", threshold: 0 }
    );
    Object.values(sectionRefs.current).forEach((ref) => { if (ref) observer.observe(ref); });
    return () => observer.disconnect();
  }, [loading, activeCategories.length, filteredByCity.length, searchResults]);

  const allCities = useMemo(() => {
    const set = new Set<string>();
    divisions.forEach((d) => d.districts.forEach((dist) => set.add(dist.nameBn)));
    return Array.from(set).sort((a, b) => a.localeCompare(b, "bn"));
  }, []);

  const clearAllFilters = () => {
    setSearchQuery(""); setFilterCategory("all"); setMinRating(0); setSortBy("popular"); setAvailability("all"); setCityOverride("");
    const next = new URLSearchParams(searchParams);
    ["q", "cat", "rating", "sort", "avail", "city"].forEach((k) => next.delete(k));
    setSearchParams(next, { replace: true });
  };

  /* ── Handle book from card ── */
  const handleBookFromCard = (service: ApiService) => {
    if (!getMySqlAuth()?.user?.id) { toast.info(bn ? "লগইন করুন" : "Login to book"); navigate("/login"); return; }
    setBookingTarget(service);
  };

  return (
    <div className="min-h-screen bg-[aliceblue]">
      <Navbar />
      <div className="md:pt-[20px]" />

      <div className="app-container py-5 md:py-8">
        <div className="block gap-3">
          <div className="mb-5 flex items-center gap-3 w-full">
            <button type="button" onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <h1 className="font-heading text-xl font-bold text-foreground md:text-2xl">{t("as.title")}</h1>
          </div>

          <div className="md:mb-2 space-y-0 w-full">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder={t("as.searchPlaceholder")} className="w-full rounded-xl border border-primary bg-background py-3 pl-10 pr-9 text-sm outline-none focus:ring-1 focus:ring-ring" />
                {searchQuery && (
                  <button type="button" onClick={() => setSearchQuery("")} className="absolute right-2.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-secondary">
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <button type="button" onClick={() => setShowFilters((prev) => !prev)} className={`relative flex h-12 w-14 items-center justify-center rounded-xl border ${showFilters || isFiltering ? "bg-green-700 text-white" : "bg-background text-foreground border-input"}`}>
                <SlidersHorizontal className="h-4 w-4" />
                {isFiltering && <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-primary ring-2 ring-background" />}
              </button>
            </div>

            {showFilters && (
              <div className="space-y-3 rounded-xl border border-border bg-card p-3">
                <div>
                  <p className="mb-1.5 text-[11px] font-semibold uppercase text-muted-foreground">{bn ? "ক্যাটাগরি" : "Category"}</p>
                  <div className="flex flex-wrap gap-1.5">
                    <button type="button" onClick={() => setFilterCategory("all")} className={`rounded-full border px-3 py-1 text-xs font-medium ${filterCategory === "all" ? "border-primary bg-primary text-white" : "border-border bg-background text-foreground hover:bg-secondary"}`}>{bn ? "সব" : "All"}</button>
                    {activeCategories.map((cat) => (
                      <button type="button" key={cat.id} onClick={() => { setFilterCategory(cat.id); setActiveCategory(cat.id); }} className={`rounded-full border px-3 py-1 text-xs font-medium ${filterCategory === cat.id ? "border-primary bg-primary text-white" : "border-border bg-background text-foreground hover:bg-secondary"}`}>{getCatName(cat)}</button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="mb-1.5 text-[11px] font-semibold uppercase text-muted-foreground">{bn ? "সাজান" : "Sort"}</p>
                    <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="w-full rounded-lg border border-input bg-background px-2 py-2 text-xs text-foreground outline-none">
                      <option value="popular">{bn ? "জনপ্রিয়" : "Popular"}</option>
                      <option value="rating">{bn ? "সর্বোচ্চ রেটিং" : "Top rated"}</option>
                    </select>
                  </div>
                  <div>
                    <p className="mb-1.5 text-[11px] font-semibold uppercase text-muted-foreground"><MapPin className="mr-0.5 inline h-3 w-3" />{bn ? "অবস্থান" : "Location"}</p>
                    <select value={cityOverride} onChange={(e) => setCityOverride(e.target.value)} className="w-full rounded-lg border border-input bg-background px-2 py-2 text-xs text-foreground outline-none">
                      <option value="">{bn ? `বর্তমান (${selectedCity})` : `Current (${selectedCity})`}</option>
                      {allCities.map((city) => <option key={city} value={city}>{city}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <p className="mb-1.5 text-[11px] font-semibold uppercase text-muted-foreground">{bn ? "ন্যূনতম রেটিং" : "Min rating"}</p>
                  <div className="flex gap-1">
                    {[0, 3, 4, 4.5].map((rating) => (
                      <button type="button" key={rating} onClick={() => setMinRating(rating)} className={`flex flex-1 items-center justify-center gap-0.5 rounded-lg border px-2 py-1.5 text-xs ${minRating === rating ? "border-primary bg-primary/10 font-semibold text-primary" : "border-border bg-background text-foreground hover:bg-secondary"}`}>
                        {rating === 0 ? (bn ? "সব" : "Any") : <>{rating}+ <Star className="h-3 w-3 fill-current" /></>}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="mb-1.5 text-[11px] font-semibold uppercase text-muted-foreground">{bn ? "প্রাপ্যতা" : "Availability"}</p>
                  <div className="grid grid-cols-3 gap-1">
                    {[{ id: "all", label: bn ? "সব" : "All" }, { id: "citywide", label: bn ? "শহর" : "City" }, { id: "nationwide", label: bn ? "সারাদেশ" : "Nationwide" }].map((item) => (
                      <button type="button" key={item.id} onClick={() => setAvailability(item.id)} className={`rounded-lg border px-2 py-1.5 text-xs font-medium ${availability === item.id ? "border-primary bg-primary/10 text-primary" : "border-border bg-background text-foreground hover:bg-secondary"}`}>{item.label}</button>
                    ))}
                  </div>
                </div>
                {isFiltering && (
                  <button type="button" onClick={clearAllFilters} className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-border bg-background py-2 text-xs font-medium text-muted-foreground hover:bg-secondary">
                    <X className="h-3.5 w-3.5" />{bn ? "সব ফিল্টার মুছুন" : "Clear all filters"}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-6">
          <CategorySidebar categories={activeCategories} activeCategory={activeCategory} getCatName={getCatName} scrollToCategory={scrollToCategory} />

          <main className="flex-1 pt-12 md:pt-0">
            {loading ? (
              <div className="py-16 text-center text-muted-foreground">{bn ? "লোড হচ্ছে..." : "Loading..."}</div>
            ) : searchResults ? (
              <div>
                <p className="mb-4 text-sm text-muted-foreground">{searchResults.length > 0 ? `${searchResults.length}${t("as.found")}` : t("as.notFound")}</p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {searchResults.map((service) => (
                    <CmsServiceCard key={service.id} service={service} title={getServiceTitle(service)} onClick={() => navigate(`/service/${service.slug}`)} onBook={() => handleBookFromCard(service)} />
                  ))}
                </div>
              </div>
            ) : (
              <CategorySections categories={activeCategories} services={filteredByCity} sectionRefs={sectionRefs} getCatName={getCatName} getServiceTitle={getServiceTitle} navigate={navigate} onBook={handleBookFromCard} />
            )}
          </main>
        </div>
      </div>

      <Footer />

      {/* Booking modal portal */}
      {bookingTarget && <BookingModal service={bookingTarget} bn={bn} onClose={() => setBookingTarget(null)} />}

      <div className="h-16 md:hidden" />
    </div>
  );
};

/* ──────────────────────── CategorySidebar ──────────────────────── */

const CategorySidebar = ({ categories, activeCategory, getCatName, scrollToCategory }: {
  categories: ApiCategory[]; activeCategory: string; getCatName: (cat: ApiCategory) => string; scrollToCategory: (id: string) => void;
}) => (
  <>
    <aside className="hidden w-52 shrink-0 md:block">
      <div className="sticky top-20 space-y-0.5">
        {categories.map((cat) => (
          <button type="button" key={cat.id} onClick={() => scrollToCategory(cat.id)}
            className={`flex w-full items-center rounded gap-2.5 px-3 py-2.5 text-left text-sm transition-all ${activeCategory === cat.id ? "border-primary bg-primary/10 font-semibold text-primary" : "border-transparent text-muted-foreground hover:text-primary hover:font-semibold"}`}
          >
            {cat.icon_url && <img src={/^https?:\/\//i.test(cat.icon_url) ? cat.icon_url : `${import.meta.env.VITE_SERVICE_API_BASE_URL}${cat.icon_url}`} alt={getCatName(cat)} className="h-6 w-6 object-contain" />}
            <span className="line-clamp-2">{getCatName(cat)}</span>
          </button>
        ))}
      </div>
    </aside>
    <div className="fixed left-0 right-0 top-[52px] z-30 border-b border-border bg-background md:hidden">
      <div className="flex gap-2 overflow-x-auto px-4 py-2.5" style={{ scrollbarWidth: "none" }}>
        {categories.map((cat) => (
          <button type="button" key={cat.id} onClick={() => scrollToCategory(cat.id)}
            className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ${activeCategory === cat.id ? "bg-primary text-white" : "bg-secondary text-muted-foreground"}`}
          >
            {cat.icon_url && <img src={/^https?:\/\//i.test(cat.icon_url) ? cat.icon_url : `${import.meta.env.VITE_SERVICE_API_BASE_URL}${cat.icon_url}`} alt={getCatName(cat)} className="h-4 w-4 object-contain" />}
            {getCatName(cat)}
          </button>
        ))}
      </div>
    </div>
  </>
);

/* ──────────────────────── CategorySections ──────────────────────── */
const CategorySections = ({ categories, services, sectionRefs, getCatName, getServiceTitle, navigate, onBook }: {
  categories: ApiCategory[]; services: ApiService[]; sectionRefs: MutableRefObject<Record<string, HTMLDivElement | null>>;
  getCatName: (cat: ApiCategory) => string; getServiceTitle: (service: ApiService) => string;
  navigate: (path: string) => void; onBook: (service: ApiService) => void;
}) => {
  const { language } = useLanguage(); const bn = language === "bn";
  const visibleCategoryCount = categories.filter((cat) => services.some((s) => String(s.category_id || "") === String(cat.id))).length;
  const categoryIds = new Set(categories.map((category) => String(category.id)));
  const uncategorizedServices = services
    .filter((s) => !s.category_id || !categoryIds.has(String(s.category_id)))
    .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0));

  if (visibleCategoryCount === 0 && uncategorizedServices.length === 0) {
    return <div className="py-16 text-center text-muted-foreground">{bn ? "কোনো সার্ভিস পাওয়া যায়নি" : "No services available"}</div>;
  }

  return (
    <>
      {categories.map((cat, index) => {
        const catServices = services.filter((s) => String(s.category_id || "") === String(cat.id)).sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0));
        if (!catServices.length) return null;
        return (
          <div key={cat.id} id={cat.id} ref={(el) => { sectionRefs.current[cat.id] = el; }} className={index > 0 ? "mb-10" : ""}>
            <div className="mb-4 flex items-center gap-3 border-b border-border px-1 pb-3">
              {cat.icon_url && <img src={/^https?:\/\//i.test(cat.icon_url) ? cat.icon_url : `${import.meta.env.VITE_SERVICE_API_BASE_URL}${cat.icon_url}`} alt={getCatName(cat)} className="h-7 w-7 object-contain" />}
              <h2 className="font-heading text-lg font-bold text-foreground">{getCatName(cat)}</h2>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {catServices.map((service) => (
                <CmsServiceCard key={service.id} service={service} title={getServiceTitle(service)} onClick={() => navigate(`/service/${service.slug}`)} onBook={() => onBook(service)} />
              ))}
            </div>
          </div>
        );
      })}
      {uncategorizedServices.length > 0 && (
        <div className={visibleCategoryCount > 0 ? "mt-10" : ""}>
          <div className="mb-4 flex items-center gap-3 border-b border-border px-1 pb-3">
            <h2 className="font-heading text-lg font-bold text-foreground">{bn ? "অন্যান্য সার্ভিস" : "Other Services"}</h2>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {uncategorizedServices.map((service) => (
              <CmsServiceCard key={service.id} service={service} title={getServiceTitle(service)} onClick={() => navigate(`/service/${service.slug}`)} onBook={() => onBook(service)} />
            ))}
          </div>
        </div>
      )}
    </>
  );
};
/* ──────────────────────── CmsServiceCard (with Book button) ──────────────────────── */



const CmsServiceCard = ({ service, title, onClick, onBook }: {
  service: ApiService; title: string; onClick: () => void; onBook: () => void;
}) => {
  const { language } = useLanguage(); const bn = language === "bn";
  const { addToCompare, removeFromCompare, isInCompare, compareList } = useCompare();
  const inCompare = isInCompare(service.slug);
  const [shareState, setShareState] = useState<{ slug: string; title: string; rect: DOMRect } | null>(null);
  const closeShare = useCallback(() => setShareState(null), []);

  const toggleCompare = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (inCompare) { removeFromCompare(service.slug); return; }
    if (compareList.length >= 3) return;
    addToCompare(service as any);
  };

  const handleShareClick = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (shareState?.slug === service.slug) setShareState(null);
    else setShareState({ slug: service.slug, title, rect: (e.currentTarget as HTMLElement).getBoundingClientRect() });
  };

  const handleBookClick = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    onBook();
  };

  const parsePrice = (value: unknown) => {
    if (value === null || value === undefined) return 0;
    const s = String(value).trim(); if (!s) return 0;
    const n = Number(s.replace(/৳/g, "").replace(/,/g, "").replace(/\s/g, ""));
    return Number.isFinite(n) ? n : 0;
  };
  const price = parsePrice(service.price);
  const formattedPrice = price % 1 === 0 ? String(price) : price.toFixed(2);

  return (
    <motion.div
      role="button" tabIndex={0} onClick={onClick}
      onKeyDown={(e) => { if (e.key === "Enter") onClick(); }}
      whileHover={{ y: -2 }}
      className="group relative flex h-full cursor-pointer flex-col overflow-hidden rounded-xl border border-border bg-card text-left transition-shadow hover:shadow-md"
    >
      <div className="relative aspect-[4/3] overflow-hidden yess-wm">
        <img
          src={getServiceImage(service.slug, service.image_url ? (/^https?:\/\//i.test(service.image_url) ? service.image_url : `${import.meta.env.VITE_SERVICE_API_BASE_URL}${service.image_url}`) : service.image_url)}
          alt={title} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy"
        />

        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-foreground/60 to-transparent p-2">
          <span className="flex items-center gap-1 text-[10px] font-medium text-background">
            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
            {Number(service.rating || 0)}
          </span>
        </div>

        <div className="absolute right-2 top-2 flex flex-col gap-1.5">
          <button type="button" onClick={handleShareClick} className="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-background/80 text-muted-foreground backdrop-blur-sm hover:text-primary transition-colors cursor-pointer">
            <Share2 className="h-3.5 w-3.5" />
          </button>
          <button type="button" onClick={toggleCompare} disabled={!inCompare && compareList.length >= 3}
            className={`flex h-7 w-7 items-center justify-center rounded-full border ${inCompare ? "border-primary bg-primary text-white" : "border-border bg-background/80 text-muted-foreground disabled:opacity-30"}`}
          >
            {inCompare ? <Check className="h-3.5 w-3.5" /> : <GitCompareArrows className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-2.5">
        <h3 className="line-clamp-2 text-xs font-semibold leading-snug text-foreground group-hover:text-primary">
          {title}
        </h3>

        {price > 0 ? (
          <p className="mt-1 text-[11px] font-bold text-foreground">
            ৳{formattedPrice}
            <span className="ml-1 font-normal text-muted-foreground">{bn ? "থেকে" : "from"}</span>
          </p>
        ) : (
          <p className="mt-1 text-[11px] text-muted-foreground">{bn ? "দাম দেখুন" : "View"}</p>
        )}

        {!!service.total_orders && (
          <p className="mt-0.5 text-[11px] text-muted-foreground">{service.total_orders}+ orders</p>
        )}

        {/* ── Book Now button ── */}
        <button
          type="button"
          onClick={handleBookClick}
          className="mt-auto flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary py-[10px] text-[10px] font-semibold text-white shadow-sm shadow-primary/20 transition-colors hover:bg-emerald-600 cursor-pointer"
        >
          <CalendarCheck className="h-3 w-3" />
          {bn ? "বুক করুন" : "Book Now"}
        </button>
      </div>
      <AnimatePresence>
        {shareState && <SharePopup slug={shareState.slug} title={shareState.title} anchorRect={shareState.rect} onClose={closeShare} />}
      </AnimatePresence>
    </motion.div>
  );
};
export default AllServices;

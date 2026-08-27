import { useParams, useNavigate, Link, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Star,
  ShieldCheck,
  
  CheckCircle2,
  Phone,
  MapPin,
  Clock,
  Award,
  BadgeCheck,
  CalendarCheck,
  ShoppingBag,
  CalendarIcon,
  Trash2,
  Home,
  ChevronRight,
  Wallet,
  User,
  Building2,
} from "lucide-react";
import { useState, useEffect, useCallback, useMemo } from "react";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { getServiceBySlug } from "@/data/services";
import { getServiceImage } from "@/data/serviceImages";
import { useRecentlyViewed } from "@/hooks/useRecentlyViewed";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { toast } from "sonner";
import { useCart } from "@/contexts/CartContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useLocation } from "@/contexts/LocationContext";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import StickyBottomCTA from "@/components/StickyBottomCTA";
import { useSEO } from "@/hooks/useSEO";
import { createBooking, startBookingPayment } from "@/lib/bookingApi";
import { getMySqlAuth } from "@/lib/mysqlAuth";
import { INDIVIDUAL_API_BASE_URL } from "@/lib/api";
import {
  createReview,
  deleteReview,
  listServiceReviews,
} from "@/lib/reviewApi";

/* ─── Compact Design Tokens ─── */
const T = {
  ink: "#182620",
  inkSoft: "#3c4a43",
  paper: "#EEF0E9",
  card: "#FFFFFF",
  line: "#DBD9CC",
  primary: "hsl(var(--primary))",
  primaryDark: "hsl(var(--primary))",
  primaryTint: "hsl(var(--primary) / 0.08)",
  brass: "#C4842E",
  brassDark: "#8F5E1E",
  brassTint: "#F6E9D6",
  muted: "#7A7F76",
  radiusLg: "16px",
  radiusMd: "10px",
  radiusSm: "7px",
} as const;

/* ─── Font injection ─── */
let fontsInjected = false;
const injectFonts = () => {
  if (fontsInjected || typeof document === "undefined") return;
  fontsInjected = true;
  const ids = ["sd-f1", "sd-f2", "sd-f3"];
  const links = [
    { id: ids[0], rel: "preconnect", href: "https://fonts.googleapis.com" },
    { id: ids[1], rel: "preconnect", href: "https://fonts.gstatic.com", cross: "" },
    {
      id: ids[2],
      rel: "stylesheet",
      href: "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=JetBrains+Mono:wght@400;500&display=swap",
    },
  ];
  links.forEach(({ id, ...rest }) => {
    if (document.getElementById(id)) return;
    const el = document.createElement("link");
    el.id = id;
    Object.assign(el, rest);
    document.head.appendChild(el);
  });
};

/* ─── Types ─── */
type CmsService = {
  id: string;
  slug: string;
  title: string;
  title_en?: string | null;
  image_url?: string | null;
  description?: string | null;
  rating?: number;
  total_reviews?: number;
  total_orders?: number;
  commission_percent?: number;
  platform_fee?: number;
  features?: string[];
  available_cities?: string[];
  category_id?: string | null;
  is_active?: boolean;
  sort_order?: number;
  price?: number;
  color_overlay?: string;
};

type ServiceReview = {
  id: string;
  service_slug?: string;
  user_id?: number | string;
  rating: number;
  reviewer_name?: string;
  comment?: string | null;
  created_at?: string;
};

/* ─── API helpers ─── */
const VITE_SERVICE_API_BASE_URL = INDIVIDUAL_API_BASE_URL.replace(/\/+$/, "");
const VITE_API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_CENTRAL_API_BASE_URL || "").replace(/\/+$/, "");

const getServiceApiHeaders = () => {
  const auth = getMySqlAuth();
  return {
    "Content-Type": "application/json",
    ...(auth?.token ? { Authorization: `Bearer ${auth.token}` } : {}),
  };
};

const getBackendImageUrl = (value?: string | null) => {
  const imageUrl = String(value || "").trim();
  if (!imageUrl) return "";
  if (/^https?:\/\//i.test(imageUrl) || imageUrl.startsWith("data:") || imageUrl.startsWith("blob:")) return imageUrl;
  if (imageUrl.startsWith("/assets/") || imageUrl.startsWith("/src/") || imageUrl.startsWith("/images/")) return imageUrl;
  return `${VITE_SERVICE_API_BASE_URL}${imageUrl.startsWith("/") ? "" : "/"}${imageUrl}`;
};

const getServiceDisplayImage = (slug: string, imageUrl?: string | null) => {
  const backend = getBackendImageUrl(imageUrl);
  return backend || getServiceImage(slug, undefined);
};

const parseList = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value !== "string") return [];
  try {
    const p = JSON.parse(value);
    if (Array.isArray(p)) return p.map(String).filter(Boolean);
  } catch { /* */ }
  return value.split(",").map((s) => s.trim()).filter(Boolean);
};

const getPayload = (raw: any) => raw?.data ?? raw?.service ?? raw?.item ?? raw?.result ?? raw;

const normalizeCmsService = (raw: any): CmsService | null => {
  const s = Array.isArray(raw) ? raw[0] : getPayload(raw);
  if (!s || typeof s !== "object") return null;
  return {
    ...s,
    id: String(s.id ?? ""),
    slug: String(s.slug ?? ""),
    title: String(s.title ?? s.name ?? ""),
    title_en: s.title_en ?? s.name_en ?? null,
    image_url: s.image_url ?? s.image ?? null,
    description: s.description ?? null,
    rating: Number(s.rating ?? 4.5),
    total_reviews: Number(s.total_reviews ?? s.reviews_count ?? 0),
    total_orders: Number(s.total_orders ?? s.orders_count ?? 0),
    commission_percent: Number(s.commission_percent ?? 0),
    platform_fee: Number(s.platform_fee ?? s.platform_fee_amount ?? 0),
    features: parseList(s.features),
    available_cities: parseList(s.available_cities),
    category_id: s.category_id == null ? null : String(s.category_id),
    is_active: s.is_active === false || s.is_active === 0 ? false : true,
    sort_order: Number(s.sort_order ?? 0),
    price: Number(s.price ?? 0),
  };
};

const normalizePackages = (raw: any): any[] => {
  const payload = getPayload(raw);
  const pkgs = raw?.packages ?? raw?.service_packages ?? raw?.data?.packages ?? raw?.data?.service_packages ?? payload?.packages ?? payload?.service_packages ?? (Array.isArray(payload) ? payload : []);
  if (!Array.isArray(pkgs)) return [];
  return pkgs.map((pkg) => ({
    ...pkg,
    id: pkg.id == null ? undefined : String(pkg.id),
    service_id: pkg.service_id == null ? undefined : String(pkg.service_id),
    name: pkg.name ?? pkg.package_name ?? "Basic Service",
    price: Number(pkg.price ?? 0),
    original_price: pkg.original_price == null || pkg.original_price === "" ? null : Number(pkg.original_price),
    features: parseList(pkg.features),
    sort_order: Number(pkg.sort_order ?? 0),
  }));
};

const makePricePackage = (service: CmsService | null): any[] => {
  const price = Number(service?.price ?? 0);
  if (!service || !Number.isFinite(price) || price <= 0) return [];
  return [{ id: `${service.id || service.slug}-default`, service_id: service.id, name: "Basic Service", price, original_price: null, features: Array.isArray(service.features) ? service.features : [], sort_order: 0 }];
};

const isRealUuid = (v?: string | null) => !!v && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
const getSafePackageId = (v: unknown): string | null => { const id = String(v ?? "").trim(); if (!id || id.includes("default")) return null; return isRealUuid(id) ? id : null; };

/* ─── Query hooks ─── */
const useServiceBySlug = (slug?: string) =>
  useQuery({
    queryKey: ["service-detail", slug],
    queryFn: async () => {
      const res = await fetch(`${VITE_SERVICE_API_BASE_URL}/api/services/${encodeURIComponent(slug || "")}`, { headers: getServiceApiHeaders() });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || "Service load failed");
      return { service: normalizeCmsService(json), packages: normalizePackages(json) };
    },
    enabled: !!slug, retry: 1,
  });

const useServicePackages = (serviceId?: string, enabled = true) =>
  useQuery({
    queryKey: ["service-packages", serviceId],
    queryFn: async () => {
      const res = await fetch(`${VITE_SERVICE_API_BASE_URL}/api/packages?service_id=${encodeURIComponent(serviceId || "")}`, { headers: getServiceApiHeaders() });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || "Package load failed");
      return normalizePackages(json);
    },
    enabled: !!serviceId && enabled, retry: 1,
  });

const useUserWallet = (userId?: string | number) =>
  useQuery({
    queryKey: ["user-wallet", userId],
    queryFn: async () => {
      if (!userId) return null;
      const res = await fetch(`${VITE_API_BASE_URL}/api/wallet/balance/${userId}`, { headers: getServiceApiHeaders() });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Wallet load failed");
      return json.wallet || json;
    },
    enabled: !!userId, retry: 1,
  });

/* ─── Barcode generator ─── */
const useBarcode = () => useMemo(() => Array.from({ length: 20 }, () => 4 + Math.random() * 7), []);

/* ═══════════════════════════════════════════════════════════════════════
   ServiceDetail — entry point
   ═══════════════════════════════════════════════════════════════════════ */
const ServiceDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const { t, language } = useLanguage();
  const bn = language === "bn";
  const [selectedPackage, setSelectedPackage] = useState(0);

  injectFonts();

  const detailQuery = useServiceBySlug(slug);
  const cmsService = detailQuery.data?.service || null;
  const pkgQuery = useServicePackages(cmsService?.id);
  const legacyService = getServiceBySlug(slug || "");
  const fallbackPkgs = makePricePackage(cmsService);

  const servicePackages = (pkgQuery.data && pkgQuery.data.length > 0 ? pkgQuery.data : detailQuery.data?.packages) || [];
  const canFallback = !!cmsService && !pkgQuery.isLoading && servicePackages.length === 0;
  const cmsPackages = servicePackages.length > 0 ? servicePackages : canFallback ? fallbackPkgs : [];

  if (detailQuery.isLoading && !legacyService) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: T.paper }}>
        <div className="flex flex-col items-center gap-2">
          <div className="h-6 w-6 rounded-full border-2 animate-spin" style={{ borderColor: `${T.primary}33`, borderTopColor: T.primary }} />
          <p className="text-xs" style={{ color: T.muted }}>{bn ? "লোড হচ্ছে…" : "Loading…"}</p>
        </div>
      </div>
    );
  }

  if (!cmsService && !legacyService) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center" style={{ background: T.paper }}>
        <h1 className="font-['Fraunces',serif] text-xl font-medium mb-2" style={{ color: T.ink }}>Service Not Found</h1>
        <p className="text-sm mb-4" style={{ color: T.muted }}>The service you are looking for is not available.</p>
        <button onClick={() => navigate("/")} className="rounded-full px-5 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5" style={{ background: T.primary }}>Go Home</button>
      </div>
    );
  }

  if (cmsService) {
    return <CmsServiceDetail service={cmsService} packages={cmsPackages} selectedPackage={selectedPackage} setSelectedPackage={setSelectedPackage} addItem={addItem} navigate={navigate} t={t} bn={bn} />;
  }

  const service = legacyService!;
  const pkg = service.packages[selectedPackage];
  const handleAddToCart = () => {
    const p = service.packages[selectedPackage];
    addItem({ serviceSlug: service.slug, serviceTitle: service.title, serviceImage: service.image, packageName: p.name, packagePrice: p.price, originalPrice: p.originalPrice });
    toast.success(t("cart.added"));
  };

  return (
    <div className="min-h-screen pb-20 md:pb-0" style={{ background: T.paper }}>
      <Navbar />
      <div className="pt-[16px] md:pt-[32px]" />
      <div className="app-container py-3">
        <div className="font-['JetBrains_Mono',monospace] text-[9px] tracking-[.12em] uppercase flex items-center gap-1.5 mb-2" style={{ color: T.brassDark }}>
          <span className="w-1 h-1 rounded-full" style={{ background: T.brass }} />
          {bn ? "হোম সার্ভিস" : "Home services"}
        </div>
        <h1 className="font-['Fraunces',serif] font-medium text-xl" style={{ color: T.ink }}>{service.title}</h1>
        <img src={service.image} alt={service.title} className="w-full h-[180px] object-cover mt-3 rounded-[16px] shadow-sm" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4">
          {service.packages.map((p, i) => (
            <button key={i} onClick={() => setSelectedPackage(i)} className="p-3 rounded-[10px] border text-left transition-all" style={{ borderColor: selectedPackage === i ? T.primary : T.line, background: selectedPackage === i ? `linear-gradient(180deg,#fff,${T.primaryTint} 220%)` : T.card }}>
              {selectedPackage === i && <span className="inline-block -mt-0.5 mb-1 rounded-full px-1.5 py-0.5 text-[8px] font-semibold text-white" style={{ background: T.primary }}>{bn ? "নির্বাচিত" : "Selected"}</span>}
              <h3 className="font-semibold text-[13px]" style={{ color: T.ink }}>{p.name}</h3>
              <span className="font-['JetBrains_Mono',monospace] text-sm font-medium" style={{ color: T.primaryDark }}>৳{p.price}</span>
            </button>
          ))}
        </div>
      </div>
      <Footer />
      <StickyBottomCTA price={pkg.price} originalPrice={pkg.originalPrice} packageName={pkg.name} onAddToCart={handleAddToCart} />
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════
   CmsServiceDetail — compact version
   ═══════════════════════════════════════════════════════════════════════ */
const CmsServiceDetail = ({ service, packages, selectedPackage, setSelectedPackage, addItem, navigate, t, bn }: {
  service: CmsService; packages: any[]; selectedPackage: number;
  setSelectedPackage: (i: number) => void; addItem: any; navigate: any; t: any; bn: boolean;
}) => {
  injectFonts();
  const mysqlAuth = getMySqlAuth();
  const activeUserId = mysqlAuth?.user?.id;
  const { selectedCity } = useLocation();
  const serviceTitle = bn ? service.title : service.title_en || service.title;
  const features = Array.isArray(service.features) ? service.features : [];
  const cities = Array.isArray(service.available_cities) ? service.available_cities : [];
  const pkg = packages[selectedPackage] || packages[0];
  const commissionPercent = Number(service.commission_percent || 0);
  const platformFee = Math.round(Number(pkg?.price || 0) * (commissionPercent / 100));
  const { addItem: addRecentlyViewed, getItems: getRecentItems } = useRecentlyViewed();
  const heroImage = getServiceDisplayImage(service.slug, service.image_url);
  const minPrice = packages.length ? Math.min(...packages.map((p: any) => Number(p.price) || 0)) : null;
  const barcode = useBarcode();

  const seoDesc = bn ? `${serviceTitle} — পেশাদার, নির্ভরযোগ্য ও সাশ্রয়ী সার্ভিস।` : `${serviceTitle} — professional, reliable & affordable service.`;
  useSEO({ title: serviceTitle, description: seoDesc, canonical: `/service/${service.slug}`, image: heroImage, type: "product", jsonLd: { "@context": "https://schema.org", "@type": "Service", name: serviceTitle, description: seoDesc, image: heroImage, provider: { "@type": "Organization", name: "Shondhaan" }, areaServed: "Bangladesh", aggregateRating: service.rating ? { "@type": "AggregateRating", ratingValue: service.rating, reviewCount: service.total_reviews || 0 } : undefined, offers: minPrice ? { "@type": "Offer", price: minPrice, priceCurrency: "BDT", availability: "https://schema.org/InStock" } : undefined } });

  useEffect(() => { addRecentlyViewed({ slug: service.slug, title: service.title, titleEn: service.title_en || undefined, image: heroImage, rating: service.rating ?? 4.5 }); }, [service.slug, service.title, service.title_en, service.rating, heroImage, addRecentlyViewed]);

  const [bookingDate, setBookingDate] = useState<Date | undefined>();
  const [bookingTime, setBookingTime] = useState("");
  const [bookingName, setBookingName] = useState("");
  const [bookingPhone, setBookingPhone] = useState("");
  const [bookingAddress, setBookingAddress] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "reviews">("overview");
  const [useWalletPayment, setUseWalletPayment] = useState(false);
  const { data: walletData } = useUserWallet(activeUserId);
  const walletBalance = Number(walletData?.cash_balance || 0);

  const [searchParams] = useSearchParams();
  const [referralCode, setReferralCode] = useState("");
  const [referralValidation, setReferralValidation] = useState<{ valid: boolean; code?: string; referrer_name?: string; referred_reward_type?: string; referred_reward_amount?: number; remaining_uses?: number; reason?: string } | null>(null);
  const [validatingReferral, setValidatingReferral] = useState(false);
  const [referralSource, setReferralSource] = useState<"url" | "manual" | null>(null);

  useEffect(() => { const c = searchParams.get("ref") || searchParams.get("referral"); if (c?.trim()) { setReferralCode(c.trim().toUpperCase()); setReferralSource("url"); } }, [searchParams]);

  const timeSlots = [
    { label: "8:00", value: "08:00" }, { label: "9:00", value: "09:00" }, { label: "10:00", value: "10:00" }, { label: "11:00", value: "11:00" },
    { label: "12:00", value: "12:00" }, { label: "1:00", value: "13:00" }, { label: "2:00", value: "14:00" }, { label: "3:00", value: "15:00" },
  ];

  const recentlyViewed = getRecentItems(service.slug).slice(0, 6);

  const handleAddToCart = () => {
    if (!pkg) return;
    addItem({ serviceSlug: service.slug, serviceTitle, serviceImage: heroImage, packageName: pkg.name, packagePrice: pkg.price, originalPrice: pkg.original_price });
    toast.success(t("cart.added"));
  };

  const handleValidateReferral = useCallback(async () => {
    const code = referralCode.trim().toUpperCase();
    if (!code) return;
    setValidatingReferral(true); setReferralValidation(null);
    try {
      const res = await fetch(`${VITE_API_BASE_URL}/api/referral/validate/${encodeURIComponent(code)}`, { headers: getServiceApiHeaders() });
      const data = await res.json();
      setReferralValidation(data);
      if (!data.valid) toast.error(data.reason === "INVALID_FORMAT" ? (bn ? "অবৈধ কোড ফরম্যাট" : "Invalid code format") : data.reason === "NOT_FOUND_OR_EXPIRED" ? (bn ? "কোডটি পাওয়া যায়নি বা মেয়াদ উত্তীর্ণ" : "Code not found or expired") : data.reason === "MAX_USES_REACHED" ? (bn ? "সর্বোচ্চ ব্যবহার সীমা" : "Max uses reached") : (bn ? "রেফারেল কোড বৈধ নয়" : "Invalid referral code"));
      else toast.success(bn ? `✅ ${data.referrer_name} এর রেফারেল প্রয়োগ হয়েছে!` : `✅ Referral from ${data.referrer_name} applied!`);
    } catch { toast.error(bn ? "রেফারেল যাচাই ব্যর্থ" : "Validation failed"); } finally { setValidatingReferral(false); }
  }, [referralCode, bn]);

  const clearReferral = () => { setReferralCode(""); setReferralValidation(null); setReferralSource(null); };

  useEffect(() => { if (referralSource === "url" && referralCode) handleValidateReferral(); }, [referralSource, referralCode, handleValidateReferral]);

  const handleDirectBooking = async () => {
    if (!activeUserId) { toast.error(t("sd.loginFirst")); navigate("/auth"); return; }
    if (!bookingDate || !bookingTime || !bookingName.trim() || !bookingPhone.trim() || !bookingAddress.trim()) {
      if (!showBookingForm) { setShowBookingForm(true); return; }
      toast.error(t("sd.fillAll")); return;
    }
    if (!/^01[3-9]\d{8}$/.test(bookingPhone.trim())) { toast.error(t("sd.validPhone")); return; }
    if (!pkg) return;
    if (useWalletPayment && walletBalance < platformFee) { toast.error(bn ? "ওয়ালেটে পর্যাপ্ত ব্যালেন্স নেই" : "Insufficient wallet balance"); return; }

    setSubmitting(true);
    try {
      const paymentAmount = Math.round(platformFee || 0);
      let walletTxId: string | null = null;
      if (useWalletPayment) {
        const wr = await fetch(`${VITE_API_BASE_URL}/api/wallet/debit`, { method: "POST", headers: { "Content-Type": "application/json", ...(mysqlAuth?.token ? { Authorization: `Bearer ${mysqlAuth.token}` } : {}) }, body: JSON.stringify({ user_id: String(activeUserId), amount_cash: paymentAmount, amount_coins: 0, module: "SERVICE", reference_id: `booking-${Date.now()}`, description: `${serviceTitle} - ${pkg.name}` }) });
        const wj = await wr.json();
        if (!wr.ok || !wj.success) throw new Error(wj.error || "Wallet payment failed");
        walletTxId = wj.transaction_id;
      }
      const booking: any = await createBooking({ user_id: String(activeUserId), service_id: service.id || null, package_id: getSafePackageId(pkg?.id), service_slug: service.slug, service_title: serviceTitle, package_name: pkg.name, package_price: Number(pkg.price || 0), platform_fee_amount: paymentAmount, customer_name: bookingName.trim(), customer_phone: bookingPhone.trim(), customer_address: bookingAddress.trim(), booking_date: format(bookingDate, "yyyy-MM-dd"), booking_time: bookingTime, status: "pending", payment_status: useWalletPayment ? "paid" : "unpaid", payment_method: useWalletPayment ? "wallet" : "gateway", wallet_cash_used: useWalletPayment ? paymentAmount : 0, wallet_coins_used: 0, referral_code: referralValidation?.valid ? referralValidation.code : null, referred_reward_type: referralValidation?.valid ? referralValidation.referred_reward_type : null, referred_reward_amount: referralValidation?.valid ? referralValidation.referred_reward_amount : null });
      if (useWalletPayment) {
        await fetch(`${VITE_SERVICE_API_BASE_URL}/api/bookings/${booking.id}/payment-status`, { method: "PUT", headers: getServiceApiHeaders(), body: JSON.stringify({ payment_status: "paid", payment_method: "wallet", payment_transaction_id: walletTxId, wallet_cash_used: paymentAmount, wallet_coins_used: 0 }) });
        toast.success(bn ? "ওয়ালেট থেকে পেমেন্ট সফল!" : "Payment successful via wallet!");
        navigate("/my-bookings");
      } else {
        const payment = await startBookingPayment(booking.id, paymentAmount);
        if (!payment.checkout_url) throw new Error("No payment link");
        window.location.href = payment.checkout_url;
      }
    } catch (err: any) { toast.error(err.message || t("sd.bookingError")); } finally { setSubmitting(false); }
  };

  const benefits = [
    { icon: BadgeCheck, title: bn ? "প্রশিক্ষিত পেশাদার" : "Verified technicians", desc: bn ? "ব্যাকগ্রাউন্ড চেকড" : "Background-checked" },
    { icon: ShieldCheck, title: bn ? "সার্ভিস গ্যারান্টি" : "Service guarantee", desc: bn ? "বিনামূল্যে পুনঃসার্ভিস" : "Free re-visit" },
    { icon: Clock, title: bn ? "সময়মতো আগমন" : "On-time arrival", desc: bn ? "ETA ট্র্যাক করা হয়" : "Tracked ETA" },
    { icon: Award, title: bn ? "স্বচ্ছ মূল্য" : "Transparent pricing", desc: bn ? "লুকানো চার্জ নেই" : "No hidden charges" },
  ];

  const jobCode = useMemo(() => { const h = service.slug.slice(0, 6).toUpperCase().replace(/[^A-Z0-9]/g, "X").padEnd(6, "X"); return `SVC-${h}-BD`; }, [service.slug]);

  return (
    <div className="min-h-screen pb-20 pt-10 md:pt-2 md:pb-0" style={{ background: T.paper }}>
      <Navbar />
      <div className="pt-[14px] md:pt-[22px]" />

      <div className="app-container pt-3">
        {/* Eyebrow */}

        {/* Breadcrumb */}
        <Breadcrumb>
          <BreadcrumbList className="text-[10px]">
            <BreadcrumbItem><BreadcrumbLink asChild><Link to="/" className="flex items-center gap-0.5" style={{ color: T.muted }}><Home className="h-2.5 w-2.5" /></Link></BreadcrumbLink></BreadcrumbItem>
            <BreadcrumbSeparator><ChevronRight className="h-2 w-2" style={{ color: T.muted, opacity: 0.5 }} /></BreadcrumbSeparator>
            <BreadcrumbItem><BreadcrumbLink asChild><Link to="/all-services" style={{ color: T.muted }}>{bn ? "সকল সার্ভিস" : "All services"}</Link></BreadcrumbLink></BreadcrumbItem>
            <BreadcrumbSeparator><ChevronRight className="h-2 w-2" style={{ color: T.muted, opacity: 0.5 }} /></BreadcrumbSeparator>
            <BreadcrumbItem><BreadcrumbPage className="font-medium" style={{ color: T.ink }}>{serviceTitle}</BreadcrumbPage></BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {/* ── Hero ── */}
      <div className="app-container py-2">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="relative h-[160px] md:h-[200px] w-full overflow-hidden" style={{ borderRadius: T.radiusLg }}>
          <img src={heroImage} alt={serviceTitle} className="absolute inset-0 h-full w-full object-cover mix-blend-luminosity" style={{ opacity: 0.55 }} />
          <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(15,42,34,0.25) 0%, rgba(11,23,19,0.92) 100%)" }} />
          <div className="absolute bottom-0 left-0 right-0 p-3 md:p-4 z-10 text-white">
            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] tracking-wide mb-2" style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.25)" }}>
              {bn ? "সার্ভিস বিবরণ" : "Service details"}
            </span>
            <h1 className="font-['Fraunces',serif] font-medium text-[20px] md:text-[28px] leading-tight tracking-tight">{serviceTitle}</h1>
            <div className="mt-1.5 flex items-center gap-3 text-[11px]" style={{ color: "rgba(255,255,255,0.82)" }}>
              <span className="flex items-center gap-0.5 font-semibold" style={{ color: T.brass }}>
                <Star className="h-3 w-3 fill-current" /> {service.rating ?? 4.5}
              </span>
              <span>{(service.total_reviews ?? 0).toLocaleString()} {t("sd.reviews")}</span>
              <span>· {(service.total_orders ?? 0).toLocaleString("bn-BD")}+ {t("sd.orders")}</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* ── Grid: Content + Ticket ── */}
      <div className="app-container py-2 md:py-4">
        <div className="grid grid-cols-1 md:grid-cols-[1.65fr_1fr] gap-4 md:gap-6">

          {/* ─── Main Column ─── */}
          <div>
            {/* Tabs */}
            <div className="flex gap-4 mb-3" style={{ borderBottom: `1px solid ${T.line}` }}>
              {(["overview", "reviews"] as const).map((tab) => (
                <button key={tab} onClick={() => setActiveTab(tab)} className="relative pb-2.5 text-[12px] font-semibold bg-transparent border-none cursor-pointer transition-colors" style={{ color: activeTab === tab ? T.ink : T.muted }}>
                  {tab === "overview" ? (bn ? "বিবরণ" : "Overview") : `${bn ? "রিভিউ" : "Reviews"} (${service.total_reviews ?? 0})`}
                  <span className="absolute left-0 right-0 -bottom-px h-[1.5px] rounded-full transition-transform duration-300" style={{ background: T.brass, transform: activeTab === tab ? "scaleX(1)" : "scaleX(0)", transformOrigin: "left" }} />
                </button>
              ))}
            </div>

            {/* Overview */}
            {activeTab === "overview" && (
              <motion.div key="ov" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="space-y-5">
                {service.description && <p className="leading-[1.65] text-[12.5px]" style={{ color: T.inkSoft }}>{service.description}</p>}

                {features.length > 0 && (
                  <div>
                    <h3 className="font-['Fraunces',serif] font-medium text-[14px] mb-2" style={{ color: T.ink, letterSpacing: "-0.01em" }}>{bn ? "বৈশিষ্ট্য" : "Features"}</h3>
                    <div className="flex flex-wrap gap-1.5">
                      {features.map((f) => (
                        <span key={f} className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10.5px] font-medium" style={{ background: T.primaryTint, color: T.primaryDark }}>
                          <CheckCircle2 className="h-2.5 w-2.5" style={{ color: T.primary }} /> {f}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {packages.length > 0 && (
                  <div>
                    <h3 className="font-['Fraunces',serif] font-medium text-[14px] mb-2" style={{ color: T.ink, letterSpacing: "-0.01em" }}>{bn ? "প্যাকেজ" : "Packages"}</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {packages.map((p: any, i: number) => {
                        const sel = selectedPackage === i;
                        const disc = p.original_price ? Math.round(((p.original_price - p.price) / p.original_price) * 100) : 0;
                        return (
                          <button key={p.id || p.name} onClick={() => setSelectedPackage(i)} className="relative text-left border rounded-[10px] p-3 cursor-pointer transition-all duration-200" style={{ borderColor: sel ? T.primary : T.line, background: sel ? `linear-gradient(180deg,#fff,${T.primaryTint} 220%)` : T.card, boxShadow: sel ? `0 4px 12px hsl(var(--primary) / 0.1)` : "none", transform: sel ? "translateY(-1px)" : "none" }}>
                            {sel && <span className="absolute -top-[7px] left-2.5 rounded-full px-2 py-[2px] text-[8px] font-semibold text-white" style={{ background: T.primary }}>{bn ? "নির্বাচিত" : "Selected"}</span>}
                            {disc > 0 && <span className="absolute -top-[7px] right-2.5 rounded-full px-1.5 py-[2px] text-[8px] font-semibold text-white" style={{ background: T.brass }}>-{disc}%</span>}
                            <h4 className="text-[13px] font-semibold" style={{ color: T.ink }}>{p.name}</h4>
                            <div className="mt-0.5 flex items-baseline gap-1">
                              <span className="font-['JetBrains_Mono',monospace] text-[15px] font-medium" style={{ color: T.primaryDark }}>৳{p.price}</span>
                              {p.original_price && <span className="text-[10px] line-through" style={{ color: T.muted }}>৳{p.original_price}</span>}
                            </div>
                            {Array.isArray(p.features) && p.features.length > 0 && (
                              <ul className="mt-2 space-y-0.5 pt-2" style={{ borderTop: `1px dashed ${T.line}` }}>
                                {p.features.slice(0, 3).map((f: string) => (
                                  <li key={f} className="flex items-start gap-1 text-[10px]" style={{ color: T.inkSoft }}>
                                    <span style={{ color: T.primary, fontWeight: 700, fontSize: "9px" }}>✓</span> {f}
                                  </li>
                                ))}
                                {p.features.length > 3 && <li className="text-[9px] font-medium" style={{ color: T.primary }}>+{p.features.length - 3} {bn ? "আরও" : "more"}</li>}
                              </ul>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div>
                  <h3 className="font-['Fraunces',serif] font-medium text-[14px] mb-2" style={{ color: T.ink, letterSpacing: "-0.01em" }}>{bn ? "সুবিধা" : "Benefits"}</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {benefits.map((b, i) => (
                      <div key={i} className="flex items-start gap-2 border rounded-[10px] p-2.5" style={{ borderColor: T.line, background: T.card }}>
                        <div className="w-6 h-6 rounded-[7px] shrink-0 flex items-center justify-center" style={{ background: T.brassTint }}>
                          <b.icon className="w-3 h-3" style={{ color: T.brassDark }} />
                        </div>
                        <div className="min-w-0">
                          <h5 className="text-[10.5px] font-semibold leading-tight" style={{ color: T.ink }}>{b.title}</h5>
                          <p className="text-[9px] mt-0.5 leading-[1.4]" style={{ color: T.muted }}>{b.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="font-['Fraunces',serif] font-medium text-[14px] mb-2" style={{ color: T.ink, letterSpacing: "-0.01em" }}>{bn ? "পরিষেবা এলাকা" : "Service Area"}</h3>
                  {cities.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {cities.map((c) => (
                        <span key={c} className="inline-flex items-center gap-0.5 rounded-full px-2 py-1 text-[10px] font-medium" style={{ background: T.primaryTint, color: T.primaryDark }}>
                          <MapPin className="h-2.5 w-2.5" /> {c}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 rounded-[10px] border p-2.5" style={{ borderColor: T.line, background: T.card }}>
                      <CheckCircle2 className="h-3 w-3 shrink-0" style={{ color: T.primary }} />
                      <span className="text-[10px]" style={{ color: T.inkSoft }}>{bn ? "সারাদেশে পরিষেবা উপলব্ধ" : "Available nationwide"}</span>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Reviews */}
            {activeTab === "reviews" && (
              <motion.div key="rv" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
                <ReviewSection serviceSlug={service.slug} t={t} bn={bn} navigate={navigate} />
              </motion.div>
            )}
          </div>

          {/* ─── Ticket Sidebar ─── */}
          <div className="md:block">
            <div className="sticky top-4">
              <div className="border rounded-[16px] bg-white shadow-[0_8px_24px_rgba(24,38,32,0.08)]">
                {/* Top: Price Block */}
                <div className="p-3.5 pb-3">
                  <h2 className="font-['Fraunces',serif] font-medium text-[15px] mb-2.5" style={{ color: T.ink }}>{bn ? "বুকিং করুন" : "Book this visit"}</h2>
                  {pkg && (
                    <div className="rounded-[10px] p-3 flex justify-between items-end text-white" style={{ background: T.primaryDark }}>
                      <div>
                        <div className="text-[9px] tracking-[.08em] uppercase" style={{ color: "rgba(255,255,255,0.6)" }}>{bn ? "প্যাকেজ" : "Package"}</div>
                        <div className="text-[11px] font-semibold mt-0.5">{pkg.name}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-['JetBrains_Mono',monospace] text-[18px] font-medium">৳{pkg.price}</div>
                        {platformFee > 0 && <div className="text-[9px]" style={{ color: "rgba(255,255,255,0.65)" }}>{bn ? "প্লাটফর্ম ফি" : "Platform fee"} ৳{platformFee}</div>}
                      </div>
                    </div>
                  )}
                </div>

                {/* Perforation */}
                <div className="relative mx-4" style={{ borderTop: `1px dashed ${T.line}` }}>
                  <div className="absolute -left-[26px] -top-[7px] w-[14px] h-[14px] rounded-full" style={{ background: T.paper }} />
                  <div className="absolute -right-[26px] -top-[7px] w-[14px] h-[14px] rounded-full" style={{ background: T.paper }} />
                </div>

                {/* Body */}
                <div className="p-3.5 pt-3 space-y-3">
                  {/* Date */}
                  <div>
                    <label className="text-[10px] font-semibold block mb-1" style={{ color: T.inkSoft }}>{bn ? "ভিজিটের তারিখ" : "Visit date"}</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <button className="w-full flex items-center gap-1.5 rounded-[7px] border bg-white px-2.5 py-2 text-[11px] text-left cursor-pointer transition-colors" style={{ borderColor: T.line, color: T.ink }}>
                          <CalendarIcon className="h-3 w-3" style={{ color: T.brass }} />
                          {bookingDate ? format(bookingDate, "EEE, dd MMM") : (bn ? "তারিখ বেছে নিন" : "Pick date")}
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={bookingDate} onSelect={setBookingDate} disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))} initialFocus />
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Time Slots */}
                  <div>
                    <label className="text-[10px] font-semibold block mb-1" style={{ color: T.inkSoft }}>{bn ? "সময়" : "Time slot"}</label>
                    <div className="grid grid-cols-4 gap-1">
                      {timeSlots.map((slot) => (
                        <button key={slot.value} onClick={() => setBookingTime(slot.value)} className="rounded-md border bg-white px-0 py-[5px] text-[10px] font-medium font-['JetBrains_Mono',monospace] cursor-pointer transition-all duration-150" style={{ borderColor: bookingTime === slot.value ? T.primary : T.line, background: bookingTime === slot.value ? T.primary : "white", color: bookingTime === slot.value ? "white" : T.inkSoft }}>
                          {slot.label}
                        </button>
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
                          <p className="text-[8px] truncate" style={{ color: "#16a34a" }}>{bn ? `${referralValidation.referrer_name} এর রেফারেল` : `From ${referralValidation.referrer_name}`}{referralValidation.referred_reward_amount != null && referralValidation.referred_reward_amount > 0 && <span className="ml-0.5 font-bold">(+৳{referralValidation.referred_reward_amount})</span>}</p>
                        </div>
                      </div>
                      <button onClick={clearReferral} className="shrink-0 rounded p-1 cursor-pointer" style={{ color: "#16a34a" }} title={bn ? "সরান" : "Remove"}><Trash2 className="h-2.5 w-2.5" /></button>
                    </div>
                  ) : (
                    <div className="flex gap-1">
                      <input value={referralCode} onChange={(e) => { setReferralCode(e.target.value.toUpperCase()); setReferralSource("manual"); }} placeholder={bn ? "রেফারেল (ঐচ্ছিক)" : "Referral (optional)"} className="flex-1 rounded-[7px] border bg-white px-2 py-1.5 text-[10px] outline-none focus:ring-1" style={{ borderColor: T.line, color: T.ink, "--tw-ring-color": T.primary } as any} />
                      <button onClick={handleValidateReferral} disabled={validatingReferral || !referralCode.trim()} className="rounded-[7px] px-2 text-[9px] font-semibold text-white cursor-pointer disabled:opacity-40" style={{ background: T.primary }}>{validatingReferral ? "…" : bn ? "যাচাই" : "Go"}</button>
                    </div>
                  )}

                  {/* Expandable booking form */}
                  <AnimatePresence>
                    {showBookingForm && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                        <div className="space-y-2 pt-1">
                          <div className="relative">
                            <User className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3" style={{ color: T.muted }} />
                            <input value={bookingName} onChange={(e) => setBookingName(e.target.value)} placeholder={bn ? "নাম" : "Name"} className="w-full rounded-[7px] border bg-white pl-7 pr-2 py-2 text-[11px] outline-none focus:ring-1" style={{ borderColor: T.line, color: T.ink, "--tw-ring-color": T.primary } as any} />
                          </div>
                         <div className="relative">
                          <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                          <input
                            type="text"
                            inputMode="numeric"
                            value={bookingPhone}
                            onChange={(e) => setBookingPhone(e.target.value.replace(/[^0-9]/g, "").slice(0, 100))}
                            onKeyDown={(e) => {
                              const allowed = ["Backspace","Delete","ArrowLeft","ArrowRight","Tab","Home","End"];
                              if (allowed.includes(e.key)) return;
                              if (e.metaKey || e.ctrlKey) return;
                              if (!/^\d$/.test(e.key)) e.preventDefault();
                            }}
                            onPaste={(e) => {
                              const paste = e.clipboardData.getData("text").replace(/[^0-9]/g, "").slice(0, 100);
                              e.preventDefault();
                              setBookingPhone(paste);
                            }}
                            placeholder="01XXXXXXXXX"
                            maxLength={100}
                            className="w-full rounded-lg border border-input bg-background pl-7 pr-2 py-2 text-xs outline-none focus:ring-1 focus:ring-ring"
                          />
                        </div>
                          <div className="relative">
                            <Building2 className="absolute left-2.5 top-2.5 h-3 w-3" style={{ color: T.muted }} />
                            <textarea value={bookingAddress} onChange={(e) => setBookingAddress(e.target.value)} placeholder={bn ? "ঠিকানা" : "Address"} rows={2} className="w-full rounded-[7px] border bg-white pl-7 pr-2 py-2 text-[11px] outline-none focus:ring-1 resize-none" style={{ borderColor: T.line, color: T.ink, "--tw-ring-color": T.primary } as any} />
                          </div>
                          {activeUserId && walletBalance > 0 && (
                            <button type="button" onClick={() => setUseWalletPayment(!useWalletPayment)} className="flex items-center gap-2 w-full rounded-[7px] border p-2 text-left cursor-pointer" style={{ borderColor: useWalletPayment ? T.primary : T.line, background: useWalletPayment ? T.primaryTint : "white" }}>
                              <Wallet className="h-3 w-3" style={{ color: useWalletPayment ? T.primary : T.muted }} />
                              <div className="flex-1 min-w-0">
                                <p className="text-[10px] font-semibold" style={{ color: T.ink }}>{bn ? "ওয়ালেট পেমেন্ট" : "Pay with wallet"}</p>
                                <p className="text-[8px]" style={{ color: T.muted }}>৳{walletBalance.toLocaleString()}</p>
                              </div>
                              <span className="text-[10px] font-semibold" style={{ color: useWalletPayment ? T.primary : T.muted }}>{useWalletPayment ? "✓" : "→"}</span>
                            </button>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* CTA Buttons */}
                  <button onClick={handleDirectBooking} disabled={submitting} className="w-full flex items-center justify-center gap-1.5 rounded-[7px] py-2.5 text-[11px] font-semibold text-white cursor-pointer transition-all duration-150 disabled:opacity-60" style={{ background: T.primary, boxShadow: "0 4px 12px hsl(var(--primary) / 0.2)" }}>
                    {submitting ? (
                      <div className="h-3 w-3 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    ) : (
                      <CalendarCheck className="h-3 w-3" />
                    )}
                    {submitting ? (bn ? "প্রসেসিং…" : "Processing…") : (bn ? "বুকিং নিশ্চিত করুন" : "Confirm booking")}
                  </button>

                  <button onClick={handleAddToCart} className="w-full flex items-center justify-center gap-1.5 rounded-[7px] border py-2 text-[10.5px] font-semibold cursor-pointer transition-colors" style={{ borderColor: T.line, color: T.ink, background: "transparent" }}>
                    <ShoppingBag className="h-3 w-3" />
                    {bn ? "কার্টে যোগ করুন" : "Add to cart"}
                  </button>

                  {/* Job code + barcode */}
                  <div className="flex items-center justify-between pt-3 mt-1" style={{ borderTop: `1px solid ${T.line}` }}>
                    <span className="font-['JetBrains_Mono',monospace] text-[8px] tracking-[.04em]" style={{ color: T.muted }}>{jobCode}</span>
                    <div className="flex gap-[1.5px] h-3 items-end">
                      {barcode.map((h, i) => (
                        <span key={i} className="w-[1.5px]" style={{ height: `${h}px`, background: T.ink, opacity: 0.6 }} />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Recently Viewed ── */}
      {recentlyViewed.length > 0 && (
        <div className="app-container py-5">
          <h3 className="font-['Fraunces',serif] font-medium text-[14px] mb-3" style={{ color: T.ink, letterSpacing: "-0.01em" }}>{bn ? "সাম্প্রতিক দেখা" : "Recently viewed"}</h3>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {recentlyViewed.map((item) => (
              <Link key={item.slug} to={`/service/${item.slug}`} className="group rounded-[10px] border overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm" style={{ borderColor: T.line, background: T.card }}>
                <div className="aspect-square overflow-hidden">
                  <img src={item.image} alt={item.title} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" />
                </div>
                <div className="p-1.5">
                  <p className="text-[12px] font-semibold line-clamp-1" style={{ color: T.ink }}>{bn ? item.title : item.titleEn || item.title}</p>
                  <div className="flex items-center gap-0.5 mt-0.5">
                    <Star className="h-2 w-2 fill-current" style={{ color: T.brass }} />
                    <span className="text-[7px]" style={{ color: T.muted }}>{item.rating}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      <Footer />
      {pkg && <StickyBottomCTA price={pkg.price} originalPrice={pkg.original_price} packageName={pkg.name} onAddToCart={handleAddToCart} />}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════
   ReviewSection — compact
   ═══════════════════════════════════════════════════════════════════════ */
const ReviewSection = ({ serviceSlug, t, bn, navigate }: { serviceSlug: string; t: any; bn: boolean; navigate: any }) => {
  const mysqlAuth = getMySqlAuth();
  const userId = mysqlAuth?.user?.id;
  const [reviews, setReviews] = useState<ServiceReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await listServiceReviews(serviceSlug);
        setReviews(Array.isArray(res) ? res : res?.data ?? res?.reviews ?? []);
      } catch { /* */ } finally { setLoading(false); }
    })();
  }, [serviceSlug]);

  const handleSubmitReview = async () => {
    if (!userId) { toast.error(t("sd.loginFirst")); navigate("/auth"); return; }
    if (!newComment.trim()) { toast.error(bn ? "মন্তব্য লিখুন" : "Write a comment"); return; }
    setSubmitting(true);
    try {
      const created = await createReview({ service_slug: serviceSlug, user_id: String(userId), rating: newRating, comment: newComment.trim() });
      setReviews((prev) => [{ ...created, reviewer_name: mysqlAuth?.user?.name || "You", created_at: new Date().toISOString() }, ...prev]);
      setNewComment("");
      toast.success(bn ? "রিভিউ যোগ হয়েছে!" : "Review added!");
    } catch { toast.error(bn ? "রিভিউ জমা ব্যর্থ" : "Review submit failed"); } finally { setSubmitting(false); }
  };

  const handleDeleteReview = async (id: string) => {
    try {
      await deleteReview(id);
      setReviews((prev) => prev.filter((r) => r.id !== id));
      toast.success(bn ? "রিভিউ মুছে ফেলা হয়েছে" : "Review deleted");
    } catch { toast.error(bn ? "মুছে ফেলা ব্যর্থ" : "Delete failed"); }
  };

  const avgRating = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;

  return (
    <div className="space-y-4">
      {loading ? (
        <div className="py-8 text-center text-[11px]" style={{ color: T.muted }}>{bn ? "লোড হচ্ছে…" : "Loading…"}</div>
      ) : reviews.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-[11px]" style={{ color: T.muted }}>{bn ? "এখনো কোনো রিভিউ নেই" : "No reviews yet"}</p>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-3 p-2.5 rounded-[10px] border" style={{ borderColor: T.line, background: T.card }}>
            <div className="text-center">
              <div className="font-['JetBrains_Mono',monospace] text-xl font-medium" style={{ color: T.ink }}>{avgRating.toFixed(1)}</div>
              <div className="flex gap-px mt-0.5">{[1,2,3,4,5].map((s) => <Star key={s} className="h-2.5 w-2.5" style={{ color: s <= Math.round(avgRating) ? T.brass : T.line, fill: s <= Math.round(avgRating) ? T.brass : "none" }} />)}</div>
              <div className="text-[8px] mt-0.5" style={{ color: T.muted }}>{reviews.length}</div>
            </div>
          </div>

          <div className="space-y-2">
            {reviews.map((r) => (
              <div key={r.id} className="rounded-[10px] border p-2.5" style={{ borderColor: T.line, background: T.card }}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white" style={{ background: T.primary }}>{(r.reviewer_name || "U").charAt(0).toUpperCase()}</div>
                    <span className="text-[10px] font-semibold" style={{ color: T.ink }}>{r.reviewer_name || "User"}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="flex gap-px">{[1,2,3,4,5].map((s) => <Star key={s} className="h-2 w-2" style={{ color: s <= r.rating ? T.brass : T.line, fill: s <= r.rating ? T.brass : "none" }} />)}</div>
                    {String(r.user_id) === String(userId) && (
                      <button onClick={() => handleDeleteReview(r.id)} className="p-0.5 rounded cursor-pointer" style={{ color: T.muted }} title="Delete"><Trash2 className="h-2.5 w-2.5" /></button>
                    )}
                  </div>
                </div>
                {r.comment && <p className="text-[10.5px] leading-relaxed" style={{ color: T.inkSoft }}>{r.comment}</p>}
                {r.created_at && <p className="text-[8px] mt-1" style={{ color: T.muted }}>{format(new Date(r.created_at), "dd MMM yyyy")}</p>}
              </div>
            ))}
          </div>
        </>
      )}

      <div className="rounded-[10px] border p-2.5 space-y-2" style={{ borderColor: T.line, background: T.card }}>
        <h4 className="text-[11px] font-semibold" style={{ color: T.ink }}>{bn ? "রিভিউ লিখুন" : "Write a review"}</h4>
        <div className="flex gap-0.5">
          {[1,2,3,4,5].map((s) => (
            <button key={s} onClick={() => setNewRating(s)} className="cursor-pointer transition-transform hover:scale-110">
              <Star className="h-4 w-4" style={{ color: s <= newRating ? T.brass : T.line, fill: s <= newRating ? T.brass : "none" }} />
            </button>
          ))}
        </div>
        <textarea value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder={bn ? "আপনার অভিজ্ঞতা…" : "Share your experience…"} rows={2} className="w-full rounded-[7px] border bg-white px-2.5 py-2 text-[10.5px] outline-none focus:ring-1 resize-none" style={{ borderColor: T.line, color: T.ink, "--tw-ring-color": T.primary } as any} />
        <button onClick={handleSubmitReview} disabled={submitting} className="rounded-[7px] px-3 py-1.5 text-[10px] font-semibold text-white cursor-pointer disabled:opacity-60" style={{ background: T.primary }}>{submitting ? "…" : (bn ? "জমা দিন" : "Submit")}</button>
      </div>
    </div>
  );
};

export default ServiceDetail;

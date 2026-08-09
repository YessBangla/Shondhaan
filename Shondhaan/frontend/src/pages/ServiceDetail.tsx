import { useParams, useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Star,
  ChevronLeft,
  ShieldCheck,
  CheckCircle2,
  Phone,
  MapPin,
  ShoppingBag,
  Clock,
  Award,
  Sparkles,
  Users,
  BadgeCheck,
  Wrench,
  CalendarCheck,
  CalendarIcon,
  MessageSquare,
  Trash2,
  Share2,
  Facebook,
  Copy,
  Send,
  Home,
  ChevronRight,
  Briefcase,
} from "lucide-react";
import PrescriptionUpload from "@/components/PrescriptionUpload";
import LabTestTracker from "@/components/LabTestTracker";
import VideoProviderPreview from "@/components/VideoProviderPreview";
import AIReviewSummary from "@/components/AIReviewSummary";
import { useState, useEffect } from "react";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { getServiceBySlug, allServices } from "@/data/services";
import { getServiceImage } from "@/data/serviceImages";
import { serviceCategories } from "@/data/categories";
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

const SERVICE_API_BASE_URL = (
  INDIVIDUAL_API_BASE_URL || "http://localhost:3000"
).replace(/\/+$/, "");

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
  if (
    /^https?:\/\//i.test(imageUrl) ||
    imageUrl.startsWith("data:") ||
    imageUrl.startsWith("blob:")
  ) {
    return imageUrl;
  }
  if (
    imageUrl.startsWith("/assets/") ||
    imageUrl.startsWith("/src/") ||
    imageUrl.startsWith("/images/")
  ) {
    return imageUrl;
  }
  const path = imageUrl.startsWith("/") ? imageUrl : `/${imageUrl}`;
  return `${SERVICE_API_BASE_URL}${path}`;
};

const getServiceDisplayImage = (slug: string, imageUrl?: string | null) => {
  const backendImage = getBackendImageUrl(imageUrl);
  if (backendImage) return backendImage;
  return getServiceImage(slug, undefined);
};

const parseList = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value !== "string") return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
  } catch {
    // fallback
  }
  return value.split(",").map((item) => item.trim()).filter(Boolean);
};

const getPayload = (raw: any) =>
  raw?.data ?? raw?.service ?? raw?.item ?? raw?.result ?? raw;

const normalizeCmsService = (raw: any): CmsService | null => {
  const service = Array.isArray(raw) ? raw[0] : getPayload(raw);
  if (!service || typeof service !== "object") return null;
  return {
    ...service,
    id: String(service.id ?? ""),
    slug: String(service.slug ?? ""),
    title: String(service.title ?? service.name ?? ""),
    title_en: service.title_en ?? service.name_en ?? null,
    image_url: service.image_url ?? service.image ?? null,
    description: service.description ?? null,
    rating: Number(service.rating ?? 4.5),
    total_reviews: Number(service.total_reviews ?? service.reviews_count ?? 0),
    total_orders: Number(service.total_orders ?? service.orders_count ?? 0),
    commission_percent: Number(service.commission_percent ?? 0),
    platform_fee: Number(service.platform_fee ?? service.platform_fee_amount ?? 0),
    features: parseList(service.features),
    available_cities: parseList(service.available_cities),
    category_id:
      service.category_id === undefined || service.category_id === null
        ? null
        : String(service.category_id),
    is_active: service.is_active === false || service.is_active === 0 ? false : true,
    sort_order: Number(service.sort_order ?? 0),
    price: Number(service.price ?? 0),
  };
};

const normalizePackages = (raw: any): any[] => {
  const payload = getPayload(raw);
  const packages =
    raw?.packages ?? raw?.service_packages ?? raw?.data?.packages ?? raw?.data?.service_packages ?? payload?.packages ?? payload?.service_packages ?? (Array.isArray(payload) ? payload : []);

  if (!Array.isArray(packages)) return [];

  return packages.map((pkg) => ({
    ...pkg,
    id: pkg.id === undefined || pkg.id === null ? undefined : String(pkg.id),
    service_id: pkg.service_id === undefined || pkg.service_id === null ? undefined : String(pkg.service_id),
    name: pkg.name ?? pkg.package_name ?? "Basic Service",
    price: Number(pkg.price ?? 0),
    original_price:
      pkg.original_price === undefined || pkg.original_price === null || pkg.original_price === ""
        ? null
        : Number(pkg.original_price),
    features: parseList(pkg.features),
    sort_order: Number(pkg.sort_order ?? 0),
  }));
};

const makePricePackage = (service: CmsService | null): any[] => {
  const price = Number(service?.price ?? 0);
  if (!service || !Number.isFinite(price) || price <= 0) return [];
  return [
    {
      id: `${service.id || service.slug}-default-package`,
      service_id: service.id,
      name: "Basic Service",
      price,
      original_price: null,
      features: Array.isArray(service.features) ? service.features : [],
      sort_order: 0,
    },
  ];
};

const isRealUuid = (value?: string | null) =>
  !!value && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

const getSafePackageId = (value: unknown): string | null => {
  if (value === undefined || value === null) return null;
  const id = String(value).trim();
  if (!id || id.includes("default-package")) return null;
  return isRealUuid(id) ? id : null;
};

const useServiceBySlug = (slug?: string) =>
  useQuery({
    queryKey: ["service-detail-by-slug", slug],
    queryFn: async () => {
      const response = await fetch(
        `${SERVICE_API_BASE_URL}/api/services/${encodeURIComponent(slug || "")}`,
        { headers: getServiceApiHeaders() }
      );
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json?.message || "Service load failed");
      return {
        service: normalizeCmsService(json),
        packages: normalizePackages(json),
      };
    },
    enabled: !!slug,
    retry: 1,
  });

const useServicePackages = (serviceId?: string, enabled = true) =>
  useQuery({
    queryKey: ["service-detail-packages", serviceId],
    queryFn: async () => {
      const response = await fetch(
        `${SERVICE_API_BASE_URL}/api/packages?service_id=${encodeURIComponent(serviceId || "")}`,
        { headers: getServiceApiHeaders() }
      );
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json?.message || "Package load failed");
      return normalizePackages(json);
    },
    enabled: !!serviceId && enabled,
    retry: 1,
  });

const ServiceDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const { t, language } = useLanguage();
  const { selectedCity } = useLocation();
  const bn = language === "bn";
  const [selectedPackage, setSelectedPackage] = useState<number>(0);

  const serviceDetailQuery = useServiceBySlug(slug);
  const cmsService = serviceDetailQuery.data?.service || null;
  const servicePackagesQuery = useServicePackages(cmsService?.id);

  const legacyService = getServiceBySlug(slug || "");
  const fallbackPackages = makePricePackage(cmsService);

  const servicePackages =
    (servicePackagesQuery.data && servicePackagesQuery.data.length > 0
      ? servicePackagesQuery.data
      : serviceDetailQuery.data?.packages) || [];

  const canUseFallbackPackage =
    !!cmsService && !servicePackagesQuery.isLoading && servicePackages.length === 0;

  const cmsPackages =
    servicePackages.length > 0
      ? servicePackages
      : canUseFallbackPackage
      ? fallbackPackages
      : [];

  if (serviceDetailQuery.isLoading && !legacyService) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-sm text-muted-foreground animate-pulse">Loading service...</p>
      </div>
    );
  }

  if (!cmsService && !legacyService) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 text-center">
        <h1 className="font-heading text-2xl font-bold text-foreground mb-2">Service Not Found</h1>
        <p className="text-muted-foreground mb-6">The service you are looking for is not available.</p>
        <button onClick={() => navigate("/")} className="rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors">
          Go Home
        </button>
      </div>
    );
  }

  if (cmsService) {
    return (
      <CmsServiceDetail
        service={cmsService}
        packages={cmsPackages}
        categories={[]}
        allServices={[]}
        selectedPackage={selectedPackage}
        setSelectedPackage={setSelectedPackage}
        addItem={addItem}
        navigate={navigate}
        t={t}
        bn={bn}
        selectedCity={selectedCity}
      />
    );
  }

  // Legacy Service Fallback
  const service = legacyService!;
  const pkg = service.packages[selectedPackage];

  const handleAddToCart = () => {
    const p = service.packages[selectedPackage];
    addItem({
      serviceSlug: service.slug,
      serviceTitle: service.title,
      serviceImage: service.image,
      packageName: p.name,
      packagePrice: p.price,
      originalPrice: p.originalPrice,
    });
    toast.success(t("cart.added"));
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Navbar />
      <div className="pt-[22px] md:pt-[42px]" />
      
      <div className="app-container py-4">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild><Link to="/"><Home className="h-3.5 w-3.5" /></Link></BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator><ChevronRight className="h-3 w-3" /></BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbLink asChild><Link to="/all-services">All Services</Link></BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator><ChevronRight className="h-3 w-3" /></BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbPage className="text-xs">{service.title}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <div className="app-container py-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-8">
            <img src={service.image} alt={service.title} className="w-full h-[300px] object-cover rounded-2xl shadow-sm" />
            <h1 className="font-heading text-3xl font-bold text-foreground">{service.title}</h1>
            <p className="text-muted-foreground leading-relaxed">{service.description}</p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {service.packages.map((p, i) => (
                <button 
                  key={i} 
                  onClick={() => setSelectedPackage(i)}
                  className={cn(
                    "p-4 rounded-xl border text-left transition-all",
                    selectedPackage === i ? "border-primary ring-2 ring-primary bg-primary/5" : "border-border hover:border-primary/40"
                  )}
                >
                  <h3 className="font-bold text-lg">{p.name}</h3>
                  <p className="text-primary font-bold mt-1">৳{p.price}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="md:col-span-1">
            <div className="sticky top-24 rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
              <h2 className="font-heading text-xl font-bold">Book Now</h2>
              <button onClick={handleAddToCart} className="w-full rounded-lg bg-primary py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors">
                Add to Cart (৳{pkg.price})
              </button>
            </div>
          </div>
        </div>
      </div>
      <Footer />
      <StickyBottomCTA price={pkg.price} originalPrice={pkg.originalPrice} packageName={pkg.name} onAddToCart={handleAddToCart} />
    </div>
  );
};

const CmsServiceDetail = ({
  service,
  packages,
  categories,
  allServices,
  selectedPackage,
  setSelectedPackage,
  addItem,
  navigate,
  t,
  bn,
  selectedCity,
}: {
  service: CmsService;
  packages: any[];
  categories: any[];
  allServices: CmsService[];
  selectedPackage: number;
  setSelectedPackage: (i: number) => void;
  addItem: any;
  navigate: any;
  t: any;
  bn: boolean;
  selectedCity: string;
}) => {
  const mysqlAuth = getMySqlAuth();
  const mysqlUser = mysqlAuth?.user;
  const activeUserId = mysqlUser?.id;

  const serviceTitle = bn ? service.title : service.title_en || service.title;
  const category = categories.find((c: any) => c.id === service.category_id);
  const features = Array.isArray(service.features) ? service.features : [];
  const cities = Array.isArray(service.available_cities) ? service.available_cities : [];

  const pkg = packages[selectedPackage] || packages[0];
  const platformFee = Number(service.platform_fee || 0);

  const { addItem: addRecentlyViewed, getItems: getRecentItems } = useRecentlyViewed();
  const heroImage = getServiceDisplayImage(service.slug, service.image_url);

  const minPrice = packages.length ? Math.min(...packages.map((p: any) => Number(p.price) || 0)) : null;

  const seoDescription = bn 
    ? `${serviceTitle} — পেশাদার, নির্ভরযোগ্য ও সাশ্রয়ী সেবা।` 
    : `${serviceTitle} — professional, reliable & affordable service.`;

  useSEO({
    title: serviceTitle,
    description: seoDescription,
    canonical: `/service/${service.slug}`,
    image: heroImage,
    type: "product",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "Service",
      name: serviceTitle,
      description: seoDescription,
      image: heroImage,
      provider: { "@type": "Organization", name: "Shondhaan" },
      areaServed: "Bangladesh",
      aggregateRating: service.rating ? {
        "@type": "AggregateRating",
        ratingValue: service.rating,
        reviewCount: service.total_reviews || 0,
      } : undefined,
      offers: minPrice ? {
        "@type": "Offer",
        price: minPrice,
        priceCurrency: "BDT",
        availability: "https://schema.org/InStock",
      } : undefined,
    },
  });

  useEffect(() => {
    addRecentlyViewed({
      slug: service.slug,
      title: service.title,
      titleEn: service.title_en || undefined,
      image: heroImage,
      rating: service.rating ?? 4.5,
    });
  }, [service.slug, service.title, service.title_en, service.rating, heroImage, addRecentlyViewed]);

  const [bookingDate, setBookingDate] = useState<Date | undefined>();
  const [bookingTime, setBookingTime] = useState("");
  const [bookingName, setBookingName] = useState("");
  const [bookingPhone, setBookingPhone] = useState("");
  const [bookingAddress, setBookingAddress] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showBookingForm, setShowBookingForm] = useState(false);

  const timeSlots = [
    { label: "8:00", value: "08:00" }, { label: "9:00", value: "09:00" }, { label: "10:00", value: "10:00" }, { label: "11:00", value: "11:00" },
    { label: "12:00", value: "12:00" }, { label: "1:00", value: "13:00" }, { label: "2:00", value: "14:00" }, { label: "3:00", value: "15:00" },
    { label: "4:00", value: "16:00" }, { label: "5:00", value: "17:00" }, { label: "6:00", value: "18:00" }, { label: "7:00", value: "19:00" },
  ];

  const relatedServices = allServices
    .filter((s) => s.id !== service.id && s.is_active && s.category_id === service.category_id)
    .slice(0, 4);

  const handleAddToCart = () => {
    if (!pkg) return;
    addItem({
      serviceSlug: service.slug,
      serviceTitle,
      serviceImage: heroImage,
      packageName: pkg.name,
      packagePrice: pkg.price,
      originalPrice: pkg.original_price,
    });
    toast.success(t("cart.added"));
  };

  const handleDirectBooking = async () => {
    if (!activeUserId) {
      toast.error(t("sd.loginFirst"));
      navigate("/auth");
      return;
    }
    if (!bookingDate || !bookingTime || !bookingName.trim() || !bookingPhone.trim() || !bookingAddress.trim()) {
      toast.error(t("sd.fillAll"));
      return;
    }
    if (!/^01[3-9]\d{8}$/.test(bookingPhone.trim())) {
      toast.error(t("sd.validPhone"));
      return;
    }
    if (!pkg) return;

    setSubmitting(true);
    try {
      const createdBooking: any = await createBooking({
        user_id: String(activeUserId),
        service_id: service.id || null,
        package_id: getSafePackageId(pkg?.id),
        service_slug: service.slug,
        service_title: serviceTitle,
        package_name: pkg.name,
        package_price: Number(pkg.price || 0),
        platform_fee_amount: platformFee,
        customer_name: bookingName.trim(),
        customer_phone: bookingPhone.trim(),
        customer_address: bookingAddress.trim(),
        booking_date: format(bookingDate, "yyyy-MM-dd"),
        booking_time: bookingTime,
        status: "pending",
        payment_status: "unpaid",
      });

      const paymentAmount = Number(createdBooking?.platform_fee_amount || platformFee || 0);
      const payment = await startBookingPayment(createdBooking.id, paymentAmount);

      if (!payment.checkout_url) throw new Error("Payment link was not returned");
      
      window.location.href = payment.checkout_url;
    } catch (error: any) {
      console.error("Booking create error:", error);
      toast.error(error.message || t("sd.bookingError"));
    } finally {
      setSubmitting(false);
    }
  };

  const benefits = [
    { icon: BadgeCheck, title: bn ? "প্রশিক্ষিত পেশাদার" : "Trained Professionals", desc: bn ? "আমাদের সকল টেকনিশিয়ান প্রশিক্ষিত ও অভিজ্ঞ" : "All our technicians are trained & experienced" },
    { icon: ShieldCheck, title: bn ? "সেবা গ্যারান্টি" : "Service Guarantee", desc: bn ? "সেবায় সন্তুষ্ট না হলে পুনরায় বিনামূল্যে সেবা" : "Free re-service if not satisfied" },
    { icon: Clock, title: bn ? "সময়মতো সেবা" : "On-time Service", desc: bn ? "নির্ধারিত সময়ে টেকনিশিয়ান আসবে" : "Technician arrives at scheduled time" },
    { icon: Award, title: bn ? "স্বচ্ছ মূল্য" : "Transparent Pricing", desc: bn ? "কোনো লুকানো চার্জ নেই" : "No hidden charges" },
  ];

  const recentlyViewed = getRecentItems(service.slug).slice(0, 6);

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Navbar />
      <div className="pt-[20px] md:pt-[20px]" />

      <div className="app-container py-3">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild><Link to="/"><Home className="h-3.5 w-3.5" /></Link></BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator><ChevronRight className="h-3 w-3" /></BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbLink asChild><Link to="/all-services">{bn ? "সকল সেবা" : "All Services"}</Link></BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator><ChevronRight className="h-3 w-3" /></BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbPage className="text-xs">{serviceTitle}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {/* Hero Section - Aligned with app-container padding */}
      <div className="app-container">
        <div className="relative h-[150px] md:h-[250px] w-full overflow-hidden rounded-2xl shadow-sm">
          <img src={heroImage} alt={serviceTitle} className="absolute inset-0 h-full w-full object-cover" />
          <div className={`absolute inset-0 bg-gradient-to-t ${category?.color_overlay || "from-foreground/80 to-foreground/20"}`} />
          <div className="absolute bottom-0 left-0 right-0 p-5 md:p-8">
            {category && (
              <span className="inline-flex items-center rounded-full bg-background/20 backdrop-blur-sm px-3 py-1 text-xs font-medium text-background mb-2">
                {bn ? category.name : category.name_en || category.name}
              </span>
            )}
            <h1 className="font-heading text-3xl md:text-5xl font-bold text-background drop-shadow-sm">
              {serviceTitle}
            </h1>
            <div className="mt-3 flex items-center gap-4 text-background/90 text-sm">
              <span className="flex items-center gap-1">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                {service.rating ?? 4.5}
              </span>
              <span className="hidden sm:inline">({service.total_reviews ?? 0} {t("sd.reviews")})</span>
              <span>• {(service.total_orders ?? 0).toLocaleString("bn-BD")}+ {t("sd.orders")}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="app-container py-6 md:py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
          
          {/* Main Content */}
          <div className="md:col-span-2 space-y-10">
            
            {/* Description & Features */}
            <section className="space-y-4">
              <h2 className="font-heading text-xl font-bold text-foreground flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                {bn ? "সেবার বিবরণ" : "Service Description"}
              </h2>
              {service.description && (
                <p className="text-muted-foreground leading-relaxed text-sm md:text-base">
                  {service.description}
                </p>
              )}
              {features.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {features.map((f) => (
                    <span key={f} className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground">
                      <CheckCircle2 className="h-3.5 w-3.5 text-primary" /> {f}
                    </span>
                  ))}
                </div>
              )}
            </section>

            {/* Packages */}
            {packages.length > 0 && (
              <section className="space-y-4">
                <h2 className="font-heading text-xl font-bold text-foreground flex items-center gap-2">
                  <ShoppingBag className="h-5 w-5 text-primary" />
                  {bn ? "প্যাকেজ ও মূল্য" : "Packages & Pricing"}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {packages.map((p: any, i: number) => {
                    const pFeats = Array.isArray(p.features) ? p.features : [];
                    const isSelected = selectedPackage === i;
                    const discount = p.original_price ? Math.round(((p.original_price - p.price) / p.original_price) * 100) : 0;

                    return (
                      <button
                        key={p.id || p.name}
                        onClick={() => setSelectedPackage(i)}
                        className={cn(
                          "relative rounded-2xl border-2 p-5 text-left transition-all",
                          isSelected ? "border-primary bg-primary/5 shadow-md" : "border-border hover:border-primary/40 hover:shadow-sm"
                        )}
                      >
                        {isSelected && (
                          <span className="absolute -top-2.5 left-4 rounded-full bg-primary px-3 py-0.5 text-[10px] font-bold text-primary-foreground">
                            {bn ? "নির্বাচিত" : "Selected"}
                          </span>
                        )}
                        {discount > 0 && (
                          <span className="absolute -top-2.5 right-4 rounded-full bg-destructive px-2 py-0.5 text-[10px] font-bold text-destructive-foreground">
                            {discount}% OFF
                          </span>
                        )}
                        <h3 className="font-heading text-base font-semibold text-foreground">{p.name}</h3>
                        <div className="mt-2 flex items-baseline gap-2">
                          <span className="font-heading text-2xl font-bold text-primary">৳{p.price}</span>
                          {p.original_price && <span className="text-sm text-muted-foreground line-through">৳{p.original_price}</span>}
                        </div>
                        {pFeats.length > 0 && (
                          <ul className="mt-4 space-y-2 border-t border-border pt-3">
                            {pFeats.map((f: string) => (
                              <li key={f} className="flex items-start gap-2 text-xs text-muted-foreground">
                                <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary" /> {f}
                              </li>
                            ))}
                          </ul>
                        )}
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Benefits */}
            <section className="space-y-4">
              <h2 className="font-heading text-xl font-bold text-foreground flex items-center gap-2">
                <Award className="h-5 w-5 text-primary" />
                {bn ? "এই সেবা নিলে যা যা পাবেন" : "What You Get"}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {benefits.map((b, i) => (
                  <div key={i} className="flex items-start gap-3 rounded-xl border border-border bg-card p-4 transition-shadow hover:shadow-sm">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <b.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-foreground">{b.title}</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">{b.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Cities */}
            <section className="space-y-4">
              <h2 className="font-heading text-xl font-bold text-foreground flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                {bn ? "যেসব শহরে সেবাটি পাওয়া যায়" : "Available Cities"}
              </h2>
              {cities.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {cities.map((city) => (
                    <span key={city} className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary">
                      <MapPin className="h-3 w-3" /> {city}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-border bg-card p-4">
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    {bn ? "এই সেবাটি সারাদেশে পাওয়া যায়" : "Available nationwide"}
                  </p>
                </div>
              )}
            </section>

            {/* Reviews */}
            <ReviewSection serviceSlug={service.slug} t={t} bn={bn} navigate={navigate} />
          </div>

          {/* Sidebar */}
          <div className="hidden md:block md:col-span-1">
            <div className="sticky top-24 rounded-2xl border border-border bg-card p-6 shadow-lg space-y-5">
              <h2 className="font-heading text-xl font-bold text-foreground">{t("sd.bookNow")}</h2>
              
              {pkg && (
                <div className="rounded-xl bg-primary/5 border border-primary/20 p-4">
                  <p className="text-xs text-muted-foreground">{bn ? "নির্বাচিত প্যাকেজ" : "Selected Package"}</p>
                  <p className="font-semibold text-foreground text-sm mt-0.5">{pkg.name}</p>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="font-heading text-2xl font-bold text-primary">৳{pkg.price}</span>
                    {pkg.original_price && <span className="text-sm text-muted-foreground line-through">৳{pkg.original_price}</span>}
                  </div>
                  <div className="mt-3 rounded-lg border border-dashed border-border bg-background px-3 py-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Platform Fee</span>
                      <span className="font-semibold text-foreground">৳{platformFee.toLocaleString(bn ? "bn-BD" : "en-US")}</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground">{t("sd.selectDate")}</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <button className={cn("w-full flex items-center gap-2 rounded-lg border border-input bg-white px-3 py-2.5 text-sm text-left hover:bg-secondary", !bookingDate && "text-muted-foreground")}>
                      <CalendarIcon className="h-4 w-4 text-primary" />
                      {bookingDate ? format(bookingDate, "dd MMM yyyy") : bn ? "তারিখ বেছে নিন" : "Pick a date"}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={bookingDate} onSelect={setBookingDate} disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground">{t("sd.selectTime")}</label>
                <div className="grid grid-cols-3 gap-2">
                  {timeSlots.map((slot) => (
                    <button
                      key={slot.value}
                      onClick={() => setBookingTime(slot.value)}
                      className={cn(
                        "rounded-lg border px-2 py-1.5 text-[11px] font-medium transition-all",
                        bookingTime === slot.value ? "border-primary text-primary-foreground" : "border-border text-muted-foreground hover:border-primary/40"
                      )}
                    >
                      {slot.label}
                    </button>
                  ))}
                </div>
              </div>

              {!showBookingForm ? (
                <button
                  onClick={() => {
                    if (!activeUserId) return toast.error(t("sd.loginFirst")), navigate("/auth");
                    if (!bookingDate || !bookingTime) return toast.error(t("sd.selectDateFirst"));
                    setShowBookingForm(true);
                  }}
                  className="w-full rounded-lg py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 flex items-center justify-center gap-2"
                >
                  <CalendarCheck className="h-4 w-4" /> {t("sd.bookingConfirmBtn")}
                </button>
              ) : (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="space-y-2.5">
                  <input type="text" placeholder={t("sd.namePlaceholder")} value={bookingName} onChange={(e) => setBookingName(e.target.value)} className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-ring" />
                  <input type="tel" placeholder={t("sd.phonePlaceholder")} value={bookingPhone} onChange={(e) => setBookingPhone(e.target.value.replace(/\D/g, "").slice(0, 11))} className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-ring" />
                  <textarea placeholder={t("sd.addressPlaceholder")} value={bookingAddress} onChange={(e) => setBookingAddress(e.target.value)} rows={2} className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-ring resize-none" />
                  <button onClick={handleDirectBooking} disabled={submitting} className="w-full rounded-lg bg-primary py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                    {submitting ? "Submitting..." : bn ? "নিশ্চিত করে বুক করুন" : "Confirm & Book"}
                  </button>
                </motion.div>
              )}

              <button onClick={handleAddToCart} className="w-full rounded-lg border border-border py-2.5 text-sm font-medium text-foreground hover:bg-secondary flex items-center justify-center gap-2">
                <ShoppingBag className="h-4 w-4" /> {t("cart.addToCart")}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Related Services */}
      {relatedServices.length > 0 && (
        <div className="app-container pb-12">
          <h2 className="font-heading text-xl font-bold text-foreground mb-6">{t("sd.relatedServices")}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {relatedServices.map((rs) => (
              <RelatedThumb key={rs.id} service={rs} bn={bn} navigate={navigate} />
            ))}
          </div>
        </div>
      )}

      <Footer />

      {/* Mobile CTA */}
      {pkg && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/95 backdrop-blur-md px-4 py-3 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{pkg.name}</p>
              <p className="text-lg font-bold text-primary leading-tight">৳{pkg.price}</p>
            </div>
            <button
              onClick={() => {
                if (!activeUserId) {
                  toast.error(t("sd.loginFirst"));
                  navigate("/auth");
                  return;
                }
                setShowBookingForm(true);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="flex-1 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 flex items-center justify-center gap-2"
            >
              <CalendarCheck className="h-4 w-4" /> {t("sd.bookNow")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const RelatedThumb = ({ service, bn, navigate }: { service: CmsService; bn: boolean; navigate: any }) => {
  const { data: pkgs } = useServicePackages(service.id);
  const title = bn ? service.title : service.title_en || service.title;
  const cheapest = pkgs && pkgs.length > 0 ? pkgs.reduce((min, p) => (p.price < min.price ? p : min), pkgs[0]) : null;

  return (
    <button onClick={() => navigate(`/service/${service.slug}`)} className="group text-left">
      <div className="relative rounded-xl overflow-hidden border border-border bg-card aspect-[4/3]">
        <img
          src={getServiceDisplayImage(service.slug, service.image_url)}
          alt={title}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
        <div className="absolute top-2 right-2 flex items-center gap-1 rounded-full bg-background/90 backdrop-blur-sm px-2 py-0.5 shadow-sm">
          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
          <span className="text-[10px] font-bold text-foreground">{service.rating ?? 4.5}</span>
        </div>
      </div>
      <h3 className="mt-2 text-sm font-medium text-foreground line-clamp-2 group-hover:text-primary transition-colors">{title}</h3>
      {cheapest && (
        <p className="mt-0.5 text-xs text-primary font-bold">৳{cheapest.price}</p>
      )}
    </button>
  );
};

const ReviewSection = ({ serviceSlug, t, bn, navigate }: { serviceSlug: string; t: any; bn: boolean; navigate: any }) => {
  const mysqlAuth = getMySqlAuth();
  const activeUserId = mysqlAuth?.user?.id;
  const reviewerName = mysqlAuth?.user?.name || "User";

  const [reviews, setReviews] = useState<ServiceReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const data = await listServiceReviews(serviceSlug);
      setReviews(data || []);
    } catch (error) {
      setReviews([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReviews(); }, [serviceSlug]);

  const avgRating = reviews.length > 0 ? (reviews.reduce((sum, r) => sum + Number(r.rating || 0), 0) / reviews.length).toFixed(1) : "0";

  const handleSubmit = async () => {
    if (!activeUserId) {
      toast.error("Please login to leave a review");
      navigate("/auth");
      return;
    }
    if (rating === 0) return toast.error("Please select a rating");
    setSubmitting(true);
    try {
      await createReview({
        service_slug: serviceSlug,
        user_id: activeUserId,
        rating,
        reviewer_name: reviewerName,
        comment: comment.trim() || null,
      });
      toast.success("Review submitted!");
      setRating(0);
      setComment("");
      setShowForm(false);
      fetchReviews();
    } catch {
      toast.error("Failed to submit review");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-xl font-bold text-foreground flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          {bn ? "রিভিউ ও রেটিং" : "Ratings & Reviews"}
        </h2>
        <button onClick={() => setShowForm(!showForm)} className="rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20">
          {showForm ? "Cancel" : "Write a Review"}
        </button>
      </div>

      {showForm && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
          <div className="flex items-center gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <button key={i} onClick={() => setRating(i + 1)}>
                <Star className={`h-6 w-6 ${i < rating ? "fill-yellow-400 text-yellow-400" : "text-border"}`} />
              </button>
            ))}
          </div>
          <textarea placeholder="Share your experience..." value={comment} onChange={(e) => setComment(e.target.value)} rows={3} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring resize-none" />
          <button onClick={handleSubmit} disabled={submitting} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">
            {submitting ? "Submitting..." : "Submit Review"}
          </button>
        </div>
      )}

      {loading ? (
        <div className="text-sm text-muted-foreground py-4 text-center">Loading reviews...</div>
      ) : reviews.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-6 text-center">
          <p className="text-sm text-muted-foreground">No reviews yet. Be the first to review!</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-6 rounded-xl border border-border bg-card p-5">
            <div className="text-center">
              <p className="font-heading text-4xl font-bold text-foreground">{avgRating}</p>
              <div className="flex items-center gap-0.5 mt-1 justify-center">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className={`h-3 w-3 ${i < Math.round(Number(avgRating)) ? "fill-yellow-400 text-yellow-400" : "text-border"}`} />
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{reviews.length} Reviews</p>
            </div>
          </div>

          <div className="space-y-3">
            {reviews.map((review) => (
              <div key={review.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                      {review.reviewer_name?.charAt(0)?.toUpperCase() || "U"}
                    </div>
                    <div>
                      <span className="font-medium text-sm text-foreground">{review.reviewer_name}</span>
                      <p className="text-[10px] text-muted-foreground">{review.created_at ? format(new Date(review.created_at), "dd MMM yyyy") : ""}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`h-3 w-3 ${i < Number(review.rating || 0) ? "fill-yellow-400 text-yellow-400" : "text-border"}`} />
                    ))}
                  </div>
                </div>
                {review.comment && <p className="text-sm text-muted-foreground mt-1">{review.comment}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
};

export default ServiceDetail;
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

const parseList = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value !== "string") return [];

  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
  } catch {
    // fallback to comma separated string
  }

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
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
    features: parseList(service.features),
    available_cities: parseList(service.available_cities),
    category_id:
      service.category_id === undefined || service.category_id === null
        ? null
        : String(service.category_id),
    is_active:
      service.is_active === false || service.is_active === 0 ? false : true,
    sort_order: Number(service.sort_order ?? 0),
    price: Number(service.price ?? 0),
  };
};

const normalizePackages = (raw: any): any[] => {
  const payload = getPayload(raw);

  const packages =
    raw?.packages ??
    raw?.service_packages ??
    raw?.data?.packages ??
    raw?.data?.service_packages ??
    payload?.packages ??
    payload?.service_packages ??
    (Array.isArray(payload) ? payload : []);

  if (!Array.isArray(packages)) return [];

  return packages.map((pkg) => ({
    ...pkg,
    id: pkg.id === undefined || pkg.id === null ? undefined : String(pkg.id),
    service_id:
      pkg.service_id === undefined || pkg.service_id === null
        ? undefined
        : String(pkg.service_id),
    name: pkg.name ?? pkg.package_name ?? "Basic Service",
    price: Number(pkg.price ?? 0),
    original_price:
      pkg.original_price === undefined ||
      pkg.original_price === null ||
      pkg.original_price === ""
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
  !!value &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value
  );

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
        `${SERVICE_API_BASE_URL}/api/services/${encodeURIComponent(
          slug || ""
        )}`,
        { headers: getServiceApiHeaders() }
      );

      const json = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(json?.message || "Service load failed");
      }

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
        `${SERVICE_API_BASE_URL}/api/packages?service_id=${encodeURIComponent(
          serviceId || ""
        )}`,
        { headers: getServiceApiHeaders() }
      );

      const json = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(json?.message || "Package load failed");
      }

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
    !!cmsService &&
    !servicePackagesQuery.isLoading &&
    servicePackages.length === 0;

  const cmsPackages =
    servicePackages.length > 0
      ? servicePackages
      : canUseFallbackPackage
      ? fallbackPackages
      : [];

  if (serviceDetailQuery.isLoading && !legacyService) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-[44px] md:pt-[104px] flex items-center justify-center min-h-[60vh] px-4">
          <p className="text-sm text-muted-foreground">
            {bn ? "সেবা লোড হচ্ছে..." : "Loading service..."}
          </p>
        </div>
        <Footer />
      </div>
    );
  }

  if (!cmsService && !legacyService) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-[44px] md:pt-[104px] flex flex-col items-center justify-center min-h-[60vh] px-4">
          <h1 className="font-heading text-2xl font-bold text-foreground mb-2">
            {t("sd.notFound")}
          </h1>
          <p className="text-muted-foreground mb-4">{t("sd.notAvailable")}</p>
          <button
            onClick={() => navigate("/")}
            className="rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            {t("sd.goHome")}
          </button>
        </div>
        <Footer />
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

  const service = legacyService!;
  const category = serviceCategories.find((c) =>
    c.serviceSlugs.includes(service.slug)
  );
  const serviceTitle =
    language === "en" && service.titleEn ? service.titleEn : service.title;

  const relatedServices = (() => {
    const sameCategorySlugs = category
      ? category.serviceSlugs.filter((s) => s !== service.slug)
      : [];

    const related = sameCategorySlugs
      .map((s) => allServices.find((svc) => svc.slug === s))
      .filter(
        (s): s is NonNullable<typeof s> =>
          !!s && s.availableCities.includes(selectedCity)
      );

    if (related.length < 4) {
      const more = allServices
        .filter(
          (s) =>
            s.slug !== service.slug &&
            !related.some((r) => r.slug === s.slug) &&
            s.availableCities.includes(selectedCity)
        )
        .sort((a, b) => b.totalOrders - a.totalOrders)
        .slice(0, 4 - related.length);

      related.push(...more);
    }

    return related.slice(0, 4);
  })();

  const handleAddToCart = () => {
    const pkg = service.packages[selectedPackage];

    addItem({
      serviceSlug: service.slug,
      serviceTitle,
      serviceImage: service.image,
      packageName: pkg.name,
      packagePrice: pkg.price,
      originalPrice: pkg.originalPrice,
    });

    toast.success(t("cart.added"));
  };

  const pkg = service.packages[selectedPackage];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-[44px] md:pt-[104px]" />

      <div className="mx-auto max-w-5xl px-4 md:px-6 py-3">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/">
                  <Home className="h-3.5 w-3.5" />
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>

            <BreadcrumbSeparator>
              <ChevronRight className="h-3 w-3" />
            </BreadcrumbSeparator>

            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/all-services">
                  {bn ? "সকল সেবা" : "All Services"}
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>

            {category && (
              <>
                <BreadcrumbSeparator>
                  <ChevronRight className="h-3 w-3" />
                </BreadcrumbSeparator>
                <BreadcrumbItem>
                  <BreadcrumbLink className="text-xs">
                    {language === "en"
                      ? category.nameEn || category.name
                      : category.name}
                  </BreadcrumbLink>
                </BreadcrumbItem>
              </>
            )}

            <BreadcrumbSeparator>
              <ChevronRight className="h-3 w-3" />
            </BreadcrumbSeparator>

            <BreadcrumbItem>
              <BreadcrumbPage className="text-xs">
                {serviceTitle}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <div className="relative h-[200px] md:h-[340px] yess-wm">
        <img
          src={service.image}
          alt={serviceTitle}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div
          className={`absolute inset-0 bg-gradient-to-t ${
            category?.color.overlay || "from-foreground/70 to-foreground/20"
          }`}
        />
        <div className="absolute bottom-0 left-0 right-0 p-4 md:p-8 mx-auto max-w-5xl">
          <button
            onClick={() => navigate(-1)}
            className="mb-3 flex items-center gap-1 text-sm text-background/80 hover:text-background transition-colors"
          >
            <ChevronLeft className="h-4 w-4" /> {t("sd.goBack")}
          </button>

          <h1 className="font-heading text-2xl md:text-4xl font-bold text-background">
            {serviceTitle}
          </h1>

          <div className="mt-2 flex items-center gap-3 text-background/90 text-sm">
            <span className="flex items-center gap-1">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />{" "}
              {service.rating}
            </span>
            <span>
              ({service.totalReviews} {t("sd.reviews")})
            </span>
            <span>
              • {service.totalOrders.toLocaleString("bn-BD")}+ {t("sd.orders")}
            </span>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 md:px-6 py-6 md:py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-10">
          <div className="md:col-span-2 space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <p className="text-muted-foreground leading-relaxed">
                {service.description}
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                {service.features.map((f) => (
                  <span
                    key={f}
                    className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 text-primary" /> {f}
                  </span>
                ))}
              </div>

              <div className="mt-5">
                <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-primary" />{" "}
                  {t("sd.availableCities")}
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {service.availableCities.map((city) => (
                    <span
                      key={city}
                      className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
                    >
                      {city}
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>

            {service.slug === "medicine-delivery" && (
              <PrescriptionUpload bn={bn} />
            )}
            {service.slug === "lab-test" && <LabTestTracker bn={bn} />}

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <h2 className="font-heading text-lg font-bold text-foreground mb-4">
                {t("sd.packages")}
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {service.packages.map((p, i) => (
                  <button
                    key={p.name}
                    onClick={() => setSelectedPackage(i)}
                    className={`rounded-xl border p-4 text-left transition-all ${
                      selectedPackage === i
                        ? "border-primary bg-secondary ring-1 ring-primary"
                        : "border-border hover:border-primary/40"
                    }`}
                  >
                    <h3 className="font-heading text-sm font-semibold text-foreground">
                      {p.name}
                    </h3>

                    <div className="mt-2 flex items-baseline gap-2">
                      <span className="font-heading text-xl font-bold text-primary">
                        ৳{p.price}
                      </span>
                      {p.originalPrice && (
                        <span className="text-sm text-muted-foreground line-through">
                          ৳{p.originalPrice}
                        </span>
                      )}
                    </div>

                    <ul className="mt-3 space-y-1.5">
                      {p.features.map((f) => (
                        <li
                          key={f}
                          className="flex items-start gap-1.5 text-xs text-muted-foreground"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary" />{" "}
                          {f}
                        </li>
                      ))}
                    </ul>
                  </button>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h2 className="font-heading text-lg font-bold text-foreground mb-4">
                {t("sd.reviewsTitle")}
              </h2>

              <div className="space-y-4">
                {service.reviews.map((review) => (
                  <div
                    key={review.name + review.date}
                    className="rounded-xl border border-border bg-card p-4"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm text-foreground">
                        {review.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {review.date}
                      </span>
                    </div>

                    <div className="flex items-center gap-0.5 mb-2">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`h-3.5 w-3.5 ${
                            i < review.rating
                              ? "fill-yellow-400 text-yellow-400"
                              : "text-border"
                          }`}
                        />
                      ))}
                    </div>

                    <p className="text-sm text-muted-foreground">
                      {review.comment}
                    </p>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          <div className="md:col-span-1">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="sticky top-20 rounded-2xl border border-border bg-card p-5 shadow-sm"
            >
              <h2 className="font-heading text-lg font-bold text-foreground mb-1">
                {t("sd.bookNow")}
              </h2>
              <p className="text-xs text-muted-foreground mb-4">
                {t("sd.selected")}:{" "}
                <span className="font-semibold text-primary">
                  {pkg.name} — ৳{pkg.price}
                </span>
              </p>

              <button
                onClick={handleAddToCart}
                className="w-full rounded-lg bg-primary py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 flex items-center justify-center gap-2"
              >
                <ShoppingBag className="h-4 w-4" /> {t("cart.addToCart")}
              </button>

              <div className="mt-4 flex items-center gap-2 rounded-lg bg-secondary p-3">
                <ShieldCheck className="h-5 w-5 text-primary shrink-0" />
                <p className="text-xs text-muted-foreground">
                  {t("sd.guarantee")}
                </p>
              </div>

              <a
                href="tel:+8801XXXXXXXXX"
                className="mt-3 flex items-center justify-center gap-2 rounded-lg border border-border py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
              >
                <Phone className="h-4 w-4 text-primary" /> {t("sd.callUs")}
              </a>
            </motion.div>
          </div>
        </div>
      </div>

      {relatedServices.length > 0 && (
        <div className="mx-auto max-w-5xl px-4 md:px-6 pb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="font-heading text-lg md:text-xl font-bold text-foreground mb-4">
              {t("sd.relatedServices")}
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {relatedServices.map((rs) => (
                <button
                  key={rs.slug}
                  onClick={() => navigate(`/service/${rs.slug}`)}
                  className="group rounded-xl border border-border bg-card overflow-hidden text-left transition-shadow hover:shadow-md"
                >
                  <div className="relative aspect-[4/3] overflow-hidden">
                    <img
                      src={rs.image}
                      alt={
                        language === "en" && rs.titleEn ? rs.titleEn : rs.title
                      }
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-foreground/60 to-transparent p-2">
                      <span className="flex items-center gap-1 text-[10px] text-background font-medium">
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />{" "}
                        {rs.rating}
                      </span>
                    </div>
                  </div>

                  <div className="p-2.5">
                    <h3 className="text-xs font-semibold text-foreground line-clamp-2 leading-snug group-hover:text-primary transition-colors">
                      {language === "en" && rs.titleEn ? rs.titleEn : rs.title}
                    </h3>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      ৳{rs.packages[0].price} {t("as.from")}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        </div>
      )}

      <Footer />
      <div className="h-16 md:hidden" />
      <StickyBottomCTA
        price={service.packages[selectedPackage].price}
        originalPrice={service.packages[selectedPackage].originalPrice}
        packageName={service.packages[selectedPackage].name}
        onAddToCart={handleAddToCart}
      />
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
  const cities = Array.isArray(service.available_cities)
    ? service.available_cities
    : [];

  const pkg = packages[selectedPackage] || packages[0];

  const { addItem: addRecentlyViewed, getItems: getRecentItems } =
    useRecentlyViewed();

  const heroImage = getServiceImage(service.slug, service.image_url || undefined);

  const minPrice = packages.length
    ? Math.min(...packages.map((p: any) => Number(p.price) || 0))
    : null;

  const seoDescription = bn
    ? `${serviceTitle} — পেশাদার, নির্ভরযোগ্য ও সাশ্রয়ী সেবা। অনলাইনে বুক করুন${
        minPrice ? `, শুরু মাত্র ৳${minPrice} থেকে।` : "।"
      }`
    : `${serviceTitle} — professional, reliable & affordable service. Book online${
        minPrice ? `, starting from ৳${minPrice}.` : "."
      }`;

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
      provider: { "@type": "Organization", name: "Yess Service" },
      areaServed: "Bangladesh",
      aggregateRating: service.rating
        ? {
            "@type": "AggregateRating",
            ratingValue: service.rating,
            reviewCount: service.total_reviews || 0,
          }
        : undefined,
      offers: minPrice
        ? {
            "@type": "Offer",
            price: minPrice,
            priceCurrency: "BDT",
            availability: "https://schema.org/InStock",
          }
        : undefined,
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
  }, [
    service.slug,
    service.title,
    service.title_en,
    service.rating,
    heroImage,
    addRecentlyViewed,
  ]);

  const [bookingDate, setBookingDate] = useState<Date | undefined>();
  const [bookingTime, setBookingTime] = useState("");
  const [bookingName, setBookingName] = useState("");
  const [bookingPhone, setBookingPhone] = useState("");
  const [bookingAddress, setBookingAddress] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showBookingForm, setShowBookingForm] = useState(false);

  const timeSlots = [
    { label: `${t("sd.morning")} 8:00`, value: "08:00" },
    { label: `${t("sd.morning")} 9:00`, value: "09:00" },
    { label: `${t("sd.morning")} 10:00`, value: "10:00" },
    { label: `${t("sd.morning")} 11:00`, value: "11:00" },
    { label: `${t("sd.afternoon")} 12:00`, value: "12:00" },
    { label: `${t("sd.afternoon")} 1:00`, value: "13:00" },
    { label: `${t("sd.afternoon")} 2:00`, value: "14:00" },
    { label: `${t("sd.afternoon")} 3:00`, value: "15:00" },
    { label: `${t("sd.evening")} 4:00`, value: "16:00" },
    { label: `${t("sd.evening")} 5:00`, value: "17:00" },
    { label: `${t("sd.evening")} 6:00`, value: "18:00" },
    { label: `${t("sd.evening")} 7:00`, value: "19:00" },
  ];

  const relatedServices = (() => {
    const sameCategory = allServices
      .filter(
        (s) =>
          s.id !== service.id &&
          s.is_active &&
          s.category_id === service.category_id
      )
      .filter((s) => {
        const c = Array.isArray(s.available_cities)
          ? s.available_cities
          : [];
        return c.length === 0 || c.includes(selectedCity);
      });

    if (sameCategory.length >= 4) return sameCategory.slice(0, 4);

    const others = allServices
      .filter(
        (s) =>
          s.id !== service.id &&
          s.is_active &&
          s.category_id !== service.category_id &&
          !sameCategory.some((sc) => sc.id === s.id)
      )
      .filter((s) => {
        const c = Array.isArray(s.available_cities)
          ? s.available_cities
          : [];
        return c.length === 0 || c.includes(selectedCity);
      })
      .sort((a, b) => (b.total_orders ?? 0) - (a.total_orders ?? 0))
      .slice(0, 4 - sameCategory.length);

    return [...sameCategory, ...others].slice(0, 4);
  })();

  const handleAddToCart = () => {
    if (!pkg) return;

    addItem({
      serviceSlug: service.slug,
      serviceTitle,
      serviceImage: getServiceImage(service.slug, service.image_url || undefined),
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

    if (!bookingDate || !bookingTime) {
      toast.error(t("sd.selectDateFirst"));
      return;
    }

    if (!bookingName.trim() || !bookingPhone.trim() || !bookingAddress.trim()) {
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
        customer_name: bookingName.trim(),
        customer_phone: bookingPhone.trim(),
        customer_address: bookingAddress.trim(),
        booking_date: format(bookingDate, "yyyy-MM-dd"),
        booking_time: bookingTime,
        status: "pending",
        payment_status: "unpaid",
      });

      const paymentAmount = Number(
        createdBooking?.payment_amount ||
          createdBooking?.service_charge_amount ||
          pkg.price ||
          0
      );

      const payment = await startBookingPayment(createdBooking.id, paymentAmount);

      if (!payment.checkout_url) {
        throw new Error(
          bn ? "পেমেন্ট লিংক পাওয়া যায়নি" : "Payment link was not returned"
        );
      }

      toast.success(
        bn ? "পেমেন্ট পেজে নেওয়া হচ্ছে..." : "Redirecting to payment..."
      );
      window.location.href = payment.checkout_url;
    } catch (error: any) {
      console.error("Booking create error:", error);
      toast.error(error.message || t("sd.bookingError"));
    } finally {
      setSubmitting(false);
    }
  };

  const benefits = [
    {
      icon: BadgeCheck,
      title: bn ? "প্রশিক্ষিত পেশাদার" : "Trained Professionals",
      desc: bn
        ? "আমাদের সকল টেকনিশিয়ান প্রশিক্ষিত ও অভিজ্ঞ"
        : "All our technicians are trained & experienced",
    },
    {
      icon: ShieldCheck,
      title: bn ? "সেবা গ্যারান্টি" : "Service Guarantee",
      desc: bn
        ? "সেবায় সন্তুষ্ট না হলে পুনরায় বিনামূল্যে সেবা"
        : "Free re-service if not satisfied",
    },
    {
      icon: Clock,
      title: bn ? "সময়মতো সেবা" : "On-time Service",
      desc: bn
        ? "নির্ধারিত সময়ে টেকনিশিয়ান আসবে"
        : "Technician arrives at scheduled time",
    },
    {
      icon: Award,
      title: bn ? "স্বচ্ছ মূল্য" : "Transparent Pricing",
      desc: bn ? "কোনো লুকানো চার্জ নেই" : "No hidden charges",
    },
    {
      icon: Wrench,
      title: bn ? "আধুনিক যন্ত্রপাতি" : "Modern Equipment",
      desc: bn
        ? "সর্বাধুনিক সরঞ্জাম ব্যবহার করা হয়"
        : "Latest tools and equipment used",
    },
    {
      icon: Users,
      title: bn ? "২৪/৭ সাপোর্ট" : "24/7 Support",
      desc: bn
        ? "যেকোনো সময় কাস্টমার সাপোর্ট"
        : "Customer support available anytime",
    },
  ];

  const recentlyViewed = getRecentItems(service.slug).slice(0, 6);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-[44px] md:pt-[104px]" />

      <div className="mx-auto max-w-5xl px-4 md:px-6 py-3">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/">
                  <Home className="h-3.5 w-3.5" />
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>

            <BreadcrumbSeparator>
              <ChevronRight className="h-3 w-3" />
            </BreadcrumbSeparator>

            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/all-services">
                  {bn ? "সকল সেবা" : "All Services"}
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>

            {category && (
              <>
                <BreadcrumbSeparator>
                  <ChevronRight className="h-3 w-3" />
                </BreadcrumbSeparator>
                <BreadcrumbItem>
                  <BreadcrumbLink className="text-xs">
                    {bn ? category.name : category.name_en || category.name}
                  </BreadcrumbLink>
                </BreadcrumbItem>
              </>
            )}

            <BreadcrumbSeparator>
              <ChevronRight className="h-3 w-3" />
            </BreadcrumbSeparator>

            <BreadcrumbItem>
              <BreadcrumbPage className="text-xs">
                {serviceTitle}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <div className="relative h-[220px] md:h-[360px] yess-wm">
        <img
          src={getServiceImage(service.slug, service.image_url || undefined)}
          alt={serviceTitle}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div
          className={`absolute inset-0 bg-gradient-to-t ${
            category?.color_overlay || "from-foreground/70 to-foreground/20"
          }`}
        />
        <div className="absolute bottom-0 left-0 right-0 p-4 md:p-8 mx-auto max-w-5xl">
          <button
            onClick={() => navigate(-1)}
            className="mb-3 flex items-center gap-1 text-sm text-background/80 hover:text-background transition-colors"
          >
            <ChevronLeft className="h-4 w-4" /> {t("sd.goBack")}
          </button>

          {category && (
            <span className="inline-flex items-center rounded-full bg-background/20 backdrop-blur-sm px-3 py-1 text-xs font-medium text-background mb-2">
              {bn ? category.name : category.name_en || category.name}
            </span>
          )}

          <h1 className="font-heading text-2xl md:text-4xl font-bold text-background">
            {serviceTitle}
          </h1>

          <div className="mt-2 flex items-center gap-3 text-background/90 text-sm">
            <span className="flex items-center gap-1">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />{" "}
              {service.rating ?? 4.5}
            </span>
            <span>
              ({service.total_reviews ?? 0} {t("sd.reviews")})
            </span>
            <span>
              • {(service.total_orders ?? 0).toLocaleString("bn-BD")}+{" "}
              {t("sd.orders")}
            </span>
          </div>
        </div>
      </div>

      {["job-placement", "overseas-job", "skilled-worker", "daily-labor"].includes(
        service.slug
      ) && (
        <div className="mx-auto max-w-5xl px-4 md:px-6 pt-4">
          <Link
            to="/jobs"
            className="block rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 p-4 text-white hover:opacity-95 transition-opacity"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Briefcase className="h-6 w-6" />
                <div>
                  <p className="font-semibold text-sm">
                    {bn ? "চাকরির বিজ্ঞাপন দেখুন" : "Visit Job Portal"}
                  </p>
                  <p className="text-xs text-white/80">
                    {bn
                      ? "চাকরি খুঁজুন বা বিজ্ঞাপন দিন"
                      : "Find jobs or post vacancies"}
                  </p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5" />
            </div>
          </Link>
        </div>
      )}

      <div className="mx-auto max-w-5xl px-4 md:px-6 pt-4">
        <ShareButtons title={serviceTitle} slug={service.slug} t={t} />
      </div>

      <div className="mx-auto max-w-5xl px-4 md:px-6 py-6 md:py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-10">
          <div className="md:col-span-2 space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <h2 className="font-heading text-lg font-bold text-foreground flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                {bn ? "সেবার বিবরণ" : "Service Description"}
              </h2>

              {service.description && (
                <p className="text-muted-foreground leading-relaxed text-sm md:text-base">
                  {service.description}
                </p>
              )}

              {features.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {features.map((f) => (
                    <span
                      key={f}
                      className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 text-primary" /> {f}
                    </span>
                  ))}
                </div>
              )}
            </motion.div>

            {service.slug === "medicine-delivery" && (
              <PrescriptionUpload bn={bn} />
            )}
            {service.slug === "lab-test" && <LabTestTracker bn={bn} />}

            <VideoProviderPreview
              poster={service.image_url || undefined}
              rating={service.rating ?? 4.8}
              totalJobs={service.total_orders ?? 240}
            />

            {packages.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="space-y-4"
              >
                <h2 className="font-heading text-lg font-bold text-foreground flex items-center gap-2">
                  <ShoppingBag className="h-5 w-5 text-primary" />
                  {bn ? "প্যাকেজ ও মূল্য" : "Packages & Pricing"}
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {packages.map((p: any, i: number) => {
                    const pFeats = Array.isArray(p.features) ? p.features : [];
                    const isSelected = selectedPackage === i;
                    const discount = p.original_price
                      ? Math.round(
                          ((p.original_price - p.price) / p.original_price) *
                            100
                        )
                      : 0;

                    return (
                      <button
                        key={p.id || p.name}
                        onClick={() => setSelectedPackage(i)}
                        className={`relative rounded-xl border p-4 text-left transition-all ${
                          isSelected
                            ? "border-primary bg-primary/5 ring-2 ring-primary shadow-md"
                            : "border-border hover:border-primary/40 hover:shadow-sm"
                        }`}
                      >
                        {isSelected && (
                          <span className="absolute -top-2.5 left-3 rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-bold text-primary-foreground">
                            {bn ? "নির্বাচিত" : "Selected"}
                          </span>
                        )}

                        {discount > 0 && (
                          <span className="absolute -top-2.5 right-3 rounded-full bg-destructive px-2 py-0.5 text-[10px] font-bold text-destructive-foreground">
                            {discount}% {bn ? "ছাড়" : "OFF"}
                          </span>
                        )}

                        <h3 className="font-heading text-sm font-semibold text-foreground mt-1">
                          {p.name}
                        </h3>

                        <div className="mt-2 flex items-baseline gap-2">
                          <span className="font-heading text-xl font-bold text-primary">
                            ৳{p.price}
                          </span>
                          {p.original_price && (
                            <span className="text-sm text-muted-foreground line-through">
                              ৳{p.original_price}
                            </span>
                          )}
                        </div>

                        {pFeats.length > 0 && (
                          <ul className="mt-3 space-y-1.5 border-t border-border pt-3">
                            {pFeats.map((f: string) => (
                              <li
                                key={f}
                                className="flex items-start gap-1.5 text-xs text-muted-foreground"
                              >
                                <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary" />{" "}
                                {f}
                              </li>
                            ))}
                          </ul>
                        )}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="space-y-4"
            >
              <h2 className="font-heading text-lg font-bold text-foreground flex items-center gap-2">
                <Award className="h-5 w-5 text-primary" />
                {bn
                  ? "এই সেবা নিলে যা যা পাবেন"
                  : "What You Get With This Service"}
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {benefits.map((b, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:bg-secondary/50"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <b.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-foreground">
                        {b.title}
                      </h4>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {b.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="space-y-4"
            >
              <h2 className="font-heading text-lg font-bold text-foreground flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                {bn ? "যেসব শহরে সেবাটি পাওয়া যায়" : "Available In These Cities"}
              </h2>

              {cities.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {cities.map((city) => (
                    <span
                      key={city}
                      className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary"
                    >
                      <MapPin className="h-3 w-3" /> {city}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-border bg-card p-4">
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    {bn
                      ? "এই সেবাটি সারাদেশে পাওয়া যায়"
                      : "This service is available nationwide"}
                  </p>
                </div>
              )}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="space-y-4"
            >
              <h2 className="font-heading text-lg font-bold text-foreground flex items-center gap-2">
                <CalendarCheck className="h-5 w-5 text-primary" />
                {bn ? "কিভাবে বুকিং করবেন" : "How to Book"}
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  {
                    step: "১",
                    title: bn ? "প্যাকেজ নির্বাচন" : "Select Package",
                    desc: bn
                      ? "আপনার প্রয়োজন অনুযায়ী প্যাকেজ বেছে নিন"
                      : "Choose a package that suits your needs",
                  },
                  {
                    step: "২",
                    title: bn ? "কার্টে যুক্ত করুন" : "Add to Cart",
                    desc: bn
                      ? "কার্টে যুক্ত করে চেকআউটে যান"
                      : "Add to cart and proceed to checkout",
                  },
                  {
                    step: "৩",
                    title: bn ? "বুকিং কনফার্ম" : "Confirm Booking",
                    desc: bn
                      ? "সময় ও ঠিকানা দিয়ে বুকিং নিশ্চিত করুন"
                      : "Confirm with your time & address",
                  },
                ].map((item, i) => (
                  <div
                    key={i}
                    className="relative rounded-xl border border-border bg-card p-4 text-center"
                  >
                    <div className="mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                      {item.step}
                    </div>
                    <h4 className="text-sm font-semibold text-foreground">
                      {item.title}
                    </h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      {item.desc}
                    </p>
                  </div>
                ))}
              </div>
            </motion.div>

            <ReviewSection
              serviceSlug={service.slug}
              t={t}
              bn={bn}
              navigate={navigate}
            />
          </div>

          <div className="hidden md:block md:col-span-1">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="sticky top-20 rounded-2xl border border-border bg-card p-5 shadow-sm space-y-4"
            >
              <h2 className="font-heading text-lg font-bold text-foreground">
                {t("sd.bookNow")}
              </h2>

              {pkg && (
                <div className="rounded-lg bg-primary/5 border border-primary/20 p-3">
                  <p className="text-xs text-muted-foreground">
                    {bn ? "নির্বাচিত প্যাকেজ" : "Selected Package"}
                  </p>
                  <p className="font-semibold text-foreground text-sm mt-0.5">
                    {pkg.name}
                  </p>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="font-heading text-xl font-bold text-primary">
                      ৳{pkg.price}
                    </span>
                    {pkg.original_price && (
                      <span className="text-sm text-muted-foreground line-through">
                        ৳{pkg.original_price}
                      </span>
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground">
                  {t("sd.selectDate")}
                </label>

                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      className={cn(
                        "w-full flex items-center gap-2 rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-left transition-colors hover:bg-secondary",
                        !bookingDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="h-4 w-4 text-primary" />
                      {bookingDate
                        ? format(bookingDate, "dd MMM yyyy")
                        : bn
                        ? "তারিখ বেছে নিন"
                        : "Pick a date"}
                    </button>
                  </PopoverTrigger>

                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={bookingDate}
                      onSelect={setBookingDate}
                      disabled={(date) =>
                        date < new Date(new Date().setHours(0, 0, 0, 0))
                      }
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground">
                  {t("sd.selectTime")}
                </label>

                <div className="grid grid-cols-3 gap-1.5">
                  {timeSlots.map((slot) => (
                    <button
                      key={slot.value}
                      onClick={() => setBookingTime(slot.value)}
                      className={cn(
                        "rounded-lg border px-2 py-1.5 text-[11px] font-medium transition-all",
                        bookingTime === slot.value
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border text-muted-foreground hover:border-primary/40"
                      )}
                    >
                      {slot.label}
                    </button>
                  ))}
                </div>
              </div>

              {!showBookingForm ? (
                <div className="space-y-2">
                  <button
                    onClick={() => {
                      if (!activeUserId) {
                        toast.error(t("sd.loginFirst"));
                        navigate("/auth");
                        return;
                      }

                      if (!bookingDate || !bookingTime) {
                        toast.error(t("sd.selectDateFirst"));
                        return;
                      }

                      setShowBookingForm(true);
                    }}
                    className="w-full rounded-lg bg-primary py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 flex items-center justify-center gap-2"
                  >
                    <CalendarCheck className="h-4 w-4" />{" "}
                    {t("sd.bookingConfirmBtn")}
                  </button>

                  <button
                    onClick={handleAddToCart}
                    disabled={!pkg}
                    className="w-full rounded-lg border border-border py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <ShoppingBag className="h-4 w-4" /> {t("cart.addToCart")}
                  </button>
                </div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="space-y-2.5"
                >
                  <p className="text-[11px] font-medium text-muted-foreground px-0.5">
                    {bn
                      ? "ধাপ ৩ — যোগাযোগের তথ্য দিন"
                      : "Step 3 — Your contact details"}
                  </p>

                  <input
                    type="text"
                    autoComplete="name"
                    autoCapitalize="words"
                    autoCorrect="off"
                    enterKeyHint="next"
                    placeholder={t("sd.namePlaceholder")}
                    value={bookingName}
                    onChange={(e) => setBookingName(e.target.value)}
                    maxLength={100}
                    className="w-full rounded-lg border border-input bg-background px-3 py-3 text-base md:text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:border-primary transition"
                  />

                  <input
                    type="tel"
                    inputMode="numeric"
                    pattern="01[3-9][0-9]{8}"
                    autoComplete="tel"
                    enterKeyHint="next"
                    placeholder={t("sd.phonePlaceholder")}
                    value={bookingPhone}
                    onChange={(e) =>
                      setBookingPhone(
                        e.target.value.replace(/\D/g, "").slice(0, 11)
                      )
                    }
                    maxLength={11}
                    className="w-full rounded-lg border border-input bg-background px-3 py-3 text-base md:text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:border-primary transition"
                  />

                  {bookingPhone.length > 0 && bookingPhone.length < 11 && (
                    <p className="text-[11px] text-amber-600 px-0.5">
                      {bn
                        ? "১১ ডিজিটের সঠিক মোবাইল নম্বর দিন (01…)"
                        : "Enter a valid 11-digit mobile (01…)"}
                    </p>
                  )}

                  <textarea
                    placeholder={t("sd.addressPlaceholder")}
                    value={bookingAddress}
                    onChange={(e) => setBookingAddress(e.target.value)}
                    maxLength={300}
                    rows={2}
                    autoCapitalize="sentences"
                    autoComplete="street-address"
                    enterKeyHint="done"
                    className="w-full rounded-lg border border-input bg-background px-3 py-3 text-base md:text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:border-primary transition resize-none"
                  />

                  <button
                    onClick={handleDirectBooking}
                    disabled={submitting}
                    className="press w-full rounded-lg bg-primary py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <CalendarCheck className="h-4 w-4" />{" "}
                    {submitting
                      ? bn
                        ? "জমা দিচ্ছে…"
                        : "Submitting…"
                      : bn
                      ? "নিশ্চিত করে বুক করুন"
                      : "Confirm & book"}
                  </button>

                  <p className="text-[10.5px] text-muted-foreground text-center">
                    {bn
                      ? "বুকিং করলে আপনি আমাদের শর্তাবলী মেনে নিচ্ছেন।"
                      : "By booking you agree to our terms."}
                  </p>
                </motion.div>
              )}

              <div className="space-y-2">
                <div className="flex items-center gap-2 rounded-lg bg-secondary p-3">
                  <ShieldCheck className="h-5 w-5 text-primary shrink-0" />
                  <p className="text-xs text-muted-foreground">
                    {t("sd.guarantee")}
                  </p>
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-secondary p-3">
                  <Clock className="h-5 w-5 text-primary shrink-0" />
                  <p className="text-xs text-muted-foreground">
                    {bn ? "৩০ মিনিটে টেকনিশিয়ান" : "Technician within 30 min"}
                  </p>
                </div>
              </div>

              <a
                href="tel:+8801XXXXXXXXX"
                className="flex items-center justify-center gap-2 rounded-lg border border-border py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
              >
                <Phone className="h-4 w-4 text-primary" /> {t("sd.callUs")}
              </a>
            </motion.div>
          </div>
        </div>
      </div>

      {recentlyViewed.length > 0 && (
        <div className="mx-auto max-w-5xl px-4 md:px-6 pb-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="font-heading text-lg md:text-xl font-bold text-foreground mb-4 flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              {bn ? "সম্প্রতি দেখা সেবা" : "Recently Viewed Services"}
            </h2>

            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {recentlyViewed.map((rv) => (
                <button
                  key={rv.slug}
                  onClick={() => navigate(`/service/${rv.slug}`)}
                  className="shrink-0 w-[110px] md:w-[130px] group text-left"
                >
                  <div className="relative rounded-xl overflow-hidden border border-border bg-card aspect-square">
                    <img
                      src={rv.image || "/placeholder.svg"}
                      alt={bn ? rv.title : rv.titleEn || rv.title}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                      loading="lazy"
                    />
                    {rv.rating && (
                      <div className="absolute bottom-1 left-1 flex items-center gap-0.5 rounded-full bg-background/80 backdrop-blur-sm px-1.5 py-0.5">
                        <Star className="h-2.5 w-2.5 fill-yellow-400 text-yellow-400" />
                        <span className="text-[10px] font-medium text-foreground">
                          {rv.rating}
                        </span>
                      </div>
                    )}
                  </div>

                  <p className="mt-1.5 text-[11px] font-medium text-foreground line-clamp-2 text-center leading-tight group-hover:text-primary transition-colors">
                    {bn ? rv.title : rv.titleEn || rv.title}
                  </p>
                </button>
              ))}
            </div>
          </motion.div>
        </div>
      )}

      {relatedServices.length > 0 && (
        <div className="mx-auto max-w-5xl px-4 md:px-6 pb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="font-heading text-lg md:text-xl font-bold text-foreground mb-4">
              {t("sd.relatedServices")}
            </h2>
            <div className="flex gap-3 pb-2 flex-wrap pt-[120px] -mt-[120px]">
              {relatedServices.map((rs) => (
                <RelatedThumb
                  key={rs.id}
                  service={rs}
                  bn={bn}
                  navigate={navigate}
                />
              ))}
            </div>
          </motion.div>
        </div>
      )}

      <Footer />

      {pkg && (
        <div className="fixed bottom-[56px] left-0 right-0 z-40 border-t border-border bg-background/98 backdrop-blur-md px-4 py-2.5 md:hidden">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground truncate">
                {pkg.name}
              </p>
              <p className="text-base font-bold text-primary">৳{pkg.price}</p>
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
              className="shrink-0 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 flex items-center gap-2 active:scale-95"
            >
              <CalendarCheck className="h-4 w-4" /> {t("sd.bookNow")}
            </button>
          </div>
        </div>
      )}

      <div className="h-[120px] md:h-0 md:hidden" />

      {pkg && (
        <StickyBottomCTA
          price={pkg.price}
          originalPrice={pkg.original_price}
          packageName={pkg.name}
          onAddToCart={handleAddToCart}
          disabled={!pkg}
        />
      )}
    </div>
  );
};

const RelatedThumb = ({
  service,
  bn,
  navigate,
}: {
  service: CmsService;
  bn: boolean;
  navigate: any;
}) => {
  const [hovered, setHovered] = useState(false);
  const { data: pkgs } = useServicePackages(service.id);
  const title = bn ? service.title : service.title_en || service.title;
  const cheapest =
    pkgs && pkgs.length > 0
      ? pkgs.reduce((min, p) => (p.price < min.price ? p : min), pkgs[0])
      : null;

  return (
    <button
      onClick={() => navigate(`/service/${service.slug}`)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative shrink-0 w-[100px] md:w-[120px] group"
    >
      <div className="relative rounded-xl overflow-hidden border border-border bg-card aspect-square">
        <img
          src={getServiceImage(service.slug, service.image_url || undefined)}
          alt={title}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
      </div>

      <p className="mt-1.5 text-[11px] font-medium text-foreground line-clamp-2 text-center leading-tight group-hover:text-primary transition-colors">
        {title}
      </p>

      {hovered && (
        <motion.div
          initial={{ opacity: 0, y: 8, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.15 }}
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-[200px] rounded-xl border border-border bg-card shadow-lg p-3 pointer-events-none"
        >
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 rotate-45 w-2.5 h-2.5 bg-card border-r border-b border-border" />
          <h4 className="text-xs font-bold text-foreground line-clamp-2">
            {title}
          </h4>

          <div className="flex items-center gap-1 mt-1">
            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
            <span className="text-[11px] font-medium text-foreground">
              {service.rating ?? 4.5}
            </span>
            <span className="text-[10px] text-muted-foreground">
              ({service.total_reviews ?? 0})
            </span>
          </div>

          {cheapest && (
            <div className="mt-1.5 flex items-baseline gap-1.5">
              <span className="text-sm font-bold text-primary">
                ৳{cheapest.price}
              </span>
              {cheapest.original_price &&
                cheapest.original_price > cheapest.price && (
                  <>
                    <span className="text-[10px] text-muted-foreground line-through">
                      ৳{cheapest.original_price}
                    </span>
                    <span className="text-[10px] font-bold text-destructive">
                      {Math.round(
                        ((cheapest.original_price - cheapest.price) /
                          cheapest.original_price) *
                          100
                      )}
                      % OFF
                    </span>
                  </>
                )}
            </div>
          )}

          {(service.total_orders ?? 0) > 0 && (
            <p className="text-[10px] text-muted-foreground mt-1">
              {(service.total_orders ?? 0).toLocaleString("bn-BD")}+ orders
            </p>
          )}
        </motion.div>
      )}
    </button>
  );
};

const ReviewSection = ({
  serviceSlug,
  t,
  bn,
  navigate,
}: {
  serviceSlug: string;
  t: any;
  bn: boolean;
  navigate: any;
}) => {
  const mysqlAuth = getMySqlAuth();
  const mysqlUser = mysqlAuth?.user;
  const activeUserId = mysqlUser?.id;
  const reviewerName =
    mysqlUser?.name || mysqlUser?.email?.split("@")[0] || "User";

  const [reviews, setReviews] = useState<ServiceReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const data = await listServiceReviews(serviceSlug);
      setReviews(data || []);
    } catch (error) {
      console.error("Fetch service reviews error:", error);
      toast.error(t("rv.error"));
      setReviews([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [serviceSlug]);

  const avgRating =
    reviews.length > 0
      ? (
          reviews.reduce((sum, r) => sum + Number(r.rating || 0), 0) /
          reviews.length
        ).toFixed(1)
      : "0";

  const ratingDist = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => Number(r.rating) === star).length,
    pct:
      reviews.length > 0
        ? Math.round(
            (reviews.filter((r) => Number(r.rating) === star).length /
              reviews.length) *
              100
          )
        : 0,
  }));

  const handleSubmit = async () => {
    if (!activeUserId) {
      toast.error(t("rv.loginFirst"));
      navigate("/auth");
      return;
    }

    if (rating === 0) {
      toast.error(t("rv.selectRating"));
      return;
    }

    setSubmitting(true);

    try {
      await createReview({
        service_slug: serviceSlug,
        user_id: activeUserId,
        rating,
        reviewer_name: reviewerName,
        comment: comment.trim() || null,
      });

      toast.success(t("rv.success"));
      setRating(0);
      setComment("");
      setShowForm(false);
      fetchReviews();
    } catch (error) {
      console.error("Create service review error:", error);
      toast.error(t("rv.error"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteReview(id);
      toast.success(t("rv.deleted"));
      fetchReviews();
    } catch (error) {
      console.error("Delete service review error:", error);
      toast.error(t("rv.error"));
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="space-y-5"
    >
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-lg font-bold text-foreground flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          {t("rv.title")}
        </h2>

        <button
          onClick={() => {
            if (!activeUserId) {
              toast.error(t("rv.loginFirst"));
              navigate("/auth");
              return;
            }

            setShowForm(!showForm);
          }}
          className="rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/20"
        >
          {t("rv.writeReview")}
        </button>
      </div>

      {reviews.length > 0 && (
        <>
          <div className="flex items-start gap-6 rounded-xl border border-border bg-card p-4">
            <div className="text-center">
              <p className="font-heading text-3xl font-bold text-foreground">
                {avgRating}
              </p>

              <div className="flex items-center gap-0.5 mt-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`h-3.5 w-3.5 ${
                      i < Math.round(Number(avgRating))
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-border"
                    }`}
                  />
                ))}
              </div>

              <p className="text-xs text-muted-foreground mt-1">
                {reviews.length}
                {t("rv.totalReviews")}
              </p>
            </div>

            <div className="flex-1 space-y-1">
              {ratingDist.map((d) => (
                <div key={d.star} className="flex items-center gap-2 text-xs">
                  <span className="w-3 text-muted-foreground">{d.star}</span>
                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                  <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
                    <div
                      className="h-full rounded-full bg-yellow-400 transition-all"
                      style={{ width: `${d.pct}%` }}
                    />
                  </div>
                  <span className="w-6 text-right text-muted-foreground">
                    {d.count}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <AIReviewSummary
            reviews={reviews.map((r) => ({
              rating: Number(r.rating || 0),
              comment: r.comment,
            }))}
            productName={serviceSlug}
            cacheKey={serviceSlug}
          />
        </>
      )}

      {showForm && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3"
        >
          <p className="text-sm font-semibold text-foreground">
            {t("rv.yourRating")}
          </p>

          <div className="flex items-center gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <button
                key={i}
                onMouseEnter={() => setHoverRating(i + 1)}
                onMouseLeave={() => setHoverRating(0)}
                onClick={() => setRating(i + 1)}
                className="transition-transform hover:scale-110"
              >
                <Star
                  className={`h-7 w-7 ${
                    (hoverRating || rating) > i
                      ? "fill-yellow-400 text-yellow-400"
                      : "text-border"
                  }`}
                />
              </button>
            ))}
          </div>

          <textarea
            placeholder={t("rv.yourComment")}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={500}
            rows={3}
            className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-ring resize-none"
          />

          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {submitting ? t("rv.submitting") : t("rv.submit")}
          </button>
        </motion.div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="rounded-xl border border-border bg-card p-4 animate-pulse"
            >
              <div className="h-4 w-24 bg-muted rounded mb-2" />
              <div className="h-3 w-full bg-muted rounded" />
            </div>
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-6 text-center">
          <MessageSquare className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">{t("rv.noReviews")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map((review) => (
            <div
              key={review.id}
              className="rounded-xl border border-border bg-card p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {review.reviewer_name?.charAt(0)?.toUpperCase() || "U"}
                  </div>

                  <div>
                    <span className="font-medium text-sm text-foreground">
                      {review.reviewer_name}
                    </span>
                    <p className="text-[10px] text-muted-foreground">
                      {review.created_at
                        ? format(new Date(review.created_at), "dd MMM yyyy")
                        : ""}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`h-3 w-3 ${
                          i < Number(review.rating || 0)
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-border"
                        }`}
                      />
                    ))}
                  </div>

                  {String(activeUserId) === String(review.user_id) && (
                    <button
                      onClick={() => handleDelete(review.id)}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {review.comment && (
                <p className="text-sm text-muted-foreground mt-1">
                  {review.comment}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
};

const ShareButtons = ({
  title,
  slug,
  t,
}: {
  title: string;
  slug: string;
  t: any;
}) => {
  const url = `${window.location.origin}/service/${slug}`;
  const text = title;

  const shareLinks = [
    {
      name: "Facebook",
      icon: Facebook,
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
        url
      )}`,
      className:
        "bg-[#1877F2]/10 text-[#1877F2] hover:bg-[#1877F2] hover:text-white",
    },
    {
      name: "WhatsApp",
      icon: Send,
      href: `https://wa.me/?text=${encodeURIComponent(text + " " + url)}`,
      className:
        "bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366] hover:text-white",
    },
    {
      name: "X",
      icon: Share2,
      href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(
        text
      )}&url=${encodeURIComponent(url)}`,
      className:
        "bg-foreground/10 text-foreground hover:bg-foreground hover:text-background",
    },
  ];

  const handleCopy = () => {
    navigator.clipboard.writeText(url);
    toast.success(t("sd.copyLink"));
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-medium text-muted-foreground mr-1">
        {t("sd.share")}:
      </span>

      {shareLinks.map((link) => (
        <a
          key={link.name}
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          className={`inline-flex items-center justify-center rounded-full w-8 h-8 transition-all duration-200 ${link.className}`}
          title={link.name}
        >
          <link.icon className="h-4 w-4" />
        </a>
      ))}

      <button
        onClick={handleCopy}
        className="inline-flex items-center justify-center rounded-full w-8 h-8 bg-secondary text-muted-foreground hover:bg-primary hover:text-primary-foreground transition-all duration-200"
        title="Copy link"
      >
        <Copy className="h-4 w-4" />
      </button>
    </div>
  );
};

export default ServiceDetail;
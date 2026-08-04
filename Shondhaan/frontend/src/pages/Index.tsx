import { useMemo, useState, useEffect } from "react";
import { useSEO } from "@/hooks/useSEO";
import Navbar from "@/components/Navbar";
import { getServiceImage } from "@/data/serviceImages";
import HeroSection from "@/components/HeroSection";
import CategoryBar from "@/components/CategoryBar";
import MobilePromoBanner from "@/components/MobilePromoBanner";
import ServiceSection from "@/components/ServiceSection";
import WhyChooseUs from "@/components/WhyChooseUs";
import HowItWorks from "@/components/HowItWorks";
import Testimonials from "@/components/Testimonials";
import AppDownload from "@/components/AppDownload";
import RequestService from "@/components/RequestService";
import TrackingSearch from "@/components/TrackingSearch";
import Footer from "@/components/Footer";
import ScrollButtons from "@/components/ScrollButtons";
import ServiceChatFloatingButton from "@/components/ServiceChatFloatingButton";
import { useLocation } from "@/contexts/LocationContext";
import { useLanguage } from "@/contexts/LanguageContext";
import MobileServiceSkeleton from "@/components/MobileServiceSkeleton";
import ServiceCardSkeleton from "@/components/ServiceCardSkeleton";
import PullToRefreshIndicator from "@/components/PullToRefreshIndicator";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { useQueryClient } from "@tanstack/react-query";
import ForYouSection from "@/components/ForYouSection";
import { INDIVIDUAL_API_BASE_URL } from "@/lib/api";

type Service = {
  id: string;
  slug: string;
  title: string;
  title_en?: string;
  image_url?: string;
  description?: string;
  rating?: string | number;
  total_reviews?: number;
  total_orders?: number;
  commission_percent?: string;
  features?: string[] | string;
  available_cities?: string[] | string;
  category_id?: string | null;
  is_active?: boolean | number | string | null;
  sort_order?: number;
  price?: string | number;
};

type Category = {
  id: string;
  name: string;
  name_en?: string;
  title?: string;
  title_en?: string;
};

type HomepageSection = {
  id: string | number;
  section_key: string;
  title_bn: string;
  title_en?: string;
  service_slugs: string[] | string;
  sort_order?: number;
  is_active?: boolean | number | string | null;
};

type FormattedService = {
  id: string;
  title: string;
  image: string;
  slug: string;
  rating: number;
  total_reviews: number;
  total_orders: number;
  description: string;
  features: string[];
  price: number;
  commission_percent: string;
};

const API_BASE = `${(INDIVIDUAL_API_BASE_URL).replace(
  /\/+$/,
  ""
)}/api`;

const parseJsonArray = (value: unknown): string[] => {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value.map(String).filter(Boolean);
  }

  if (typeof value === "string") {
    const splitList = () =>
      value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed)
        ? parsed.map(String).filter(Boolean)
        : splitList();
    } catch {
      return splitList();
    }
  }

  return [];
};

const normalizeCity = (value: unknown) => {
  const text = String(value || "").trim().toLowerCase();

  const cityMap: Record<string, string> = {
    ঢাকা: "dhaka",
    dhaka: "dhaka",
    চট্টগ্রাম: "chittagong",
    chittagong: "chittagong",
    chattogram: "chittagong",
    sylhet: "sylhet",
    সিলেট: "sylhet",
    khulna: "khulna",
    খুলনা: "khulna",
  };

  return cityMap[text] || text;
};
const normalizeSlug = (value: unknown) =>
  String(value || "").trim().toLowerCase();

const isActiveValue = (value: unknown) => {
  if (value === undefined || value === null) return true;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;

  return ["1", "true", "active", "yes"].includes(
    String(value).trim().toLowerCase()
  );
};

const isActiveService = (service: Service) => isActiveValue(service.is_active);
const isActiveSection = (section: HomepageSection) =>
  isActiveValue(section.is_active);

const extractArray = <T,>(payload: any, keys: string[] = []): T[] => {
  if (Array.isArray(payload)) return payload;

  for (const key of keys) {
    if (Array.isArray(payload?.[key])) return payload[key];
  }

  const data =
    payload?.data ??
    payload?.items ??
    payload?.rows ??
    payload?.result ??
    payload;

  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.rows)) return data.rows;
  return [];
};

const Index = () => {
  const { selectedCity } = useLocation();
  const { language } = useLanguage();
  const bn = language === "bn";
  const queryClient = useQueryClient();

  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [homepageSections, setHomepageSections] = useState<HomepageSection[]>(
    []
  );
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  const { pull, refreshing } = usePullToRefresh(async () => {
    console.log("🔄 Pull refresh started");
    await queryClient.invalidateQueries();
    window.location.reload();
  });

  useSEO({
    title: bn
      ? "হোম সার্ভিসের সেরা প্ল্যাটফর্ম"
      : "Best Home Service Platform in Bangladesh",
    description: bn
      ? "সন্ধান — বাংলাদেশের প্রিমিয়াম হোম সার্ভিস।"
      : "Shondhaan — Bangladesh's premium home service platform.",
    canonical: "/",
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        console.log(" Fetching homepage data...");
        console.log(" Services URL:", `${API_BASE}/services`);
        console.log(" Categories URL:", `${API_BASE}/categories`);
        console.log(
          "Homepage sections URL:",
          `${API_BASE}/homepage-sections?active=1`
        );
        const [servicesRes, categoriesRes, sectionsRes] = await Promise.all([
          fetch(`${API_BASE}/services`),
          fetch(`${API_BASE}/categories`),
          fetch(`${API_BASE}/homepage-sections?active=1`),
        ]);
        console.log(" Services status:", servicesRes.status);
        console.log(" Categories status:", categoriesRes.status);
        console.log(" Homepage sections status:", sectionsRes.status);

        const servicesData = await servicesRes.json().catch(() => ({}));
        const categoriesData = await categoriesRes.json().catch(() => ({}));
        const sectionsData = await sectionsRes.json().catch(() => ({}));

        console.log(" Raw services response:", servicesData);
        console.log(" Raw categories response:", categoriesData);
        console.log(" Raw homepage sections response:", sectionsData);

        const safeServices = extractArray<Service>(servicesData, ["services"]);
        const safeCategories = extractArray<Category>(categoriesData, [
          "categories",
        ]);
        const safeSections = extractArray<HomepageSection>(sectionsData, [
          "sections",
          "homepage_sections",
        ]);

        console.log("✅ Safe services:", safeServices);
        console.log("✅ Safe categories:", safeCategories);
        console.log("✅ Safe homepage sections:", safeSections);

        setServices(safeServices);
        setCategories(safeCategories);
        setHomepageSections(safeSections);
      } catch (err) {
        console.error("❌ Homepage fetch error:", err);
        setServices([]);
        setCategories([]);
        setHomepageSections([]);
      } finally {
        setLoading(false);
        console.log("✅ Homepage loading finished");
      }
    };
    fetchData();
  }, []);

  const cityMatched = (service: Service) => {
    const cities = parseJsonArray(service.available_cities);

    if (cities.length === 0 || !selectedCity) return true;

    return cities.some(
      (city) => normalizeCity(city) === normalizeCity(selectedCity)
    );
  };

  const formatService = (service: Service): FormattedService => ({
    id: service.id,
    title: bn ? service.title : service.title_en || service.title,
    image: getServiceImage(service.slug, service.image_url),
    slug: service.slug,
    rating: Number(service.rating || 0),
    total_reviews: service.total_reviews || 0,
    total_orders: service.total_orders || 0,
    description: service.description || "",
    features: parseJsonArray(service.features),
    price: Number(service.price || 0),
    commission_percent: service.commission_percent || "0",
  });

  const groupedServices = useMemo(() => {
    console.log("🧮 Grouping services by category...");
    console.log("📍 Selected city:", selectedCity);
    console.log("📁 Selected category:", selectedCategoryId);

    const visibleCategories =
      selectedCategoryId === "all"
        ? categories
        : categories.filter(
            (category) => String(category.id) === String(selectedCategoryId)
          );

    return visibleCategories.map((category) => {
      const filteredServices = services
        .filter(
          (service) => String(service.category_id || "") === String(category.id)
        )
        .filter(isActiveService)
        .filter(cityMatched)
        .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0))
        .map(formatService);

      console.log("📁 Category:", category.name || category.title);
      console.log("➡️ Category ID:", category.id);
      console.log("➡️ Services:", filteredServices);

      return {
        category,
        services: filteredServices,
      };
    });
  }, [services, categories, selectedCity, language, selectedCategoryId]);

  const uncategorizedServices = useMemo(() => {
    if (selectedCategoryId !== "all") return [];

    const knownCategoryIds = new Set(
      categories.map((category) => String(category.id))
    );

    const items = services
      .filter(
        (service) =>
          !service.category_id ||
          !knownCategoryIds.has(String(service.category_id))
      )
      .filter(isActiveService)
      .filter(cityMatched)
      .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0))
      .map(formatService);

    console.log("📌 Uncategorized services:", items);
    return items;
  }, [services, categories, selectedCity, language, selectedCategoryId]);

  const dynamicHomepageSections = useMemo(() => {
    if (!homepageSections.length) return [];
    if (selectedCategoryId !== "all") return [];

    const allActiveServices = services.filter(isActiveService);
    const cityActiveServices = allActiveServices.filter(cityMatched);

    const allServiceBySlug = new Map(
      allActiveServices.map((service) => [normalizeSlug(service.slug), service])
    );

    const cityServiceBySlug = new Map(
      cityActiveServices.map((service) => [normalizeSlug(service.slug), service])
    );

    console.log("✅ Homepage sections from API:", homepageSections);
    console.log(
      "✅ All service slugs:",
      allActiveServices.map((service) => service.slug)
    );
    console.log(
      "✅ City filtered service slugs:",
      cityActiveServices.map((service) => service.slug)
    );

    const sections = homepageSections
      .filter(isActiveSection)
      .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0))
      .map((section) => {
        const slugs = parseJsonArray(section.service_slugs).map(normalizeSlug);

        console.log(`🔎 Section "${section.section_key}" slugs:`, slugs);

        const sectionServices = slugs
          .map((slug) => {
            const cityMatchedService = cityServiceBySlug.get(slug);
            const fallbackService = allServiceBySlug.get(slug);

            if (!cityMatchedService && !fallbackService) {
              console.warn(`❌ No service found for slug: ${slug}`);
            }

            return cityMatchedService || fallbackService;
          })
          .filter(Boolean)
          .map((service) => formatService(service as Service));

        console.log(
          `✅ Section "${section.section_key}" matched services:`,
          sectionServices
        );

        return {
          section,
          services: sectionServices,
        };
      })
      .filter((group) => group.services.length > 0);

    console.log("🏠 Dynamic homepage sections:", sections);
    return sections;
  }, [homepageSections, services, selectedCity, language, selectedCategoryId]);

  const hasAnyService =
    dynamicHomepageSections.some((group) => group.services.length > 0) ||
    groupedServices.some((group) => group.services.length > 0) ||
    uncategorizedServices.length > 0;

return (
  <div className="min-h-screen flex flex-col bg-background">
    <PullToRefreshIndicator pull={pull} refreshing={refreshing} />

    {/* ✅ MAIN CONTENT WRAPPER */}
    <div className="flex-1 flex flex-col">
      <Navbar />
      <HeroSection />

      <CategoryBar
        categories={categories}
        selectedCategoryId={selectedCategoryId}
        onCategorySelect={(id) => {
          console.log("Category clicked:", id);
          setSelectedCategoryId(id);
        }}
      />

      <MobilePromoBanner />

      {/* Service Section */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-50/50 via-blue-400/30 to-emerald-700/40 pointer-events-none" />

        <div className="app-container relative z-10">
          <ForYouSection />

          {loading ? (
            <>
              <MobileServiceSkeleton />
              <div className="mt-6 hidden md:block">
                <ServiceCardSkeleton count={8} />
              </div>
            </>
          ) : (
            <>
              {selectedCategoryId === "all" &&
                dynamicHomepageSections.map(({ section, services }) => {
                  const heading = bn
                    ? section.title_bn || "সার্ভিস"
                    : section.title_en || section.title_bn || "Services";

                  return (
                    <ServiceSection
                      key={`dynamic-${section.id}`}
                      heading={heading}
                      services={services}
                      viewAllLink="/all-services"
                    />
                  );
                })}

              {groupedServices.map(({ category, services }) => {
                if (!services.length) return null;

                const heading = bn
                  ? category.name || category.title || "সার্ভিস"
                  : category.name_en ||
                    category.title_en ||
                    category.name ||
                    category.title ||
                    "Services";

                return (
                  <ServiceSection
                    key={`category-${category.id}`}
                    heading={heading}
                    services={services}
                    viewAllLink={`/all-services?category=${category.id}`}
                  />
                );
              })}

              {uncategorizedServices.length > 0 && (
                <ServiceSection
                  heading={bn ? "অন্যান্য সার্ভিস" : "Other Services"}
                  services={uncategorizedServices}
                  viewAllLink="/all-services"
                />
              )}

              {!hasAnyService && (
                <div className="py-16 text-center">
                  <p className="text-muted-foreground">
                    {bn
                      ? "কোনো সার্ভিস পাওয়া যায়নি"
                      : "No services available"}
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <WhyChooseUs />
      <HowItWorks />
      <Testimonials />
    </div>

    {/* FOOTER (ALWAYS AT BOTTOM) */}
    <Footer />

    {/* Floating UI (doesn’t affect layout) */}
    <ScrollButtons />
    <ServiceChatFloatingButton />
   
    {/* <div
      className="md:hidden lg:hidden"
      style={{ height: "calc(96px + env(safe-area-inset-bottom, 0px))" }}
    /> */}
  </div>
);
};

export default Index;
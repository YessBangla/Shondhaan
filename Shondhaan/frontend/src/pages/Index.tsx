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
import { useLocation } from "@/contexts/LocationContext";
import { useLanguage } from "@/contexts/LanguageContext";
import MobileServiceSkeleton from "@/components/MobileServiceSkeleton";
import ServiceCardSkeleton from "@/components/ServiceCardSkeleton";
import PullToRefreshIndicator from "@/components/PullToRefreshIndicator";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { useQueryClient } from "@tanstack/react-query";
import ForYouSection from "@/components/ForYouSection";

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
  is_active?: boolean | number;
  sort_order?: number;
};

type Category = {
  id: string;
  name: string;
  name_en?: string;
  title?: string;
  title_en?: string;
};

const API_BASE = "http://localhost:3000/api";

const parseJsonArray = (value: unknown): string[] => {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value.map(String).filter(Boolean);
  }

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

  const cityMap: Record<string, string> = {
    ঢাকা: "dhaka",
    dhaka: "dhaka",
    চট্টগ্রাম: "chittagong",
    chittagong: "chittagong",
    sylhet: "sylhet",
    সিলেট: "sylhet",
    khulna: "khulna",
    খুলনা: "khulna",
  };

  return cityMap[text] || text;
};

const isActiveService = (service: Service) => {
  return (
    service.is_active === true ||
    service.is_active === 1 ||
    service.is_active === undefined
  );
};

const Index = () => {
  const { selectedCity } = useLocation();
  const { language } = useLanguage();
  const bn = language === "bn";
  const queryClient = useQueryClient();

  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
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
      ? "ইয়েস সার্ভিস — বাংলাদেশের প্রিমিয়াম হোম সার্ভিস।"
      : "Yess Service — Bangladesh's premium home service platform.",
    canonical: "/",
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        console.log("🚀 Fetching services and categories...");
        console.log("🌐 Services URL:", `${API_BASE}/services`);
        console.log("🌐 Categories URL:", `${API_BASE}/categories`);

        const [servicesRes, categoriesRes] = await Promise.all([
          fetch(`${API_BASE}/services`),
          fetch(`${API_BASE}/categories`),
        ]);

        console.log("📡 Services status:", servicesRes.status);
        console.log("📡 Categories status:", categoriesRes.status);

        const servicesData = await servicesRes.json();
        const categoriesData = await categoriesRes.json();

        console.log("📦 Raw services response:", servicesData);
        console.log("📦 Raw categories response:", categoriesData);

        const safeServices: Service[] = Array.isArray(servicesData)
          ? servicesData
          : servicesData?.data || servicesData?.services || [];

        const safeCategories: Category[] = Array.isArray(categoriesData)
          ? categoriesData
          : categoriesData?.data || categoriesData?.categories || [];

        console.log("✅ Safe services:", safeServices);
        console.log("✅ Safe categories:", safeCategories);

        setServices(safeServices);
        setCategories(safeCategories);
      } catch (err) {
        console.error("❌ Fetch error:", err);
      } finally {
        setLoading(false);
        console.log("✅ Loading finished");
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

  const formatService = (s: Service) => ({
    id: s.id,
    title: bn ? s.title : s.title_en || s.title,
    image: getServiceImage(s.slug, s.image_url),
    slug: s.slug,
    rating: Number(s.rating || 0),
    total_reviews: s.total_reviews || 0,
    total_orders: s.total_orders || 0,
    description: s.description || "",
    features: parseJsonArray(s.features),
    price: 0,
    commission_percent: s.commission_percent || "0",
  });

  const groupedServices = useMemo(() => {
    console.log("🧮 Grouping services...");
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
        .filter((s) => String(s.category_id || "") === String(category.id))
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

    const items = services
      .filter((s) => !s.category_id)
      .filter(isActiveService)
      .filter(cityMatched)
      .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0))
      .map(formatService);

    console.log("📌 Uncategorized services:", items);
    return items;
  }, [services, selectedCity, language, selectedCategoryId]);

  const hasAnyService =
    groupedServices.some((group) => group.services.length > 0) ||
    uncategorizedServices.length > 0;

  return (
    <div className="min-h-screen bg-background">
      <PullToRefreshIndicator pull={pull} refreshing={refreshing} />

      <Navbar />
      <HeroSection />

      <CategoryBar
        categories={categories}
        selectedCategoryId={selectedCategoryId}
        onCategorySelect={(id) => {
          console.log("✅ Category clicked:", id);
          setSelectedCategoryId(id);
        }}
      />

      <MobilePromoBanner />

      <div className="mx-auto max-w-6xl px-4">
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
                  key={category.id}
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
                  {bn ? "কোনো সার্ভিস পাওয়া যায়নি" : "No services available"}
                </p>
              </div>
            )}
          </>
        )}
      </div>

      <WhyChooseUs />
      <HowItWorks />
      <Testimonials />
      <AppDownload />
      <RequestService />
      <TrackingSearch />

      <Footer />
      <ScrollButtons />

      <div
        className="md:hidden"
        style={{ height: "calc(96px + env(safe-area-inset-bottom, 0px))" }}
      />
    </div>
  );
};

export default Index;
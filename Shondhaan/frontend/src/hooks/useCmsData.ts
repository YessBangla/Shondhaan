import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getMySqlAuth } from "@/lib/mysqlAuth";
import { CENTRAL_API_BASE_URL } from "@/lib/api";

const API_BASE_URL = CENTRAL_API_BASE_URL;


async function cmsRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const auth = getMySqlAuth();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(auth?.token ? { Authorization: `Bearer ${auth.token}` } : {}),
      ...options.headers,
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || "CMS request failed");
  }
  return data as T;
}
// Generic CMS table hook
function useCmsTable<T extends Record<string, any>>(
  table: string,
  queryKey: string,
  orderBy = "sort_order"
) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: [queryKey],
    queryFn: async () => {
      const { data } = await cmsRequest<{ data: T[] }>(
        `/api/cms/${table}?orderBy=${encodeURIComponent(orderBy)}`
      );
      return data as T[];
    },
  });

  const upsert = useMutation({
    mutationFn: async (item: Partial<T>) => {
      const { data } = await cmsRequest<{ data: T }>(`/api/cms/${table}`, {
        method: "POST",
        body: JSON.stringify(item),
      });
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [queryKey] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      await cmsRequest(`/api/cms/${table}/${encodeURIComponent(id)}`, { method: "DELETE" });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [queryKey] }),
  });

  return { ...query, upsert, remove };
}

export interface CmsCategory {
  id: string;
  name: string;
  name_en: string | null;
  icon_url: string | null;
  color_gradient: string;
  color_overlay: string;
  color_chip_bg: string;
  color_chip_text: string;
  color_accent: string;
  sort_order: number;
  is_active: boolean;
}

export interface CmsService {
  id: string;
  slug: string;
  title: string;
  title_en: string | null;
  image_url: string | null;
  description: string | null;
  rating: number;
  total_reviews: number;
  total_orders: number;
  features: string[];
  available_cities: string[];
  category_id: string | null;
  is_active: boolean;
  sort_order: number;
}

export interface CmsServicePackage {
  id: string;
  service_id: string;
  name: string;
  price: number;
  original_price: number | null;
  features: string[];
  sort_order: number;
}

export interface CmsSpecialOffer {
  id: string;
  title_bn: string;
  title_en: string | null;
  discount_bn: string;
  discount_en: string | null;
  description_bn: string | null;
  description_en: string | null;
  service_slug: string | null;
  badge: string;
  gradient: string;
  border_color: string;
  accent_color: string;
  bg_accent: string;
  is_active: boolean;
  expires_at: string | null;
  sort_order: number;
}

export interface CmsHeroBanner {
  id: string;
  title_bn: string;
  title_en: string | null;
  subtitle_bn: string | null;
  subtitle_en: string | null;
  image_url: string | null;
  is_active: boolean;
  sort_order: number;
}

export interface CmsHomepageSection {
  id: string;
  section_key: string;
  title_bn: string;
  title_en: string | null;
  service_slugs: string[];
  sort_order: number;
  is_active: boolean;
}

export const useCmsCategories = () => useCmsTable<CmsCategory>("cms_categories", "cms-categories");
export const useCmsServices = () => useCmsTable<CmsService>("cms_services", "cms-services");
export const useCmsPackages = (serviceId?: string) => {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["cms-packages", serviceId],
    queryFn: async () => {
      const { data } = await cmsRequest<{ data: CmsServicePackage[] }>(
        `/api/cms/cms_service_packages?orderBy=sort_order&service_id=${encodeURIComponent(serviceId || "")}`
      );
      return data as CmsServicePackage[];
    },
    enabled: !!serviceId,
  });
  const upsert = useMutation({
    mutationFn: async (item: Partial<CmsServicePackage>) => {
      const { data } = await cmsRequest<{ data: CmsServicePackage }>("/api/cms/cms_service_packages", {
        method: "POST",
        body: JSON.stringify(item),
      });
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cms-packages"] }),
  });
  const remove = useMutation({
    mutationFn: async (id: string) => {
      await cmsRequest(`/api/cms/cms_service_packages/${encodeURIComponent(id)}`, { method: "DELETE" });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cms-packages"] }),
  });
  return { ...query, upsert, remove };
};
export const useCmsOffers = () => useCmsTable<CmsSpecialOffer>("cms_special_offers", "cms-offers");
export const useCmsHeroBanners = () => useCmsTable<CmsHeroBanner>("cms_hero_banners", "cms-hero-banners");
export const useCmsHomepageSections = () => useCmsTable<CmsHomepageSection>("cms_homepage_sections", "cms-homepage-sections");

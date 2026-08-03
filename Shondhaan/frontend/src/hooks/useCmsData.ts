import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getMySqlAuth } from "@/lib/mysqlAuth";
import {INDIVIDUAL_API_BASE_URL } from "@/lib/api";

const API_BASE_URL = INDIVIDUAL_API_BASE_URL;
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
const unwrapRows = <T,>(payload: any): T[] => {
  if (Array.isArray(payload)) return payload as T[];
  if (Array.isArray(payload?.data)) return payload.data as T[];
  if (Array.isArray(payload?.services)) return payload.services as T[];
  if (Array.isArray(payload?.categories)) return payload.categories as T[];
  if (Array.isArray(payload?.packages)) return payload.packages as T[];
  if (Array.isArray(payload?.results)) return payload.results as T[];
  return [];
};

const unwrapItem = <T,>(payload: any): T => {
  return (payload?.data ?? payload?.service ?? payload?.category ?? payload?.package ?? payload) as T;
};

const parseList = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value !== "string") return [];

  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
  } catch {
    // keep going with comma separated text
  }

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
};

const normalizeCategory = (row: any): CmsCategory => ({
  ...row,
  id: String(row.id ?? ""),
  name: String(row.name ?? ""),
  name_en: row.name_en ?? row.nameEn ?? null,
  icon_url: row.icon_url ?? row.icon ?? null,
  color_gradient: row.color_gradient ?? "from-blue-600 to-blue-800",
  color_overlay: row.color_overlay ?? "from-blue-900/80 to-blue-700/40",
  color_chip_bg: row.color_chip_bg ?? "bg-blue-500/15",
  color_chip_text: row.color_chip_text ?? "text-blue-700",
  color_accent: row.color_accent ?? "#2563eb",
  sort_order: Number(row.sort_order ?? 0),
  is_active: row.is_active === false || row.is_active === 0 ? false : true,
});

const normalizeService = (row: any): CmsService => ({
  ...row,
  id: String(row.id ?? ""),
  slug: String(row.slug ?? ""),
  title: String(row.title ?? row.name ?? ""),
  title_en: row.title_en ?? row.name_en ?? null,
  image_url: row.image_url ?? row.image ?? null,
  description: row.description ?? null,
  rating: Number(row.rating ?? 4.5),
  total_reviews: Number(row.total_reviews ?? row.reviews_count ?? 0),
  total_orders: Number(row.total_orders ?? row.orders_count ?? 0),
  commission_percent: Number(row.commission_percent ?? 10),
  platform_fee: Number(row.platform_fee ?? row.platform_fee_amount ?? 0),
  features: parseList(row.features),
  available_cities: parseList(row.available_cities),
  category_id:
    row.category_id === undefined || row.category_id === null
      ? null
      : String(row.category_id),
  is_active: row.is_active === false || row.is_active === 0 ? false : true,
  sort_order: Number(row.sort_order ?? 0),
});

const normalizePackage = (row: any): CmsServicePackage => ({
  ...row,
  id: String(row.id ?? ""),
  service_id: String(row.service_id ?? ""),
  name: String(row.name ?? row.package_name ?? ""),
  price: Number(row.price ?? 0),
  original_price:
    row.original_price === undefined ||
    row.original_price === null ||
    row.original_price === ""
      ? null
      : Number(row.original_price),
  features: parseList(row.features),
  sort_order: Number(row.sort_order ?? 0),
});

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
        `/api/${table}?orderBy=${encodeURIComponent(orderBy)}`
      );
      return data as T[];
    },
  });

  const upsert = useMutation({
    mutationFn: async (item: Partial<T>) => {
      const { data } = await cmsRequest<{ data: T }>(`/api/${table}`, {
        method: "POST",
        body: JSON.stringify(item),
      });
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [queryKey] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      await cmsRequest(`/api/${table}/${encodeURIComponent(id)}`, { method: "DELETE" });
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
  commission_percent?: number;
  platform_fee?: number;
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

export const useCmsCategories = () => {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["cms-categories"],
    queryFn: async () => {
      const payload = await cmsRequest<any>("/api/categories?orderBy=sort_order");
      return unwrapRows<any>(payload).map(normalizeCategory);
    },
  });

  const upsert = useMutation({
    mutationFn: async (item: Partial<CmsCategory>) => {
      const payload = await cmsRequest<any>("/api/categories", {
        method: "POST",
        body: JSON.stringify(item),
      });
      return normalizeCategory(unwrapItem<any>(payload));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cms-categories"] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      await cmsRequest(`/api/categories/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cms-categories"] }),
  });

  return { ...query, upsert, remove };
};

export const useCmsServices = () => {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["cms-services"],
    queryFn: async () => {
      const payload = await cmsRequest<any>("/api/services?orderBy=sort_order");
      return unwrapRows<any>(payload).map(normalizeService);
    },
  });
  const upsert = useMutation({
    mutationFn: async (item: Partial<CmsService>) => {
      const payload = await cmsRequest<any>("/api/services", {
        method: "POST",
        body: JSON.stringify(item),
      });
      return normalizeService(unwrapItem<any>(payload));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cms-services"] }),
  });
  const remove = useMutation({
    mutationFn: async (id: string) => {
      await cmsRequest(`/api/services/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cms-services"] }),
  });

  return { ...query, upsert, remove };
};
export const useCmsPackages = (serviceId?: string) => {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["cms-packages", serviceId],
    queryFn: async () => {
      const payload = await cmsRequest<any>(
        `/api/packages?orderBy=sort_order&service_id=${encodeURIComponent(serviceId || "")}`
      );
      return unwrapRows<any>(payload).map(normalizePackage);
    },
    enabled: !!serviceId,
  });
  const upsert = useMutation({
    mutationFn: async (item: Partial<CmsServicePackage>) => {
      const payload = await cmsRequest<any>("/api/packages", {
        method: "POST",
        body: JSON.stringify(item),
      });
      return normalizePackage(unwrapItem<any>(payload));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cms-packages"] }),
  });
  const remove = useMutation({
    mutationFn: async (id: string) => {
      await cmsRequest(`/api/packages/${encodeURIComponent(id)}`, { method: "DELETE" });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cms-packages"] }),
  });
  return { ...query, upsert, remove };
};
export const useCmsOffers = () => useCmsTable<CmsSpecialOffer>("cms_special_offers", "cms-offers");
export const useCmsHeroBanners = () => useCmsTable<CmsHeroBanner>("cms_hero_banners", "cms-hero-banners");
export const useCmsHomepageSections = () => useCmsTable<CmsHomepageSection>("cms_homepage_sections", "cms-homepage-sections");

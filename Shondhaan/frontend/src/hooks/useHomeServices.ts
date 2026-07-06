import { useQuery } from "@tanstack/react-query";
import { INDIVIDUAL_API_BASE_URL } from "@/lib/api";
import { getMySqlAuth } from "@/lib/mysqlAuth";

const API_BASE_URL = INDIVIDUAL_API_BASE_URL;

type HomeApiResponse<T> =
  | T[]
  | { data?: T[] }
  | { services?: T[] }
  | { categories?: T[] }
  | { results?: T[] }
  | { items?: T[] };

const parseStringList = (value: unknown): string[] => {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(String).map((item) => item.trim()).filter(Boolean);
  if (typeof value === "string") {
    const splitList = () => value.split(",").map((item) => item.trim()).filter(Boolean);
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed)
        ? parsed.map(String).map((item) => item.trim()).filter(Boolean)
        : splitList();
    } catch {
      return splitList();
    }
  }
  return [];
};

const normalizeActive = (value: unknown) => {
  if (value === undefined || value === null) return true;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") {
    return ["1", "true", "active", "yes"].includes(value.trim().toLowerCase());
  }
  return false;
};

async function fetchJson<T>(path: string): Promise<T> {
  const auth = getMySqlAuth();
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      ...(auth?.token ? { Authorization: `Bearer ${auth.token}` } : {}),
    },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((json as any)?.message || "Home CMS request failed");
  }
  return json as T;
}

export type HomeService = {
  id?: string | number;
  slug?: string;
  title?: string;
  title_en?: string | null;
  category_id?: string | number | null;
  image_url?: string | null;
  description?: string | null;
  rating?: number;
  price?: number;
  features?: string[] | string | null;
  is_active?: boolean | number | string | null;
  available_cities?: string[] | string | null;
  [key: string]: any;
};

export type HomeCategory = {
  id: string | number;
  name: string;
  name_bn?: string;
  name_en?: string | null;
  is_active?: boolean | number | string | null;
  [key: string]: any;
};

export function useHomeServices() {
  const servicesQuery = useQuery({
    queryKey: ["home-services"],
    queryFn: async () => {
      const raw = await fetchJson<HomeApiResponse<HomeService>>("/api/services");
      const list = Array.isArray(raw)
        ? raw
        : (raw as any)?.data || (raw as any)?.services || (raw as any)?.results || (raw as any)?.items || [];
      return Array.isArray(list)
        ? list.map((service) => ({
            ...service,
            price: Number((service as any).price || 0),
            rating: Number((service as any).rating || 0),
            features: parseStringList((service as any).features),
            available_cities: parseStringList((service as any).available_cities),
            is_active: normalizeActive((service as any).is_active),
          }))
        : [];
    },
    staleTime: 2 * 60 * 1000,
    retry: 1,
  });

  const categoriesQuery = useQuery({
    queryKey: ["home-categories"],
    queryFn: async () => {
      const raw = await fetchJson<HomeApiResponse<HomeCategory>>("/api/categories");
      const list = Array.isArray(raw)
        ? raw
        : (raw as any)?.data || (raw as any)?.categories || (raw as any)?.results || (raw as any)?.items || [];
      return Array.isArray(list)
        ? list.map((category) => ({
            ...category,
            is_active: normalizeActive((category as any).is_active),
          }))
        : [];
    },
    staleTime: 2 * 60 * 1000,
    retry: 1,
  });

  const loading = servicesQuery.isLoading || categoriesQuery.isLoading;

  return {
    loading,
    services: servicesQuery.data || [],
    categories: categoriesQuery.data || [],
    error: servicesQuery.error || categoriesQuery.error,
    refetch: () => {
      servicesQuery.refetch();
      categoriesQuery.refetch();
    },
  };
}


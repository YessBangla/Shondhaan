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
  is_active?: boolean;
  available_cities?: string[] | string | null;
  [key: string]: any;
};

export type HomeCategory = {
  id: string | number;
  name: string;
  name_bn?: string;
  name_en?: string | null;
  is_active?: boolean;
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
      return Array.isArray(list) ? list : [];
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
      return Array.isArray(list) ? list : [];
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


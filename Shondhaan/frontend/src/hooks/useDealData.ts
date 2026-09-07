import { useQuery } from "@tanstack/react-query";

const DEAL_API_BASE_URL = (
  import.meta.env.VITE_DEAL_API_BASE_URL || "VITE_DEAL_API_BASE_URL"
).replace(/\/+$/, "");

export interface DealCategory {
  id: string;
  name: string;
  name_en: string | null;
  slug: string;
  icon: string | null;
  parent_id: string | null;
  sort_order: number;
  is_active: boolean;
  children?: DealCategory[];
  parent_category?: Pick<DealCategory, "id" | "name" | "name_en" | "slug" | "icon"> | null;
}

export interface DealListing {
  id: string;
  user_id: string;
  category_id: string | null;
  title: string;
  title_en: string | null;
  description: string | null;
  price: number;
  is_negotiable: boolean;
  condition: string;
  location_division: string | null;
  location_district: string | null;
  location_area: string | null;
  images: string[];
  phone: string | null;
  hide_phone: boolean;
  status: string;
  is_featured: boolean;
  views_count: number;
  inquiries_count: number;
  created_at: string;
  updated_at: string;
  deal_categories?: DealCategory | null;
}

const extractArray = <T,>(payload: any): T[] => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.categories)) return payload.categories;
  if (Array.isArray(payload?.listings)) return payload.listings;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.rows)) return payload.rows;
  return [];
};

const extractObject = <T,>(payload: any): T | null => {
  if (!payload) return null;
  if (payload?.data && typeof payload.data === "object") return payload.data;
  if (payload?.listing && typeof payload.listing === "object") return payload.listing;
  return payload;
};

const apiGet = async <T,>(url: string): Promise<T> => {
  const response = await fetch(url, {
    method: "GET",
    credentials: "include",
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.message || payload?.error || "API request failed");
  }

  return payload as T;
};

const normalizeCategory = (cat: any): DealCategory => ({
  id: String(cat.id),
  name: cat.name || "",
  name_en: cat.name_en ?? null,
  slug: cat.slug || "",
  icon: cat.icon ?? null,
  parent_id: cat.parent_id ? String(cat.parent_id) : null,
  sort_order: Number(cat.sort_order || 0),
  is_active:
    cat.is_active === true ||
    cat.is_active === 1 ||
    cat.is_active === "1" ||
    cat.is_active === "true",
  children: Array.isArray(cat.children)
    ? cat.children.map(normalizeCategory)
    : undefined,
  parent_category: cat.parent_category
    ? {
        id: String(cat.parent_category.id),
        name: cat.parent_category.name || "",
        name_en: cat.parent_category.name_en ?? null,
        slug: cat.parent_category.slug || "",
        icon: cat.parent_category.icon ?? null,
      }
    : null,
});

const normalizeImages = (images: any): string[] => {
  if (Array.isArray(images)) {
    return images.filter(Boolean).map(String);
  }

  if (typeof images === "string") {
    try {
      const parsed = JSON.parse(images);
      if (Array.isArray(parsed)) return parsed.filter(Boolean).map(String);
    } catch {
      return images
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }

  return [];
};

const normalizeListing = (listing: any): DealListing => ({
  id: String(listing.id),
  user_id: String(listing.user_id),
  category_id: listing.category_id ? String(listing.category_id) : null,

  title: listing.title || "",
  title_en: listing.title_en ?? null,
  description: listing.description ?? null,

  price: Number(listing.price || 0),
  is_negotiable:
    listing.is_negotiable === true ||
    listing.is_negotiable === 1 ||
    listing.is_negotiable === "1" ||
    listing.is_negotiable === "true",

  condition: listing.condition || listing.product_condition || "used",

  location_division: listing.location_division ?? null,
  location_district: listing.location_district ?? null,
  location_area: listing.location_area ?? null,

  images: normalizeImages(listing.images),

  phone: listing.phone ?? null,
  hide_phone:
    listing.hide_phone === true ||
    listing.hide_phone === 1 ||
    listing.hide_phone === "1" ||
    listing.hide_phone === "true",

  status: listing.status || "active",
  is_featured:
    listing.is_featured === true ||
    listing.is_featured === 1 ||
    listing.is_featured === "1" ||
    listing.is_featured === "true",

  views_count: Number(listing.views_count || 0),
  inquiries_count: Number(listing.inquiries_count || 0),

  created_at: listing.created_at,
  updated_at: listing.updated_at,

  deal_categories: listing.deal_categories
    ? normalizeCategory(listing.deal_categories)
    : listing.category_name
      ? {
          id: listing.category_id ? String(listing.category_id) : "",
          name: listing.category_name,
          name_en: listing.category_name_en ?? null,
          slug: listing.category_slug || "",
          icon: listing.category_icon ?? null,
          parent_id: listing.category_parent_id
            ? String(listing.category_parent_id)
            : null,
          sort_order: 0,
          is_active: true,
          parent_category: listing.category_parent_name
            ? {
                id: String(listing.category_parent_id),
                name: listing.category_parent_name,
                name_en: listing.category_parent_name_en ?? null,
                slug: listing.category_parent_slug || "",
                icon: listing.category_parent_icon ?? null,
              }
            : null,
        }
      : null,
});

export function useDealCategories() {
  return useQuery({
    queryKey: ["deal-categories"],
    queryFn: async () => {
      const payload = await apiGet<any>(
        `${DEAL_API_BASE_URL}/api/deal-categories`
      );

      return extractArray<any>(payload)
        .map(normalizeCategory)
        .filter((cat) => cat.is_active)
        .sort((a, b) => a.sort_order - b.sort_order);
    },
  });
}

/** Returns only top-level parent categories */
export function useDealParentCategories() {
  return useQuery({
    queryKey: ["deal-parent-categories"],
    queryFn: async () => {
      const payload = await apiGet<any>(
        `${DEAL_API_BASE_URL}/api/deal-categories`
      );

      return extractArray<any>(payload)
        .map(normalizeCategory)
        .filter((cat) => cat.is_active && !cat.parent_id)
        .sort((a, b) => a.sort_order - b.sort_order);
    },
  });
}

/** Returns subcategories for a given parent */
export function useDealSubcategories(parentId: string | null) {
  return useQuery({
    queryKey: ["deal-subcategories", parentId],
    queryFn: async () => {
      if (!parentId) return [];

      const payload = await apiGet<any>(
        `${DEAL_API_BASE_URL}/api/deal-categories`
      );

      return extractArray<any>(payload)
        .map(normalizeCategory)
        .filter(
          (cat) =>
            cat.is_active && String(cat.parent_id) === String(parentId)
        )
        .sort((a, b) => a.sort_order - b.sort_order);
    },
    enabled: !!parentId,
  });
}

/** Returns all categories as a tree */
export function useDealCategoryTree() {
  return useQuery({
    queryKey: ["deal-category-tree"],
    queryFn: async () => {
      const payload = await apiGet<any>(
        `${DEAL_API_BASE_URL}/api/deal-categories`
      );

      const all = extractArray<any>(payload)
        .map(normalizeCategory)
        .filter((cat) => cat.is_active)
        .sort((a, b) => a.sort_order - b.sort_order);

      const parents = all.filter((cat) => !cat.parent_id);

      return parents.map((parent) => ({
        ...parent,
        children: all.filter((cat) => cat.parent_id === parent.id),
      }));
    },
  });
}

export function useDealListings(filters?: {
  categorySlug?: string;
  search?: string;
  division?: string;
  district?: string;
  thana?: string;
  condition?: string;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: string;
}) {
  return useQuery({
    queryKey: ["deal-listings", JSON.stringify(filters)],
    queryFn: async () => {
      const params = new URLSearchParams();

      if (filters?.categorySlug) {
        params.set("categorySlug", filters.categorySlug);
      }

      if (filters?.search) {
        params.set("search", filters.search);
      }

      if (filters?.division) {
        params.set("division", filters.division);
      }

      if (filters?.district) {
        params.set("district", filters.district);
      }

      if (filters?.thana) {
        params.set("thana", filters.thana);
      }

      if (filters?.condition) {
        params.set("condition", filters.condition);
      }

      if (filters?.minPrice !== undefined) {
        params.set("minPrice", String(filters.minPrice));
      }

      if (filters?.maxPrice !== undefined) {
        params.set("maxPrice", String(filters.maxPrice));
      }

      if (filters?.sortBy) {
        params.set("sortBy", filters.sortBy);
      }

      const queryString = params.toString();

      const payload = await apiGet<any>(
        `${DEAL_API_BASE_URL}/api/deal/listings${
          queryString ? `?${queryString}` : ""
        }`
      );

      return extractArray<any>(payload).map(normalizeListing);
    },
  });
}

export function useDealListing(id: string) {
  return useQuery({
    queryKey: ["deal-listing", id],
    queryFn: async () => {
      const payload = await apiGet<any>(
        `${DEAL_API_BASE_URL}/api/deal/listings/${id}`
      );

      const listing = extractObject<any>(payload);

      if (!listing) {
        throw new Error("Listing not found");
      }

      return normalizeListing(listing);
    },
    enabled: !!id,
  });
}

export function useFeaturedDeals() {
  return useQuery({
    queryKey: ["deal-featured"],
    queryFn: async () => {
      const payload = await apiGet<any>(
        `${DEAL_API_BASE_URL}/api/deal/listings?featured=1`
      );

      return extractArray<any>(payload).map(normalizeListing).slice(0, 8);
    },
  });
}

export function useLatestDeals() {
  return useQuery({
    queryKey: ["deal-latest"],
    queryFn: async () => {
      const payload = await apiGet<any>(
        `${DEAL_API_BASE_URL}/api/deal/listings`
      );

      return extractArray<any>(payload).map(normalizeListing).slice(0, 20);
    },
  });
}
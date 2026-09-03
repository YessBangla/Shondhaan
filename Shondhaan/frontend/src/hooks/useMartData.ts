import { useQuery } from "@tanstack/react-query";
import { toPublicProduct } from "@/lib/martApi";

const API_BASE =
  import.meta.env.VITE_MART_API_BASE_URL ||
  import.meta.env.VITE_API_BASE ||
  import.meta.env.VITE_API_URL ||
  "";

const isSellerVerified = (value: unknown) =>
  value === true || value === 1 || value === "1";

export interface MartCategory {
  id: string;
  parent_id: string | null;
  name: string;
  name_en: string | null;
  slug: string;
  icon_url?: string | null;
  image_url?: string | null;
  sort_order?: number;
  is_active?: boolean;
  children?: MartCategory[];
}

export interface MartProductCategory {
  id: string;
  name: string;
  name_en: string | null;
  slug: string;
}

interface BackendMartSubCategory {
  id: number | string;
  category_id: number | string;
  name: string;
  category_name?: string | null;
}

export interface MartProduct {
  id: string;
  vendor_id?: string | number | null;
  seller_id?: string | number | null;
  category_id: string | null;
  name: string;
  name_en: string | null;
  slug: string;
  description: string | null;
  image_url: string | null;
  gallery_urls: string[];
  price: number;
  original_price: number | null;
  stock: number;
  unit: string;
  rating: number;
  total_reviews: number;
  total_sold: number;
  is_active: boolean;
  is_featured: boolean;
  seller_name?: string;
  shop_name?: string | null;
  seller_email?: string | null;
  seller_mobile?: string | null;
  seller_verified?: 0 | 1 | boolean;
  seller_slug?: string | null;
  category?: MartProductCategory;
}

export function useMartCategories() {
  return useQuery({
    queryKey: ["mart-categories"],
    queryFn: async () => {
      const [categoriesResponse, subCategoriesResponse] = await Promise.all([
        fetch(`${API_BASE}/api/categories`),
        fetch(`${API_BASE}/api/sub-categories`),
      ]);
      const [categoriesJson, subCategoriesJson] = await Promise.all([
        categoriesResponse.json().catch(() => ({})),
        subCategoriesResponse.json().catch(() => ({})),
      ]);

      if (!categoriesResponse.ok || categoriesJson.success === false) {
        throw new Error(categoriesJson.message || "Categories fetch failed");
      }

      const categories = Array.isArray(categoriesJson.data) ? categoriesJson.data : [];
      const subCategories = Array.isArray(subCategoriesJson.data) ? subCategoriesJson.data : [];

      return categories.map((category: any) => ({
        ...category,
        id: String(category.id),
        parent_id: null,
        slug: category.slug || String(category.id),
        is_active: true,
        children: subCategories
          .filter((subCategory: BackendMartSubCategory) => String(subCategory.category_id) === String(category.id))
          .map((subCategory: BackendMartSubCategory) => ({
            id: `sub-${subCategory.id}`,
            parent_id: String(category.id),
            name: subCategory.name,
            name_en: null,
            slug: `sub-${subCategory.id}`,
            icon_url: category.icon_url || null,
            image_url: null,
            sort_order: 0,
            is_active: true,
            children: [],
          })),
      })) as MartCategory[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

async function fetchVendorProducts(categoryIds?: string[], search?: string, subCategoryIds?: string[]) {
  const params = new URLSearchParams();
  params.set("status", "active");
  if (categoryIds && categoryIds.length > 0) {
    params.set("category_id", categoryIds.join(","));
  }
  if (subCategoryIds && subCategoryIds.length > 0) {
    params.set("sub_category_id", subCategoryIds.join(","));
  }

  const response = await fetch(`${API_BASE}/api/products?${params.toString()}`);
  const json = await response.json().catch(() => ({}));
  if (!response.ok || json.success === false) {
    throw new Error(json.message || "Vendor products fetch failed");
  }

  let products = Array.isArray(json.data) ? json.data : [];
  products = products.filter((p: any) => isSellerVerified(p.seller_verified));

  if (search) {
    const lowerSearch = search.toLowerCase();
    products = products.filter((p: any) =>
      String(p.name_bn || "").toLowerCase().includes(lowerSearch) ||
      String(p.name_en || "").toLowerCase().includes(lowerSearch)
    );
  }

  return products.map((p: any) => toPublicProduct(p as any));
}

async function fetchBackendCategoryFilter(categorySlug?: string) {
  if (!categorySlug || categorySlug === "all") return {};

  const [categoriesResponse, subCategoriesResponse] = await Promise.all([
    fetch(`${API_BASE}/api/categories`),
    fetch(`${API_BASE}/api/sub-categories`),
  ]);
  const [categoriesJson, subCategoriesJson] = await Promise.all([
    categoriesResponse.json().catch(() => ({})),
    subCategoriesResponse.json().catch(() => ({})),
  ]);

  if (!categoriesResponse.ok || categoriesJson.success === false) {
    throw new Error(categoriesJson.message || "Categories fetch failed");
  }

  const categories = Array.isArray(categoriesJson.data) ? categoriesJson.data : [];
  const subCategories = Array.isArray(subCategoriesJson.data) ? subCategoriesJson.data : [];
  const requested = String(categorySlug);
  const normalizedRequested = requested.toLowerCase();
  if (normalizedRequested.startsWith("sub-")) {
    return { subCategoryIds: [requested.replace(/^sub-/i, "")] };
  }

  const subCategoryMatch = subCategories.find((subCategory: any) => {
    const candidates = [
      subCategory.id,
      subCategory.name,
    ].filter((value) => value != null);

    return candidates.some((value) => String(value).toLowerCase() === normalizedRequested);
  });

  if (subCategoryMatch) return { subCategoryIds: [String(subCategoryMatch.id)] };

  const match = categories.find((category: any) => {
    const candidates = [
      category.id,
      category.slug,
      category.name,
      category.name_en,
    ].filter((value) => value != null);

    return candidates.some((value) => String(value).toLowerCase() === normalizedRequested);
  });

  if (!match) return { categoryIds: [requested] };

  return { categoryIds: [String(match.id)] };
}

export function useMartProducts(categorySlug?: string, search?: string, limit = 20) {
  return useQuery({
    queryKey: ["mart-products", categorySlug, search, limit],
    queryFn: async () => {
      const { categoryIds, subCategoryIds } = await fetchBackendCategoryFilter(categorySlug);
      const vendorProducts = await fetchVendorProducts(categoryIds, search, subCategoryIds);

      return vendorProducts
        .sort((a, b) => {
          if (Number(a.is_featured) !== Number(b.is_featured)) {
            return Number(b.is_featured) - Number(a.is_featured);
          }
          return Number(b.total_sold || 0) - Number(a.total_sold || 0);
        })
        .slice(0, limit);
    },
  });
}

// Looks up a single category by id from the /api/categories list.
// Replaces the old Supabase `mart_categories` lookup — categories now
// come exclusively from the MySQL-backed API.
async function fetchCategoryById(categoryId: string): Promise<MartProductCategory | undefined> {
  try {
    const response = await fetch(`${API_BASE}/api/categories`);
    const json = await response.json().catch(() => ({}));
    if (!response.ok || json.success === false) return undefined;

    const categories = Array.isArray(json.data) ? json.data : [];
    const match = categories.find((c: any) => String(c.id) === String(categoryId));
    if (!match) return undefined;

    return {
      id: String(match.id),
      name: match.name,
      name_en: match.name_en ?? null,
      slug: match.slug || String(match.id),
    };
  } catch {
    return undefined;
  }
}

export function useMartProduct(slug: string) {
  return useQuery({
    queryKey: ["mart-product", slug],
    queryFn: async () => {
      // Legacy fallback: old links that used the mysql-product-<id> pattern
      // before real slugs existed. Keep this working so old shared/bookmarked
      // links don't break.
      if (slug.startsWith("mysql-product-")) {
        const productId = slug.replace("mysql-product-", "");
        const response = await fetch(`${API_BASE}/api/products/${encodeURIComponent(productId)}`);
        const json = await response.json().catch(() => ({}));
        if (!response.ok || json.success === false) {
          throw new Error(json.message || "Product not found");
        }
        const product = toPublicProduct(json.data as any);
        if (product.category_id) {
          product.category = await fetchCategoryById(product.category_id);
        }
        return {
          ...product,
          gallery_urls: product.gallery_urls || [],
        } as MartProduct;
      }

      // Real-slug lookup — the only product source now (no Supabase fallback).
      const response = await fetch(`${API_BASE}/api/products/slug/${encodeURIComponent(slug)}`);
      const json = await response.json().catch(() => ({}));
      if (!response.ok || json.success === false || !json.data) {
        throw new Error(json.message || "Product not found");
      }

      const product = toPublicProduct(json.data as any);
      if (product.category_id) {
        product.category = await fetchCategoryById(product.category_id);
      }
      return {
        ...product,
        gallery_urls: product.gallery_urls || [],
      } as MartProduct;
    },
    enabled: !!slug,
  });
}

export function useFeaturedProducts() {
  return useQuery({
    queryKey: ["mart-featured"],
    queryFn: async () => {
      const products = await fetchVendorProducts(undefined, undefined);
      return products
        .filter((product) => product.is_featured)
        .sort((a, b) => Number(b.total_sold || 0) - Number(a.total_sold || 0))
        .slice(0, 12);
    },
  });
}

export interface MartBanner {
  id: string;
  title: string;
  title_en: string | null;
  subtitle: string | null;
  subtitle_en: string | null;
  image_url: string | null;
  link_url: string | null;
  button_label: string | null;
  button_label_en: string | null;
  button_bg_color: string | null;
  button_text_color: string | null;
  is_active: boolean;
  sort_order: number;
}

export function useMartBanners() {
  return useQuery({
    queryKey: ["mart-banners"],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/api/banners`);
      const json = await response.json().catch(() => ({}));

      if (!response.ok || json.success === false) {
        throw new Error(json.message || "Mart banners fetch failed");
      }

      return (Array.isArray(json.data) ? json.data : []) as MartBanner[];
    },
  });
}

export function useTopSellingProducts(limit = 6) {
  return useQuery({
    queryKey: ["mart-top-selling", limit],
    queryFn: async () => {
      const products = await fetchVendorProducts();
      return products
        .filter((product) => Number(product.total_sold || 0) > 0)
        .sort((a, b) => Number(b.total_sold || 0) - Number(a.total_sold || 0))
        .slice(0, limit);
    },
  });
}

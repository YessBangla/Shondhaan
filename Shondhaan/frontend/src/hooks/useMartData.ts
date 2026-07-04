import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toPublicProduct } from "@/lib/martApi";

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
  category?: MartProductCategory;
}

export function useMartCategories() {
  return useQuery({
    queryKey: ["mart-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mart_categories")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;

      const categories = data as MartCategory[];
      // Build tree
      const rootCats = categories.filter((c) => !c.parent_id);
      return rootCats.map((root) => ({
        ...root,
        children: categories
          .filter((c) => c.parent_id === root.id)
          .sort((a, b) => a.sort_order - b.sort_order),
      }));
    },
    staleTime: 5 * 60 * 1000,
  });
}

async function fetchVendorProducts(categoryIds?: string[], search?: string) {
  const params = new URLSearchParams();
  params.set("status", "active");
  if (categoryIds && categoryIds.length > 0) {
    params.set("category_id", categoryIds.join(","));
  }

  const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:8081";
  const response = await fetch(`${apiUrl}/api/products?${params.toString()}`);
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

async function fetchBackendCategoryIds(categorySlug?: string) {
  if (!categorySlug || categorySlug === "all") return undefined;

  const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:8081";
  const [categoriesResponse, subCategoriesResponse] = await Promise.all([
    fetch(`${apiUrl}/api/categories`),
    fetch(`${apiUrl}/api/sub-categories`),
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
  const match = categories.find((category: any) => {
    const candidates = [
      category.id,
      category.slug,
      category.name,
      category.name_en,
    ].filter((value) => value != null);

    return candidates.some((value) => String(value).toLowerCase() === normalizedRequested);
  });

  if (!match) return [requested];

  const ids = [
    String(match.id),
    ...subCategories
      .filter((subCategory: any) => String(subCategory.category_id) === String(match.id))
      .map((subCategory: any) => String(subCategory.id)),
  ];

  return ids;
}

export function useMartProducts(categorySlug?: string, search?: string, limit = 20) {
  return useQuery({
    queryKey: ["mart-products", categorySlug, search, limit],
    queryFn: async () => {
      const categoryIds = await fetchBackendCategoryIds(categorySlug);
      const vendorProducts = await fetchVendorProducts(categoryIds, search);

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

export function useMartProduct(slug: string) {
  return useQuery({
    queryKey: ["mart-product", slug],
    queryFn: async () => {
      if (slug.startsWith("mysql-product-")) {
        const productId = slug.replace("mysql-product-", "");
        const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:8081";
        const response = await fetch(`${apiUrl}/api/products/${encodeURIComponent(productId)}`);
        const json = await response.json().catch(() => ({}));
        if (!response.ok || json.success === false) {
          throw new Error(json.message || "Vendor product not found");
        }
        const product = toPublicProduct(json.data as any);
        if (product.category_id) {
          const { data: category } = await supabase
            .from("mart_categories")
            .select("id, name, name_en, slug")
            .eq("id", product.category_id)
            .single();
          product.category = category || undefined;
        }
        return {
          ...product,
          gallery_urls: product.gallery_urls || [],
        } as MartProduct;
      }

      const { data, error } = await supabase
        .from("mart_products")
        .select("*, mart_categories!mart_products_category_id_fkey(id, name, name_en, slug)")
        .eq("slug", slug)
        .single();
      if (error) throw error;
      return {
        ...data,
        gallery_urls: data.gallery_urls || [],
        category: data.mart_categories,
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
  is_active: boolean;
  sort_order: number;
}

export function useMartBanners() {
  return useQuery({
    queryKey: ["mart-banners"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mart_banners")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return (data || []) as MartBanner[];
    },
  });
}

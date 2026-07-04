import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface DealCategory {
  id: string;
  name: string;
  name_en: string | null;
  slug: string;
  icon: string | null;
  parent_id: string | null;
  sort_order: number;
  is_active: boolean;
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
  deal_categories?: DealCategory;
}

export function useDealCategories() {
  return useQuery({
    queryKey: ["deal-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deal_categories")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return data as DealCategory[];
    },
  });
}

/** Returns only top-level (parent) categories */
export function useDealParentCategories() {
  return useQuery({
    queryKey: ["deal-parent-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deal_categories")
        .select("*")
        .is("parent_id", null)
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return data as DealCategory[];
    },
  });
}

/** Returns subcategories for a given parent */
export function useDealSubcategories(parentId: string | null) {
  return useQuery({
    queryKey: ["deal-subcategories", parentId],
    queryFn: async () => {
      if (!parentId) return [];
      const { data, error } = await supabase
        .from("deal_categories")
        .select("*")
        .eq("parent_id", parentId)
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return data as DealCategory[];
    },
    enabled: !!parentId,
  });
}

/** Returns all categories as a tree (parents with children) */
export function useDealCategoryTree() {
  return useQuery({
    queryKey: ["deal-category-tree"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deal_categories")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      const all = data as DealCategory[];
      const parents = all.filter(c => !c.parent_id);
      return parents.map(p => ({
        ...p,
        children: all.filter(c => c.parent_id === p.id),
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
    queryKey: ["deal-listings", filters],
    queryFn: async () => {
      let query = supabase
        .from("deal_listings")
        .select("*, deal_categories(*)");

      if (filters?.categorySlug) {
        // Find the category by slug
        const { data: cat } = await supabase
          .from("deal_categories")
          .select("id")
          .eq("slug", filters.categorySlug)
          .single();
        if (cat) {
          // Also get child categories (for parent category browsing)
          const { data: children } = await supabase
            .from("deal_categories")
            .select("id")
            .eq("parent_id", cat.id);
          const catIds = [cat.id, ...(children?.map(c => c.id) || [])];
          query = query.in("category_id", catIds);
        }
      }

      if (filters?.search) {
        query = query.or(`title.ilike.%${filters.search}%,title_en.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }

      if (filters?.division) {
        query = query.eq("location_division", filters.division);
      }

      if (filters?.district) {
        query = query.eq("location_district", filters.district);
      }

      if (filters?.thana) {
        query = query.eq("location_area", filters.thana);
      }

      if (filters?.condition) {
        query = query.eq("condition", filters.condition);
      }

      if (filters?.minPrice !== undefined) {
        query = query.gte("price", filters.minPrice);
      }
      if (filters?.maxPrice !== undefined) {
        query = query.lte("price", filters.maxPrice);
      }

      if (filters?.sortBy === "price_asc") {
        query = query.order("price", { ascending: true });
      } else if (filters?.sortBy === "price_desc") {
        query = query.order("price", { ascending: false });
      } else {
        query = query.order("is_featured", { ascending: false }).order("created_at", { ascending: false });
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map((d: any) => ({
        ...d,
        images: Array.isArray(d.images) ? d.images : [],
      })) as DealListing[];
    },
  });
}

export function useDealListing(id: string) {
  return useQuery({
    queryKey: ["deal-listing", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deal_listings")
        .select("*, deal_categories(*)")
        .eq("id", id)
        .single();
      if (error) throw error;
      return { ...data, images: Array.isArray(data.images) ? data.images : [] } as DealListing;
    },
    enabled: !!id,
  });
}

export function useFeaturedDeals() {
  return useQuery({
    queryKey: ["deal-featured"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deal_listings")
        .select("*, deal_categories(*)")
        .eq("is_featured", true)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(8);
      if (error) throw error;
      return (data || []).map((d: any) => ({
        ...d,
        images: Array.isArray(d.images) ? d.images : [],
      })) as DealListing[];
    },
  });
}

export function useLatestDeals() {
  return useQuery({
    queryKey: ["deal-latest"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deal_listings")
        .select("*, deal_categories(*)")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data || []).map((d: any) => ({
        ...d,
        images: Array.isArray(d.images) ? d.images : [],
      })) as DealListing[];
    },
  });
}

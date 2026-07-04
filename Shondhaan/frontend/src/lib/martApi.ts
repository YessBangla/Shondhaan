import { getMySqlAuth } from "@/lib/mysqlAuth";

const MART_API_BASE_URL = import.meta.env.VITE_MART_API_BASE_URL || "http://localhost:8081";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${MART_API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.success === false) {
    throw new Error(data.message || "Mart API request failed");
  }
  return data as T;
}

export interface MartSeller {
  id: number;
  user_id: number | null;
  slug: string | null;
  shop_name: string | null;
  shop_type?: string | null;
  seller_name: string;
  seller_email: string | null;
  seller_mobile: string | null;
  seller_address: string | null;
  seller_total_products: number;
  seller_verified: 0 | 1 | boolean;
  banner_url?: string | null;
  profile_image_url?: string | null;
  store_carousel_media?: string | Array<{ url: string; type: "image" | "video"; title?: string }> | null;
  kyc_admin_message?: string | null;
}

export interface MartProduct {
  id: number;
  seller_id: number | null;
  vendor_id?: number | null;
  category_id?: number | string | null;
  image: string | null;
  gallery_urls?: string[] | string | null;
  name_bn: string;
  name_en: string | null;
  description: string | null;
  sale_price: number;
  original_price: number | null;
  stock: number;
  status: "active" | "inactive";
  unit: string | null;
  featured: 0 | 1 | boolean;
  sold_qty: number;
  discount: number;
  is_freedelivery: 0 | 1 | boolean;
  seller_name?: string;
  shop_name?: string | null;
  seller_email?: string | null;
  seller_mobile?: string | null;
  seller_verified?: 0 | 1 | boolean;
  sold_count?: number | string | null;
  review_count?: number | string | null;
  avg_rating?: number | string | null;
}

export interface MartCoupon {
  id: number;
  seller_id?: number | string | null;
  code: string;
  description: string | null;
  discount_type: "percentage" | "fixed";
  discount_value: number | string;
  min_order_amount: number | string | null;
  max_discount_amount?: number | string | null;
  usage_limit?: number | null;
  used_count?: number;
  starts_at?: string | null;
  expires_at: string | null;
  is_active?: 0 | 1 | boolean;
  discount_amount?: number;
  eligible_subtotal?: number;
  shop_name?: string | null;
  seller_name?: string | null;
}

export interface MartCouponValidationItem {
  product_id: string | number;
  quantity: number;
  unit_price: number;
  seller_id?: string | number | null;
}

export function toPanelProduct(product: MartProduct) {
  const galleryUrls = Array.isArray(product.gallery_urls)
    ? product.gallery_urls
    : typeof product.gallery_urls === "string"
      ? (() => {
          try {
            const parsed = JSON.parse(product.gallery_urls);
            return Array.isArray(parsed) ? parsed : [];
          } catch {
            return [];
          }
        })()
      : [];

  return {
    ...product,
    id: String(product.id),
    name: product.name_bn,
    price: Number(product.sale_price || 0),
    original_price: product.original_price == null ? null : Number(product.original_price),
    total_sold: Number(product.sold_count ?? product.sold_qty ?? 0),
    is_active: product.status === "active",
    is_featured: Boolean(product.featured),
    image_url: product.image,
    gallery_urls: galleryUrls.slice(0, 4),
    slug: `mysql-product-${product.id}`,
    category_id: product.category_id != null ? String(product.category_id) : null,
    rating: Number(product.avg_rating || 0),
    total_reviews: Number(product.review_count || 0),
    vendor_id: product.vendor_id ?? product.seller_id ?? null,
  };
}

export const toPublicProduct = toPanelProduct;

export async function getCurrentMartSeller() {
  const auth = getMySqlAuth();
  const user = auth?.user;
  if (!user) throw new Error("Login is required");

  const list = await request<{ success: true; data: MartSeller[] }>(`/api/sellers?user_id=${user.id}`);
  if (list.data[0]) return list.data[0];

  const created = await request<{ success: true; data: { id: number | null } }>("/api/sellers", {
    method: "POST",
    body: JSON.stringify({
      user_id: user.id,
      slug: user.name,
      shop_name: user.shop_name || user.name,
      shop_type: user.shop_type || null,
      seller_name: user.name,
      seller_email: user.email,
      seller_mobile: user.mobile,
      seller_address: user.address,
    }),
  });

  if (created.data.id) {
    return {
      id: created.data.id,
      user_id: Number(user.id),
      slug: `${String(user.name || "seller").toLowerCase().replace(/[^a-z0-9\u0980-\u09FF]+/g, "-").replace(/(^-|-$)/g, "")}-${user.id}`,
      shop_name: user.shop_name || user.name,
      shop_type: user.shop_type || null,
      seller_name: user.name,
      seller_email: user.email,
      seller_mobile: user.mobile,
      seller_address: user.address,
      seller_total_products: 0,
      seller_verified: 1,
    };
  }

  const refreshed = await request<{ success: true; data: MartSeller[] }>(`/api/sellers?user_id=${user.id}`);
  if (!refreshed.data[0]) throw new Error("Could not load mart seller");
  return refreshed.data[0];
}

export async function listMartProducts(sellerId: number) {
  const data = await request<{ success: true; data: MartProduct[] }>(`/api/products?seller_id=${sellerId}`);
  return data.data;
}

export async function getMartSellerBySlug(slug: string) {
  const list = await request<{ success: true; data: MartSeller[] }>(`/api/sellers?slug=${encodeURIComponent(slug)}`);
  return list.data[0] || null;
}

export async function getMartSellerById(sellerId: number) {
  const result = await request<{ success: true; data: MartSeller }>(`/api/sellers/${sellerId}`);
  return result.data;
}

export async function createMartProduct(payload: Partial<MartProduct>) {
  return request<{ success: true; data: { id: number } }>("/api/products", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateMartProduct(productId: string | number, payload: Partial<MartProduct>) {
  return request<{ success: true; message: string }>(`/api/products/${productId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function deleteMartProduct(productId: string | number) {
  return request<{ success: true; message: string }>(`/api/products/${productId}`, {
    method: "DELETE",
  });
}

export async function listActiveMartCoupons(limit = 5) {
  const data = await request<{ success: true; data: MartCoupon[] }>(`/api/coupons?limit=${limit}`);
  return data.data;
}

export async function listSellerMartCoupons(sellerId: number, limit = 50) {
  const data = await request<{ success: true; data: MartCoupon[] }>(`/api/coupons?seller_id=${sellerId}&limit=${limit}`);
  return data.data;
}

export async function createMartCoupon(payload: Partial<MartCoupon>) {
  return request<{ success: true; data: { id: number } }>("/api/coupons", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateMartCoupon(couponId: string | number, payload: Partial<MartCoupon>) {
  return request<{ success: true; message: string }>(`/api/coupons/${couponId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function deleteMartCoupon(couponId: string | number) {
  return request<{ success: true; message: string }>(`/api/coupons/${couponId}`, {
    method: "DELETE",
  });
}

export async function validateMartCoupon(code: string, subtotal: number, items: MartCouponValidationItem[] = []) {
  const data = await request<{ success: true; data: MartCoupon }>("/api/coupons/validate", {
    method: "POST",
    body: JSON.stringify({ code, subtotal, items }),
  });
  return data.data;
}

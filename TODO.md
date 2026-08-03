# Store URL - Show store name only (no ID)

## Steps
1. [x] Backend `sellers.js`: generate seller slug without `-<user_id>` suffix (unique)
2. [x] Backend `products.js`: add `s.slug AS seller_slug` to product queries
3. [x] Frontend `martApi.ts`: add `seller_slug` to `MartProduct` + `toPanelProduct`
4. [x] Frontend `MartProductDetail.tsx`: store links use `seller_slug`
5. [x] Frontend `MartHome.tsx`: store link uses `shop.slug`
6. [x] Frontend `MartStore.tsx`: resolve slug OR numeric user_id
7. [x] Backfill existing seller slugs to remove ID suffix (tavi-8→tavi, rabeya-shop-2→rabeya-shop, farjana-yeasmin-sumaiya-5→farjana-yeasmin-sumaiya)
8. [x] Fix legacy `mysql-product-<id>` links to resolve real product slug first:
  - `NotificationBell.tsx` — resolves slug before navigating
  - `VendorMessageDetail.tsx` — resolves slug before navigating
9. [x] `MartProductDetail.tsx` — auto-redirect legacy `mysql-product-*` URLs to readable slug
10. [x] `MartStore.tsx` — fetchSeller now detects numeric vs slug param and queries accordingly
11. [x] Verify

## Product URL fix (mysql-product-5 → readable slug)
- Backend `products.js` already returns real `slug` + `seller_slug` in all 3 product queries (GET /, GET /slug/:slug, GET /:id)
- Database has all products with real slugs (teddy-bear, groot, red-gown, black-dress, gucci-bag, etc.)
- `toPanelProduct` still falls back to `mysql-product-${id}` only when a product genuinely has no slug (legacy rows)
- Remaining `mysql-product-` references are intentional fallbacks for legacy compatibility

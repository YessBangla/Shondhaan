- [x] Update AddProductForm to fetch categories from yservice_backend GET /api/categories
- [x] Replace Supabase mart_categories usage with fetch/axios (existing fetch is fine) and remove unused Supabase dependency for categories
- [x] Update Category interface and dropdown rendering to use {id, name} only
- [x] Ensure editProduct preselect works (setCategoryId from editProduct.category_id)
- [ ] Add Sub-Category dropdown after category selection (filtered by selected category)
- [ ] Persist sub_category_id into products table + POST/PUT endpoints + frontend payload
- [ ] Run frontend typecheck/build or start dev server to confirm no TS errors


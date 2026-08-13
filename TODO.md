# Task: Enforce 5-free-product limit with buy-package message

## Done
- [x] Analyze current implementation (frontend gating + backend allowance logic)
- [x] Wire `requireProductAllowance` guard into POST /api/products in `yessmart_backend/routes/products.js`
- [x] Fix "Could not load packages" — route double-prefix mismatch in `yessmart_backend/server.js` (changed mount from `/api/mart-packages` to `/api` so internal `/mart-packages` and `/sellers/:id/...` paths resolve)
- [x] Frontend `MartPanel.tsx` shows explicit "cannot add product without buying a package" message and opens the package modal
- [x] Frontend `AddProductForm.tsx` handles backend `PRODUCT_LIMIT_REACHED` via `onLimitReached` → opens package modal
- [x] Frontend `martApi.ts` attaches `code` to errors for reliable limit detection

## Verify
- [ ] Restart `yessmart_backend` server so the route mount + product-limit enforcement take effect
- [ ] Confirm `GET /api/mart-packages` returns packages (no more "Could not load packages")
- [ ] Confirm sellers can add up to 5 products free, then see the buy-package message/modal

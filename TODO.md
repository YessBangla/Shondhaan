# ShurjoPay Prepaid Payment Fix — Plan A (Code Fix)

## Goal
Fix the ShurjoPay `sp_code 1062 "Please check your URL & Parameter!"` error in the EmployerPanel prepaid flow.

## Root Cause (Confirmed)
1. `yessjob_backend/utils/shurjopay.js` is **broken** — it contains a full copy of `routes/payments.js` (an Express router), NOT the actual ShurjoPay helper functions. So `routes/payments.js` destructures `{ initiateShurjoPayCheckout, checkoutUrlFrom, paymentRecordFrom }` which are all `undefined`.
2. `routes/payments.js` never calls ShurjoPay's real `get_token` + `secret-pay` flow. It uses a placeholder `checkout_url` and `sp_order_id = null`.
3. `yessjob_backend/.env` has placeholder merchant credentials (`your_sandbox_username` / `your_sandbox_password`), which ShurjoPay rejects → sp_code 1062.

## Tasks
- [x] Confirm root cause (routes/payments.js, utils/shurjopay.js, middleware/requireAuth.js)
- [x] Rewrite `yessjob_backend/utils/shurjopay.js` with proper ShurjoPay helpers:
  - `getToken()` — POST to `SURJOPAY_GET_TOKEN_URL` with username/password
  - `initiateShurjoPayCheckout({...})` — build full secret-pay payload (prefix, store_id, return_url, cancel_url, amount, order_id, currency, customer_*, client_ip, value1-4), POST to `SURJOPAY_SECRETPAY_URL`
  - `checkoutUrlFrom()` / `paymentRecordFrom()` — response parsers
  - `verifyShurjoPayPayment()` — verification helper
  - `requireConfig()` — validate required env vars
- [x] Update `yessjob_backend/routes/payments.js`:
  - Fix `initiate` route to call `initiateShurjoPayCheckout` and persist the real `checkout_url` / `sp_order_id`
  - Add missing `/shurjopay/verify/:orderId` and `/shurjopay/cancel/:orderId` routes
- [x] Syntax-check modified files (node -c)
- [x] Document the `.env` credential requirement (user must set real sandbox credentials)
- [ ] USER ACTION REQUIRED: Replace `SURJOPAY_MERCHANT_NAME=your_sandbox_username` and `SURJOPAY_MERCHANT_PASSWORD=your_sandbox_password` in `yessjob_backend/.env` with real ShurjoPay sandbox credentials
  - CONFIRMED: `.env` still has placeholders (your_sandbox_username / your_sandbox_password)
  - Current symptom: POST /initiate returns 500 "Unauthorized" — the new code now calls ShurjoPay get_token, which rejects the placeholder creds (HTTP 401)
- [ ] USER ACTION REQUIRED: Restart the yessjob backend (node server.js) and re-test prepaid flow

## Note
The code fix alone won't resolve sp_code 1062 — the placeholder credentials in `.env` must be replaced with real ShurjoPay sandbox merchant credentials by the user.


# EmployerPanel ShurjoPay Prepaid Fix — TODO

## Goal
Fix the `POST /api/payments/shurjopay/initiate` 500 error in the EmployerPanel prepaid flow.

## Root Cause
- `routes/payments.js` calls `db.query(...)` without defining `db` (throws ReferenceError → 500).
- Route reads `req.user` but auth middleware is commented out; working routes use `req.shondhaanUser`.
- `utils/shurjopay.js` only handles one checkout URL response shape.

## Tasks
- [x] Confirm root cause (backend routes/payments.js, utils/shurjopay.js, frontend EmployerPanel.tsx)
- [x] Rewrite `routes/payments.js`: add mysql pool, auth chain, use req.shondhaanUser, fix db.query→pool.query, add verify route
- [x] Improve `utils/shurjopay.js`: add checkoutUrlFrom() helper, build return_url/cancel_url
- [x] Syntax-check modified files
3- [x] Restart yessjob_backend and verify endpoint returns 401 (not 500/502) — new code is active
- [x] Freed port 5050 (killed conflicting hidden server process PID 11436) so the user can start their own server cleanly
- [x] ROOT CAUSE FOUND & FIXED: `routes/payments.js` imported `checkoutUrlFrom`/`paymentRecordFrom` from `utils/shurjopay.js`, but they were NOT exported → `TypeError: checkoutUrlFrom is not a function` → 500. Added them to module.exports.
- [x] Verified endpoint returns 401 (not 500) with dummy token — route no longer throws
- [x] Restarted server with latest code; verified full initiate flow returns 200 + valid checkout_url using a valid employer JWT

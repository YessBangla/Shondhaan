# Fix AdminAnalytics 401 Unauthorized on /api/admin/job-stats

## Root Cause
- Frontend reads token from `localStorage.getItem("token")` but the admin JWT is stored in `localStorage["yess_mysql_auth"]` as `{ user, token }`.
- Backend `requireAuth` verifies against yessjob's own `JWT_SECRET`, but the admin token is signed by the central backend's secret.

## Steps
- [x] Create shared auth helper in yessjob backend (`utils/auth.js`) mirroring `jobs.js` `verifyShondhaanUser`.
- [x] Update `yessjob_backend/middleware/requireAuth.js` to use the shared helper.
- [x] Update `yessjob_backend/routes/adminJobStats.js` to use the shared admin check.
- [x] Update `Shondhaan/frontend/src/components/admin/AdminAnalytics.tsx` to read token via `getMySqlAuth()` and send `Bearer` header.
- [x] Verify backend files pass `node --check` (all OK).
- [x] Verify TypeScript — no new errors in `AdminAnalytics.tsx` (other errors are pre-existing and unrelated).

## Done ✅

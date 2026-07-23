# Fix 401 Unauthorized at `/api/employer-profile/me`

## Status: ✅ COMPLETED

### Step 1: Install `cookie-parser` in yessjob_backend ✅
- Installed `cookie-parser` package

### Step 2: Update `yessjob_backend/server.js` ✅
- Added `cookie-parser` require
- Added `app.use(cookieParser())` middleware
- Updated CORS to support credentials with specific origins

### Step 3: Update `yessjob_backend/routes/employerProfile.js` ✅
- Modified `requireVerifiedUser` to try Authorization header first, then fall back to cookie token
- Extracts `req.cookies.token` and forwards as Bearer token to central API

### Step 4: Update `Shondhaan/frontend/src/pages/EmployerPanel.tsx` ✅
- Added `credentials: "include"` to all fetch calls (`fetchJobsJson`, `checkEmployer`, `saveProfile`)

## How It Works Now
1. User logs in via central backend (port 5000) → JWT stored as httpOnly cookie
2. Browser automatically sends this cookie with all requests to yessjob backend (port 5050) when `credentials: "include"` is set
3. Yessjob backend reads `req.cookies.token` with `cookie-parser` and forwards it to central API for verification
4. Central API verifies the JWT and returns user data → yessjob backend authenticates the request


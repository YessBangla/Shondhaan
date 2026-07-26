- [x] Add SQL note for token_blacklist table (manual or migration)
- [x] Update utils/jwt.js to include `jti` claim
- [x] Fix middleware import bug (auth.middleware.js should use utils/jwt.js)
- [x] Add logout controller that blacklists token jti until expiry
- [x] Add POST /logout route to routes/auth.routes.js
- [x] Update middleware to reject blacklisted tokens
- [x] Quick sanity test commands (curl)

## Curl test
1) Login to get token:
   curl -X POST https://backend-shondhaan.com/api/auth/login -H "Content-Type: application/json" -d "{\"identifier\":\"email@example.com\",\"password\":\"password\"}"
2) Logout:
   curl -X POST https://backend-shondhaan.com/api/auth/logout -H "Authorization: Bearer <TOKEN>"
3) Call a protected route using middleware (e.g. requireAuth) and expect 401 "Token revoked".

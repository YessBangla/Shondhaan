# Role-Based User Dashboard Implementation Guide

## Overview

This implementation provides a unified **User Dashboard** accessible to all roles, with:

- ✅ **Role-Based Access Control**: Each role can access only appropriate features
- ✅ **Data Isolation**: Users can only see their own data, NOT other users' dashboards
- ✅ **User Role Restriction**: User role has **ONLY** access to `/user-dashboard`
- ✅ **Multi-Role Access**: Other roles can access both their role panel AND `/user-dashboard`
- ✅ **Security**: Multiple layers of authorization checks prevent data leakage

## Architecture

### Frontend Components

#### 1. **UserDashboard.tsx** (`/src/pages/UserDashboard.tsx`)
Main dashboard component with data isolation features:
- Verifies user authentication and ownership
- Displays only authenticated user's data
- Role-specific statistics
- Error handling for unauthorized access
- Data verification before display

#### 2. **ProtectedRoute.tsx** (`/src/components/ProtectedRoute.tsx`)
Route guard component with data isolation:

```typescript
// Only allow specific roles (no cross-user access)
<ProtectedRoute allowedRoles={["admin", "super_admin"]}>
  <AdminPanel />
</ProtectedRoute>

// Require a single role with data verification
<ProtectedRoute requiredRole="provider">
  <ProviderPanel />
</ProtectedRoute>

// Only allow standard users (exclusive access)
<ProtectedRoute onlyUser>
  <UserDashboard />
</ProtectedRoute>

// Allow all authenticated users (with data isolation)
<ProtectedRoute>
  <MyComponent />
</ProtectedRoute>
```

### Backend Middleware

#### Authorization Middleware (`/middleware/authorization.middleware.js`)

1. **authorizeOwnData** - Prevents cross-user access
   - Validates user owns the requested data
   - Returns 403 if accessing other user's data
   - Checks userId in request params/query

2. **authorizeRolePanel** - Role-specific panel access
   - Ensures only authorized roles access panels
   - Prevents standard users from accessing admin panels
   - Returns 403 for role mismatch

3. **preventUserRolePanelAccess** - User role restriction
   - Prevents "user" role from accessing any panels
   - User role can ONLY access `/user-dashboard`

### Backend Endpoints

#### New Endpoints (in `/api/user/`)

1. **GET `/api/user/profile`** (with authorization)
   - Returns ONLY current user's profile data
   - Requires authentication
   - Rejects cross-user access attempts
   - Double-verification of user ownership

2. **GET `/api/user/stats`** (with authorization)
   - Returns ONLY current user's statistics
   - Role-based stat calculation
   - All queries filtered by authenticated user ID
   - No data leakage between users

## Data Isolation Architecture

### Frontend Layer
1. Validates authenticated user ID before loading
2. Verifies profile data belongs to authenticated user
3. Shows error if data mismatch detected
4. Blocks navigation to other users' dashboards

### Backend Layer
1. Authorization middleware checks ownership
2. Double-verification in controller functions
3. All database queries filtered by user ID
4. Returns 403 for unauthorized access

### Database Layer
1. All queries include user ID WHERE clause
2. Stats only calculate for current user
3. No admin override for user profile access
4. Cross-user queries impossible

## Access Control Rules

### User Role (Restricted)
- ✅ Can access: `/user-dashboard` ONLY
- ❌ Cannot access: Any role panel
- ❌ Cannot view: Other users' dashboards
- View their own profile and statistics
- Cannot access admin/staff panels

### Non-User Roles (Full Access with Data Isolation)
- ✅ Can access: `/user-dashboard` + their role panel
- ✅ Can access: Role-specific features
- ✅ Can see: Only their own user dashboard
- ❌ Cannot view: Other users' dashboards
- Role-specific restrictions apply

### Cross-User Access Prevention
- All users see `403 Forbidden` if trying to access another user's data
- Frontend redirects to `/user-dashboard` on unauthorized attempts
- Backend rejects with `ACCESS_DENIED` error code
- Audit logs (optional) can track access attempts

## Implementation Files

### Frontend
- ✅ `src/pages/UserDashboard.tsx` - Dashboard with data validation
- ✅ `src/components/ProtectedRoute.tsx` - Route guard with verification
- ✅ `src/App.tsx` - Route configuration

### Backend  
- ✅ `middleware/authorization.middleware.js` - Authorization checks
- ✅ `middleware/auth.middleware.js` - Authentication (existing)
- ✅ `routes/user.routes.js` - API routes with middleware
- ✅ `controllers/user.controller.js` - Data isolation logic

## Routes Configuration

### Frontend Routes

```javascript
// User Dashboard - all roles can access their own
<Route path="/user-dashboard" element={<UserDashboard />} />

// Role-specific panels - restricted by authorization
<Route path="/admin" element={<AdminLayout />} />
<Route path="/provider" element={<ProviderPanel />} />
// ... etc

// Note: Users cannot access other users' dashboards
```

### Backend Routes

```javascript
// Profile endpoint - requires authentication + ownership verification
GET /api/user/profile
  - Middleware: authMiddleware, authorizeOwnData
  - Returns: Current user's profile only

// Stats endpoint - requires authentication + ownership verification
GET /api/user/stats
  - Middleware: authMiddleware, authorizeOwnData
  - Returns: Current user's stats only
```

## Security Features

### 1. Authentication
- ✅ JWT token verification
- ✅ Expired token detection
- ✅ Session validation

### 2. Authorization
- ✅ Role-based access control
- ✅ User ownership verification
- ✅ Cross-user access prevention
- ✅ Multiple authorization layers

### 3. Data Privacy
- ✅ Users can only see their own data
- ✅ Dashboard data filtered by user ID
- ✅ Statistics calculated per-user only
- ✅ No data leakage between users

### 4. Error Handling
- ✅ Clear 401 for authentication errors
- ✅ Clear 403 for authorization errors
- ✅ User-friendly error messages
- ✅ Secure error logging

## Testing Data Isolation

### Test Case 1: User Cannot Access Other Dashboard
```bash
# Login as User A
curl -X POST /api/auth/login -d "email=userA@example.com"
# Token: tokenA

# Try to access User B's profile
curl -H "Authorization: Bearer tokenA" \
  http://localhost:5000/api/user/profile?userId=userB_id
# Expected: 403 Forbidden - ACCESS_DENIED
```

### Test Case 2: User Role Cannot Access Panels
```bash
# Login as User role
curl -X GET -H "Authorization: Bearer tokenUser" \
  http://localhost:5173/admin
# Expected: Redirect to /user-dashboard
```

### Test Case 3: Admin Can Access Their Own Dashboard
```bash
# Login as Admin
curl -H "Authorization: Bearer tokenAdmin" \
  http://localhost:5000/api/user/profile
# Expected: 200 OK with admin's profile data
```

### Test Case 4: Admin Cannot See Other Admin's Dashboard
```bash
# Login as Admin A
# Try to view Admin B's profile
curl -H "Authorization: Bearer tokenAdminA" \
  http://localhost:5000/api/user/profile?userId=adminB_id
# Expected: 403 Forbidden - ACCESS_DENIED
```

## Customization

### Adding Role-Specific Content

```typescript
// In UserDashboard.tsx
const roleConfig = getRoleConfig(userRole);

// Add role-specific sections
{userRole === "provider" && (
  <ProviderStatsSection stats={stats} />
)}

{userRole === "mart_vendor" && (
  <VendorStatsSection stats={stats} />
)}
```

### Updating Authorization Rules

Modify `authorization.middleware.js`:

```javascript
export const authorizeRolePanel = (requiredRole) => {
  return (req, res, next) => {
    const userRole = req.user?.role;
    
    // Add custom logic
    if (userRole === "user") {
      return res.status(403).json({
        message: "Standard users cannot access panels",
      });
    }
    
    next();
  };
};
```

### Adding More Statistics

Update `user.controller.js`:

```javascript
// For mall vendors
if (userRole === "mart_vendor") {
  const sales = await req.app.locals.db.query(
    "SELECT SUM(amount) FROM orders WHERE vendor_id = ?",
    [userId]
  );
  stats.totalSales = sales[0]?.[0]?.SUM || 0;
}
```

## Common Issues & Solutions

### Issue: "You can only access your own data" error
**Cause**: User token ID doesn't match requested data
**Solution**: 
- Ensure token is from the correct user
- Check that frontend sends correct user ID
- Verify database user_id matches token

### Issue: User role sees admin panel
**Cause**: Missing `preventUserRolePanelAccess` middleware
**Solution**:
- Add middleware to role-specific routes
- Verify ProtectedRoute component is used
- Check role configuration in token

### Issue: Stats showing other user's data
**Cause**: Missing user ID filter in query
**Solution**:
- Check WHERE clause includes `userId`
- Verify `req.user.id` is set correctly
- Add data verification in controller

### Issue: 403 errors on legitimate access
**Cause**: User ID mismatch or middleware config
**Solution**:
- Verify authorized user's token
- Check authorization middleware order
- Ensure token contains correct user ID

## Database Queries

All queries include user ID filtering:

```sql
-- User bookings only
SELECT * FROM bookings WHERE customer_id = ? LIMIT 10

-- Provider's bookings only
SELECT * FROM bookings WHERE provider_id = ? LIMIT 10

-- User reviews only
SELECT * FROM reviews WHERE reviewer_id = ? OR provider_id = ?

-- Vendor orders only
SELECT * FROM orders WHERE vendor_id = ?
```

## Monitoring & Logging

Add logging for security events:

```javascript
// Log unauthorized access attempts
console.warn(`Unauthorized access attempt: ${req.user.id} tried to access ${req.path}`);

// Log cross-user access attempts
console.warn(`Cross-user access attempt: ${req.user.id} tried to access data of ${requestedUserId}`);

// Log successful dashboard access
console.info(`Dashboard accessed by: ${req.user.id} (${req.user.role})`);
```

## Deployment Checklist

- ✅ Authorization middleware deployed
- ✅ Data isolation queries verified
- ✅ Frontend validation in place
- ✅ Error messages configured
- ✅ Environment variables set
- ✅ Database queries tested
- ✅ Token verification working
- ✅ Cross-user access tests passed
- ✅ Logging configured
- ✅ Documentation updated

## File Structure

```
frontend/src/
├── pages/
│   ├── UserDashboard.tsx (with data validation)
│   └── ...
├── components/
│   ├── ProtectedRoute.tsx (with data isolation)
│   └── ...
└── App.tsx (updated routes)

backend/
├── middleware/
│   ├── auth.middleware.js (authentication)
│   ├── authorization.middleware.js (NEW - authorization)
│   └── ...
├── routes/
│   └── user.routes.js (with auth guards)
├── controllers/
│   └── user.controller.js (with data isolation)
└── ...
```

---

**Last Updated**: 2026-07-08
**Version**: 2.0 (with Data Isolation)


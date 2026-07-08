import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { getMySqlAuth } from "@/lib/mysqlAuth";
import { ReactNode } from "react";
import PageLoader from "@/components/PageLoader";
import { toast } from "sonner";

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: string[];
  requiredRole?: string;
  onlyUser?: boolean; // If true, only "user" role can access
}

/**
 * ProtectedRoute Component
 * 
 * Features:
 * - Prevents unauthorized access
 * - Data isolation - users can only access their own data
 * - Role-based access control
 * - Automatic redirects to appropriate pages
 * 
 * Usage examples:
 * 
 * 1. Restrict to specific roles:
 *    <ProtectedRoute allowedRoles={["admin", "super_admin"]}>
 *      <AdminPanel />
 *    </ProtectedRoute>
 * 
 * 2. Restrict to a single role:
 *    <ProtectedRoute requiredRole="admin">
 *      <AdminPanel />
 *    </ProtectedRoute>
 * 
 * 3. Only allow standard users:
 *    <ProtectedRoute onlyUser>
 *      <UserDashboard />
 *    </ProtectedRoute>
 * 
 * 4. Allow all authenticated users (no role restriction):
 *    <ProtectedRoute>
 *      <MyDashboard />
 *    </ProtectedRoute>
 */
const ProtectedRoute = ({
  children,
  allowedRoles,
  requiredRole,
  onlyUser = false,
}: ProtectedRouteProps) => {
  const { user, loading: authLoading } = useAuth();
  const mysqlAuth = getMySqlAuth();
  const userRole = mysqlAuth?.user?.role;
  const userId = mysqlAuth?.user?.id;

  // Show loader while checking authentication
  if (authLoading || (!user && !mysqlAuth?.user)) {
    return <PageLoader />;
  }

  // Check if user is authenticated
  if (!user && !mysqlAuth?.user) {
    toast.error("Please login to continue");
    return <Navigate to="/auth" replace />;
  }

  // Verify user ID is present (data isolation)
  if (!userId) {
    toast.error("Session error. Please login again");
    return <Navigate to="/auth" replace />;
  }

  // Check role restrictions
  if (onlyUser) {
    // Only allow user role
    if (userRole !== "user") {
      toast.error("This page is only for standard users");
      return <Navigate to="/user-dashboard" replace />;
    }
  } else if (requiredRole) {
    // Require specific role
    if (userRole !== requiredRole) {
      toast.error(`Access denied. This requires ${requiredRole} role`);
      return <Navigate to="/user-dashboard" replace />;
    }
  } else if (allowedRoles && allowedRoles.length > 0) {
    // Allow only specific roles
    if (!allowedRoles.includes(userRole || "")) {
      toast.error("You don't have access to this page");
      return <Navigate to="/user-dashboard" replace />;
    }
  }

  // All checks passed
  return <>{children}</>;
};

export default ProtectedRoute;

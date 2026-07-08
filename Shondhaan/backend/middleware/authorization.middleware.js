/**
 * Authorization Middleware
 * Ensures users can only access their own data
 */

export const authorizeOwnData = (req, res, next) => {
  try {
    const requestedUserId = req.params.userId || req.query.userId;
    const authenticatedUserId = req.user?.id;

    if (!authenticatedUserId) {
      return res.status(401).json({ message: "Unauthorized - No user in token" });
    }

    // If a specific userId is requested, ensure it matches the authenticated user
    if (requestedUserId && requestedUserId !== authenticatedUserId) {
      return res.status(403).json({
        message: "Forbidden - You can only access your own data",
        code: "ACCESS_DENIED",
      });
    }

    next();
  } catch (err) {
    return res.status(500).json({ message: "Authorization error" });
  }
};

export const authorizeRolePanel = (requiredRole) => {
  return (req, res, next) => {
    try {
      const userRole = req.user?.role;
      const authenticatedUserId = req.user?.id;

      if (!userRole || !authenticatedUserId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Check if user has the required role
      if (userRole !== requiredRole) {
        return res.status(403).json({
          message: `Forbidden - This panel requires ${requiredRole} role`,
          code: "ROLE_MISMATCH",
        });
      }

      next();
    } catch (err) {
      return res.status(500).json({ message: "Authorization error" });
    }
  };
};

/**
 * Prevent standard users from accessing role-specific panels
 * Users with "user" role can only access /user-dashboard
 */
export const preventUserRolePanelAccess = (req, res, next) => {
  try {
    const userRole = req.user?.role;

    if (userRole === "user") {
      return res.status(403).json({
        message: "Forbidden - Your role does not have access to this panel",
        code: "USER_ROLE_RESTRICTED",
      });
    }

    next();
  } catch (err) {
    return res.status(500).json({ message: "Authorization error" });
  }
};

/**
 * Authorization Middleware
 * Ensures users can only access their own data
 */

export const authorizeOwnData = (req, res, next) => {
  try {
    const requestedUserId = req.params.userId || req.query.userId;
    const authenticatedUserId = req.user?.id;

    // Debug (optional but useful)
    console.log("Requested ID:", requestedUserId);
    console.log("Auth User ID:", authenticatedUserId);

    if (!authenticatedUserId) {
      return res.status(401).json({
        message: "Unauthorized - No user in token",
      });
    }

    // ✅ FIX: safe comparison (string vs number issue solved)
    if (
      requestedUserId &&
      String(requestedUserId) !== String(authenticatedUserId)
    ) {
      return res.status(403).json({
        message: "Forbidden - You can only access your own data",
        code: "ACCESS_DENIED",
      });
    }

    next();
  } catch (err) {
    console.error("authorizeOwnData error:", err);
    return res.status(500).json({ message: "Authorization error" });
  }
};

---

/**
 * Role-based access control
 */
export const authorizeRolePanel = (requiredRole) => {
  return (req, res, next) => {
    try {
      const userRole = req.user?.role; // ✅ consistent naming
      const authenticatedUserId = req.user?.id;

      console.log("User Role:", userRole);
      console.log("Required Role:", requiredRole);

      if (!userRole || !authenticatedUserId) {
        return res.status(401).json({
          message: "Unauthorized",
        });
      }

      // ✅ FIX: normalize case (optional but safer)
      if (userRole.toLowerCase() !== requiredRole.toLowerCase()) {
        return res.status(403).json({
          message: `Forbidden - This panel requires ${requiredRole} role`,
          code: "ROLE_MISMATCH",
        });
      }

      next();
    } catch (err) {
      console.error("authorizeRolePanel error:", err);
      return res.status(500).json({ message: "Authorization error" });
    }
  };
};

---

/**
 * Prevent standard users from accessing restricted panels
 */
export const preventUserRolePanelAccess = (req, res, next) => {
  try {
    const userRole = req.user?.role;

    console.log("User Role:", userRole);

    if (!userRole) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    // ✅ FIX: normalized comparison
    if (userRole.toLowerCase() === "user") {
      return res.status(403).json({
        message: "Forbidden - Your role does not have access to this panel",
        code: "USER_ROLE_RESTRICTED",
      });
    }

    next();
  } catch (err) {
    console.error("preventUserRolePanelAccess error:", err);
    return res.status(500).json({ message: "Authorization error" });
  }
};
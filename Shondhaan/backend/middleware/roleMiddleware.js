// middleware/roleMiddleware.js
import { ADMIN_PANEL_ROLES } from "../config/constants.js";

const getAuthRole = (auth) => auth?.type || auth?.role;

/**
 * Allow only ADMIN and SUPER_ADMIN
 */
export const requireAdmin = (req, res, next) => {
  try {
    const role = getAuthRole(req.user);

    if (!role) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!ADMIN_PANEL_ROLES.has(role)) {
      return res.status(403).json({
        message: "Forbidden - Admin access required",
      });
    }

    next();
  } catch (err) {
    return res.status(500).json({ message: "Role check error" });
  }
};

/**
 * Allow only SUPER_ADMIN
 */
export const requireSuperAdmin = (req, res, next) => {
  try {
    const role = getAuthRole(req.user);

    if (!role) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (role !== "super_admin") {
      return res.status(403).json({
        message: "Forbidden - Super Admin only",
      });
    }

    next();
  } catch (err) {
    return res.status(500).json({ message: "Role check error" });
  }
};

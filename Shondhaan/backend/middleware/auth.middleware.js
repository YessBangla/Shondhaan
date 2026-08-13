import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../config/env.js";
import { verifyToken } from "../utils/jwt.js";
import { ADMIN_PANEL_ROLES, ADMIN_USER_MANAGEMENT_ROLES } from "../config/constants.js";

export const getAuthRole = (auth) => auth?.type || auth?.role;

export const requireSuperAdmin = (req, res, next) => {
  requireLoggedIn(req, res, () => {
    if (getAuthRole(req.user) !== "super_admin") {
      return res.status(403).json({ message: "Forbidden" });
    }
    next();
  });
};

// NEW MIDDLEWARE: Allows super_admin, admin, and call_center
export const requireAdminOrCallCenter = (req, res, next) => {
  requireLoggedIn(req, res, () => {
    const role = getAuthRole(req.user);
    if (!ADMIN_USER_MANAGEMENT_ROLES.has(role)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    next();
  });
};

export const requireAdminPanelAccess = (req, res, next) => {
  requireLoggedIn(req, res, () => {
    const role = getAuthRole(req.user);
    if (!ADMIN_PANEL_ROLES.has(role)) {
      return res.status(403).json({ message: "Admin access is required" });
    }
    next();
  });
};

export function requireCmsAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  const bearerToken = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length).trim()
    : null;
  const token = bearerToken || req.cookies?.token;
  if (!token) {
    return res.status(401).json({ message: "No token provided" });
  }
  const auth = verifyToken(token);

  if (!auth || !ADMIN_PANEL_ROLES.has(getAuthRole(auth))) {
    return res.status(403).json({ message: "Admin access is required" });
  }
  req.auth = auth;
  next();
}

export const requireLoggedIn = (req, res, next) => {
  try {

    const authHeader = req.headers.authorization;
    const bearerToken = authHeader?.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length).trim()
      : null;
    const token = bearerToken || req.cookies?.token;
    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
};
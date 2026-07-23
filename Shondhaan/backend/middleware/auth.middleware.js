import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../config/env.js";
import { verifyToken } from "../utils/jwt.js";

export const requireSuperAdmin = (req, res, next) => {
  requireLoggedIn(req, res, () => {
    if (req.user?.role !== "super_admin") {
      return res.status(403).json({ message: "Forbidden" });
    }
    next();
  });
};

export function requireCmsAdmin(req, res, next) {
  const token = req.cookies?.token;
  if (!token) {
    return res.status(401).json({ message: "No token provided" });
  }
  const auth = verifyToken(token);

  if (!auth || !["admin", "super_admin", "call_center" ].includes(auth.type)) {
    return res.status(403).json({ message: "Admin access is required" });
  }
  req.auth = auth;
  next();
}

export const requireLoggedIn = (req, res, next) => {
  try {
    const token = req.cookies?.token;
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

// export const requireStaff = (req, res, next) => {
//   if (!isStaffUser(req.user)) {
//     return res.status(403).json({
//       message: "Staff access required",
//     });
//   }
//   next();
// };
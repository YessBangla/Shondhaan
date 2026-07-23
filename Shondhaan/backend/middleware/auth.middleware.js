import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../config/env.js";
import { verifyToken } from "../utils/jwt.js";

export function requireSuperAdmin(req, res, next) {
  const token = req.cookies?.token;

  if (!token) {
    return res.status(401).json({ message: "No token provided" });
  }

  const auth = verifyToken(token);

  if (!auth || auth.type !== "super_admin") {
    return res.status(403).json({ message: "Super admin access is required" });
  }

  req.auth = auth;
  next();
}

export function requireCmsAdmin(req, res, next) {
  const token = req.cookies?.token;

  if (!token) {
    return res.status(401).json({ message: "No token provided" });
  }

  const auth = verifyToken(token);

  if (!auth || !["admin", "super_admin"].includes(auth.type)) {
    return res.status(403).json({ message: "Admin access is required" });
  }

  req.auth = auth;
  next();
}

export const requireLoggedIn = (req, res, next) => {
  try {
    const token = req.cookies?.token;

    console.log("COOKIE TOKEN:", token); // debug

    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    req.auth = decoded;

    next();
  } catch (err) {
    console.error("JWT Error:", err.message);
    return res.status(401).json({ message: "Invalid token" });
  }
};

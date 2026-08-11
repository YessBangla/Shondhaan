import "dotenv/config";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.AUTH_TOKEN_SECRET || "secret";

export const authMiddleware = (req, res, next) => {
  try {
    let token;

    // ✅ 1. Check Authorization header
    const header = req.headers.authorization;
    if (header && header.startsWith("Bearer ")) {
      token = header.split(" ")[1];
    }

    // ✅ 2. Check cookies if no header
    if (!token && req.cookies?.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({ message: "No token" });
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    req.user = decoded;

    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

export const requireSuperAdmin = (req, res, next) => {
  authMiddleware(req, res, () => {
    const role = req.user?.type || req.user?.role;
    if (role !== "super_admin") {
      return res.status(403).json({ message: "Forbidden" });
    }

    next();
  });
};

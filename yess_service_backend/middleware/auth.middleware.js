import "dotenv/config";
import jwt from "jsonwebtoken";

const JWT_SECRETS = Array.from(
  new Set(
    [process.env.JWT_SECRET, process.env.AUTH_TOKEN_SECRET, "secret-key", "secret", ""].filter(Boolean)
  )
);

const verifyToken = (token) => {
  if (!token) return null;

  for (const secret of JWT_SECRETS) {
    try {
      return jwt.verify(token, secret);
    } catch {
      // try the next configured secret
    }
  }

  return null;
};

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

    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ message: "Invalid token" });
    }

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

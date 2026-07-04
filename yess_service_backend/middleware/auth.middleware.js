import "dotenv/config";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.AUTH_TOKEN_SECRET || "secret";

export const authMiddleware = (req, res, next) => {
  try {
    const header = req.headers.authorization;

    if (!header || !header.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No token" });
    }

    const token = header.split(" ")[1];

    const decoded = jwt.verify(token, JWT_SECRET);

    req.user = decoded; 

    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

export const requireSuperAdmin = (req, res, next) => {
  authMiddleware(req, res, () => {
    if (req.user?.type !== "super_admin") {
      return res.status(403).json({ message: "Forbidden" });
    }

    next();
  });
};

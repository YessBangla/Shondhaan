import { pool } from "../config/db.js";
import { verifyToken } from "../utils/jwt.js";

function getBearerToken(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  return authHeader.split(" ")[1];
}

async function isTokenBlacklisted(jti) {
  if (!jti) return false;

  try {
    const [rows] = await pool.execute(
      "SELECT 1 FROM token_blacklist WHERE jti = ? LIMIT 1",
      [jti]
    );

    return rows.length > 0;
  } catch (error) {
    if (error?.code === "ER_NO_SUCH_TABLE") {
      console.warn("token_blacklist table is missing; skipping blacklist check");
      return false;
    }

    throw error;
  }
}

async function getTokenUser(decoded) {
  const userId = decoded?.id;
  if (!userId) return null;

  const [rows] = await pool.execute(
    "SELECT id, type FROM users WHERE id = ? LIMIT 1",
    [userId]
  );

  return rows[0] || null;
}

export async function requireAuth(req, res, next) {
  try {
    const token = getBearerToken(req);
    if (!token) return res.status(401).json({ message: "Unauthorized" });

    const decoded = verifyToken(token);
    const user = await getTokenUser(decoded);

    if (!user) return res.status(401).json({ message: "Unauthorized" });
    if (await isTokenBlacklisted(decoded?.jti)) {
      return res.status(401).json({ message: "Token revoked" });
    }

    req.user = { id: user.id, type: user.type };
    req.token = token;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Unauthorized" });
  }
}

export async function requireSuperAdmin(req, res, next) {
  try {
    const token = getBearerToken(req);
    if (!token) return res.status(401).json({ message: "Unauthorized" });

    const decoded = verifyToken(token);
    const user = await getTokenUser(decoded);

    if (!user) return res.status(401).json({ message: "Unauthorized" });
    if (await isTokenBlacklisted(decoded?.jti)) {
      return res.status(401).json({ message: "Token revoked" });
    }

    if (user.type !== "super_admin") {
      return res.status(403).json({ message: "Forbidden" });
    }

    req.user = { id: user.id, type: user.type };
    req.token = token;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Unauthorized" });
  }
}


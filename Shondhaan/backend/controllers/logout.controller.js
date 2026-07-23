import { pool } from "../db/pool.js";
import { verifyToken } from "../utils/jwt.js";

export async function logout(req, res) {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "Unauthorized" });

    const decoded = verifyToken(token);

    const { jti, id } = decoded || {};
    if (!jti) return res.status(401).json({ message: "Unauthorized" });

    // JWT exp is seconds since epoch
    const expiresAt = decoded.exp ? new Date(decoded.exp * 1000) : null;
    if (!expiresAt) {
      return res.status(400).json({ message: "Invalid token expiry" });
    }

    // Blacklist token (dedupe by UNIQUE(jti))
    await pool.execute(
      "INSERT INTO token_blacklist (jti, user_id, token_expires_at) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE token_expires_at = VALUES(token_expires_at), blacklisted_at = CURRENT_TIMESTAMP",
      [jti, id ?? null, expiresAt]
    );

    return res.json({ message: "Logged out successfully" });
  } catch (err) {
    return res.status(401).json({ message: "Unauthorized" });
  }
}


import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../config/env.js";

export function createToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

export function verifyToken(token = "") {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    console.error("JWT Error:", err.message);
    return null;
  }
}
import { pool } from "../config/db.js";
import bcrypt from "bcrypt";
import crypto from "node:crypto";
import { promisify } from "node:util";
import { createToken } from "../utils/jwt.js";
import {
  findUserByEmail,
  findUserByIdentifier,
  normalizeEmail,
  normalizeMobile,
  safeUser,
} from "./user.service.js";

const scrypt = promisify(crypto.scrypt);

async function verifyScryptPassword(password, storedHash) {
  const [salt, key] = String(storedHash || "").split(":");
  if (!salt || !key) return false;

  const derivedKey = await scrypt(password, salt, 64);
  const storedBuffer = Buffer.from(key, "hex");
  if (storedBuffer.length !== derivedKey.length) return false;

  return crypto.timingSafeEqual(storedBuffer, derivedKey);
}

export async function verifyPassword(password, storedHash) {
  if (String(storedHash || "").includes(":")) {
    return verifyScryptPassword(password, storedHash);
  }

  return bcrypt.compare(password, storedHash);
}

async function createUser({ name, mobile, email, password, type = "user" }) {
  const [result] = await pool.execute(
    "INSERT INTO users (name, mobile, email, password, type, email_verified) VALUES (?, ?, ?, ?, ?, 1)",
    [name || null, normalizeMobile(mobile), normalizeEmail(email), password, type]
  );
  return result.insertId;
}

async function register(email, password, profile = {}) {
  const existing = await findUserByEmail(email);
  if (existing) throw new Error("User already exists");

  const hashed = await bcrypt.hash(password, 10);
  const userId = await createUser({
    name: profile.name,
    mobile: profile.mobile,
    email,
    password: hashed,
    type: "user",
  });
  const user = await findUserByEmail(email);

  return {
    user: safeUser(user || { id: userId, email, type: "user" }),
    token: createToken(user || { id: userId, email, type: "user" }),
  };
}

async function login(identifier, password) {
  const user = await findUserByIdentifier(identifier);
  if (!user) throw new Error("User not found");

  const match = await verifyPassword(password, user.password);
  if (!match) throw new Error("Invalid credentials");
  if (!user.email_verified) throw new Error("Please verify your email OTP before login");

  return {
    user: safeUser(user),
    token: createToken(user),
  };
}

export { register, login };

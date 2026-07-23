import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is missing in .env");
}

export const PORT = Number(process.env.PORT || 5000);
export const DB_NAME = process.env.DB_NAME;
export const OTP_EXPIRY_MINUTES = Number(process.env.OTP_EXPIRY_MINUTES || 20);

export { JWT_SECRET, __filename, __dirname };
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";

import userRoutes from "./routes/user.routes.js";
import serviceCatalogRoutes from "./routes/serviceCatalog.routes.js";
import authRoutes from "./routes/auth.routes.js";

dotenv.config();

const app = express();

/**
 * Default allowed origins
 */
const defaultCorsOrigins = [
  "http://localhost:8080",
  "http://127.0.0.1:8080",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "https://shondhaan.com",
  "https://www.shondhaan.com",
];

/**
 * Merge .env origins with defaults
 *
 * Example:
 * CORS_ORIGIN=https://admin.shondhaan.com,https://dashboard.shondhaan.com
 */
const allowedOrigins = [
  ...new Set([
    ...defaultCorsOrigins,
    ...(process.env.CORS_ORIGIN || "")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
  ]),
];

/**
 * Check if origin is allowed
 */
const isAllowedCorsOrigin = (origin) => {
  // Allow requests without Origin (Postman, curl, server-to-server)
  if (!origin) return true;

  if (allowedOrigins.includes(origin)) {
    return true;
  }

  try {
    const url = new URL(origin);

    // Allow any HTTPS subdomain of shondhaan.com
    return (
      url.protocol === "https:" &&
      url.hostname.endsWith(".shondhaan.com")
    );
  } catch {
    return false;
  }
};

// =========================
// Middlewares
// =========================

app.use(cookieParser());

app.use(express.json());

app.use(
  cors({
    origin(origin, callback) {
      if (isAllowedCorsOrigin(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    optionsSuccessStatus: 204,
  })
);

// =========================
// Routes
// =========================

app.use("/api/admin/users", userRoutes);
app.use("/api/users", userRoutes);
app.use("/api", serviceCatalogRoutes);
app.use("/api/auth", authRoutes);

// Health Check
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Backend is running 🚀",
  });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err);

  if (err.message === "Not allowed by CORS") {
    return res.status(403).json({
      success: false,
      message: err.message,
    });
  }

  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

export default app;
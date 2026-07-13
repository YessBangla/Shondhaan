import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";

import dealRoutes from "./routes/deal.route.js";
import uploadRoutes from "./routes/upload.route.js";
import dealDb from "./config.js";

const app = express();

const PORT = process.env.PORT || 4000;

const DEAL_BACKEND_BASE_URL =
  process.env.DEAL_BACKEND_BASE_URL || `http://localhost:${PORT}`;

// Create uploads folder if not exists
const uploadsDir = path.join(process.cwd(), "uploads");
fs.mkdirSync(uploadsDir, { recursive: true });

// CORS origins
const corsOrigin = [
  ...new Set(
    [
      ...(process.env.CORS_ORIGIN || "")
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean),

      process.env.FRONTEND_BASE_URL,

      "http://localhost:5173",
      "http://localhost:8080",
      "http://localhost:4000",
      "https://shondhaan.yessbd.top",
      "https://www.shondhaan.yessbd.top",
    ].filter(Boolean)
  ),
];

app.use(
  cors({
    origin: corsOrigin,
    credentials: true,
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Static uploaded files
app.use("/uploads", express.static(uploadsDir));

// Base route
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Yess Deal backend is running",
    base_url: DEAL_BACKEND_BASE_URL,
  });
});

// Health check
app.get("/api/health", async (req, res) => {
  try {
    await dealDb.query("SELECT 1");

    res.json({
      success: true,
      message: "Yess Deal backend and database connected",
    });
  } catch (error) {
    console.error("Deal DB health check error:", error);

    res.status(500).json({
      success: false,
      message: "Deal database connection failed",
      error: error.message,
    });
  }
});

// Upload routes
app.use("/api/uploads", uploadRoutes);

// Deal routes
app.use("/api/deal", dealRoutes);

// 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error("Server error:", error);

  res.status(error.status || 500).json({
    success: false,
    message: error.message || "Internal server error",
  });
});

app.listen(PORT, () => {
  console.log(`Yess Deal backend running on ${DEAL_BACKEND_BASE_URL}`);
  console.log(`Allowed CORS origins: ${corsOrigin.join(", ")}`);
});
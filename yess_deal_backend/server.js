import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import http from "http";
import { Server } from "socket.io";

import dealRoutes from "./routes/deal.route.js";
import categoryRoutes from "./routes/categories.route.js";
import uploadRoutes from "./routes/upload.route.js";
import createMessagesRouter from "./routes/messages.route.js";
import dealDb from "./config.js";
import { registerDealChatSocket } from "./sockets/dealChat.js";
import { initializeDatabase } from "./initDb.js"; // ✅ ADD THIS

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 4000;

const DEAL_BACKEND_BASE_URL =
  process.env.DEAL_BACKEND_BASE_URL;

//
// ✅ SOCKET.IO SETUP
//
const io = new Server(server, {
  cors: {
    origin: [
      process.env.FRONTEND_BASE_URL
    ].filter(Boolean),
    credentials: true,
  },
});

registerDealChatSocket(io, dealDb);

//
// ✅ CREATE UPLOADS FOLDER
//
const uploadsDir = path.join(process.cwd(), "uploads");
fs.mkdirSync(uploadsDir, { recursive: true });

//
// ✅ CORS CONFIG
//
const corsOrigin = [
  ...new Set(
    [
      ...(process.env.CORS_ORIGIN || "")
        .split(",")
        .map((o) => o.trim())
        .filter(Boolean),

      process.env.FRONTEND_BASE_URL,

      "http://localhost:5173",
      "http://localhost:8080",
      "http://localhost:4000",
      "https://shondhaan.com",
      "https://www.shondhaan.com",
    ].filter(Boolean)
  ),
];

app.use(
  cors({
    origin: corsOrigin,
    credentials: true,
  })
);

//
// ✅ BODY PARSERS
//
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

//
// ✅ STATIC FILES
//
app.use("/uploads", express.static(uploadsDir));

//
// ✅ BASE ROUTE
//
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Yess Deal backend is running",
    base_url: DEAL_BACKEND_BASE_URL,
  });
});

//
// HEALTH CHECK
//
app.get("/api/health", async (req, res) => {
  try {
    await dealDb.query("SELECT 1");

    res.json({
      success: true,
      message: "Database connected",
    });
  } catch (error) {
    console.error("Health check error:", error);

    res.status(500).json({
      success: false,
      message: "Database connection failed",
      error: error.message,
    });
  }
});

//
// ✅ ROUTES (ORDER MATTERS)
//
app.use("/api/uploads", uploadRoutes);
app.use("/api/deal", dealRoutes);

// IMPORTANT: register messages AFTER /deal (clean separation)
app.use("/api/deal/messages", createMessagesRouter(dealDb));

app.use("/api/deal-categories", categoryRoutes);

// 404 HANDLER
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

//
// GLOBAL ERROR HANDLER
//
app.use((err, req, res, next) => {
  console.error("Server error:", err);

  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal server error",
  });
});

//
// ✅ START SERVER WITH DATABASE INITIALIZATION
//
server.listen(PORT, async () => {
  console.log(` Server running at ${DEAL_BACKEND_BASE_URL}`);
  console.log(` CORS: ${corsOrigin.join(", ")}`);

  // ✅ Initialize database tables on startup
  try {
    await initializeDatabase(dealDb);
  } catch (error) {
    console.error("⚠️  Failed to initialize database:", error.message);
    console.error("Please check your database connection and retry.");
  }
});
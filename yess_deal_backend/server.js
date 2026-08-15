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

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:8080",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:8080",
];

// Production frontend may be served with or without the www subdomain.
// Keep both origins allowed because the browser sends the exact page origin.
allowedOrigins.push("https://shondhaan.com", "https://www.shondhaan.com");

if (process.env.CORS_ORIGIN) {
  process.env.CORS_ORIGIN.split(",").forEach((origin) => {
    const trimmed = origin.trim();
    if (trimmed && !allowedOrigins.includes(trimmed)) {
      allowedOrigins.push(trimmed);
    }
  });
}

if (process.env.FRONTEND_BASE_URL) {
  process.env.FRONTEND_BASE_URL.split(",").forEach((origin) => {
    const trimmed = origin.trim();
    if (trimmed && !allowedOrigins.includes(trimmed)) {
      allowedOrigins.push(trimmed);
    }
  });
}

const corsOrigins = [...allowedOrigins];

const DEAL_BACKEND_BASE_URL =
  process.env.DEAL_BACKEND_BASE_URL;

//
// ✅ SOCKET.IO SETUP
//
const io = new Server(server, {
  cors: {
    origin: corsOrigins,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
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
const corsOrigin = [...new Set(corsOrigins)];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      console.log("CORS blocked origin:", origin);
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
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


// HEALTH CHECK

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

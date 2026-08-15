console.log("Gemini key loaded:", !!process.env.GEMINI_API_KEY);
import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import cookieParser from "cookie-parser"; // <--- ADD THIS IMPORT
import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";

import providerRoutes from "./routes/provider.route.js";
import packageRoutes from "./routes/package.route.js";
import serviceRoutes from "./routes/service.route.js";
import categoryRoutes from "./routes/category.route.js";
import bookingRoutes from "./routes/booking.route.js";
import reviewRoutes from "./routes/review.route.js";
import heroBannerRoutes from "./routes/heroBanner.route.js";
import homepageSectionRoutes from "./routes/homePageSection.route.js";
import uploadRoutes from "./routes/upload.route.js";
import serviceChatRoutes from "./routes/serviceChat.route.js";

import { reconcilePendingShurjopayPayments } from "./controller/shurjopay.controller.js";
import { ensurePlatformFeeSchema } from "./config/db.js";
import { ensureServiceChatSchema } from "./controller/serviceChat.controller.js";
import { initServiceChatSocket } from "./sockets/serviceChat.js";
import prescriptionRouter from "./routes/prescription.route.js";

// ─────────────────────────────────────────────
// Process-level safety nets — prevent the whole
// server from dying on a single failed async call.
// Without these, an unhandled promise rejection
// anywhere (e.g. a flaky payment-gateway request)
// terminates the process on Node 15+, causing brief
// downtime windows that LiteSpeed's error page fills
// in with a response that has no CORS headers —
// which looks exactly like a CORS failure to the browser.
// ─────────────────────────────────────────────
process.on("unhandledRejection", (reason, promise) => {
  console.error("⚠️  Unhandled promise rejection (process kept alive):", reason);
});

process.on("uncaughtException", (err) => {
  console.error("⚠️  Uncaught exception (process kept alive):", err);
});

const app = express();

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

if (process.env.FRONTEND_URL) {
  process.env.FRONTEND_URL.split(",").forEach((origin) => {
    const trimmed = origin.trim();
    if (trimmed && !allowedOrigins.includes(trimmed)) {
      allowedOrigins.push(trimmed);
    }
  });
}

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    console.log("CORS blocked origin:", origin);
    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
};

app.use(cors(corsOptions));

app.use(cookieParser());

const httpServer = createServer(app);

const io = new SocketIOServer(httpServer, {
  cors: {
    origin: [...allowedOrigins],
    credentials: true,
  },
});

app.set("io", io);
initServiceChatSocket(io);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// API routes
app.use("/api/providers", providerRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/packages", packageRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/hero-banners", heroBannerRoutes);
app.use("/api/homepage-sections", homepageSectionRoutes);
app.use("/api/uploads", uploadRoutes);
app.use("/api/service-chat", serviceChatRoutes);
app.use("/api/prescription", prescriptionRouter);

app.get("/", (req, res) => {
  res.type("html");
  res.send("Service backend is running ✅");
});

// ─────────────────────────────────────────────
// Safety-net error handler — must be registered
// AFTER all routes. Ensures CORS headers survive
// even if a route handler throws synchronously or
// calls next(err).
// ─────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error("Unhandled route error:", err);

  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
  }

  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal server error",
  });
});

const PORT = process.env.PORT || 3000;

const SERVICE_BACKEND_BASE_URL =
  process.env.YESS_SERVICE_BACKEND_BASE_URL || `http://localhost:${PORT}`;

async function startServer() {
  try {
    await ensurePlatformFeeSchema();
    await ensureServiceChatSchema();

    httpServer.listen(PORT, () => {
      console.log(`Service backend running on ${SERVICE_BACKEND_BASE_URL}`);
    });
  } catch (error) {
    console.error("Service backend schema initialization failed:", error);
    process.exit(1);
  }
}

startServer();

// ─────────────────────────────────────────────
// Shurjopay reconciliation — now wrapped so a
// rejected promise is caught and logged instead
// of crashing the whole process.
// ─────────────────────────────────────────────
async function safeReconcile() {
  try {
    await reconcilePendingShurjopayPayments();
  } catch (error) {
    console.error("⚠️  Shurjopay reconciliation failed (will retry next cycle):", error);
  }
}

if (process.env.SHURJOPAY_RECONCILE_DISABLED !== "true") {
  setInterval(() => {
    safeReconcile();
  }, 60 * 1000);

  setTimeout(() => {
    safeReconcile();
  }, 5 * 1000);
}

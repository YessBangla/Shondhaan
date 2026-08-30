import "dotenv/config";

console.log("Gemini key loaded:", !!process.env.GEMINI_API_KEY);

import express from "express";
import cors from "cors";
import path from "path";
import cookieParser from "cookie-parser";
import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";

// ─────────────────────────────────────────────
// Routes
// ─────────────────────────────────────────────

import providerRoutes from "./routes/provider.route.js";
import packageRoutes from "./routes/package.route.js";
import serviceRoutes from "./routes/service.route.js";
import categoryRoutes from "./routes/category.route.js";
import bookingRoutes from "./routes/booking.route.js";
import reviewRoutes from "./routes/review.route.js";
import heroBannerRoutes from "./routes/heroBanner.route.js";
import homepageSectionRoutes from "./routes/homepageSection.route.js";
import uploadRoutes from "./routes/upload.route.js";
import serviceChatRoutes from "./routes/serviceChat.route.js";
import prescriptionRouter from "./routes/prescription.route.js";

// ⭐ NEW — Service Admin Dashboard
import serviceAdminDashboardRoutes from "./routes/serviceAdminDashboard.route.js";

// ⭐ NEW — Service Offers
import serviceOfferRoutes from "./routes/serviceOffer.route.js";

// ─────────────────────────────────────────────
// Controllers / Config
// ─────────────────────────────────────────────

import { reconcilePendingShurjopayPayments } from "./controller/shurjopay.controller.js";

import {
  ensurePlatformFeeSchema,
} from "./config/db.js";

import {
  initializeDatabase,
} from "./config/initDb.js";

import {
  ensureServiceChatSchema,
} from "./controller/serviceChat.controller.js";

import {
  initServiceChatSocket,
} from "./sockets/serviceChat.js";

// ─────────────────────────────────────────────
// Process-level safety nets
// ─────────────────────────────────────────────

process.on("unhandledRejection", (reason, promise) => {
  console.error(
    "⚠️ Unhandled promise rejection (process kept alive):",
    reason
  );
});

process.on("uncaughtException", (err) => {
  console.error(
    "⚠️ Uncaught exception (process kept alive):",
    err
  );
});

// ─────────────────────────────────────────────
// App
// ─────────────────────────────────────────────

const app = express();

// ─────────────────────────────────────────────
// CORS — consolidated origin list
// ─────────────────────────────────────────────
//
// All three env vars (CORS_ORIGIN, FRONTEND_URL, FRONTEND_BASE_URL)
// are merged here, in ONE place, BEFORE cors() is configured.
// This avoids the previous bug where FRONTEND_BASE_URL was pushed
// onto allowedOrigins at the bottom of the file, after cors()
// middleware was already set up — fragile and easy to break.
//
// Remember: `localhost` and `127.0.0.1` are different origins to
// the browser, even on the same machine. Both must be listed
// explicitly if your frontend might run on either.
// ─────────────────────────────────────────────

const allowedOrigins = [
  ...(process.env.CORS_ORIGIN || "").split(","),
  ...(process.env.FRONTEND_URL || "").split(","),
  ...(process.env.FRONTEND_BASE_URL || "").split(","),
]
  .map((origin) => origin.trim())
  .filter(Boolean)
  .filter((origin, index, arr) => arr.indexOf(origin) === index); // dedupe

console.log("✅ Allowed CORS origins:", allowedOrigins);

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests without an Origin header
    // such as Postman/server-to-server requests.
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    console.log("❌ CORS blocked origin:", origin);

    return callback(
      new Error("Not allowed by CORS")
    );
  },

  credentials: true,

  methods: [
    "GET",
    "POST",
    "PUT",
    "PATCH",
    "DELETE",
    "OPTIONS",
  ],

  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
  ],
};

app.use(cors(corsOptions));

// ─────────────────────────────────────────────
// Middleware
// ─────────────────────────────────────────────

app.use(cookieParser());

app.use(
  express.json({
    limit: "10mb",
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: "10mb",
  })
);

// ─────────────────────────────────────────────
// HTTP Server
// ─────────────────────────────────────────────

const httpServer = createServer(app);

// ─────────────────────────────────────────────
// Socket.IO
// ─────────────────────────────────────────────

const io = new SocketIOServer(httpServer, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
  },
});

app.set("io", io);

initServiceChatSocket(io);

// ─────────────────────────────────────────────
// Static uploads
// ─────────────────────────────────────────────
// (was previously mounted twice — once here, once above middleware;
// consolidated into a single mount)

app.use(
  "/uploads",
  express.static(
    path.join(process.cwd(), "uploads")
  )
);

// ─────────────────────────────────────────────
// PUBLIC / EXISTING API ROUTES
// ─────────────────────────────────────────────

app.use(
  "/api/providers",
  providerRoutes
);

app.use(
  "/api/services",
  serviceRoutes
);

app.use(
  "/api/packages",
  packageRoutes
);

app.use(
  "/api/categories",
  categoryRoutes
);

app.use(
  "/api/bookings",
  bookingRoutes
);

app.use(
  "/api/reviews",
  reviewRoutes
);

app.use(
  "/api/hero-banners",
  heroBannerRoutes
);

app.use(
  "/api/homepage-sections",
  homepageSectionRoutes
);

app.use(
  "/api/uploads",
  uploadRoutes
);

app.use(
  "/api/service-chat",
  serviceChatRoutes
);

app.use(
  "/api/prescription",
  prescriptionRouter
);

// ─────────────────────────────────────────────
// ⭐ SERVICE ADMIN DASHBOARD
// ─────────────────────────────────────────────
//
// Endpoints:
//
// GET /api/service-admin/dashboard/stats
// GET /api/service-admin/dashboard/recent-bookings
// GET /api/service-admin/dashboard/booking-chart
// GET /api/service-admin/dashboard/revenue-chart
//
// ─────────────────────────────────────────────

app.use(
  "/api/service-admin/dashboard",
  serviceAdminDashboardRoutes
);

// ─────────────────────────────────────────────
// ⭐ SERVICE OFFERS
// ─────────────────────────────────────────────
//
// Endpoints:
//
// GET    /api/service-offers
// GET    /api/service-offers/:id
// POST   /api/service-offers
// PUT    /api/service-offers/:id
// DELETE /api/service-offers/:id
//
// ─────────────────────────────────────────────

app.use(
  "/api/service-offers",
  serviceOfferRoutes
);

// ─────────────────────────────────────────────
// Health / Root
// ─────────────────────────────────────────────

app.get("/", (req, res) => {
  res.type("html");

  res.send(
    "Service backend is running ✅"
  );
});

// Optional health endpoint
app.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "Service backend is healthy",
    timestamp: new Date().toISOString(),
  });
});

// ─────────────────────────────────────────────
// Error handler
// MUST remain after all routes
// ─────────────────────────────────────────────

app.use((err, req, res, next) => {
  console.error(
    "Unhandled route error:",
    err
  );

  const origin = req.headers.origin;

  if (
    origin &&
    allowedOrigins.includes(origin)
  ) {
    res.setHeader(
      "Access-Control-Allow-Origin",
      origin
    );

    res.setHeader(
      "Access-Control-Allow-Credentials",
      "true"
    );
  }

  res.status(err.status || 500).json({
    success: false,
    message:
      err.message ||
      "Internal server error",
  });
});

// ─────────────────────────────────────────────
// Server configuration
// ─────────────────────────────────────────────

const PORT =
  process.env.PORT || 3000;

const SERVICE_BACKEND_BASE_URL =
  process.env.YESS_SERVICE_BACKEND_BASE_URL ||
  `http://localhost:${PORT}`;

// ─────────────────────────────────────────────
// Start server
// ─────────────────────────────────────────────

async function startServer() {
  try {
    console.log(
      "🔄 Initializing service backend..."
    );

    // ⭐ Initialize all database tables
    await initializeDatabase();

    await ensurePlatformFeeSchema();

    await ensureServiceChatSchema();

    httpServer.listen(PORT, () => {
      console.log(
        `🚀 Service backend running on ${SERVICE_BACKEND_BASE_URL}`
      );

      console.log(
        `📊 Admin dashboard: ${SERVICE_BACKEND_BASE_URL}/api/service-admin/dashboard/stats`
      );
    });
  } catch (error) {
    console.error(
      "❌ Service backend schema initialization failed:",
      error
    );

    process.exit(1);
  }
}

startServer();

// ─────────────────────────────────────────────
// Shurjopay reconciliation
// ─────────────────────────────────────────────

async function safeReconcile() {
  try {
    await reconcilePendingShurjopayPayments();
  } catch (error) {
    console.error(
      " Shurjopay reconciliation failed (will retry next cycle):",
      error
    );
  }
}

if (
  process.env.SHURJOPAY_RECONCILE_DISABLED !==
  "true"
) {
  // Every 60 seconds
  setInterval(() => {
    safeReconcile();
  }, 60 * 1000);

  // First run after 5 seconds
  setTimeout(() => {
    safeReconcile();
  }, 5 * 1000);
}
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
import homepageSectionRoutes from "./routes/homepageSection.route.js";
import uploadRoutes from "./routes/upload.route.js";
import serviceChatRoutes from "./routes/serviceChat.route.js";

import { reconcilePendingShurjopayPayments } from "./controller/shurjopay.controller.js";
import { ensurePlatformFeeSchema } from "./config/db.js";
import { ensureServiceChatSchema } from "./controller/serviceChat.controller.js";
import { initServiceChatSocket } from "./sockets/serviceChat.js";
import prescriptionRouter from "./routes/prescription.route.js";

const app = express();

const corsOrigin = [
  ...new Set(
    [
      ...(process.env.CORS_ORIGIN || "")
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean),
      process.env.FRONTEND_BASE_URL,
      "http://localhost:5173",
      "https://shondhaan.com",
      "https://www.shondhaan.com",
    ].filter(Boolean)
  ),
];

app.use(cors({ origin: corsOrigin, credentials: true }));

// --- ADD THIS LINE RIGHT HERE ---
app.use(cookieParser()); 
// --------------------------------

const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: corsOrigin,
    credentials: true,
  },
});

app.set("io", io);
initServiceChatSocket(io);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Static uploaded files
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

if (process.env.SHURJOPAY_RECONCILE_DISABLED !== "true") {
  setInterval(() => {
    reconcilePendingShurjopayPayments();
  }, 60 * 1000);

  setTimeout(() => {
    reconcilePendingShurjopayPayments();
  }, 5 * 1000);
}



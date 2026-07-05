import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import userRoutes from "./routes/user.routes.js";
import serviceCatalogRoutes from "./routes/serviceCatalog.routes.js";

import authRoutes from "./routes/auth.routes.js";

dotenv.config();

const app = express();

const defaultCorsOrigins = [
  "http://localhost:8080",
  "http://127.0.0.1:8080",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "https://shondhaan.yessbd.top",
  "https://www.shondhaan.yessbd.top",
];

const corsOrigin = [
  ...new Set([
    ...defaultCorsOrigins,
    ...(process.env.CORS_ORIGIN || "")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
  ]),
];

const isAllowedCorsOrigin = (origin) => {
  if (!origin) return true;

  const normalizedOrigin = origin.trim();
  if (corsOrigin.includes(normalizedOrigin)) return true;

  try {
    const { hostname, protocol } = new URL(normalizedOrigin);
    return protocol === "https:" && hostname.endsWith(".yessbd.top");
  } catch {
    return false;
  }
};

app.use((req, res, next) => {
  const origin = req.headers.origin;

  if (isAllowedCorsOrigin(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin || "*");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET,POST,PUT,PATCH,DELETE,OPTIONS"
    );
    res.setHeader(
      "Access-Control-Allow-Headers",
      req.headers["access-control-request-headers"] ||
        "Content-Type,Authorization"
    );
    res.setHeader("Vary", "Origin");
  }

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
});

app.use(
  cors({
    origin(origin, callback) {
      callback(null, isAllowedCorsOrigin(origin));
    },
    credentials: true,
    optionsSuccessStatus: 204,
  })
);
app.use(express.json());

// routes

app.use("/api/admin/users", userRoutes);
app.use("/api/users", userRoutes);
app.use("/api", serviceCatalogRoutes);
app.use("/api/auth", authRoutes);



app.get("/", (req, res) => {
  res.send("Backend is running");
});

export default app;

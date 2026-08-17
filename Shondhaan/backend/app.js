import path from "node:path";
import cookieParser from "cookie-parser";
import express from "express";
import { corsMiddleware } from "./middleware/cors.js";
import adminRoutes from "./routes/admin.routes.js";
import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import walletRoutes from "./routes/wallet.route.js";
// import serviceCatalogRoutes from "./routes/serviceCatalog.routes.js";

const app = express();

// Middlewares
app.use(cookieParser());
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(corsMiddleware);

app.get("/", (req, res) => {
  res.send("Backend is running");
});

// Route mounting
app.use("/api/admin", adminRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use('/api/wallet', walletRoutes);

// app.use("/api/catalog", serviceCatalogRoutes);

export default app;

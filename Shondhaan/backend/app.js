import path from "node:path";
import cookieParser from "cookie-parser";
import express from "express";
import { corsMiddleware } from "./middleware/cors.js";
import adminRoutes from "./routes/admin.routes.js";
import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import walletRoutes from "./routes/wallet.route.js";
import referralRoutes from "./routes/referral.route.js";
import referralSettlementRoutes from "./routes/referralSettlement.routes.js";
import referralAdminRoutes from "./routes/referralAdmin.routes.js";
import paymentGatewayRoutes from "./routes/paymentGateway.routes.js";
import passwordResetRouter from "./routes/passwordReset.js";

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
app.use("/api/referral/admin", referralAdminRoutes);
app.use("/api/referral", referralRoutes);
app.use("/api/referral-settlement", referralSettlementRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/wallet", walletRoutes);
app.use("/api/payment-gateways", paymentGatewayRoutes);
app.use("/api/auth", passwordResetRouter);
export default app;
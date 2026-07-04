import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

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
      "https://shondhaan.yessbd.top",
      "https://www.shondhaan.yessbd.top",
    ].filter(Boolean),
  ),
];

app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(express.json());

// // routes
// app.use("/api/auth", authRoutes);


app.get("/", (req, res) => {
  res.send("Service Backend is running");

  
});

export default app;

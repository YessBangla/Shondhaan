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
      "http://localhost:8080",
      "https://shondhaan.com",
    ].filter(Boolean),
  ),
];

app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(express.json());


app.get("/", (req, res) => {
  res.send("Service Backend is running");

  
});

export default app;

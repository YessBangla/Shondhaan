import cors from "cors";

const defaultCorsOrigins = [
  "http://localhost:8080",
  "http://127.0.0.1:8080",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "https://shondhaan.com",
  "https://www.shondhaan.com",
];

const corsOrigins = [
  ...new Set([
    ...defaultCorsOrigins,
    ...(process.env.CORS_ORIGIN || "")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
  ]),
];

const isAllowedCorsOrigin = (origin) => {
  // Allow requests without an Origin header (Postman, curl, server-to-server)
  if (!origin) return true;

  if (corsOrigins.includes(origin)) {
    return true;
  }

  try {
    const { protocol, hostname } = new URL(origin);

    return (
      protocol === "https:" &&
      (
        hostname === "shondhaan.com" ||
        hostname.endsWith(".shondhaan.com")
      )
    );
  } catch {
    return false;
  }
};

export const corsMiddleware = cors({
  origin(origin, callback) {
    if (!origin || isAllowedCorsOrigin(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
  ],
  optionsSuccessStatus: 204,
});
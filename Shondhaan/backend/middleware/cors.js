import cors from "cors";

const corsOrigins = [
  ...new Set([
    ...(process.env.CORS_ORIGIN || "")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
    ...(process.env.FRONTEND_URL || process.env.FRONTEND_BASE_URL || "")
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

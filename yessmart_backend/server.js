const express = require("express");
const cors = require("cors");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const pool = require("./db");
const initDatabase = require("./database/initDatabase");
const createOrdersCountTable = require("./database/orders_count.table");
const createBkashSettingsTable = require("./database//bkash_settings.table");
const createNagadSettingsTable = require("./database//nagad_settings.table");
const createRocketSettingsTable = require("./database//rocket_settings.table");
const createOrdersTable = require("./database/orders.table");
const createTransactionTable = require("./database/transaction.table");
const createOrderItemsTable = require("./database/order_items.table");
const createShippingAddressesTable = require("./database/shipping_addresses.table");
const createReviewsTable = require("./database/reviews.table");
const createProductQuestionsTable = require("./database/product_questions.table");
const createDeliveryAreasTable = require("./database/delivery_areas.table");
const createCouponsTable = require("./database/coupons.table");
const createDeliveryRequestsTable = require("./database/createDeliveryRequestsTable");
const createDeliverymenTable = require("./database/deliverymen.table");
const createNotificationsTable = require("./database/createNotificationsTable");
const createMartPackagesTable = require("./database/createMartPackagesTable");
const createMartSellerPackagesTable = require("./database/createMartSellerPackagesTable");
const createMartPackageTransactionsTable = require("./database/createMartPackageTransactionsTable");
const createMartWalletTables = require("./database/createMartWalletTables");
const createWishlistTable = require("./database/createWishlist.table"); // Import the createWishlistTable function
const createMessagesTable = require("./database/Createmessage.table"); // Import the createMessagesTable function
const createUserProfileTable = require("./database/user_profile.table");
const createBannersTable = require("./database/banners.table"); // ★ NEW — banners table for mart home carousel
const createMartRewardTables = require("./database/mart_reward_rules"); // ★ NEW — mart_reward_rules table for mart reward rules
// create table

const categoriesRoutes = require("./routes/categories");
const subCategoriesRoutes = require("./routes/sub_categories");
const deliveryRequestsRouter      = require("./routes/deliveryRequests");
const sellersRoutes = require("./routes/sellers");
const productsRoutes = require("./routes/products");
const ordersRoutes = require("./routes/orders");
const reviewsRoutes = require("./routes/reviews");
const productQuestionsRoutes = require("./routes/product_questions");
const deliveryAreasRoutes = require("./routes/delivery_areas");
const deliverymenRoutes = require("./routes/deliverymen");
const couponsRoutes = require("./routes/coupons");
const shippingAddressesRoutes = require("./routes/shipping_addresses");
const uploadRouter = require("./routes/upload");
const profileRoutes = require("./routes/profile");
const wishlistRoutes = require("./routes/wishlist"); // Import the wishlist routes
const notificationsRoutes = require("./routes/notifications");
const MessagesRoutes = require("./routes/messages"); // Import the messages routes
const bannersRoutes = require("./routes/banners"); // ★ NEW — banners CRUD routes
const transactionsRoutes = require("./routes/transactions"); // ★ NEW — transactions routes
const martWalletRoutes = require("./routes/martWallets");

const { registerMartMessageSocket } = require("./socket/martMessages");
const { getBackendBaseUrl } = require("./utils/baseUrl");
const app = express();
const PORT = process.env.PORT;
const server = http.createServer(app);

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

const corsOrigins = [...allowedOrigins];

const io = new Server(server, {
  cors: {
    origin: [...new Set(corsOrigins)],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    credentials: true,
  },
});

app.set("io", io);
registerMartMessageSocket(io);

app.use(
  cors({
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
  }),
);
// Needed for base64 JSON uploads (frontend sends { image: "data:image/...;base64,..." })
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true }));

const passwordPolicyMessage =
  "Password must be at least 8 characters and include uppercase, lowercase, a number, and a special character.";

const validatePasswordPolicy = (password) => {
  const value = String(password || "");
  return (
    value.length >= 8 &&
    /[A-Z]/.test(value) &&
    /[a-z]/.test(value) &&
    /\d/.test(value) &&
    /[^A-Za-z0-9]/.test(value)
  );
};

const validateSignupPassword = (req, res, next) => {
  const isSignupPath = /\/(signup|register)(\/|$)/i.test(req.path);
  const canHaveBody = ["POST", "PUT", "PATCH"].includes(req.method);

  if (!isSignupPath || !canHaveBody) return next();

  if (!validatePasswordPolicy(req.body?.password)) {
    return res.status(400).json({
      success: false,
      message: passwordPolicyMessage,
    });
  }

  return next();
};

app.use(validateSignupPassword);

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "yMart Backend is running successfully!",
  });
});

app.use("/api/categories", categoriesRoutes);
app.use("/api/sub-categories", subCategoriesRoutes);
app.use("/api/sellers", sellersRoutes);
app.use("/api/products", productsRoutes);
app.use("/api/orders", ordersRoutes);
app.use("/api/reviews", reviewsRoutes);
app.use("/api/product-questions", productQuestionsRoutes);
app.use("/api/delivery-areas", deliveryAreasRoutes);
app.use("/api/deliverymen", deliverymenRoutes);
app.use("/api/coupons", couponsRoutes);
app.use("/api/shipping-addresses", shippingAddressesRoutes);
app.use("/api/upload", uploadRouter);
app.use("/api/profile", profileRoutes);
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/uploads", express.static(path.join(__dirname, "public", "uploads")));
app.use("/api/delivery-requests", deliveryRequestsRouter);
app.use("/api/wishlist", wishlistRoutes); // Use the wishlist routes
app.use("/api/notifications", notificationsRoutes);
app.use("/api/messages", MessagesRoutes); // Use the messages routes
app.use("/api/banners", bannersRoutes); // ★ NEW — banners CRUD routes
app.use("/api/transactions", transactionsRoutes); // ★ NEW — transactions routes
app.use("/api/mart-wallets", martWalletRoutes);
app.use("/api", require("./routes/martPackages")); // ★ NEW — mart packages routes (defines /api/mart-packages, /api/sellers/:id/product-allowance, etc.)
app.use("/api/mart-reward-rules", require("./routes/martRewardRules")); // ★ NEW — mart reward rules routes (defines /api/mart-reward-rules, /api/mart-reward-rules/active, etc.)
server.listen(PORT, async () => {
  const backendBaseUrl = getBackendBaseUrl();
  console.log(`Server running on ${backendBaseUrl}`);

  try {
    const connection = await pool.getConnection();
    console.log("MySQL connected successfully.");
    connection.release();
    await createOrdersCountTable();
    await createDeliveryRequestsTable();
    await createBkashSettingsTable();
    await createNagadSettingsTable();
    await createRocketSettingsTable();
    await createOrdersTable();
    await createTransactionTable();
    await createOrderItemsTable();
    await createShippingAddressesTable();
    await initDatabase();
    await createReviewsTable();
    await createProductQuestionsTable();
    await createDeliveryAreasTable();
    await createDeliverymenTable();
    await createCouponsTable();
    await createUserProfileTable();
    await createWishlistTable(); // Create the product_wishlists table
    await createMessagesTable(); // Create the mart_conversations and mart_messages tables
    await createNotificationsTable(); // Create the notifications table
    await createBannersTable(); // ★ NEW — Create the banners table
    await createMartPackagesTable(); // ★ NEW — Create the mart_packages table
    await createMartSellerPackagesTable(); // ★ NEW — Create the mart_seller_packages table
    await createMartPackageTransactionsTable(); // Payment audit trail for package purchases
    await createMartWalletTables(); // Seller wallet balances and adjustment audit trail
    await createMartRewardTables(); // ★ NEW — Create the mart_reward_rules table
    console.log("All tables initialized successfully.");
  } catch (error) {
    console.error("Server initialization failed:", error.message);
  }
});

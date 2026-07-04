const express = require("express");
const cors = require("cors");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");
require("dotenv").config();

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
const deliveryRequestsRouter      = require("./routes/deliveryRequests");
const createWishlistTable = require("./database/createWishlist.table"); // Import the createWishlistTable function
const createMessagesTable = require("./database/Createmessage.table"); // Import the createMessagesTable function
const createUserProfileTable = require("./database/user_profile.table");
// create table

const categoriesRoutes = require("./routes/categories");
const subCategoriesRoutes = require("./routes/sub_categories");
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
const MessagesRoutes = require("./routes/messages"); // Import the messages routes
const { registerMartMessageSocket } = require("./socket/martMessages");
const app = express();
const PORT = process.env.PORT || 8081;
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "DELETE"],
  },
});

app.set("io", io);
registerMartMessageSocket(io);

app.use(cors());
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
    message: "YService Mart Backend is running successfully!",
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
app.use("/api/messages", MessagesRoutes); // Use the messages routes
server.listen(PORT, async () => {
  console.log(`Server running on http://localhost:${PORT}`);

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
    await createMessagesTable(); // Create the mart_conversations and mart_messages tables`
    console.log("All tables initialized successfully.");
  } catch (error) {
    console.error("Server initialization failed:", error.message);
  }
});

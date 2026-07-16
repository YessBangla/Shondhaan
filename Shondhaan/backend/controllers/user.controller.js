import {
  ALLOWED_USER_TYPES,
  findUserById,
  listUsers,
  normalizeUserType,
  safeUser,
  updateUserTypeById,
} from "../services/user.service.js";

// ✅ GET ALL USERS
export const getAllUsers = async (req, res) => {
  try {
    const users = await listUsers();

    res.status(200).json({
      success: true,
      users,
    });
  } catch (error) {
    console.error("Get all users error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ✅ GET SINGLE USER
export const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await findUserById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      user: safeUser(user),
    });
  } catch (error) {
    console.error("Get user error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

export const getCurrentUser = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const userId = req.user.id;

    const user = await findUserById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json(safeUser(user));
  } catch (err) {
    console.error("Get current user error:", err);
    res.status(500).json({ message: err.message });
  }
};

export const updateUserType = async (req, res) => {
  try {
    const { id } = req.params;
    const { type } = req.body;
    const normalizedType = normalizeUserType(type);

    if (!ALLOWED_USER_TYPES.has(normalizedType)) {
      return res.status(400).json({ message: "Invalid user type" });
    }

    const user = await updateUserTypeById(id, normalizedType);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ user: safeUser(user) });
  } catch (error) {
    console.error("Update user type error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ GET USER PROFILE (for dashboard) - with data isolation
export const getUserProfile = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const userId = req.user.id;
    
    // Ensure user can only fetch their own profile
    // This is checked by authorizeOwnData middleware, but double-check here
    if (!userId) {
      return res.status(401).json({ message: "Invalid user ID" });
    }

    const user = await findUserById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Ensure the requesting user owns this profile
    if (user.id !== userId) {
      return res.status(403).json({
        message: "Forbidden - You cannot access other users' profiles",
        code: "ACCESS_DENIED",
      });
    }

    const profile = {
      id: user.id,
      name: user.name || "User",
      email: user.email || "",
      phone: user.phone || "",
      address: user.address || "",
      avatar_url: user.avatar_url || null,
      created_at: user.created_at || new Date().toISOString(),
      role: user.role || "user",
    };

    res.status(200).json(profile);
  } catch (err) {
    console.error("Get user profile error:", err);
    res.status(500).json({ message: err.message });
  }
};

// ✅ GET USER STATS (for dashboard) - with data isolation
export const getUserStats = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const userId = req.user.id;
    const userRole = req.user.role || "user";

    if (!userId) {
      return res.status(401).json({ message: "Invalid user ID" });
    }

    // Initialize stats
    let stats = {
      bookings: 0,
      orders: 0,
      pendingRequests: 0,
      reviews: 0,
    };

    // For standard users, fetch their bookings
    if (userRole === "user") {
      try {
        const bookings = await req.app.locals.db.query(
          "SELECT COUNT(*) as count FROM bookings WHERE customer_id = ?",
          [userId]
        );
        stats.bookings = bookings[0]?.[0]?.count || 0;
      } catch (err) {
        console.error("Error fetching bookings:", err);
      }
    }

    // For providers, fetch their assigned bookings
    if (userRole === "provider") {
      try {
        const bookings = await req.app.locals.db.query(
          "SELECT COUNT(*) as count FROM bookings WHERE provider_id = ?",
          [userId]
        );
        stats.bookings = bookings[0]?.[0]?.count || 0;
      } catch (err) {
        console.error("Error fetching provider bookings:", err);
      }
    }

    // For vendors, fetch their orders
    if (userRole === "mart_vendor") {
      try {
        const orders = await req.app.locals.db.query(
          "SELECT COUNT(*) as count FROM orders WHERE vendor_id = ?",
          [userId]
        );
        stats.orders = orders[0]?.[0]?.count || 0;
      } catch (err) {
        console.error("Error fetching vendor orders:", err);
      }
    }

    // Generic pending requests (only for current user)
    try {
      const pending = await req.app.locals.db.query(
        "SELECT COUNT(*) as count FROM bookings WHERE (customer_id = ? OR provider_id = ?) AND status IN ('pending', 'assigned')",
        [userId, userId]
      );
      stats.pendingRequests = pending[0]?.[0]?.count || 0;
    } catch (err) {
      console.error("Error fetching pending requests:", err);
    }

    // Get reviews count (only for current user)
    try {
      const reviews = await req.app.locals.db.query(
        "SELECT COUNT(*) as count FROM reviews WHERE reviewer_id = ? OR provider_id = ?",
        [userId, userId]
      );
      stats.reviews = reviews[0]?.[0]?.count || 0;
    } catch (err) {
      console.error("Error fetching reviews:", err);
    }

    res.status(200).json(stats);
  } catch (err) {
    console.error("Get user stats error:", err);
    res.status(500).json({ message: err.message });
  }
};
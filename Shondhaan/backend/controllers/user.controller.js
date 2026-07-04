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

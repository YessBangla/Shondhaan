import express from "express";
import { getAllUsers, getCurrentUser, getUserById, updateCurrentUser, updateUserType, getUserProfile, getUserStats } from "../controllers/user.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { authorizeOwnData, preventUserRolePanelAccess } from "../middleware/authorization.middleware.js";
import { requireSuperAdmin } from "../middleware/tokenBlacklist.middleware.js";

const router = express.Router();

// Own data endpoints - user can only access their own profile/stats
router.get("/me/profile", authMiddleware, getCurrentUser);
router.patch("/me/profile", authMiddleware, updateCurrentUser);
router.get("/profile", authMiddleware, authorizeOwnData, getUserProfile);
router.get("/stats", authMiddleware, authorizeOwnData, getUserStats);

// Admin-only endpoints
router.patch("/:id/type", authMiddleware, requireSuperAdmin, updateUserType);
router.get("/", authMiddleware, requireSuperAdmin, getAllUsers);
router.get("/:id", authMiddleware, requireSuperAdmin, authorizeOwnData, getUserById);

export default router;

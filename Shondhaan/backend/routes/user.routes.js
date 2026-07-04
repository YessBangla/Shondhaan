import express from "express";
import { getAllUsers, getCurrentUser, getUserById, updateUserType } from "../controllers/user.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { requireSuperAdmin } from "../middleware/tokenBlacklist.middleware.js";

const router = express.Router();

router.get("/me/profile", authMiddleware, getCurrentUser);
router.patch("/:id/type", requireSuperAdmin, updateUserType);
router.get("/", requireSuperAdmin, getAllUsers);
router.get("/:id", requireSuperAdmin, getUserById);

export default router;

import { Router } from "express";
import { requireAdminOrCallCenter, requireAdminPanelAccess, requireSuperAdmin } from "../middleware/auth.middleware.js";
import {
  createUser,
  listUsers,
  getMyAdminAccess,
  getRoles,
  getTypes,
  updateUserType,
} from "../controllers/admin.controller.js";

const router = Router();

router.post("/users", requireSuperAdmin, createUser);
router.get("/users", requireAdminOrCallCenter, listUsers);
router.get("/me/access", requireAdminPanelAccess, getMyAdminAccess);
router.get("/roles", requireSuperAdmin, getRoles);
router.get("/types", requireSuperAdmin, getTypes);
router.patch("/users/:id/type", requireSuperAdmin, updateUserType);

export default router;

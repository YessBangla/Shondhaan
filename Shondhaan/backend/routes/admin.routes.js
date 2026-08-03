import { Router } from "express";
import { requireAdminOrCallCenter, requireSuperAdmin } from "../middleware/auth.middleware.js";
import {
  createUser,
  listUsers,
  getTypes,
  updateUserType,
} from "../controllers/admin.controller.js";

const router = Router();

router.post("/users", requireSuperAdmin, createUser);
router.get("/users", requireAdminOrCallCenter, listUsers);
router.get("/types", requireSuperAdmin, getTypes);
router.patch("/users/:id/type", requireSuperAdmin, updateUserType);

export default router;
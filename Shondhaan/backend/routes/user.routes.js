import { Router } from "express";
import { requireLoggedIn, requireStaff } from "../middleware/auth.middleware.js";
import { upload } from "../middleware/upload.js";
import { getMyProfile, updateMyProfile } from "../controllers/user.controller.js";

const router = Router();

router.get("/me/profile", requireLoggedIn, requireStaff, getMyProfile);
router.patch(
  "/me/profile",
  requireLoggedIn,
  upload.single("profile_image"),
  updateMyProfile
);

export default router;

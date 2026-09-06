import { Router } from "express";
import { requireLoggedIn} from "../middleware/auth.middleware.js";
import { upload } from "../middleware/upload.js";
import { getMyProfile, lookupUsers, updateMyProfile } from "../controllers/user.controller.js";

const router = Router();

router.get("/me/profile", requireLoggedIn, getMyProfile);
router.get("/lookup", requireLoggedIn, lookupUsers);
router.patch(
  "/me/profile",
  requireLoggedIn,
  upload.single("profile_image"),
  updateMyProfile
);

export default router;

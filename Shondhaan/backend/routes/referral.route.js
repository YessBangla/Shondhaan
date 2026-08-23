// src/routes/referral.routes.ts

import { Router } from "express";
import { referralController } from "../controllers/referral.controller.js";
import { requireLoggedIn } from "../middleware/auth.middleware.js";

const router = Router();

router.post("/generate", requireLoggedIn, referralController.generate);
router.get("/validate/:code", referralController.validate);
router.post("/apply", requireLoggedIn, referralController.apply);
router.post("/qualify/:referralId", requireLoggedIn, referralController.qualify);
router.post("/qualify-by-order/:orderId", requireLoggedIn, referralController.qualifyByOrder);
router.get("/stats", requireLoggedIn, referralController.stats);
router.post("/claim/:rewardId", requireLoggedIn, referralController.claim);

export default router;

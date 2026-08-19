// src/routes/referral.routes.ts

import { Router } from "express";
import { referralController } from "../controllers/referral.controller.js";
import { authenticate } from "/middleware/auth";

const router = Router();

router.post("/generate", authenticate, referralController.generate);
router.get("/validate/:code", referralController.validate);
router.post("/apply", authenticate, referralController.apply);
router.post("/qualify/:referralId", authenticate, referralController.qualify);
router.post("/qualify-by-order/:orderId", authenticate, referralController.qualifyByOrder);
router.get("/stats", authenticate, referralController.stats);
router.post("/claim/:rewardId", authenticate, referralController.claim);

export default router;
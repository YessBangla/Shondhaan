import { Router } from "express";
import { referralController } from "../controllers/referral.controller.js";
import { requireLoggedIn, requireServiceAdmin } from "../middleware/auth.middleware.js";

const router = Router();

router.post("/generate", requireLoggedIn, referralController.generate);
router.get("/config", requireLoggedIn, referralController.getSettings);
router.get("/validate/:code", referralController.validate);
router.post("/apply", requireLoggedIn, referralController.apply);
router.post("/qualify/:referralId", requireLoggedIn, referralController.qualify);
router.post("/qualify-by-order/:orderId", requireLoggedIn, referralController.qualifyByOrder);
router.get("/stats", requireLoggedIn, referralController.stats);
router.post("/claim/:rewardId", requireLoggedIn, referralController.claim);
router.get("/admin/settings", requireServiceAdmin, referralController.getSettings);
router.put("/admin/settings", requireServiceAdmin, referralController.updateSettings);
// router.get("/codes", requireServiceAdmin, referralController.adminList);
// router.get("/transactions", requireServiceAdmin, referralController.adminTransactions);
// router.get("/report", requireServiceAdmin, referralController.adminReport);

export default router;
import { Router } from "express";
import { requireCmsAdmin } from "../middleware/auth.middleware.js";  // ← changed
import {
  listCodes,
  createCode,
  toggleCode,
  deleteCode,
  getSettings,
  updateSettings,
  listTransactions,
  getReport,
} from "../controllers/referralAdmin.controller.js";

const router = Router();

// Public
router.get("/", (_req, res) => {
  res.json({ status: "ok", service: "referral-admin" });
});



// Codes
router.get("/codes", listCodes);
router.post("/codes", createCode);
router.patch("/codes/:id/toggle", toggleCode);
router.delete("/codes/:id", deleteCode);

// Settings
router.get("/settings", getSettings);
router.put("/settings", updateSettings);

// Transactions
router.get("/transactions", listTransactions);

// Report
router.get("/report", getReport);

export default router;
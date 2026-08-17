import express from "express";
import {
  debitWallet,
  getBalance,
  getAdminWalletStats,
  getAllWallets,
  getAllTransactions,
  adminAdjustWallet,
} from "../controllers/wallet.controller.js";
import { requireAdminPanelAccess } from "../middleware/auth.middleware.js";

const router = express.Router();

// User Routes
router.post("/debit", debitWallet);
router.get("/balance/:user_id", getBalance);

// Admin Routes (Protect these with your admin auth middleware!)
router.get("/admin/stats", requireAdminPanelAccess, getAdminWalletStats);
router.get("/admin/wallets", requireAdminPanelAccess, getAllWallets);
router.get("/admin/transactions", requireAdminPanelAccess, getAllTransactions);
router.post("/admin/adjust", requireAdminPanelAccess, adminAdjustWallet);

export default router;
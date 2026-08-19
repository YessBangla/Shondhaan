import express from "express";
import {
  debitWallet,
  getBalance,
  getAdminWalletStats,
  getAllWallets,
  getAllTransactions,
  adminAdjustWallet,
} from "../controllers/wallet.controller.js";
import {
  requireAdminPanelAccess,
  requireServiceAdmin,
  requireDealAdmin,
  requireMartAdmin,
  requireJobAdmin,
} from "../middleware/auth.middleware.js";

const router = express.Router();

// ==========================================
// USER ROUTES
// ==========================================
router.post("/debit", debitWallet);
router.get("/balance/:user_id", getBalance);

// ==========================================
// GENERAL ADMIN ROUTES
// ==========================================
router.get("/admin/stats", requireAdminPanelAccess, getAdminWalletStats);
router.get("/admin/wallets", requireAdminPanelAccess, getAllWallets);
router.get("/admin/transactions", requireAdminPanelAccess, getAllTransactions);
router.post("/admin/adjust", requireAdminPanelAccess, adminAdjustWallet);

// ==========================================
// SERVICE ADMIN ROUTES
// ==========================================
router.get("/service-admin/accounts/stats", requireServiceAdmin, getAdminWalletStats);
router.get("/service-admin/accounts/wallets", requireServiceAdmin, getAllWallets);
router.get("/service-admin/accounts/transactions", requireServiceAdmin, getAllTransactions);
router.post("/service-admin/accounts/adjust", requireServiceAdmin, adminAdjustWallet);

// ==========================================
// DEAL ADMIN ROUTES
// ==========================================
router.get("/deal-admin/accounts/stats", requireDealAdmin, getAdminWalletStats);
router.get("/deal-admin/accounts/wallets", requireDealAdmin, getAllWallets);
router.get("/deal-admin/accounts/transactions", requireDealAdmin, getAllTransactions);
router.post("/deal-admin/accounts/adjust", requireDealAdmin, adminAdjustWallet);

// ==========================================
// MART ADMIN ROUTES
// ==========================================
router.get("/mart-admin/accounts/stats", requireMartAdmin, getAdminWalletStats);
router.get("/mart-admin/accounts/wallets", requireMartAdmin, getAllWallets);
router.get("/mart-admin/accounts/transactions", requireMartAdmin, getAllTransactions);
router.post("/mart-admin/accounts/adjust", requireMartAdmin, adminAdjustWallet);

// ==========================================
// JOB ADMIN ROUTES
// ==========================================
router.get("/job-admin/accounts/stats", requireJobAdmin, getAdminWalletStats);
router.get("/job-admin/accounts/wallets", requireJobAdmin, getAllWallets);
router.get("/job-admin/accounts/transactions", requireJobAdmin, getAllTransactions);
router.post("/job-admin/accounts/adjust", requireJobAdmin, adminAdjustWallet);

export default router;
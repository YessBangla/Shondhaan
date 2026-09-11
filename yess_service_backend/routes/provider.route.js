import express from "express";
import {
  getMyProviderApplication,
  submitProviderApplication,
  getProviderApplications,
  updateProviderApplicationStatus,
  getProviders,
  getProviderById,
  getProviderByUserId,
  updateProviderStatus,
  createCallCenterProvider,
  updateCallCenterProvider,
} from "../controller/provider.controller.js";
import { upload } from "../middleware/upload.middleware.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { requireProviderReviewer } from "../controller/provider.controller.js";

const router = express.Router();

router.get("/applications/me", authMiddleware, getMyProviderApplication);
router.post(
  "/applications",
  authMiddleware,
  upload.fields([{ name: "nid_front", maxCount: 1 }, { name: "nid_back", maxCount: 1 }]),
  submitProviderApplication
);
router.post(
  "/call-center",
  authMiddleware,
  upload.fields([{ name: "nid_front", maxCount: 1 }, { name: "nid_back", maxCount: 1 }]),
  createCallCenterProvider
);
router.patch(
  "/call-center/:id",
  authMiddleware,
  upload.fields([{ name: "nid_front", maxCount: 1 }, { name: "nid_back", maxCount: 1 }]),
  updateCallCenterProvider
);
router.get("/applications", authMiddleware, requireProviderReviewer, getProviderApplications);
router.patch("/applications/:userId/status", authMiddleware, requireProviderReviewer, updateProviderApplicationStatus);
router.get("/", getProviders);
router.get("/user/:userId", getProviderByUserId);
router.get("/:id", getProviderById);
router.patch("/:id/status", updateProviderStatus);

export default router;

import express from "express";
import {
  getProviders,
  getProviderById,
  getProviderByUserId,
  updateProviderStatus,
} from "../controller/provider.controller.js";

const router = express.Router();

router.get("/", getProviders);
router.get("/user/:userId", getProviderByUserId);
router.get("/:id", getProviderById);
router.patch("/:id/status", updateProviderStatus);

export default router;
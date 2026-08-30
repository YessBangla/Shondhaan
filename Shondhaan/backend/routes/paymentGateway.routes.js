import { Router } from "express";
import * as paymentGatewayController from "../controllers/paymentGateway.controller.js";

// ─────────────────────────────────────────────────────────────────────────
// ⚠️ Auth: adjust this import to match your existing middleware.
// This file assumes you already have something like admin.routes.js using
// an authenticate + authorize(...) pair. Swap the import path/names below
// for whatever you actually use (e.g. the middleware admin.routes.js
// imports), so these endpoints stay protected — they read/write live
// payment credentials.
// ─────────────────────────────────────────────────────────────────────────
// import { authenticate, authorize } from "../middleware/auth.js";

const router = Router();

// router.use(authenticate);
// router.use(authorize("super_admin", "admin", "finance"));

router.get("/", paymentGatewayController.listGateways);
router.post("/", paymentGatewayController.createGateway);
router.get("/:gatewayName", paymentGatewayController.getGateway);
router.put("/:gatewayName", paymentGatewayController.updateGateway);
router.patch("/:gatewayName/toggle", paymentGatewayController.toggleGateway);
router.delete("/:gatewayName", paymentGatewayController.deleteGateway);

export default router;

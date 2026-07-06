import express from "express";
import {
  deleteService,
  deleteServiceCategory,
  deleteServicePackage,
  listServiceCategories,
  listServicePackages,
  listServices,
  upsertService,
  upsertServiceCategory,
  upsertServicePackage,
} from "../controllers/serviceCatalog.controller.js";
import { requireAuth } from "../middleware/tokenBlacklist.middleware.js";

const router = express.Router();

router.get("/service-categories", listServiceCategories);
router.post("/service-categories", requireAuth, upsertServiceCategory);
router.delete("/service-categories/:id", requireAuth, deleteServiceCategory);
router.get("/categories", listServiceCategories);
router.post("/categories", requireAuth, upsertServiceCategory);
router.delete("/categories/:id", requireAuth, deleteServiceCategory);

router.get("/services", listServices);
router.post("/services", requireAuth, upsertService);
router.delete("/services/:id", requireAuth, deleteService);

router.get("/service-packages", listServicePackages);
router.post("/service-packages", requireAuth, upsertServicePackage);
router.delete("/service-packages/:id", requireAuth, deleteServicePackage);
router.get("/packages", listServicePackages);
router.post("/packages", requireAuth, upsertServicePackage);
router.delete("/packages/:id", requireAuth, deleteServicePackage);

export default router;

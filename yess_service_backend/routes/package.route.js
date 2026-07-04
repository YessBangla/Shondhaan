import express from "express";
import {
  createPackage,
  getPackages,
  updatePackage,
  deletePackage,
} from "../controller/package.controller.js";

const router = express.Router();

// POST /api/packages
router.post("/", createPackage);

// GET /api/packages?service_id=xxx
router.get("/", getPackages);

// UPDATE /api/packages/:id
router.put("/:id", updatePackage);
router.patch("/:id", updatePackage);

// DELETE /api/packages/:id
router.delete("/:id", deletePackage);

export default router;

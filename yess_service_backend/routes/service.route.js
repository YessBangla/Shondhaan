import express from "express";
import {
  createService,
  getServices,
  getServiceBySlug,
  updateService,
  deleteService,
} from "../controller/service.controller.js";

const router = express.Router();

// GET ALL
router.get("/", getServices);

// CREATE
router.post("/", createService);

// UPDATE BY ID
router.put("/:id", updateService);
router.patch("/:id", updateService);

// DELETE BY ID
router.delete("/:id", deleteService);

// GET BY SLUG - keep this LAST
router.get("/:slug", getServiceBySlug);

export default router;
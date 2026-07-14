import express from "express";

import {
  getDealCategories,
  getDealCategoryTree,
  getDealCategoryById,
  createDealCategory,
  updateDealCategory,
  deleteDealCategory,
} from "../controller/categories.controller.js";

const router = express.Router();

// Read
router.get("/", getDealCategories);
router.get("/tree", getDealCategoryTree);
router.get("/:id", getDealCategoryById);

// Create
router.post("/", createDealCategory);

// Update
router.put("/:id", updateDealCategory);

// Delete
router.delete("/:id", deleteDealCategory);

export default router;
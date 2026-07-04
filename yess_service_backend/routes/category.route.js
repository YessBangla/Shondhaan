import express from "express";

import * as categoryController from "../controller/category.controller.js";

const {
  getAllCategories,
  getCategoryBySlug,
  createCategory,
  deleteCategory,
  updateCategory,
} = categoryController;


const router = express.Router();

// GET all categories
router.get("/", getAllCategories);

// GET single category by slug
router.get("/:slug", getCategoryBySlug);

// POST create category (admin)
router.post("/", createCategory);

// UPDATE category
router.put("/:id", updateCategory);
router.patch("/:id", updateCategory);

// DELETE category
router.delete("/:id", deleteCategory);

export default router;


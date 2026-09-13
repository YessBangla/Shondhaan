import express from "express";
import {
  createSuggestionCategory,
  getAllSuggestionCategories,
  getSuggestionCategoryById,
  updateSuggestionCategory,
  deleteSuggestionCategory,
} from "../controllers/suggestionCategory.Controller.js";

const router = express.Router();

// If you have authentication middleware, you can apply it like this:
// import { authMiddleware, adminMiddleware } from "../middlewares/auth.js";
// router.use(authMiddleware, adminMiddleware);

router.post("/", createSuggestionCategory);
router.get("/", getAllSuggestionCategories);
router.get("/:id", getSuggestionCategoryById);
router.put("/:id", updateSuggestionCategory);
router.delete("/:id", deleteSuggestionCategory);

export default router;
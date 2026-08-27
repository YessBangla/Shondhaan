import express from "express";
import {
  getHomepageSections,
  getHomepageSectionById,
  createHomepageSection,
  updateHomepageSection,
  deleteHomepageSection,
} from "../controller/homepageSection.controller.js";

const router = express.Router();

router.get("/", getHomepageSections);
router.get("/:id", getHomepageSectionById);
router.post("/", createHomepageSection);
router.put("/:id", updateHomepageSection);
router.patch("/:id", updateHomepageSection);
router.delete("/:id", deleteHomepageSection);

export default router;
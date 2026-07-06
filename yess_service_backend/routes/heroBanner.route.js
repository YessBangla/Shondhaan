import express from "express";
import {
  getHeroBanners,
  getHeroBannerById,
  createHeroBanner,
  updateHeroBanner,
  deleteHeroBanner,
} from "../controller/heroBanner.controller.js";

const router = express.Router();

router.get("/", getHeroBanners);
router.get("/:id", getHeroBannerById);
router.post("/", createHeroBanner);
router.put("/:id", updateHeroBanner);
router.patch("/:id", updateHeroBanner);
router.delete("/:id", deleteHeroBanner);

export default router;
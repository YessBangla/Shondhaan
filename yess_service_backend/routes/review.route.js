import express from "express";
import {
  createReview,
  deleteReview,
  getReviews,
  getReviewsByService,
} from "../controller/review.controller.js";

const router = express.Router();

router.get("/", getReviews);
router.get("/service/:slug", getReviewsByService);
router.post("/", createReview);
router.delete("/:id", deleteReview);

export default router;

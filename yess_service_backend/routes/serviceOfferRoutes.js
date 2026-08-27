import express from "express";
import {
  getAllOffers,
  getOfferById,
  createOffer,
  updateOffer,
  deleteOffer,
} from "../controller/serviceOfferController.js";

const router = express.Router();

router.get("/", getAllOffers);
router.post("/", createOffer);
router.get("/:id", getOfferById);
router.put("/:id", updateOffer);
router.delete("/:id", deleteOffer);

export default router;
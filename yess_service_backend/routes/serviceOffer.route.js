import express from "express";
import {
  getAllOffers,
  getOfferById,
  createOffer,
  updateOffer,
  deleteOffer,
  validateOfferCode,
} from "../controller/serviceOfferController.js";

const router = express.Router();

router.get("/", getAllOffers);
router.get("/:id", getOfferById);
router.post("/", createOffer);
router.put("/:id", updateOffer);
router.delete("/:id", deleteOffer);
router.get("/service-offers/validate/:code", validateOfferCode);

export default router;

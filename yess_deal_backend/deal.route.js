import express from "express";
import {
  getDealCategories,
  getDealCategoryTree,
  getDealListings,
  getDealListingById,
  createDealListing,
} from "../controller/deal.controller.js";

const router = express.Router();

router.get("/categories", getDealCategories);
router.get("/categories/tree", getDealCategoryTree);

router.get("/listings", getDealListings);
router.get("/listings/:id", getDealListingById);
router.post("/listings", createDealListing);

export default router;
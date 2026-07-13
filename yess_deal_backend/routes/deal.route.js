import express from "express";
import {
  getDealCategories,
  getDealCategoryTree,
  getDealListings,
  getDealListingById,
  createDealListing,
  deleteDealListing,
  getDealFavorites,
  getDealFavoriteStatus,
  addDealFavorite,
  removeDealFavorite,
} from "../controller/deal.controller.js";

const router = express.Router();

router.get("/categories", getDealCategories);
router.get("/categories/tree", getDealCategoryTree);

router.get("/listings", getDealListings);
router.get("/listings/:id", getDealListingById);
router.post("/listings", createDealListing);
router.delete("/listings", deleteDealListing);
router.delete("/listings/:id", deleteDealListing);

router.get("/favorites", getDealFavorites);
router.get("/favorites/:listingId", getDealFavoriteStatus);
router.post("/favorites", addDealFavorite);
router.post("/favorites/:listingId", addDealFavorite);
router.delete("/favorites/:listingId", removeDealFavorite);

export default router;


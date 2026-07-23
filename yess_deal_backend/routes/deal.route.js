import express from "express";
import {
  getDealListings,
  getDealListingById,
  deleteDealListing,
  getDealFavorites,
  getDealFavoriteStatus,
  addDealFavorite,
  removeDealFavorite,
  createDealListing,
} from "../controller/deal.controller.js";

import { getDealReports, resolveDealReport } from "../controller/reports.controller.js";

const router = express.Router();

router.get("/listings", getDealListings);
router.get("/listings/:id", getDealListingById);
router.post("/listings", createDealListing);
router.delete("/listings", deleteDealListing);
router.delete("/listings/:id", deleteDealListing);

// Reports
router.get("/reports", getDealReports);
router.put("/reports/:id", resolveDealReport);

router.get("/favorites", getDealFavorites);
router.get("/favorites/:listingId", getDealFavoriteStatus);
router.post("/favorites", addDealFavorite);
router.post("/favorites/:listingId", addDealFavorite);
router.delete("/favorites/:listingId", removeDealFavorite);

export default router;



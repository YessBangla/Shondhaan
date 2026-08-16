// routes/serviceAdminDashboard.route.js
import express from "express";
import {
  getDashboardStats,
  getRecentBookings,
  getBookingChart,
  getRevenueChart,
} from "../controller/serviceAdminDashboard.controller.js";

const router = express.Router();

router.get("/stats", getDashboardStats);
router.get("/recent-bookings", getRecentBookings);
router.get("/booking-chart", getBookingChart);
router.get("/revenue-chart", getRevenueChart);

export default router;
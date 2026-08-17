import express from "express";
import {
  createBooking,
  getBookings,
  getBookingById,
  getProviderAssignedBookings,
  updateBooking,
  updateBookingStatus,
  updatePaymentStatus,
  assignBookingProvider,
  deleteBooking,
} from "../controller/booking.controller.js";
import {
  handleBookingPaymentCancel,
  handleBookingPaymentReturn,
  initiateBookingPayment,
  verifyBookingPayment,
} from "../controller/shurjopay.controller.js";

const router = express.Router();

router.get("/", getBookings);
router.post("/", createBooking);
router.get("/payment/return", handleBookingPaymentReturn);
router.get("/payment/cancel", handleBookingPaymentCancel);
router.post("/payment/verify", verifyBookingPayment);
router.post("/:id/payment", initiateBookingPayment);

router.get("/provider/:userId", getProviderAssignedBookings);
router.get("/:id", getBookingById);

/**
 * Specific PATCH routes first
 */
router.patch("/:id/status", updateBookingStatus);
router.patch("/:id/payment-status", updatePaymentStatus);
router.patch("/:id/assign-provider", assignBookingProvider);

router.put("/:id", updateBooking);
router.patch("/:id", updateBooking);

router.delete("/:id", deleteBooking);

export default router;

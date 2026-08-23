import { Router } from "express";
import {
  reserveReferralForBooking,
  settleReferralForPaidBooking,
} from "../controllers/referralSettlement.js";

const router = Router();

router.post("/reserve", async (req, res) => {
  try {
    const { user_id, code, booking_id, order_amount } = req.body;

    if (!user_id || !code || !booking_id) {
      return res.status(400).json({
        success: false,
        reason: "MISSING_FIELDS",
      });
    }

    const result = await reserveReferralForBooking({
      userId: user_id,
      code,
      bookingId: booking_id,
      orderAmount: order_amount,
    });

    return res.json(result);
  } catch (err) {
    console.error("Reserve referral error:", err);
    return res.status(500).json({
      success: false,
      reason: "INTERNAL_ERROR",
    });
  }
});

router.post("/settle", async (req, res) => {
  try {
    const { user_id, booking_id, order_amount } = req.body;

    if (!user_id || !booking_id) {
      return res.status(400).json({
        success: false,
        reason: "MISSING_FIELDS",
      });
    }

    const result = await settleReferralForPaidBooking({
      userId: user_id,
      bookingId: booking_id,
      orderAmount: order_amount,
    });

    return res.json(result);
  } catch (err) {
    console.error("Settle referral error:", err);
    return res.status(500).json({
      success: false,
      reason: "INTERNAL_ERROR",
    });
  }
});

export default router;
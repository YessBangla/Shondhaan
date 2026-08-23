import { v4 as uuidv4 } from "uuid";
import { ensurePlatformFeeSchema, pool } from "../config/db.js";

const CENTRAL_API_BASE_URL = process.env.CENTRAL_API_BASE_URL || "http://localhost:5000";

const allowedStatuses = [
  "pending",
  "confirmed",
  "processing",
  "assigned",
  "completed",
  "cancelled",
];
const allowedPaymentStatuses = ["unpaid", "paid", "refunded"];
const allowedPaymentMethods = ["gateway", "wallet", "mixed"];

const money = (value) => Math.round(Number(value || 0) * 100) / 100;

const calculateDueAmount = (booking) => {
  const total = Number(booking.package_price || 0);
  const paidNow =
    booking.payment_status === "paid" ? Number(booking.payment_amount || 0) : 0;
  return Math.max(total - paidNow, 0);
};

const formatBooking = (booking) => ({
  ...booking,
  package_price: Number(booking.package_price || 0),
  payment_amount: Number(booking.payment_amount || 0),
  platform_fee_amount: Number(
    booking.platform_fee_amount ?? booking.payment_amount ?? 0
  ),
  paid_amount:
    booking.payment_status === "paid" ? Number(booking.payment_amount || 0) : 0,
  service_charge_amount: Number(booking.payment_amount || 0),
  due_amount: calculateDueAmount(booking),
  payment_method: booking.payment_method || "gateway",
  wallet_cash_used: Number(booking.wallet_cash_used || 0),
  wallet_coins_used: Number(booking.wallet_coins_used || 0),
  provider_payout_status: booking.provider_payout_status || "unpaid",
  referral_code: booking.referral_code || null,
  referral_id: booking.referral_id || null,
  referral_status: booking.referral_status || null,
});

// Non-blocking call to central backend for referral reservation
const reserveReferralViaApi = (userId, code, bookingId, orderAmount) => {
  fetch(`${CENTRAL_API_BASE_URL}/api/referral-settlement/reserve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_id: userId,
      code,
      booking_id: bookingId,
      order_amount: orderAmount,
    }),
  })
    .then((res) => res.json())
    .then((result) => {
      if (!result.success) {
        console.log(`[Referral] Reserve skipped: ${result.reason}`);
      } else {
        console.log(`[Referral] Reserved: ${result.referral_id}`);
        // Update booking with referral_id
        pool
          .execute(
            "UPDATE bookings SET referral_id = ?, referral_status = ? WHERE id = ?",
            [result.referral_id || null, "reserved", bookingId]
          )
          .catch(() => {});
      }
    })
    .catch((err) => {
      console.error("[Referral] Reserve failed (non-blocking):", err.message);
    });
};

// Non-blocking call to central backend for referral settlement
const settleReferralViaApi = (userId, bookingId, orderAmount) => {
  fetch(`${CENTRAL_API_BASE_URL}/api/referral-settlement/settle`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_id: userId,
      booking_id: bookingId,
      order_amount: orderAmount,
    }),
  })
    .then((res) => res.json())
    .then((result) => {
      if (!result.success) {
        console.log(`[Referral] Settle skipped: ${result.reason}`);
      } else {
        console.log(`[Referral] Settled: ${result.referral_id}, credited: ${result.credred}`);
        pool
          .execute(
            "UPDATE bookings SET referral_status = ? WHERE id = ?",
            ["rewarded", bookingId]
          )
          .catch(() => {});
      }
    })
    .catch((err) => {
      console.error("[Referral] Settle failed (non-blocking):", err.message);
    });
};

export const createBooking = async (req, res) => {
  try {
    await ensurePlatformFeeSchema();

    const {
      user_id,
      service_id,
      booked_by,
      booker_name,
      booker_phone,
      package_id,
      service_slug,
      service_title,
      package_name,
      package_price,
      customer_name,
      customer_phone,
      customer_address,
      booking_date,
      booking_time,
      note,
      platform_fee_amount,
      payment_method,
      payment_status,
      wallet_cash_used,
      wallet_coins_used,
      referral_code,
    } = req.body;

    if (
      !user_id ||
      !service_slug ||
      !service_title ||
      !package_name ||
      package_price === undefined ||
      package_price === null ||
      !customer_name ||
      !customer_phone ||
      !customer_address ||
      !booking_date ||
      !booking_time
    ) {
      return res.status(400).json({
        message: "Required booking fields are missing",
      });
    }

    const price = Number(package_price);

    if (Number.isNaN(price) || price < 0) {
      return res.status(400).json({
        message: "Invalid package price",
      });
    }

    const id = uuidv4();

    let platformFeeAmount =
      platform_fee_amount !== undefined &&
      platform_fee_amount !== null &&
      platform_fee_amount !== ""
        ? Number(platform_fee_amount)
        : 0;

    if (Number.isNaN(platformFeeAmount) || platformFeeAmount < 0) {
      return res.status(400).json({
        message: "Invalid platform fee",
      });
    }

    if (platformFeeAmount === 0) {
      let serviceRows = [];
      if (service_id) {
        [serviceRows] = await pool.execute(
          `SELECT platform_fee, commission_percent FROM services WHERE id = ? LIMIT 1`,
          [service_id]
        );
      } else if (service_slug) {
        [serviceRows] = await pool.execute(
          `SELECT platform_fee, commission_percent FROM services WHERE slug = ? LIMIT 1`,
          [service_slug]
        );
      }

      if (serviceRows.length) {
        const dbService = serviceRows[0];
        const flatFee = Number(dbService.platform_fee || 0);

        if (flatFee > 0) {
          platformFeeAmount = flatFee;
        } else {
          const commission = Number(dbService.commission_percent || 0);
          platformFeeAmount = price * (commission / 100);
        }
      }
    }

    platformFeeAmount = money(platformFeeAmount);

    const finalPaymentMethod = allowedPaymentMethods.includes(payment_method) ? payment_method : "gateway";
    const finalWalletCash = money(wallet_cash_used || 0);
    const finalWalletCoins = money(wallet_coins_used || 0);

    const finalStatus = "pending";
    const finalPaymentStatus = allowedPaymentStatuses.includes(payment_status) ? payment_status : "unpaid";

    await pool.execute(
      `
      INSERT INTO bookings (
        id,
        user_id,
        booked_by,
        service_id,
        package_id,
        service_slug,
        service_title,
        package_name,
        package_price,
        customer_name,
        customer_phone,
        customer_address,
        booker_name,
        booker_phone,
        booking_date,
        booking_time,
        status,
        payment_status,
        platform_fee_amount,
        payment_amount,
        note,
        payment_method,
        wallet_cash_used,
        wallet_coins_used,
        provider_payout_status,
        referral_code,
        referral_status
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        id,
        user_id,
        booked_by || user_id || null,
        service_id || null,
        package_id || null,
        service_slug,
        service_title,
        package_name,
        price,
        customer_name,
        customer_phone,
        customer_address,
        booker_name || null,
        booker_phone || null,
        booking_date,
        booking_time,
        finalStatus,
        finalPaymentStatus,
        platformFeeAmount,
        platformFeeAmount,
        note || null,
        finalPaymentMethod,
        finalWalletCash,
        finalWalletCoins,
        "unpaid",
        referral_code ? String(referral_code).trim().toUpperCase() : null,
        referral_code ? "pending" : null,
      ]
    );

    // Fire-and-forget referral reservation via central API
    if (referral_code) {
      reserveReferralViaApi(user_id, referral_code, id, platformFeeAmount);
    }

    const [rows] = await pool.execute(
      `
      SELECT *
      FROM bookings
      WHERE id = ?
      LIMIT 1
      `,
      [id]
    );

    return res.status(201).json({
      message: "Booking created successfully",
      data: formatBooking(rows[0]),
    });
  } catch (error) {
    console.error("Create booking error:", error);

    return res.status(500).json({
      message: "Failed to create booking",
      error: error.message,
    });
  }
};

export const getBookings = async (req, res) => {
  try {
    const {
      user_id,
      booked_by,
      status,
      payment_status,
      service_slug,
      date,
      provider_id,
      assigned_to,
    } = req.query;

    let query = `
      SELECT *
      FROM bookings
      WHERE 1 = 1
    `;

    const values = [];

    if (user_id) {
      query += ` AND user_id = ?`;
      values.push(user_id);
    }

    if (booked_by) {
      query += ` AND booked_by = ?`;
      values.push(booked_by);
    }

    if (status) {
      query += ` AND status = ?`;
      values.push(status);
    }

    if (payment_status) {
      query += ` AND payment_status = ?`;
      values.push(payment_status);
    } else if (!user_id && !booked_by) {
      query += ` AND payment_status = 'paid'`;
    }

    if (service_slug) {
      query += ` AND service_slug = ?`;
      values.push(service_slug);
    }

    if (date) {
      query += ` AND booking_date = ?`;
      values.push(date);
    }
    if (provider_id) {
      query += ` AND provider_id = ?`;
      values.push(provider_id);
    }
    if (assigned_to) {
      query += ` AND assigned_to = ?`;
      values.push(assigned_to);
    }
    query += `
      ORDER BY booking_date DESC, booking_time DESC, created_at DESC
    `;
    const [rows] = await pool.execute(query, values);
    return res.json({
      data: rows.map(formatBooking),
    });
  } catch (error) {
    console.error("Get bookings error:", error);

    return res.status(500).json({
      message: "Failed to fetch bookings",
      error: error.message,
    });
  }
};

export const getBookingById = async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await pool.execute(
      `
      SELECT *
      FROM bookings
      WHERE id = ?
      LIMIT 1
      `,
      [id]
    );

    if (!rows.length) {
      return res.status(404).json({
        message: "Booking not found",
      });
    }

    return res.json({
      data: formatBooking(rows[0]),
    });
  } catch (error) {
    console.error("Get booking by id error:", error);

    return res.status(500).json({
      message: "Failed to fetch booking",
      error: error.message,
    });
  }
};

export const getProviderAssignedBookings = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        message: "Provider user id is required",
      });
    }

    const [providerRows] = await pool.execute(
      `
      SELECT id, user_id
      FROM providers
      WHERE id = ? OR user_id = ?
      LIMIT 1
      `,
      [userId, userId]
    );

    const provider = providerRows[0] || null;
    const lookupIds = Array.from(
      new Set(
        [userId, provider?.id, provider?.user_id]
          .filter((value) => value !== undefined && value !== null && value !== "")
          .map((value) => String(value))
      )
    );

    if (!lookupIds.length) {
      return res.json({
        data: [],
        provider,
      });
    }

    const placeholders = lookupIds.map(() => "?").join(", ");
    const [rows] = await pool.execute(
      `
      SELECT *
      FROM bookings
      WHERE provider_id IN (${placeholders})
         OR assigned_to IN (${placeholders})
      ORDER BY booking_date DESC, booking_time DESC, created_at DESC
      `,
      [...lookupIds, ...lookupIds]
    );

    return res.json({
      data: rows.map(formatBooking),
      provider,
    });
  } catch (error) {
    console.error("Get provider assigned bookings error:", error);

    return res.status(500).json({
      message: "Failed to fetch provider assigned bookings",
      error: error.message,
    });
  }
};

export const updateBooking = async (req, res) => {
  try {
    const { id } = req.params;

    const [existing] = await pool.execute(
      `
      SELECT *
      FROM bookings
      WHERE id = ?
      LIMIT 1
      `,
      [id]
    );

    if (!existing.length) {
      return res.status(404).json({
        message: "Booking not found",
      });
    }

    const old = existing[0];

    const {
      customer_name,
      customer_phone,
      customer_address,
      booked_by,
      booker_name,
      booker_phone,
      booking_date,
      booking_time,
      note,
    } = req.body;

    await pool.execute(
      `
      UPDATE bookings
      SET
        customer_name = ?,
        customer_phone = ?,
        customer_address = ?,
        booked_by = ?,
        booker_name = ?,
        booker_phone = ?,
        booking_date = ?,
        booking_time = ?,
        note = ?
      WHERE id = ?
      `,
      [
        customer_name ?? old.customer_name,
        customer_phone ?? old.customer_phone,
        customer_address ?? old.customer_address,
        booked_by ?? old.booked_by,
        booker_name ?? old.booker_name,
        booker_phone ?? old.booker_phone,
        booking_date ?? old.booking_date,
        booking_time ?? old.booking_time,
        note ?? old.note,
        id,
      ]
    );

    const [rows] = await pool.execute(
      `
      SELECT *
      FROM bookings
      WHERE id = ?
      LIMIT 1
      `,
      [id]
    );

    return res.json({
      message: "Booking updated successfully",
      data: formatBooking(rows[0]),
    });
  } catch (error) {
    console.error("Update booking error:", error);

    return res.status(500).json({
      message: "Failed to update booking",
      error: error.message,
    });
  }
};

export const updateBookingStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, cancel_reason } = req.body;

    if (!status) {
      return res.status(400).json({
        message: "status is required",
      });
    }

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        message: "Invalid booking status",
      });
    }

    const [existing] = await pool.execute(
      `
      SELECT id
      FROM bookings
      WHERE id = ?
      LIMIT 1
      `,
      [id]
    );

    if (!existing.length) {
      return res.status(404).json({
        message: "Booking not found",
      });
    }

    await pool.execute(
      `
      UPDATE bookings
      SET
        status = ?,
        cancel_reason = ?
      WHERE id = ?
      `,
      [status, status === "cancelled" ? cancel_reason || null : null, id]
    );

    const [rows] = await pool.execute(
      `
      SELECT *
      FROM bookings
      WHERE id = ?
      LIMIT 1
      `,
      [id]
    );

    return res.json({
      message: "Booking status updated successfully",
      data: formatBooking(rows[0]),
    });
  } catch (error) {
    console.error("Update booking status error:", error);

    return res.status(500).json({
      message: "Failed to update booking status",
      error: error.message,
    });
  }
};

export const updatePaymentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { payment_status, payment_method, payment_transaction_id, wallet_cash_used, wallet_coins_used } = req.body;

    if (!payment_status) {
      return res.status(400).json({
        message: "payment_status is required",
      });
    }

    if (!allowedPaymentStatuses.includes(payment_status)) {
      return res.status(400).json({
        message: "Invalid payment status",
      });
    }

    const [existing] = await pool.execute(
      `
      SELECT *
      FROM bookings
      WHERE id = ?
      LIMIT 1
      `,
      [id]
    );

    if (!existing.length) {
      return res.status(404).json({
        message: "Booking not found",
      });
    }

    await pool.execute(
      `
      UPDATE bookings
      SET
        payment_status = ?,
        payment_method = COALESCE(?, payment_method),
        payment_transaction_id = COALESCE(?, payment_transaction_id),
        wallet_cash_used = COALESCE(?, wallet_cash_used),
        wallet_coins_used = COALESCE(?, wallet_coins_used),
        payment_verified_at = CASE
          WHEN ? = 'paid' THEN NOW()
          ELSE payment_verified_at
        END
      WHERE id = ?
      `,
      [
        payment_status,
        allowedPaymentMethods.includes(payment_method) ? payment_method : null,
        payment_transaction_id || null,
        wallet_cash_used !== undefined ? money(wallet_cash_used) : null,
        wallet_coins_used !== undefined ? money(wallet_coins_used) : null,
        payment_status,
        id,
      ]
    );

    // Fire-and-forget referral settlement via central API
    if (payment_status === "paid" && existing[0].referral_status === "reserved") {
      settleReferralViaApi(
        existing[0].user_id,
        id,
        existing[0].platform_fee_amount || existing[0].payment_amount
      );
    }

    const [rows] = await pool.execute(
      `
      SELECT *
      FROM bookings
      WHERE id = ?
      LIMIT 1
      `,
      [id]
    );

    return res.json({
      message:
        payment_status === "paid"
          ? "Platform fee paid and booking request is ready"
          : "Payment status updated successfully",
      data: formatBooking(rows[0]),
    });
  } catch (error) {
    console.error("Update payment status error:", error);

    return res.status(500).json({
      message: "Failed to update payment status",
      error: error.message,
    });
  }
};

export const assignBookingProvider = async (req, res) => {
  try {
    const { id } = req.params;
    const { provider_id } = req.body;

    const [bookingRows] = await pool.execute(
      `
      SELECT *
      FROM bookings
      WHERE id = ?
      LIMIT 1
      `,
      [id]
    );

    if (!bookingRows.length) {
      return res.status(404).json({
        message: "Booking not found",
      });
    }
    let finalProviderId = provider_id || null;
    let finalAssignedTo = provider_id || null;
    if (provider_id) {
      const [providerRows] = await pool.execute(
        `
        SELECT id, user_id
        FROM providers
        WHERE id = ? OR user_id = ?
        LIMIT 1
        `,
        [provider_id, provider_id]
      );

      if (providerRows.length) {
        finalProviderId = providerRows[0].id;
        finalAssignedTo = providerRows[0].user_id || providerRows[0].id;
      }
    }
    await pool.execute(
      `
      UPDATE bookings
      SET
        provider_id = ?,
        assigned_to = ?,
        status = CASE
          WHEN ? IS NULL THEN status
          WHEN status IN ('pending', 'confirmed', 'processing') THEN 'assigned'
          ELSE status
        END
      WHERE id = ?
      `,
      [finalProviderId, finalAssignedTo, finalProviderId, id]
    );
    const [rows] = await pool.execute(
      `
      SELECT *
      FROM bookings
      WHERE id = ?
      LIMIT 1
      `,
      [id]
    );
    return res.json({
      message: finalProviderId
        ? "Provider assigned successfully"
        : "Provider removed successfully",
      data: formatBooking(rows[0]),
    });
  } catch (error) {
    console.error("Assign provider error:", error);

    return res.status(500).json({
      message: "Failed to assign provider",
      error: error.message,
    });
  }
};

export const deleteBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const [existing] = await pool.execute(
      `
      SELECT id
      FROM bookings
      WHERE id = ?
      LIMIT 1
      `,
      [id]
    );
    if (!existing.length) {
      return res.status(404).json({
        message: "Booking not found",
      });
    }
    await pool.execute(
      `
      DELETE FROM bookings
      WHERE id = ?
      `,
      [id]
    );
    return res.json({
      message: "Booking deleted successfully",
      data: { id },
    });
  } catch (error) {
    console.error("Delete booking error:", error);
    return res.status(500).json({
      message: "Failed to delete booking",
      error: error.message,
    });
  }
};
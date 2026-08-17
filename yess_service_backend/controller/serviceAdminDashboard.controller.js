import { pool as db } from "../config/db.js";

/**
 * =========================================================
 * SERVICE ADMIN DASHBOARD
 * =========================================================
 *
 * Endpoints:
 *
 * GET /api/service-admin/dashboard/stats
 * GET /api/service-admin/dashboard/recent-bookings
 * GET /api/service-admin/dashboard/booking-chart
 * GET /api/service-admin/dashboard/revenue-chart
 *
 * This controller only reads Service DB data.
 */

// =========================================================
// GET DASHBOARD STATS
// =========================================================

export const getDashboardStats = async (req, res) => {
  try {
    const [
      [serviceStats],
      [providerStats],
      [bookingStats],
      [categoryStats],
      [packageStats],
      [reviewStats],
      [revenueStats],
    ] = await Promise.all([
      // SERVICES
      db.query(`
        SELECT
          COUNT(*) AS total_services,
          COALESCE(SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END), 0) AS active_services,
          COALESCE(SUM(CASE WHEN is_active = 0 THEN 1 ELSE 0 END), 0) AS inactive_services
        FROM services
      `),

      // PROVIDERS
      db.query(`
        SELECT
          COUNT(*) AS total_providers,
          COALESCE(SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END), 0) AS pending_providers,
          COALESCE(SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END), 0) AS approved_providers,
          COALESCE(SUM(CASE WHEN status = 'suspended' THEN 1 ELSE 0 END), 0) AS suspended_providers,
          COALESCE(SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END), 0) AS rejected_providers
        FROM providers
      `),

      // BOOKINGS
      db.query(`
        SELECT
          COUNT(*) AS total_bookings,

          COALESCE(
            SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END),
            0
          ) AS pending_bookings,

          COALESCE(
            SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END),
            0
          ) AS confirmed_bookings,

          COALESCE(
            SUM(CASE WHEN status = 'assigned' THEN 1 ELSE 0 END),
            0
          ) AS assigned_bookings,

          COALESCE(
            SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END),
            0
          ) AS in_progress_bookings,

          COALESCE(
            SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END),
            0
          ) AS completed_bookings,

          COALESCE(
            SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END),
            0
          ) AS cancelled_bookings,

          COALESCE(
            SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END),
            0
          ) AS rejected_bookings
        FROM bookings
      `),

      // CATEGORIES
      db.query(`
        SELECT
          COUNT(*) AS total_categories,
          COALESCE(
            SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END),
            0
          ) AS active_categories
        FROM service_categories
      `),

      // PACKAGES
      db.query(`
        SELECT
          COUNT(*) AS total_packages,
          COALESCE(
            SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END),
            0
          ) AS active_packages
        FROM service_packages
      `),

      // REVIEWS
      db.query(`
        SELECT
          COUNT(*) AS total_reviews,
          COALESCE(ROUND(AVG(rating), 1), 0) AS average_rating
        FROM service_reviews
      `),

      // REVENUE
      db.query(`
        SELECT
          COALESCE(
            SUM(
              CASE
                WHEN payment_status = 'paid'
                THEN COALESCE(payment_amount, 0)
                ELSE 0
              END
            ),
            0
          ) AS total_revenue,

          COALESCE(
            SUM(
              CASE
                WHEN payment_status = 'paid'
                AND DATE(created_at) = CURDATE()
                THEN COALESCE(payment_amount, 0)
                ELSE 0
              END
            ),
            0
          ) AS today_revenue,

          COALESCE(
            SUM(
              CASE
                WHEN payment_status = 'paid'
                AND YEAR(created_at) = YEAR(CURDATE())
                AND MONTH(created_at) = MONTH(CURDATE())
                THEN COALESCE(payment_amount, 0)
                ELSE 0
              END
            ),
            0
          ) AS monthly_revenue,

          COALESCE(
            SUM(
              CASE
                WHEN payment_status = 'paid'
                THEN 1
                ELSE 0
              END
            ),
            0
          ) AS paid_bookings,

          COALESCE(
            SUM(
              CASE
                WHEN payment_status = 'unpaid'
                THEN 1
                ELSE 0
              END
            ),
            0
          ) AS unpaid_bookings
        FROM bookings
      `),
    ]);

    return res.json({
      success: true,
      data: {
        services: {
          total: Number(serviceStats[0]?.total_services || 0),
          active: Number(serviceStats[0]?.active_services || 0),
          inactive: Number(serviceStats[0]?.inactive_services || 0),
        },

        providers: {
          total: Number(providerStats[0]?.total_providers || 0),
          pending: Number(providerStats[0]?.pending_providers || 0),
          approved: Number(providerStats[0]?.approved_providers || 0),
          suspended: Number(providerStats[0]?.suspended_providers || 0),
          rejected: Number(providerStats[0]?.rejected_providers || 0),
        },

        bookings: {
          total: Number(bookingStats[0]?.total_bookings || 0),
          pending: Number(bookingStats[0]?.pending_bookings || 0),
          confirmed: Number(bookingStats[0]?.confirmed_bookings || 0),
          assigned: Number(bookingStats[0]?.assigned_bookings || 0),
          in_progress: Number(
            bookingStats[0]?.in_progress_bookings || 0
          ),
          completed: Number(
            bookingStats[0]?.completed_bookings || 0
          ),
          cancelled: Number(
            bookingStats[0]?.cancelled_bookings || 0
          ),
          rejected: Number(
            bookingStats[0]?.rejected_bookings || 0
          ),
        },

        categories: {
          total: Number(categoryStats[0]?.total_categories || 0),
          active: Number(categoryStats[0]?.active_categories || 0),
        },

        packages: {
          total: Number(packageStats[0]?.total_packages || 0),
          active: Number(packageStats[0]?.active_packages || 0),
        },

        reviews: {
          total: Number(reviewStats[0]?.total_reviews || 0),
          average_rating: Number(
            reviewStats[0]?.average_rating || 0
          ),
        },

        revenue: {
          total: Number(revenueStats[0]?.total_revenue || 0),
          today: Number(revenueStats[0]?.today_revenue || 0),
          monthly: Number(revenueStats[0]?.monthly_revenue || 0),
          paid_bookings: Number(
            revenueStats[0]?.paid_bookings || 0
          ),
          unpaid_bookings: Number(
            revenueStats[0]?.unpaid_bookings || 0
          ),
        },
      },
    });
  } catch (error) {
    console.error("Service admin dashboard stats error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load dashboard statistics",
      error: error.message,
    });
  }
};


// =========================================================
// RECENT BOOKINGS
// =========================================================

export const getRecentBookings = async (req, res) => {
  try {
    const limit = Math.min(
      Math.max(Number(req.query.limit) || 10, 1),
      50
    );

    const [rows] = await db.query(
      `
      SELECT
        id,
        customer_name,
        customer_phone,
        service_id,
        provider_id,
        status,
        payment_status,
        payment_amount,
        package_price,
        booking_date,
        booking_time,
        created_at
      FROM bookings
      ORDER BY created_at DESC
      LIMIT ${limit}
      `
    );

    return res.json({
      success: true,
      count: rows.length,
      data: rows,
    });
  } catch (error) {
    console.error(
      "Service admin recent bookings error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to load recent bookings",
      error: error.message,
    });
  }
};


// =========================================================
// BOOKING CHART
// =========================================================

export const getBookingChart = async (req, res) => {
  try {
    const period = req.query.period || "30d";

    let days = 30;

    if (period === "7d") {
      days = 7;
    } else if (period === "30d") {
      days = 30;
    } else if (period === "90d") {
      days = 90;
    }

    const [rows] = await db.query(
      `
      SELECT
        DATE(created_at) AS date,

        COUNT(*) AS total,

        SUM(
          CASE
            WHEN status = 'completed'
            THEN 1
            ELSE 0
          END
        ) AS completed,

        SUM(
          CASE
            WHEN status = 'cancelled'
            THEN 1
            ELSE 0
          END
        ) AS cancelled,

        SUM(
          CASE
            WHEN status = 'pending'
            THEN 1
            ELSE 0
          END
        ) AS pending

      FROM bookings

      WHERE created_at >= DATE_SUB(
        CURDATE(),
        INTERVAL ${days - 1} DAY
      )

      GROUP BY DATE(created_at)

      ORDER BY date ASC
      `
    );

    return res.json({
      success: true,
      period,
      data: rows.map((row) => ({
        date: row.date,
        total: Number(row.total || 0),
        completed: Number(row.completed || 0),
        cancelled: Number(row.cancelled || 0),
        pending: Number(row.pending || 0),
      })),
    });
  } catch (error) {
    console.error(
      "Service admin booking chart error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to load booking chart",
      error: error.message,
    });
  }
};


// =========================================================
// REVENUE CHART
// =========================================================

export const getRevenueChart = async (req, res) => {
  try {
    const period = req.query.period || "30d";

    let days = 30;

    if (period === "7d") {
      days = 7;
    } else if (period === "30d") {
      days = 30;
    } else if (period === "90d") {
      days = 90;
    }

    const [rows] = await db.query(
      `
      SELECT
        DATE(created_at) AS date,

        COALESCE(
          SUM(
            CASE
              WHEN payment_status = 'paid'
              THEN COALESCE(payment_amount, 0)
              ELSE 0
            END
          ),
          0
        ) AS revenue,

        SUM(
          CASE
            WHEN payment_status = 'paid'
            THEN 1
            ELSE 0
          END
        ) AS paid_bookings

      FROM bookings

      WHERE created_at >= DATE_SUB(
        CURDATE(),
        INTERVAL ${days - 1} DAY
      )

      GROUP BY DATE(created_at)

      ORDER BY date ASC
      `
    );

    return res.json({
      success: true,
      period,
      data: rows.map((row) => ({
        date: row.date,
        revenue: Number(row.revenue || 0),
        paid_bookings: Number(
          row.paid_bookings || 0
        ),
      })),
    });
  } catch (error) {
    console.error(
      "Service admin revenue chart error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to load revenue chart",
      error: error.message,
    });
  }
};
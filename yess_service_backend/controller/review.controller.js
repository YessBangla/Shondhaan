import { pool } from "../config/db.js";

const formatReview = (review) => ({
  ...review,
  id: String(review.id),
  user_id:
    review.user_id === null || review.user_id === undefined
      ? null
      : String(review.user_id),
  rating: Number(review.rating || 0),
});

const refreshServiceRating = async (serviceSlug) => {
  const [statsRows] = await pool.execute(
    `
    SELECT
      COUNT(*) AS total_reviews,
      COALESCE(ROUND(AVG(rating), 1), 0) AS rating
    FROM service_reviews
    WHERE service_slug = ?
    `,
    [serviceSlug]
  );

  const stats = statsRows[0] || { total_reviews: 0, rating: 0 };

  await pool.execute(
    `
    UPDATE services
    SET rating = ?, total_reviews = ?
    WHERE slug = ?
    `,
    [Number(stats.rating || 0), Number(stats.total_reviews || 0), serviceSlug]
  );

  return {
    rating: Number(stats.rating || 0),
    total_reviews: Number(stats.total_reviews || 0),
  };
};

export const getReviews = async (req, res) => {
  try {
    const { service_slug, user_id } = req.query;

    let query = `
      SELECT *
      FROM service_reviews
      WHERE 1 = 1
    `;
    const values = [];

    if (service_slug) {
      query += ` AND service_slug = ?`;
      values.push(service_slug);
    }

    if (user_id) {
      query += ` AND user_id = ?`;
      values.push(user_id);
    }

    query += ` ORDER BY created_at DESC`;

    const [rows] = await pool.execute(query, values);

    return res.json({
      data: rows.map(formatReview),
    });
  } catch (error) {
    console.error("Get reviews error:", error);

    return res.status(500).json({
      message: "Failed to fetch reviews",
      error: error.message,
    });
  }
};

export const getReviewsByService = async (req, res) => {
  req.query.service_slug = req.params.slug;
  return getReviews(req, res);
};

export const createReview = async (req, res) => {
  try {
    const { service_slug, user_id, reviewer_name, rating, comment } = req.body;

    if (!service_slug || !reviewer_name || rating === undefined || rating === null) {
      return res.status(400).json({
        message: "service_slug, reviewer_name, and rating are required",
      });
    }

    const finalRating = Number(rating);

    if (!Number.isInteger(finalRating) || finalRating < 1 || finalRating > 5) {
      return res.status(400).json({
        message: "Rating must be an integer between 1 and 5",
      });
    }

    const [serviceRows] = await pool.execute(
      `
      SELECT slug
      FROM services
      WHERE slug = ?
      LIMIT 1
      `,
      [service_slug]
    );

    if (!serviceRows.length) {
      return res.status(404).json({
        message: "Service not found",
      });
    }

    await pool.execute(
      `
      INSERT INTO service_reviews (
        service_slug,
        user_id,
        reviewer_name,
        rating,
        comment
      )
      VALUES (?, ?, ?, ?, ?)
      `,
      [
        service_slug,
        user_id === undefined || user_id === null || user_id === "" ? null : String(user_id),
        String(reviewer_name).trim(),
        finalRating,
        comment && String(comment).trim() ? String(comment).trim() : null,
      ]
    );

    const [rows] = await pool.execute(
      `
      SELECT *
      FROM service_reviews
      WHERE id = LAST_INSERT_ID()
      LIMIT 1
      `
    );

    const service_stats = await refreshServiceRating(service_slug);

    return res.status(201).json({
      message: "Review submitted successfully",
      data: formatReview(rows[0]),
      service_stats,
    });
  } catch (error) {
    console.error("Create review error:", error);

    return res.status(500).json({
      message: "Failed to submit review",
      error: error.message,
    });
  }
};

export const deleteReview = async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await pool.execute(
      `
      SELECT *
      FROM service_reviews
      WHERE id = ?
      LIMIT 1
      `,
      [id]
    );

    if (!rows.length) {
      return res.status(404).json({
        message: "Review not found",
      });
    }

    const review = rows[0];

    await pool.execute(
      `
      DELETE FROM service_reviews
      WHERE id = ?
      `,
      [id]
    );

    const service_stats = await refreshServiceRating(review.service_slug);

    return res.json({
      message: "Review deleted successfully",
      data: { id: String(id), service_slug: review.service_slug },
      service_stats,
    });
  } catch (error) {
    console.error("Delete review error:", error);

    return res.status(500).json({
      message: "Failed to delete review",
      error: error.message,
    });
  }
};

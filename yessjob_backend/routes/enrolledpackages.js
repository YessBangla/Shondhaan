// routes/enrolledPackages.js
//
// Tracks which employer has enrolled in (bought, or been granted) which
// package. A job's visibility on the public listing is driven by whichever
// enrollment was active when the job was posted — see jobs.visibility_level
// / jobs.visibility_expires_at, stamped from the row here at job-creation
// time (routes/jobs.js, consumeJobSlot()).
//
// Two other files talk to this one:
//  - routes/payments.js  -> calls enrollEmployerInPackage() once a
//    ShurjoPay payment verifies as successful.
//  - routes/jobs.js       -> calls consumeJobSlot() inside the job-creation
//    transaction to burn one job-post credit and inherit visibility.

const express = require("express");
const mysql = require("mysql2");
const router = express.Router();
const requireAuth = require("../middleware/requireAuth");

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'yessjob_backend',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
}).promise();

// TODO: swap for your real admin-auth middleware (same TODO as
// routes/packages.js). This is a functional stand-in so the admin routes
// below work today.
function requireAdmin(req, res, next) {
  const role = String(req.user?.type || req.user?.role || "").toLowerCase();
  if (!["admin", "super_admin"].includes(role)) {
    return res.status(403).json({ message: "Admin access is required" });
  }
  next();
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + Number(days || 30));
  return d;
}

function mysqlDatetime(date) {
  return date.toISOString().slice(0, 19).replace("T", " ");
}

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

// -----------------------------------------------------------------------
// Core helper: turns a `packages` row into an enrolled_packages row,
// snapshotting price/visibility/quota so later admin edits to the package
// never retroactively change an employer's existing entitlement.
//
// Call this once payment is confirmed (or immediately, for free packages).
// -----------------------------------------------------------------------
async function enrollEmployerInPackage({
  employer_user_id,
  package_id,
  payment_transaction_id = null,
  order_id = null,
}) {
  const [packageRows] = await pool.query(
    `SELECT * FROM packages WHERE id = ? AND is_active = 1 LIMIT 1`,
    [package_id]
  );
  const pkg = packageRows[0];
  if (!pkg) throw httpError(400, `Package ${package_id} not found or inactive`);

  const startsAt = new Date();
  const expiresAt = addDays(startsAt, pkg.duration_days || 30);

  const [result] = await pool.query(
    `INSERT INTO enrolled_packages
      (employer_user_id, package_id, payment_transaction_id, order_id,
       package_name, price, visibility_level, duration_days,
       max_applications, max_jobs_per_year,
       starts_at, expires_at, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
    [
      employer_user_id, package_id, payment_transaction_id, order_id,
      pkg.name, pkg.price, pkg.visibility_level, pkg.duration_days || 30,
      pkg.max_applications, pkg.max_jobs_per_year,
      mysqlDatetime(startsAt), mysqlDatetime(expiresAt),
    ]
  );

  const [rows] = await pool.query(`SELECT * FROM enrolled_packages WHERE id = ?`, [result.insertId]);
  return rows[0];
}

// -----------------------------------------------------------------------
// Burns one job-post credit from an enrollment. Must be called with the
// same `conn` (and inside the same transaction) that will go on to INSERT
// the job row, so a failed job insert rolls the credit back too.
// Returns the enrollment row (post-lock) so the caller can read
// visibility_level / expires_at to stamp onto the job.
// -----------------------------------------------------------------------
async function consumeJobSlot(conn, enrolledPackageId, employerUserId) {
  const [rows] = await conn.query(
    `SELECT * FROM enrolled_packages WHERE id = ? FOR UPDATE`,
    [enrolledPackageId]
  );
  const enrollment = rows[0];
  if (!enrollment) throw httpError(400, "Enrollment not found");
  if (enrollment.employer_user_id !== employerUserId) {
    throw httpError(403, "This package enrollment does not belong to you");
  }
  if (enrollment.status !== "active") {
    throw httpError(400, "This package enrollment is not active");
  }
  if (new Date(enrollment.expires_at) < new Date()) {
    await conn.query(`UPDATE enrolled_packages SET status = 'expired' WHERE id = ?`, [enrolledPackageId]);
    throw httpError(400, "This package enrollment has expired");
  }
  if (enrollment.max_jobs_per_year !== null && enrollment.jobs_used >= enrollment.max_jobs_per_year) {
    throw httpError(400, "This package has no remaining job posts");
  }

  await conn.query(`UPDATE enrolled_packages SET jobs_used = jobs_used + 1 WHERE id = ?`, [enrolledPackageId]);
  return enrollment;
}

// -----------------------------------------------------------------------
// Employer: list my enrollments, newest first
// -----------------------------------------------------------------------
router.get("/mine", requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT * FROM enrolled_packages WHERE employer_user_id = ? ORDER BY created_at DESC`,
      [req.user.id]
    );
    const now = Date.now();
    res.json(rows.map(r => ({
      ...r,
      is_active: r.status === "active" && new Date(r.expires_at).getTime() > now,
      jobs_remaining: r.max_jobs_per_year === null ? null : Math.max(0, r.max_jobs_per_year - r.jobs_used),
    })));
  } catch (err) {
    console.error("GET /api/enrolled-packages/mine failed:", err);
    res.status(500).json({ message: "এনরোলমেন্ট লোড করতে সমস্যা হয়েছে" });
  }
});

// -----------------------------------------------------------------------
// Employer: which enrollment(s) can be used right now to post a new job
// (active, unexpired, quota remaining). The job-post wizard's frontend
// calls this to know which enrolled_package_id to send with the job.
// -----------------------------------------------------------------------
router.get("/active", requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT * FROM enrolled_packages
       WHERE employer_user_id = ?
         AND status = 'active'
         AND expires_at > NOW()
         AND (max_jobs_per_year IS NULL OR jobs_used < max_jobs_per_year)
       ORDER BY
         FIELD(visibility_level, 'hot','premium_plus','premium','standard','basic') ASC,
         expires_at ASC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error("GET /api/enrolled-packages/active failed:", err);
    res.status(500).json({ message: "এনরোলমেন্ট লোড করতে সমস্যা হয়েছে" });
  }
});

// -----------------------------------------------------------------------
// Employer: enroll directly. Only for free (price = 0) packages — paid
// packages go through POST /api/payments/shurjopay/initiate, whose verify
// step calls enrollEmployerInPackage() itself once payment clears.
// -----------------------------------------------------------------------
router.post("/", requireAuth, async (req, res) => {
  const { package_id } = req.body;
  if (!package_id) return res.status(400).json({ message: "package_id আবশ্যক" });

  try {
    const [packageRows] = await pool.query(
      `SELECT * FROM packages WHERE id = ? AND is_active = 1 LIMIT 1`,
      [package_id]
    );
    const pkg = packageRows[0];
    if (!pkg) return res.status(404).json({ message: "প্যাকেজ পাওয়া যায়নি" });

    if (Number(pkg.price) > 0) {
      return res.status(400).json({
        message: "এই প্যাকেজটি পেইড, তাই পেমেন্টের মাধ্যমে এনরোল করতে হবে",
      });
    }

    const enrollment = await enrollEmployerInPackage({
      employer_user_id: req.user.id,
      package_id,
    });
    res.status(201).json(enrollment);
  } catch (err) {
    console.error("POST /api/enrolled-packages failed:", err);
    res.status(err.status || 500).json({ message: err.status ? err.message : "এনরোল করতে সমস্যা হয়েছে" });
  }
});

// -----------------------------------------------------------------------
// Employer: cancel one of my own, still-unused enrollments
// -----------------------------------------------------------------------
router.patch("/:id/cancel", requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT * FROM enrolled_packages WHERE id = ? AND employer_user_id = ? LIMIT 1`,
      [req.params.id, req.user.id]
    );
    const enrollment = rows[0];
    if (!enrollment) return res.status(404).json({ message: "এনরোলমেন্ট পাওয়া যায়নি" });
    if (enrollment.jobs_used > 0) {
      return res.status(409).json({ message: "এই প্যাকেজ দিয়ে ইতিমধ্যে জব পোস্ট করা হয়েছে, তাই বাতিল করা যাবে না" });
    }

    await pool.query(`UPDATE enrolled_packages SET status = 'cancelled' WHERE id = ?`, [req.params.id]);
    res.json({ message: "এনরোলমেন্ট বাতিল হয়েছে" });
  } catch (err) {
    console.error("PATCH /api/enrolled-packages/:id/cancel failed:", err);
    res.status(500).json({ message: "বাতিল করতে সমস্যা হয়েছে" });
  }
});

// -----------------------------------------------------------------------
// Admin: full list, filterable by employer / status.
// NOTE: declared with explicit /admin/ prefix so it never collides with
// a future GET "/:id" the way packages.js warns about.
// -----------------------------------------------------------------------
router.get("/admin/all", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { employer_user_id, status } = req.query;
    const conditions = [];
    const values = [];
    if (employer_user_id) { conditions.push("employer_user_id = ?"); values.push(employer_user_id); }
    if (status) { conditions.push("status = ?"); values.push(status); }
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const [rows] = await pool.query(
      `SELECT * FROM enrolled_packages ${where} ORDER BY created_at DESC`,
      values
    );
    res.json(rows);
  } catch (err) {
    console.error("GET /api/enrolled-packages/admin/all failed:", err);
    res.status(500).json({ message: "এনরোলমেন্ট লোড করতে সমস্যা হয়েছে" });
  }
});

// -----------------------------------------------------------------------
// Admin: force-cancel any enrollment (refund, chargeback, abuse, etc.)
// -----------------------------------------------------------------------
router.patch("/admin/:id/cancel", requireAuth, requireAdmin, async (req, res) => {
  try {
    const [result] = await pool.query(
      `UPDATE enrolled_packages SET status = 'cancelled' WHERE id = ?`,
      [req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ message: "এনরোলমেন্ট পাওয়া যায়নি" });
    res.json({ message: "এনরোলমেন্ট বাতিল হয়েছে" });
  } catch (err) {
    console.error("PATCH /api/enrolled-packages/admin/:id/cancel failed:", err);
    res.status(500).json({ message: "বাতিল করতে সমস্যা হয়েছে" });
  }
});

module.exports = router;
module.exports.enrollEmployerInPackage = enrollEmployerInPackage;
module.exports.consumeJobSlot = consumeJobSlot;
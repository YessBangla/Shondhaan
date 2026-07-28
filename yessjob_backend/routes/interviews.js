

const express = require('express');
const router = express.Router();
const mysql = require('mysql2');
const jwt = require('jsonwebtoken');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'yessjob_backend',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
}).promise();


router.use((req, res, next) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: 'অনুমোদন প্রয়োজন' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.shondhaanUser = { id: decoded.id }; // <-- adjust decoded.id if your payload differs
    next();
  } catch (err) {
    return res.status(401).json({ message: 'অবৈধ বা মেয়াদোত্তীর্ণ টোকেন' });
  }
});

// ------------------------------------------------------------------
// Small helper: insert a notification row. Not wrapped in its own
// try/catch — callers run this inside their own transaction so a
// notification failure rolls back the interview write too.
// ------------------------------------------------------------------
async function insertNotification(conn, { recipientId, type, title, message, referenceId }) {
  await conn.query(
    `INSERT INTO notifications (recipient_id, type, title, message, reference_id)
     VALUES (?, ?, ?, ?, ?)`,
    [recipientId, type, title, message, referenceId]
  );
}


router.post('/', async (req, res) => {
  const {
    application_id,
    interview_type = 'in-person',
    scheduled_at,
    duration_minutes = 30,
    location = null,
    meeting_link = null,
    notes = null,
  } = req.body;

  if (!application_id || !scheduled_at) {
    return res.status(400).json({ message: 'application_id এবং scheduled_at আবশ্যক' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Ownership check happens here, exactly like applications routes scope
    // to jobs.user_id: pull the application's job and jobseeker, and only
    // proceed if the job belongs to req.shondhaanUser.id.
    const [rows] = await conn.query(
      `SELECT ja.id AS application_id, ja.jobseeker_id, j.id AS job_id, j.user_id AS employer_id
       FROM job_applications ja
       JOIN jobs j ON j.id = ja.job_id
       WHERE ja.id = ?`,
      [application_id]
    );

    if (rows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ message: 'আবেদন পাওয়া যায়নি' });
    }
    const application = rows[0];
    if (application.employer_id !== req.shondhaanUser.id) {
      await conn.rollback();
      return res.status(403).json({ message: 'এই আবেদনের অ্যাক্সেস নেই' });
    }

    const [existing] = await conn.query(
      `SELECT id FROM interviews WHERE application_id = ?`,
      [application_id]
    );

    let interviewId;
    let isReschedule = false;

    if (existing.length > 0) {
      isReschedule = true;
      interviewId = existing[0].id;
      await conn.query(
        `UPDATE interviews
         SET interview_type = ?, scheduled_at = ?, duration_minutes = ?,
             location = ?, meeting_link = ?, notes = ?, status = 'scheduled'
         WHERE id = ?`,
        [interview_type, scheduled_at, duration_minutes, location, meeting_link, notes, interviewId]
      );
    } else {
      const [result] = await conn.query(
        `INSERT INTO interviews
           (application_id, job_id, employer_id, jobseeker_id,
            interview_type, scheduled_at, duration_minutes, location, meeting_link, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          application_id, application.job_id, application.employer_id, application.jobseeker_id,
          interview_type, scheduled_at, duration_minutes, location, meeting_link, notes,
        ]
      );
      interviewId = result.insertId;
    }

    // Keep the pipeline stage in sync, same column routes/applications.js
    // already drives via PATCH /api/jobseeker/applications/:id/stage.
    await conn.query(
      `UPDATE job_applications SET hiring_stage = 'interview_scheduled' WHERE id = ?`,
      [application_id]
    );

    await insertNotification(conn, {
      recipientId: application.jobseeker_id,
      type: isReschedule ? 'interview_rescheduled' : 'interview_scheduled',
      title: isReschedule ? 'ইন্টারভিউ পুনঃনির্ধারিত হয়েছে' : 'ইন্টারভিউ শিডিউল হয়েছে',
      message: `আপনার ইন্টারভিউ ${new Date(scheduled_at).toLocaleString('bn-BD')} তারিখে নির্ধারিত হয়েছে।`,
      referenceId: interviewId,
    });

    await conn.commit();

    const [full] = await pool.query(`SELECT * FROM interviews WHERE id = ?`, [interviewId]);
    res.status(isReschedule ? 200 : 201).json(full[0]);
  } catch (err) {
    await conn.rollback();
    console.error('Failed to schedule interview:', err);
    res.status(500).json({ message: 'ইন্টারভিউ শিডিউল করতে সমস্যা হয়েছে' });
  } finally {
    conn.release();
  }
});

// ------------------------------------------------------------------
// GET /api/interviews/mine
// Employer's view: every interview across jobs they own. jobseeker names
// aren't joined here since jobseeker_profiles/jobs both live in this same
// DB but the caller's identity comes from Shondhaan — join whatever
// profile table you already join in routes/applications.js for the
// applicant list (left as jp below, matching that convention).
// ------------------------------------------------------------------
router.get('/mine', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT iv.*, j.title AS job_title, jp.full_name AS applicant_name
       FROM interviews iv
       JOIN jobs j ON j.id = iv.job_id
       LEFT JOIN jobseeker_profiles jp ON jp.user_id = iv.jobseeker_id
       WHERE iv.employer_id = ?
       ORDER BY iv.scheduled_at ASC`,
      [req.shondhaanUser.id]
    );
    res.json(rows);
  } catch (err) {
    console.error('Failed to fetch employer interviews:', err);
    res.status(500).json({ message: 'ইন্টারভিউ লোড করতে সমস্যা হয়েছে' });
  }
});

// ------------------------------------------------------------------
// GET /api/interviews/jobseeker/mine
// Candidate's view, for their own dashboard.
// ------------------------------------------------------------------
router.get('/jobseeker/mine', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT iv.*, j.title AS job_title
       FROM interviews iv
       JOIN jobs j ON j.id = iv.job_id
       WHERE iv.jobseeker_id = ?
       ORDER BY iv.scheduled_at ASC`,
      [req.shondhaanUser.id]
    );
    res.json(rows);
  } catch (err) {
    console.error('Failed to fetch jobseeker interviews:', err);
    res.status(500).json({ message: 'ইন্টারভিউ লোড করতে সমস্যা হয়েছে' });
  }
});

// ------------------------------------------------------------------
// PATCH /api/interviews/:id/status
// Employer marks completed/cancelled, or jobseeker declines.
// Body: { status: 'completed' | 'cancelled' | 'declined' }
// Ownership is inferred from which side of the row req.shondhaanUser.id
// matches (employer_id vs jobseeker_id) — same as how applications.js
// lets either party act on a row they're party to.
// ------------------------------------------------------------------
router.patch('/:id/status', async (req, res) => {
  const { status } = req.body;
  if (!['completed', 'cancelled', 'declined'].includes(status)) {
    return res.status(400).json({ message: 'অবৈধ স্ট্যাটাস' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [rows] = await conn.query(`SELECT * FROM interviews WHERE id = ?`, [req.params.id]);
    if (rows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ message: 'ইন্টারভিউ পাওয়া যায়নি' });
    }
    const interview = rows[0];

    const callerIsEmployer = interview.employer_id === req.shondhaanUser.id;
    const callerIsJobseeker = interview.jobseeker_id === req.shondhaanUser.id;

    if (!callerIsEmployer && !callerIsJobseeker) {
      await conn.rollback();
      return res.status(403).json({ message: 'অ্যাক্সেস নেই' });
    }
    if (callerIsJobseeker && status !== 'declined') {
      await conn.rollback();
      return res.status(403).json({ message: 'অ্যাক্সেস নেই' });
    }

    await conn.query(`UPDATE interviews SET status = ? WHERE id = ?`, [status, req.params.id]);

    if (callerIsJobseeker) {
      await insertNotification(conn, {
        recipientId: interview.employer_id,
        type: 'interview_declined',
        title: 'ইন্টারভিউ প্রত্যাখ্যাত হয়েছে',
        message: 'প্রার্থী নির্ধারিত ইন্টারভিউ প্রত্যাখ্যান করেছেন।',
        referenceId: interview.id,
      });
    } else if (status === 'cancelled') {
      await insertNotification(conn, {
        recipientId: interview.jobseeker_id,
        type: 'interview_cancelled',
        title: 'ইন্টারভিউ বাতিল হয়েছে',
        message: 'আপনার নির্ধারিত ইন্টারভিউটি বাতিল করা হয়েছে।',
        referenceId: interview.id,
      });
    }

    await conn.commit();
    res.json({ id: Number(req.params.id), status });
  } catch (err) {
    await conn.rollback();
    console.error('Failed to update interview status:', err);
    res.status(500).json({ message: 'স্ট্যাটাস আপডেট করতে সমস্যা হয়েছে' });
  } finally {
    conn.release();
  }
});

// ------------------------------------------------------------------
// DELETE /api/interviews/:id
// Employer cancels/removes an interview outright (scoped to their own jobs).
// ------------------------------------------------------------------
router.delete('/:id', async (req, res) => {
  try {
    const [result] = await pool.query(
      `DELETE FROM interviews WHERE id = ? AND employer_id = ?`,
      [req.params.id, req.shondhaanUser.id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'ইন্টারভিউ পাওয়া যায়নি' });
    }
    res.status(204).end();
  } catch (err) {
    console.error('Failed to delete interview:', err);
    res.status(500).json({ message: 'মুছতে সমস্যা হয়েছে' });
  }
});

module.exports = router;
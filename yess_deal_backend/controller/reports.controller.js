import dealDb from "../config.js";

const ensureDealReportsTable = async () => {
  await dealDb.query(`
    CREATE TABLE IF NOT EXISTS deal_reports (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      listing_id BIGINT UNSIGNED NOT NULL,
      reason VARCHAR(255) DEFAULT NULL,
      details TEXT DEFAULT NULL,
      status VARCHAR(32) NOT NULL DEFAULT 'pending',
      admin_note TEXT DEFAULT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      resolved_at TIMESTAMP NULL DEFAULT NULL,
      PRIMARY KEY (id),
      KEY idx_deal_reports_listing (listing_id),
      KEY idx_deal_reports_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // Backward-compatibility for existing tables (e.g. when a column was added later)
  // MySQL: IF NOT EXISTS is supported only for some ALTER variants; so we detect column first.
  const columns = await dealDb.query(
    `SELECT COLUMN_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'deal_reports'`,
  );

  const existing = new Set((columns[0] || []).map((c) => c.COLUMN_NAME));

  if (!existing.has('details')) {
    await dealDb.query(`ALTER TABLE deal_reports ADD COLUMN details TEXT DEFAULT NULL`);
  }

  if (!existing.has('reason')) {
    await dealDb.query(`ALTER TABLE deal_reports ADD COLUMN reason VARCHAR(255) DEFAULT NULL`);
  }

  if (!existing.has('admin_note')) {
    await dealDb.query(`ALTER TABLE deal_reports ADD COLUMN admin_note TEXT DEFAULT NULL`);
  }

  if (!existing.has('resolved_at')) {
    await dealDb.query(`ALTER TABLE deal_reports ADD COLUMN resolved_at TIMESTAMP NULL DEFAULT NULL`);
  }
};

const ensureReportListingExists = async (listing_id) => {
  const [rows] = await dealDb.query(
    `SELECT id FROM deal_listings WHERE id = ? LIMIT 1`,
    [listing_id]
  );
  return rows.length > 0;
};

const mapReportRow = (r) => ({
  id: String(r.id),
  listing_id: String(r.listing_id),
  reason: r.reason,
  details: r.details,
  status: r.status,
  admin_note: r.admin_note,
  resolved_at: r.resolved_at,
  created_at: r.created_at,

  // UI expects: r.deal_listings?.title
  deal_listings: r.title
    ? {
        id: String(r.listing_id),
        title: r.title,
      }
    : null,
});

export const getDealReports = async (req, res) => {
  try {
    await ensureDealReportsTable();

    const { status } = req.query;

    let sql = `
      SELECT
        r.id,
        r.listing_id,
        r.reason,
        r.details,
        r.status,
        r.admin_note,
        r.resolved_at,
        r.created_at,
        l.title
      FROM deal_reports r
      LEFT JOIN deal_listings l ON l.id = r.listing_id
      WHERE 1=1
    `;

    const params = [];
    if (status) {
      sql += ` AND r.status = ?`;
      params.push(status);
    }

    sql += ` ORDER BY r.created_at DESC LIMIT 200`;

    const [rows] = await dealDb.query(sql, params);

    res.json({ success: true, data: rows.map(mapReportRow) });
  } catch (error) {
    console.error("Get deal reports error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to load deal reports",
      error: error.message,
    });
  }
};

export const resolveDealReport = async (req, res) => {
  try {
    await ensureDealReportsTable();

    const { id } = req.params;
    const { status, admin_note, resolved_at } = req.body || {};

    if (!id) {
      return res.status(400).json({ success: false, message: "Report id is required" });
    }

    const newStatus = status || "resolved";
    const note = admin_note || null;
    const resolvedAt = resolved_at || new Date().toISOString();

    const [rows] = await dealDb.query(
      `SELECT id, listing_id FROM deal_reports WHERE id = ? LIMIT 1`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: "Report not found" });
    }

    await dealDb.query(
      `UPDATE deal_reports
       SET status = ?, admin_note = ?, resolved_at = ?
       WHERE id = ?`,
      [newStatus, note, resolvedAt, id]
    );

    res.json({ success: true, message: "Report updated successfully" });
  } catch (error) {
    console.error("Resolve deal report error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to resolve report",
      error: error.message,
    });
  }
};


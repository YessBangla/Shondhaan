// database/createJobCategoriesTable.js
//
// Same pattern as createEmployerProfilesTable.js / createJobsTable.js:
// exports a pool (or reuse yours if these files already share one) and an
// async function that creates the table then seeds it.
//
// If createEmployerProfilesTable.js already exports a shared pool from
// somewhere (e.g. a top-level db.js), swap the block below for:
//   const { pool } = require("./db");
// and delete the mysql2 pool creation here to avoid opening a second pool.
//
// IMPORTANT #1 — seeding: the actual schema + seed data lives in
// job_categories.sql (single source of truth). This file just runs that
// SQL on boot and only seeds ONCE, when the table is empty. This is what
// lets admins add/edit categories via the API (POST/PUT/DELETE
// /api/job-categories) and have those changes persist and show up on the
// frontend — re-seeding on every server start would silently overwrite
// any admin edits back to the hardcoded values.
//
// IMPORTANT #2 — table order: jobs.category is a FOREIGN KEY referencing
// job_categories(value) (see createJobsTable.js). That means
// createJobCategoriesTable() MUST run and finish successfully BEFORE
// createJobsTable() runs, or the jobs table's CREATE TABLE will fail with
// "Cannot add foreign key constraint" (errno 150). This function does NOT
// swallow errors for that reason — let it throw so your startup script
// stops instead of silently continuing to create jobs against a missing
// or broken job_categories table.

const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");
require("dotenv").config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "yessjob_backend",
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

async function createJobCategoriesTable() {
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS job_categories (
      id          INT AUTO_INCREMENT PRIMARY KEY,
      value       VARCHAR(64)  NOT NULL UNIQUE,
      label_bn    VARCHAR(191) NOT NULL,
      label_en    VARCHAR(191) NOT NULL,
      sort_order  INT          NOT NULL DEFAULT 0,
      is_active   TINYINT(1)   NOT NULL DEFAULT 1,
      created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // Only seed if the table is empty. Once an admin has added/edited
  // categories through the API, this block never touches the table again.
  const [[{ count }]] = await pool.query(
    `SELECT COUNT(*) AS count FROM job_categories`
  );

  if (count > 0) {
    console.log(`✓ job_categories table ready (${count} categories already present, skipping seed)`);
    return;
  }

  const sqlPath = path.join(__dirname, "job_categories.sql");

  if (!fs.existsSync(sqlPath)) {
    console.warn(
      `⚠ job_categories table is empty and no seed file was found at ${sqlPath}. ` +
      `No categories were seeded — jobs.category's FK will reject every category value ` +
      `until you add rows manually or create job_categories.sql.`
    );
    return;
  }

  const sql = fs.readFileSync(sqlPath, "utf8");

  // Strip the CREATE TABLE statement (already ran above) and run only the
  // INSERT statements from the .sql file, so this stays a single source
  // of truth for seed data instead of duplicating it here in JS.
  const insertStatements = sql
    .split(";")
    .map((s) => s.trim())
    .filter((s) => /^INSERT/i.test(s));

  if (insertStatements.length === 0) {
    console.warn(`⚠ ${sqlPath} contained no INSERT statements — nothing was seeded.`);
    return;
  }

  let seededRows = 0;
  for (const statement of insertStatements) {
    const [result] = await pool.query(statement);
    seededRows += result.affectedRows || 0;
  }

  console.log(`✓ job_categories table seeded (${insertStatements.length} statements, ${seededRows} rows inserted)`);
}

module.exports = { pool, createJobCategoriesTable };
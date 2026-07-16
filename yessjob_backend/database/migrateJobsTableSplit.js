// database/migrateJobsTableSplit.js
//
// One-time migration for existing databases where `jobs` was already
// created with the OLD schema (education_required, gender_preference,
// age_min, age_max, experience_min, experience_max living directly on
// jobs, and no salary_hidden / work_from_office / work_from_home).
//
// Run this ONCE, after requiring the three new createJob*Table.js files
// but it creates them itself here for convenience. Safe to re-run — every
// step checks before acting.
//
// Usage:  node database/migrateJobsTableSplit.js

const mysql = require('mysql2');
const createJobCandidateRequirementsTable = require('./createJobCandidateRequirementsTable');
const createJobMatchingCriteriaTable = require('./createJobMatchingCriteriaTable');
const createJobBillingContactsTable = require('./createJobBillingContactsTable');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'yessjob_backend',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
}).promise();

const DB_NAME = process.env.DB_NAME || 'yessjob_backend';

async function columnExists(table, column) {
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS cnt FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [DB_NAME, table, column]
  );
  return rows[0].cnt > 0;
}

async function addColumnIfMissing(table, column, definition) {
  if (await columnExists(table, column)) {
    console.log(`  – ${table}.${column} already exists, skipping`);
    return;
  }
  await pool.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  console.log(`  ✅ added ${table}.${column}`);
}

async function dropColumnIfPresent(table, column) {
  if (!(await columnExists(table, column))) {
    console.log(`  – ${table}.${column} already gone, skipping`);
    return;
  }
  await pool.query(`ALTER TABLE ${table} DROP COLUMN ${column}`);
  console.log(`  ✅ dropped ${table}.${column}`);
}

async function migrate() {
  console.log('Step 1: add new columns to jobs (if missing)');
  await addColumnIfMissing('jobs', 'salary_hidden', "TINYINT(1) NOT NULL DEFAULT 0");
  await addColumnIfMissing('jobs', 'work_from_office', "TINYINT(1) NOT NULL DEFAULT 1");
  await addColumnIfMissing('jobs', 'work_from_home', "TINYINT(1) NOT NULL DEFAULT 0");

  console.log('Step 2: create satellite tables (if missing)');
  await createJobCandidateRequirementsTable();
  await createJobMatchingCriteriaTable();
  await createJobBillingContactsTable();

  console.log('Step 3: backfill job_candidate_requirements from any existing jobs rows');
  // Only backfill rows that don't already have a candidate_requirements
  // row (so re-running this script is safe) AND only if the old columns
  // still exist on jobs (first run after the split; harmless to skip on
  // later runs once those columns are gone).
  const hasOldCols = await columnExists('jobs', 'education_required');
  if (hasOldCols) {
    const [result] = await pool.query(`
      INSERT INTO job_candidate_requirements
        (job_id, education_required, gender_preference, age_min, age_max, experience_min, experience_max)
      SELECT j.id, j.education_required, j.gender_preference, j.age_min, j.age_max, j.experience_min, j.experience_max
      FROM jobs j
      LEFT JOIN job_candidate_requirements cr ON cr.job_id = j.id
      WHERE cr.job_id IS NULL
    `);
    console.log(`  ✅ backfilled ${result.affectedRows} row(s) into job_candidate_requirements`);
  } else {
    console.log('  – old columns already gone, nothing to backfill');
  }

  console.log('Step 4: drop old columns from jobs now that data has moved');
  await dropColumnIfPresent('jobs', 'education_required');
  await dropColumnIfPresent('jobs', 'gender_preference');
  await dropColumnIfPresent('jobs', 'age_min');
  await dropColumnIfPresent('jobs', 'age_max');
  await dropColumnIfPresent('jobs', 'experience_min');
  await dropColumnIfPresent('jobs', 'experience_max');

  console.log('Migration complete.');
  process.exit(0);
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
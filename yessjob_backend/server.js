// server.js
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

const { createJobCategoriesTable } = require("./database/createJobCategoriesTable");
const jobCategoriesRoutes = require("./routes/jobCategories");

const createEmployerProfilesTable = require('./database/createEmployerProfilesTable');
const createJobsTable = require('./database/createJobsTable');
const createJobCandidateRequirementsTable = require('./database/createJobCandidateRequirementsTable');
const createJobMatchingCriteriaTable = require('./database/Createjobmatchingcriteriatable');
const createJobBillingContactsTable = require('./database/createJobBillingContactsTable');
const createJobseekerProfilesTable = require('./database/createJobseekerProfilesTable');
const createApplicationsTable = require('./database/Createapplicationstable');
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files (CVs, logos, trade licenses, etc.)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Static public assets
app.use('/public', express.static(path.join(__dirname, 'public')));

// Routes
app.use('/api/employer-profile', require('./routes/employerProfile'));
app.use('/api/jobs', require('./routes/jobs'));
app.use("/api/job-categories", jobCategoriesRoutes);
app.use('/api/jobseeker/profile', require('./routes/jobSeekerProfile'));
app.use('/api/jobseeker/applications', require('./routes/applications'));
app.get('/', (req, res) => {
  res.send('YessJob backend is running');
});

const PORT = process.env.PORT || 5050;

// Tables must be created in dependency order, each one awaited before the
// next starts — job_categories before jobs (jobs.category_id FKs into it),
// and jobs before the three satellite tables (they all FK into jobs.id).
// The server only starts listening once every table is confirmed to exist,
// so no request can hit a route before its table is ready.
async function initDatabaseAndStart() {
  try {
    await createJobCategoriesTable();
    await createEmployerProfilesTable();
    await createJobsTable();
    await createJobCandidateRequirementsTable();
    await createJobMatchingCriteriaTable();
    await createJobBillingContactsTable();
    await createJobseekerProfilesTable();
    await createApplicationsTable();          // must come after jobs
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('❌ Failed to initialize database tables:', err);
    process.exit(1);
  }
}

initDatabaseAndStart();
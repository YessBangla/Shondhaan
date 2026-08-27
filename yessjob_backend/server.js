
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const cookieParser = require('cookie-parser');

const app = express();

const { createJobCategoriesTable } = require("./database/Createjobcategoriestable");

const createEmployerProfilesTable = require('./database/createEmployerProfilesTable');
const createJobsTable = require('./database/createJobsTable');
const createJobCandidateRequirementsTable = require('./database/Createjobcandidaterequirementstable');
const createJobMatchingCriteriaTable = require('./database/Createjobmatchingcriteriatable');
const createJobBillingContactsTable = require('./database/Createjobbillingcontactstable');
const createJobseekerProfilesTable = require('./database/createJobseekerProfilesTable');
const createApplicationsTable = require('./database/Createapplicationstable');
const createInterviewsTable = require('./database/interviewsTable');
const notificationsTable = require('./database/notificationstable');
const  createPackagesTable  = require('./database/packagestable');
const seedPackages = require('./database/seedPackages');
const paymentTransactionsTable = require('./database/paymenttransactionTable');
const createEnrolledPackagesTable = require('./database/enrolledpackageTable');
const allowedOrigins = [
  'https://shondhaan.com',
  'https://www.shondhaan.com',
  'http://localhost:8080',
  'http://127.0.0.1:8080',
];

if (process.env.CORS_ORIGIN) {
  process.env.CORS_ORIGIN.split(',').forEach(origin => {
    const trimmed = origin.trim();
    if (trimmed && !allowedOrigins.includes(trimmed)) {
      allowedOrigins.push(trimmed);
    }
  });
}

if (process.env.FRONTEND_URL) {
  process.env.FRONTEND_URL.split(',').forEach(origin => {
    const trimmed = origin.trim();
    if (trimmed && !allowedOrigins.includes(trimmed)) {
      allowedOrigins.push(trimmed);
    }
  });
}

if (process.env.FRONTEND_BASE_URL) {
  process.env.FRONTEND_BASE_URL.split(',').forEach(origin => {
    const trimmed = origin.trim();
    if (trimmed && !allowedOrigins.includes(trimmed)) allowedOrigins.push(trimmed);
  });
}

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests without an Origin header
    // (Postman, server-to-server requests, server-to-server calls, etc.)
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    console.log('❌ CORS blocked origin:', origin);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files (CVs, logos, trade licenses, etc.)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Static public assets
app.use('/public', express.static(path.join(__dirname, 'public')));

// Routes
app.use('/api/employer-profile', require('./routes/employerProfile'));
app.use('/api/jobs', require('./routes/jobs'));
app.use("/api/job-categories", require('./routes/Jobcategories'));
app.use('/api/jobseeker/profile', require('./routes/jobSeekerProfile'));
app.use('/api/jobseeker/applications', require('./routes/applications'));
app.use('/api/interviews', require('./routes/interviews'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/packages', require('./routes/packages'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/enrolled-packages', require('./routes/enrolledPackages'));
app.use('/api/admin', require('./routes/adminJobStats'));

app.get('/', (req, res) => {
  res.send('YessJob backend is running');
});

const PORT = process.env.PORT || 5050;

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
   await createInterviewsTable();          // must come after jobs + job_applications
    await notificationsTable();          // can run at any point, no FKs
    await createPackagesTable();         // must come before the next line
    await seedPackages();                // seed initial packages if table is empty
    await paymentTransactionsTable();    // must come after packages
    await createEnrolledPackagesTable(); // must come after packages + payment_transactions
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('❌ Failed to initialize database tables:', err);
    process.exit(1);
  }
}

initDatabaseAndStart();

// server.js
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files (CVs, logos, trade licenses, etc.)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Static public assets
app.use('/public', express.static(path.join(__dirname, 'public')));

// Ensure tables exist
const createEmployerProfilesTable = require('./database/createEmployerProfilesTable');
createEmployerProfilesTable();

// Routes
app.use('/api/employer-profile', require('./routes/employerProfile'));

app.get('/', (req, res) => {
  res.send('YessJob backend is running');
});

const PORT = process.env.PORT || 5050;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

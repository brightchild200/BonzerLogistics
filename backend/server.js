const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes       = require('./routes/auth');
const leadsRoutes      = require('./routes/leads');
const enquiryRoutes    = require('./routes/enquiries');
const attendanceRoutes = require('./routes/attendance');
const followupRoutes   = require('./routes/followups');
const errorHandler     = require('./middleware/errorHandler');

const app = express();

app.use(cors());
app.use(express.json());

// Health check
app.get('/', (req, res) => res.json({ status: 'Bonzer Logistics API running' }));

// Routes
app.use('/api/auth',       authRoutes);
app.use('/api/leads',      leadsRoutes);
app.use('/api/enquiries',  enquiryRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/followups',  followupRoutes);

// Central error handler — always last
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Bonzer API running on port ${PORT}`));

module.exports = app;

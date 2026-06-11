// Basic Express backend scaffold for E-Lawyer System
require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');
const http = require('http');
const { startSignalingServer } = require('./signaling');
const rateLimit = require('express-rate-limit');

const app = express();
const isDevelopment = process.env.NODE_ENV !== 'production';
// Basic global rate limiter to reduce abuse
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 500,
  standardHeaders: true,
  legacyHeaders: false,
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: isDevelopment ? 500 : 30,
  standardHeaders: true,
  legacyHeaders: false,
});
const aiLimiter = rateLimit({ windowMs: 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false });
// Import/Export route for data integration
const importExportRoutes = require('./routes/importExport');
app.use('/api/import-export', importExportRoutes);

// Route imports
const casesReportRoutes = require('./routes/cases-report');
const recordingsRoutes = require('./routes/recordings');
const calendarRoutes = require('./routes/calendar');

// Register routes
app.use('/api/cases/report', casesReportRoutes);
app.use('/api/reports', casesReportRoutes);
app.use('/api/recordings', recordingsRoutes);
app.use('/api/calendar', calendarRoutes);

// Start reminders cron job for automated notifications (disabled in tests/CI via env flags)
if (!process.env.JEST_WORKER_ID && process.env.NODE_ENV !== 'test' && process.env.DISABLE_JOBS !== '1') {
  require('./jobs/reminders');
}

// Configure CORS to allow credentials (cookies)
const corsOptions = {
  origin: process.env.CORS_ORIGIN || (isDevelopment ? 'http://localhost:5180' : ''),
  credentials: true, // Allow cookies to be sent
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser()); // Parse cookies
app.use(globalLimiter);

// Serve uploaded files (attachments, credentials) from backend/uploads
// Note: upload routes write to backend/uploads/**/*, so serve that exact directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Global request logger for debugging (dev only)
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
    next();
  });
}

// Connect to MongoDB
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/e-lawyer';
mongoose.connect(mongoUri)
  .then(() => process.env.NODE_ENV !== 'production' && console.log('MongoDB connected'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1); // Exit if cannot connect
  });

// Example route
app.get('/', (req, res) => {
  res.send('E-Lawyer Backend API is running');
});

// Simple health check endpoint for automation and devops
app.get('/health', (req, res) => {
  res.json({ ok: true, uptime: process.uptime(), time: new Date().toISOString() });
});


// Case management routes
const caseRoutes = require('./routes/cases');
app.use('/api/cases', caseRoutes);

// User management routes
const userRoutes = require('./routes/users');
app.use('/api/users', userRoutes);

// Lawyers route for client dashboard
const lawyersRoutes = require('./routes/lawyers');
app.use('/api/lawyers', lawyersRoutes);

// Clients route for lawyer dashboard
const clientsRoutes = require('./routes/clients');
app.use('/api/clients', clientsRoutes);

// Court sessions routes
const courtSessionRoutes = require('./routes/courtsessions');
app.use('/api/courtsessions', courtSessionRoutes);

// Activity routes
const activityRoutes = require('./routes/activity');
app.use('/api/activity', activityRoutes);


// Auth/session routes
const authRoutes = require('./routes/auth-extended');
app.use('/api/auth', authLimiter, authRoutes);

// Session management routes
const sessionRoutes = require('./routes/sessions');
app.use('/api/sessions', sessionRoutes);

// Documents route for client dashboard
const documentsRoutes = require('./routes/documents');
app.use('/api/documents', documentsRoutes);

// Communication route for client dashboard
const communicationRoutes = require('./routes/communication');
app.use('/api/communication', communicationRoutes);

// Notifications route for client dashboard
const notificationsRoutes = require('./routes/notifications');
app.use('/api/notifications', notificationsRoutes);

// Complaints route for user reports
const complaintsRoutes = require('./routes/complaints');
app.use('/api/complaints', complaintsRoutes);

// AI route (Gemini)
const aiRoutes = require('./routes/ai');
app.use('/api/ai', aiLimiter, aiRoutes);

// Profiles route
const profilesRoutes = require('./routes/profiles');
app.use('/api/profiles', profilesRoutes);

// Admin maintenance routes
const adminRoutes = require('./routes/admin');
app.use('/api/admin', adminRoutes);

// Auth/me route for client dashboard
const authMeRoutes = require('./routes/auth-me');
app.use('/api/auth/me', authMeRoutes);

const server = http.createServer(app);
// Start signaling server and attach io to app.locals so routes can emit events
const io = startSignalingServer(server);
app.locals.io = io;

const PORT = process.env.PORT || 5100;

let hasStarted = false;
function startServer(port = PORT) {
  if (hasStarted) return server;
  hasStarted = true;
  server.once('error', (err) => {
    if (err && err.code === 'EADDRINUSE') {
      console.error(`Port ${port} is already in use. Stop the existing backend process or set PORT to a free port.`);
      process.exit(1);
      return;
    }
    console.error('Server startup error:', err);
    process.exit(1);
  });
  server.listen(port, () => {
    console.log(`Backend server and signaling server running on port ${port}`);
  });
  return server;
}

if (require.main === module) {
  startServer(PORT);
}

// Export server and io for tests and integration
module.exports = { app, server, io, startServer };

const http       = require('http');
const express    = require('express');
const mongoose   = require('mongoose');
const cors       = require('cors');
const path       = require('path');
const compression    = require('compression');
const rateLimit      = require('express-rate-limit');
const helmet         = require('helmet');
require('dotenv').config();

const { initWebSocket } = require('./websocket');

const authRoutes      = require('./routes/authRoutes');
const adminRoutes     = require('./routes/adminRoutes');
const frontdeskRoutes = require('./routes/frontdeskRoutes');
const serviceRoutes   = require('./routes/serviceRoutes');
const doctorRoutes    = require('./routes/doctorRoutes');
const homeCareRoutes  = require('./routes/homeCareRoutes');
const dayCareRoutes   = require('./routes/dayCareRoutes');
const labOrderRoutes  = require('./routes/labOrderRoutes');
const reportRoutes    = require('./routes/reportRoutes');
const clinicRoutes    = require('./routes/clinicRoutes');
const emailRoutes     = require('./routes/emailRoutes');

const app = express();

// ── Security headers (XSS, clickjacking, etc.) ───────────────────────────────
// Note: crossOriginResourcePolicy disabled so uploaded assets (logos, etc.)
// can be loaded by the frontend running on a different port in development.
app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: false }));

// ── GZIP compression — reduces response size by ~70% ────────────────────────
app.use(compression({ level: 6, threshold: 1024 }));

// ── CORS ─────────────────────────────────────────────────────────────────────
app.use(cors());

// ── Body limits ───────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// ── Rate limiting ─────────────────────────────────────────────────────────────
// General API: 1000 requests per minute per IP (increased to support VisitPad autosave/autocomplete)
const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again in a minute.' },
  skip: (req) => req.path === '/health'
});

// Auth endpoints: strict — 20 attempts per 15 minutes per IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please wait 15 minutes.' },
});

app.use('/api/', generalLimiter);
app.use('/api/auth/login',  authLimiter);
app.use('/api/auth/signup', authLimiter);

// ── Health check endpoint (for load balancers / uptime monitors) ─────────────
app.get('/health', (req, res) => res.json({ status: 'ok', uptime: process.uptime() }));

// ── Static files ───────────────────────────────────────────────────────────────
// Set Cross-Origin-Resource-Policy: cross-origin so images uploaded here
// can be rendered by the frontend (different port in dev, or subdomain in prod).
app.use('/uploads', (req, res, next) => {
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static(path.join(__dirname, 'uploads'), {
  maxAge: '7d', // cache static uploads for 7 days in browser
  etag: true,
}));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth',       authRoutes);
app.use('/api/admin',      adminRoutes);
app.use('/api/clinics',    clinicRoutes);
app.use('/api/frontdesk',  frontdeskRoutes);
app.use('/api/services',   serviceRoutes);
app.use('/api/doctor',     doctorRoutes);
app.use('/api/reports',    reportRoutes);
app.use('/api/homecare',   homeCareRoutes);
app.use('/api/daycare',    dayCareRoutes);
app.use('/api/laborders',  labOrderRoutes);
app.use('/api/email',      emailRoutes);

// ── Global error handler (prevents crash on unhandled errors) ─────────────────
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.stack || err.message);
  res.status(err.status || 500).json({ message: err.message || 'Internal Server Error' });
});

// ── MongoDB — optimized connection pool ──────────────────────────────────────
// maxPoolSize=50: allows up to 50 parallel DB connections per process
// serverSelectionTimeoutMS: fail fast if DB unreachable
mongoose.connect(process.env.MONGO_URI, {
  maxPoolSize: 50,
  minPoolSize: 5,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
})
.then(() => console.log('MongoDB connected successfully'))
.catch((err) => {
  console.error('MongoDB connection error:', err);
  process.exit(1); // Crash loud so PM2 / process manager restarts us
});

// ── Prevent crash on unhandled promise rejections ────────────────────────────
process.on('unhandledRejection', (reason, promise) => {
  console.error('[UnhandledRejection]', reason);
  // Don't exit — just log. PM2 will restart on actual crashes.
});

process.on('uncaughtException', (err) => {
  console.error('[UncaughtException]', err);
  // Log but don't exit — nodemon will restart if truly needed
});

// ── Start server ──────────────────────────────────────────────────────────────
const PORT   = process.env.PORT || 5000;
const server = http.createServer(app);

// Increase timeout for slow connections
server.keepAliveTimeout = 65000;
server.headersTimeout   = 70000;

initWebSocket(server);

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT} (PID: ${process.pid})`);
  console.log(`WebSocket available at ws://localhost:${PORT}`);
});

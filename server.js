// server.js
const express       = require('express');
const mongoose      = require('mongoose');
const cookieParser  = require('cookie-parser');
const dotenv        = require('dotenv');
const path          = require('path');

dotenv.config();
console.log('ENV loaded — NODE_ENV:', process.env.NODE_ENV);

const app = express();
app.use(express.json());
app.use(cookieParser());

/* ------------------------------------------------------------------ */
/* MongoDB helper ---------------------------------------------------- */
let isConnected = false;           // cached across Lambda invocations

async function connectDB () {
  if (isConnected || mongoose.connection.readyState === 1) return;
  console.log('Attempting MongoDB handshake…');
  await mongoose.connect(process.env.MONGODB_URI);
  isConnected = true;
  console.log('MongoDB connected');
}
/* ------------------------------------------------------------------ */

/* Force DB connection for every /api/* route ----------------------- */
app.use('/api', async (req, res, next) => {
  try { await connectDB(); next(); }
  catch (err) {
    console.error('DB connect failed:', err);
    return res.status(500).json({ message: 'Database connection failed' });
  }
});

/* ----------------------- Mount routers --------------------------- */
app.use('/api/auth',  require('./routes/auth'));
app.use('/api/plan',  require('./routes/plan'));

/* ------------------  Serve static assets ------------------------- */
/*  Anything under /public becomes directly available,               */
/*  e.g.  /login.html  or  /css/styles.css                           */
app.use(express.static(path.join(__dirname, 'public')));

/* SPA / fallback: send index.html for non‑API, non‑file requests --- */
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api/')) {
    return res.sendFile(path.join(__dirname, 'public', 'index.html'));
  }
});

/* ------------------- Global error handler ------------------------ */
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    message: 'Something went wrong',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal Server Error'
  });
});

/* -------------------- Local dev listener ------------------------- */
if (process.env.NODE_ENV !== 'production') {
  const port = process.env.PORT || 3000;
  app.listen(port, () => console.log(`Local server running on port ${port}`));
}

module.exports = app;

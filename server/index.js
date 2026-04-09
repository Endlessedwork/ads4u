import dotenv from 'dotenv';
dotenv.config({ override: true });
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { setupAuth } from './auth.js';
import { apiLimiter } from './middleware.js';
import servicesRouter from './routes/services.js';
import ordersRouter from './routes/orders.js';
import balanceRouter from './routes/balance.js';
import adminRouter from './routes/admin.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Auth must be set up before API routes
setupAuth(app);

// Rate limit on API routes
app.use('/api', apiLimiter);

// API routes
app.use(servicesRouter);
app.use(ordersRouter);
app.use(balanceRouter);
app.use(adminRouter);

// Serve static frontend
app.use(express.static(path.join(__dirname, '..', 'public')));

// SPA fallback
app.get('{*path}', (req, res) => {
  if (req.path.startsWith('/api/') || req.path.startsWith('/auth/')) {
    return res.status(404).json({ error: 'Not found' });
  }
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// JSON error handler — prevent Express from sending HTML error pages
app.use((err, req, res, _next) => {
  console.error('Unhandled error:', err.message);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Ads4U Panel running on http://localhost:${PORT}`);
});

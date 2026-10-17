import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initializeDatabase, checkDatabaseHealth } from './db.js';
import itineraryRouter from './routes/itinerary.js';

// Load environment variables from .env if present
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
// Build allowed origins list from environment or default
const configuredOrigins = (process.env.CLIENT_ORIGIN || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const allowedOrigins = [...configuredOrigins];

// During local development (or when not explicitly in production), allow common local Vite dev ports
if (process.env.NODE_ENV !== 'production') {
  const localDevOrigins = ['http://localhost:5173', 'http://localhost:5174'];
  localDevOrigins.forEach((origin) => {
    if (!allowedOrigins.includes(origin)) {
      allowedOrigins.push(origin);
    }
  });
}

// Middleware configuration
// 1. CORS: allow requests from configured origins and local React frontend origins
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (such as curl, mobile apps, or server-to-server)
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`CORS error: Origin ${origin} not allowed.`));
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
  })
);

// 2. Body Parser: parse incoming requests with JSON payloads
app.use(express.json());

// Base Route
app.get('/', (req, res) => {
  res.json({
    name: 'TripWise API Service',
    status: 'online',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      itinerary: '/api/itinerary',
    },
  });
});

// Health check endpoint with safe database status check
app.get('/api/health', async (req, res) => {
  const dbHealth = await checkDatabaseHealth();
  const isHealthy = dbHealth.status !== 'disconnected';

  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'ok' : 'degraded',
    service: 'tripwise-backend',
    uptime: Math.floor(process.uptime()),
    database: dbHealth.status,
    timestamp: new Date().toISOString(),
  });
});

// Mount Itinerary REST API routes
app.use('/api/itinerary', itineraryRouter);

// 404 handler for undefined routes
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.originalUrl}`,
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('[TripWise Server Error]:', err.message || err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message || 'An unexpected error occurred on the server.',
  });
});

// Start listening and attempt non-blocking database initialization
app.listen(PORT, async () => {
  console.log(`[TripWise API] Server running at http://localhost:${PORT}`);
  console.log(`[TripWise API] Allowed CORS origins: ${allowedOrigins.join(', ')}`);
  await initializeDatabase();
});

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import statusRoutes from './routes/status.js';
import youtubeRoutes from './routes/youtube.js';
import archiveRoutes from './routes/archive.js';

const app = express();
const PORT = process.env.PORT || 5001;

// 1. Allowed Origins for CORS
const defaultOrigins = [
  'https://music-player-d0eb8.web.app',
  'https://music-player-d0eb8.firebaseapp.com',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:4173',
  'http://127.0.0.1:4173'
];

const envOrigins = (process.env.FRONTEND_ORIGINS || '')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

const allowedOrigins = new Set([...defaultOrigins, ...envOrigins]);

app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser requests (e.g. curl, render health checks, mobile webviews without origin)
    if (!origin) return callback(null, true);

    if (allowedOrigins.has(origin) || process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }

    // Check if origin matches subdomains of firebaseapp or web.app
    if (origin.endsWith('.firebaseapp.com') || origin.endsWith('.web.app')) {
      return callback(null, true);
    }

    return callback(new Error(`CORS policy does not allow access from origin: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// 2. Request Parsers
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// 3. Mount Routes
app.use('/api', statusRoutes);
app.use('/api', youtubeRoutes);
app.use('/api', archiveRoutes);

// Root Health Check
app.get('/', (req, res) => {
  res.json({
    service: 'Isaiyon Music Backend API',
    status: 'online',
    healthCheck: '/api/status'
  });
});

// 4. Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Unhandled Server Error]', err);
  const status = err.status || 500;
  res.status(status).json({
    error: err.message || 'An internal server error occurred.'
  });
});

// 5. Start Server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`===============================================`);
  console.log(`🎶 Isaiyon Node.js Backend is running!`);
  console.log(`📡 Port: ${PORT}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔒 Allowed Origins:`, Array.from(allowedOrigins));
  console.log(`🩺 Health check available at: http://localhost:${PORT}/api/status`);
  console.log(`===============================================`);
});

export default app;

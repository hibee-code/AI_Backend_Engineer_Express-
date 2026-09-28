import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './lib/config';
import { logger } from './lib/logger';
import { errorHandler } from './middleware/error-handler';
// Import event listeners so they register on startup
import './events/auth.events';
import adminRoutes from './routes/admin';
import authRoutes from './routes/auth';
import documentRoutes from './routes/documents';

const app = express();

// === MIDDLEWARE (runs on every request) ===
// Must run BEFORE the routes: express.json() is what fills req.body.
app.use(helmet()); // Security headers
app.use(cors()); // Cross-origin requests
app.use(express.json()); // Parse JSON request bodies

// === REQUEST LOGGING ===
app.use((req, res, next) => {
  logger.info({
    method: req.method,
    url: req.url,
    ip: req.ip,
  });
  next();
});

// === HEALTH CHECK (no versioning needed) ===
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: config.NODE_ENV,
  });
});

// === API v1 ===
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/documents', documentRoutes);
app.use('/api/v1/admin', adminRoutes);
// TODO: mount once src/routes/conversations.ts exists
// app.use('/api/v1/conversations', conversationRoutes);

// When v2 exists:
// app.use('/api/v2/documents', documentRoutesV2);

// === ERROR HANDLER (must be last middleware) ===
app.use(errorHandler);

export { app };

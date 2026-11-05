import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

import reviewRoutes from './routes/reviewRoutes.js';
import errorHandler from './middlewares/errorHandler.js';

const app = express();

// ── Middlewares globales ──────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_ORIGIN || '*' }));
app.use(express.json());

// Logging básico de cada petición entrante
app.use((req, _res, next) => {
  if (process.env.NODE_ENV !== 'test') {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  }
  next();
});

// ── Rutas ─────────────────────────────────────────────────────────────────────
app.use('/api/v1/reviews', reviewRoutes);

// Health-check
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'backend-node' }));

// ── Manejo centralizado de errores ────────────────────────────────────────────
app.use(errorHandler);

export default app;

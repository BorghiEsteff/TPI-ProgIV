import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { graphqlHTTP } from 'express-graphql';

import personalNoteRoutes from './routes/personalNoteRoutes.js';
import recommendationRoutes from './routes/recommendationRoutes.js';
import errorHandler from './middlewares/errorHandler.js';
import { graphqlSchema, graphqlRoot } from './graphql/schema.js';

const app = express();

// ── Middlewares globales ──────────────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false }));
const rawOrigin = process.env.CLIENT_ORIGIN;
const corsOrigin = rawOrigin
  ? (rawOrigin.includes(',') ? rawOrigin.split(',').map((o) => o.trim()).filter(Boolean) : rawOrigin)
  : (process.env.NODE_ENV === 'production'
      ? 'http://localhost:5173'
      : ['http://localhost:5173', 'http://127.0.0.1:5173']);
app.use(
  cors({
    origin: corsOrigin,
    exposedHeaders: ['X-Degraded-Mode', 'X-Degraded-AI'],
  })
);
app.use(express.json());

// Logging básico
app.use((req, _res, next) => {
  if (process.env.NODE_ENV !== 'test') {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  }
  next();
});

// ── Rutas REST ────────────────────────────────────────────────────────────────
app.use('/api/v1/personal-notes', personalNoteRoutes);
app.use('/api/v1/recommendations', recommendationRoutes);

// Rutas sociales públicas retiradas por política de privacidad (P1)
app.use('/api/v1/reviews', (_req, res) => {
  res.status(410).json({
    error: {
      code: 'ENDPOINT_RETIRED',
      message: 'Las reseñas públicas fueron retiradas. Usa /api/v1/personal-notes para notas privadas.',
      details: null,
    },
  });
});

// ── Endpoint GraphQL Unificado (TP 4) ─────────────────────────────────────────
app.use(
  '/graphql',
  graphqlHTTP({
    schema: graphqlSchema,
    rootValue: graphqlRoot,
    graphiql: process.env.NODE_ENV !== 'production',
  })
);

// Health-check
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'backend-node' }));

// ── Manejo centralizado de errores ────────────────────────────────────────────
app.use(errorHandler);

export default app;

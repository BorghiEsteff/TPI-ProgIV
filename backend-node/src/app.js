import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { graphqlHTTP } from 'express-graphql';

import reviewRoutes from './routes/reviewRoutes.js';
import errorHandler from './middlewares/errorHandler.js';
import { graphqlSchema, graphqlRoot } from './graphql/schema.js';

const app = express();

// ── Middlewares globales ──────────────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false }));
app.use(cors({ origin: process.env.CLIENT_ORIGIN || '*' }));
app.use(express.json());

// Logging básico
app.use((req, _res, next) => {
  if (process.env.NODE_ENV !== 'test') {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  }
  next();
});

// ── Rutas REST ────────────────────────────────────────────────────────────────
app.use('/api/v1/reviews', reviewRoutes);

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

import cors from '@fastify/cors';
import Fastify from 'fastify';
import type { ApiErrorBody } from '../../src/shared/types/api';
import { HttpError, createDb } from './data/db';
import { analyticsRoutes } from './routes/analytics';
import { ordersRoutes } from './routes/orders';

const PORT = Number(process.env.PORT ?? 3333);
/** Latência artificial para os skeletons aparecerem em dev. */
const LATENCY_MS = Number(process.env.MOCK_LATENCY ?? 350);

export function buildServer(db = createDb()) {
  const app = Fastify({ logger: { level: process.env.LOG_LEVEL ?? 'info' } });

  app.register(cors, { origin: true });

  app.addHook('onRequest', async () => {
    if (LATENCY_MS > 0) await new Promise((resolve) => setTimeout(resolve, LATENCY_MS * (0.5 + Math.random())));
  });

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof HttpError) {
      const body: ApiErrorBody = { message: error.message, code: error.code };
      return reply.status(error.status).send(body);
    }
    app.log.error(error);
    const body: ApiErrorBody = { message: 'Erro interno do mock server.' };
    return reply.status(500).send(body);
  });

  ordersRoutes(app, db);
  analyticsRoutes(app, db);
  app.get('/api/health', async () => ({ ok: true }));

  return app;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const app = buildServer();
  app.listen({ port: PORT, host: '0.0.0.0' }).catch((error) => {
    app.log.error(error);
    process.exit(1);
  });
}

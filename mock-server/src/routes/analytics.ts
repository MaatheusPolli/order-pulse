import type { FastifyInstance } from 'fastify';
import { parseMetricPeriod } from '../../../src/features/analytics/api/metrics.params';
import type { MockDb } from '../data/db';

export function analyticsRoutes(app: FastifyInstance, db: MockDb) {
  app.get<{ Querystring: { days?: string } }>('/api/metrics', async (request) =>
    db.metrics(parseMetricPeriod(request.query.days ?? null)),
  );
}

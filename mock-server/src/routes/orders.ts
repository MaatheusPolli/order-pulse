import type { FastifyInstance } from 'fastify';
import { parseOrdersQuery } from '../../../src/features/orders/api/orders.query';
import type { MockDb } from '../data/db';
import { toSearchParams } from './util';

export function ordersRoutes(app: FastifyInstance, db: MockDb) {
  app.get('/api/orders', async (request) => db.listOrders(parseOrdersQuery(toSearchParams(request.query))));

  app.get<{ Params: { id: string } }>('/api/orders/:id', async (request) => db.getOrder(request.params.id));

  app.get('/api/failures', async () => ({ data: db.listFailures() }));

  app.post<{ Params: { id: string } }>('/api/failures/:id/reprocess', async (request) => db.reprocess(request.params.id));
}

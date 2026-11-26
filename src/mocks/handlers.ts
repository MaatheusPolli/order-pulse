import { HttpResponse, delay, http } from 'msw';
import { HttpError } from '../../mock-server/src/data/db';
import type { MockDb } from '../../mock-server/src/data/db';
import { parseMetricPeriod } from '../features/analytics/api/metrics.params';
import { parseOrdersQuery } from '../features/orders/api/orders.query';
import type { ApiErrorBody } from '../shared/types/api';

/**
 * Handlers MSW que delegam ao mesmo "banco" do servidor Fastify — mesmo
 * contrato em testes, demo estática e dev com servidor.
 */
export function createHandlers(db: MockDb, { latency = 0 }: { latency?: number } = {}) {
  const wait = () => (latency > 0 ? delay(latency * (0.5 + Math.random())) : Promise.resolve());

  const handle = async (fn: () => unknown) => {
    await wait();
    try {
      return HttpResponse.json(fn() as Record<string, unknown>);
    } catch (error) {
      if (error instanceof HttpError) {
        return HttpResponse.json<ApiErrorBody>({ message: error.message, code: error.code }, { status: error.status });
      }
      throw error;
    }
  };

  return [
    http.get('/api/orders', ({ request }) => handle(() => db.listOrders(parseOrdersQuery(new URL(request.url).searchParams)))),
    http.get<{ id: string }>('/api/orders/:id', ({ params }) => handle(() => db.getOrder(params.id))),
    http.get('/api/failures', () => handle(() => ({ data: db.listFailures() }))),
    http.post<{ id: string }>('/api/failures/:id/reprocess', ({ params }) => handle(() => db.reprocess(params.id))),
    http.get('/api/metrics', ({ request }) =>
      handle(() => db.metrics(parseMetricPeriod(new URL(request.url).searchParams.get('days')))),
    ),
  ];
}

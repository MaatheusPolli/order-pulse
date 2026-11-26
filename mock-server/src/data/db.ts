import type { Metrics, Kpis } from '../../../src/features/analytics/types';
import type { OrdersQuery } from '../../../src/features/orders/api/orders.query';
import { mapRawOrder } from '../../../src/features/orders/mappers';
import type { RawOrderEnvelope } from '../../../src/features/orders/mappers/raw.types';
import { CHANNELS, ORDER_STATUSES } from '../../../src/features/orders/types';
import type { Order } from '../../../src/features/orders/types';
import type { Paginated } from '../../../src/shared/types/api';
import { DEFAULT_ORDER_COUNT, REFERENCE_DATE, generateEnvelopes } from './generator';

/**
 * "Banco" em memória compartilhado pelo servidor Fastify (dev) e pelos
 * handlers MSW (testes e demo estática) — um único contrato.
 *
 * Os envelopes guardam o payload bruto; o hub normaliza com os mesmos mappers
 * do front apenas para conseguir filtrar/ordenar do lado do servidor.
 */
interface OrderRecord {
  envelope: RawOrderEnvelope;
  order: Order;
}

export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly code?: string,
  ) {
    super(message);
  }
}

const STATUS_RANK = Object.fromEntries(ORDER_STATUSES.map((s, i) => [s, i]));
const DAY = 86_400_000;

const normalizeText = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

/** Datas do filtro são dias no fuso de São Paulo (UTC-3). */
const dayStart = (date: string) => new Date(`${date}T00:00:00-03:00`).getTime();
const dayKey = (iso: string) => new Date(new Date(iso).getTime() - 3 * 3_600_000).toISOString().slice(0, 10);

function compare(a: Order, b: Order, sort: OrdersQuery['sort']): number {
  switch (sort) {
    case 'total':
      return a.totals.total - b.totals.total;
    case 'customer':
      return a.customer.name.localeCompare(b.customer.name, 'pt-BR');
    case 'status':
      return (STATUS_RANK[a.status] ?? 0) - (STATUS_RANK[b.status] ?? 0);
    case 'channel':
      return a.channel.localeCompare(b.channel);
    case 'placedAt':
      return a.placedAt.localeCompare(b.placedAt);
  }
}

function kpis(orders: Order[]): Kpis {
  const valid = orders.filter((o) => o.status !== 'canceled');
  const revenue = valid.reduce((sum, o) => sum + o.totals.total, 0);
  const failures = orders.filter((o) => o.integration.error).length;
  return {
    orders: orders.length,
    revenue,
    averageTicket: valid.length ? Math.round(revenue / valid.length) : 0,
    failureRate: orders.length ? failures / orders.length : 0,
  };
}

export function createDb(count = DEFAULT_ORDER_COUNT) {
  let records: OrderRecord[] = [];
  let byId = new Map<string, OrderRecord>();
  let dirty = true;

  const load = () => {
    records = generateEnvelopes(count).map((envelope) => ({ envelope, order: mapRawOrder(envelope) }));
    byId = new Map(records.map((r) => [r.envelope.id, r]));
    dirty = false;
  };
  load();

  const find = (id: string) => {
    const record = byId.get(id);
    if (!record) throw new HttpError(404, `Pedido ${id} não encontrado.`, 'NOT_FOUND');
    return record;
  };

  return {
    referenceDate: REFERENCE_DATE,

    /** Restaura o estado inicial (usado entre testes). */
    reset() {
      if (dirty) load();
    },

    listOrders(query: OrdersQuery): Paginated<RawOrderEnvelope> {
      const q = normalizeText(query.q);
      const from = query.from ? dayStart(query.from) : -Infinity;
      const to = query.to ? dayStart(query.to) + DAY : Infinity;
      const min = query.minTotal !== null ? Math.round(query.minTotal * 100) : -Infinity;
      const max = query.maxTotal !== null ? Math.round(query.maxTotal * 100) : Infinity;

      const filtered = records.filter(({ order }) => {
        if (query.channels.length && !query.channels.includes(order.channel)) return false;
        if (query.statuses.length && !query.statuses.includes(order.status)) return false;
        const placed = new Date(order.placedAt).getTime();
        if (placed < from || placed >= to) return false;
        if (order.totals.total < min || order.totals.total > max) return false;
        if (q) {
          const haystack = [order.id, order.channelOrderId, order.customer.name, order.customer.email, ...order.items.map((i) => i.sku)];
          if (!haystack.some((value) => normalizeText(value).includes(q))) return false;
        }
        return true;
      });

      const direction = query.dir === 'asc' ? 1 : -1;
      filtered.sort((a, b) => compare(a.order, b.order, query.sort) * direction || a.order.id.localeCompare(b.order.id) * direction);

      const total = filtered.length;
      const totalPages = Math.max(1, Math.ceil(total / query.pageSize));
      const start = (query.page - 1) * query.pageSize;
      return {
        data: filtered.slice(start, start + query.pageSize).map((r) => r.envelope),
        meta: { page: query.page, pageSize: query.pageSize, total, totalPages },
      };
    },

    getOrder(id: string): RawOrderEnvelope {
      return find(id).envelope;
    },

    listFailures(): RawOrderEnvelope[] {
      return records
        .filter((r) => r.envelope.integration.error)
        .sort((a, b) => b.envelope.integration.error!.occurredAt.localeCompare(a.envelope.integration.error!.occurredAt))
        .map((r) => r.envelope);
    },

    /**
     * Erros transitórios (timeout, rate limit...) passam no reprocessamento;
     * erros de dado (SKU, documento...) falham de novo com 422.
     */
    reprocess(id: string, now = new Date()): RawOrderEnvelope {
      const record = find(id);
      const error = record.envelope.integration.error;
      if (!error) throw new HttpError(409, `Pedido ${id} já está sincronizado.`, 'ALREADY_SYNCED');
      dirty = true;
      if (!error.retryable) {
        error.attempts += 1;
        error.occurredAt = now.toISOString();
        throw new HttpError(422, `Reprocessamento falhou: ${error.message}`, error.code);
      }
      record.envelope.integration = { synced: true };
      record.order = mapRawOrder(record.envelope);
      return record.envelope;
    },

    metrics(days: number): Metrics {
      // Período = últimos N dias corridos (fuso de São Paulo), incluindo o dia de referência.
      const end = REFERENCE_DATE.getTime();
      const start = dayStart(dayKey(REFERENCE_DATE.toISOString())) - (days - 1) * DAY;
      const previousStart = start - days * DAY;
      const inRange = (from: number, to: number) =>
        records.map((r) => r.order).filter((o) => {
          const t = new Date(o.placedAt).getTime();
          return t >= from && t < to;
        });
      const current = inRange(start, end + 1);

      const series = new Map<string, { orders: number; revenue: number }>();
      for (let i = 0; i < days; i += 1) series.set(dayKey(new Date(start + i * DAY + 12 * 3_600_000).toISOString()), { orders: 0, revenue: 0 });
      for (const order of current) {
        const bucket = series.get(dayKey(order.placedAt));
        if (!bucket) continue;
        bucket.orders += 1;
        if (order.status !== 'canceled') bucket.revenue += order.totals.total;
      }

      return {
        period: { from: new Date(start).toISOString(), to: REFERENCE_DATE.toISOString(), days },
        kpis: kpis(current),
        previousKpis: kpis(inRange(previousStart, start)),
        byChannel: CHANNELS.map((channel) => {
          const orders = current.filter((o) => o.channel === channel);
          return {
            channel,
            orders: orders.length,
            revenue: orders.filter((o) => o.status !== 'canceled').reduce((sum, o) => sum + o.totals.total, 0),
            failures: orders.filter((o) => o.integration.error).length,
          };
        }),
        byStatus: ORDER_STATUSES.map((status) => ({ status, orders: current.filter((o) => o.status === status).length })),
        series: [...series.entries()].map(([date, value]) => ({ date, ...value })),
      };
    },
  };
}

export type MockDb = ReturnType<typeof createDb>;

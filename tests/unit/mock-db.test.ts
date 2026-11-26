import { describe, expect, it } from 'vitest';
import { HttpError, createDb } from '../../mock-server/src/data/db';
import { generateEnvelopes } from '../../mock-server/src/data/generator';
import { DEFAULT_ORDERS_QUERY } from '@/features/orders/api/orders.query';
import { mapRawOrder } from '@/features/orders/mappers';

const db = createDb();
const list = (patch: Partial<typeof DEFAULT_ORDERS_QUERY>) =>
  db.listOrders({ ...DEFAULT_ORDERS_QUERY, ...patch });

describe('gerador de dados', () => {
  it('é determinístico (seed fixa)', () => {
    expect(generateEnvelopes(50)).toEqual(generateEnvelopes(50));
  });

  it('gera pedidos consistentes em todos os canais', () => {
    const orders = generateEnvelopes(300).map(mapRawOrder);
    expect(new Set(orders.map((o) => o.channel)).size).toBe(4);
    for (const order of orders) {
      const items = order.items.reduce((sum, i) => sum + i.total, 0);
      expect(order.totals.products).toBe(items);
      expect(order.totals.total).toBe(items - order.totals.discount + order.totals.shipping);
      expect(order.timeline.at(-1)?.status).toBe(order.status);
    }
  });
});

describe('mock db', () => {
  it('pagina e informa metadados', () => {
    const page = list({ page: 2, pageSize: 25 });
    expect(page.data).toHaveLength(25);
    expect(page.meta).toMatchObject({ page: 2, pageSize: 25, total: 1500, totalPages: 60 });
  });

  it('filtra por canal, status, período, valor e busca', () => {
    const filtered = list({ channels: ['tray'], statuses: ['delivered'], pageSize: 1000 }).data.map(mapRawOrder);
    expect(filtered.length).toBeGreaterThan(0);
    expect(filtered.every((o) => o.channel === 'tray' && o.status === 'delivered')).toBe(true);

    const byValue = list({ minTotal: 100, maxTotal: 200, pageSize: 1000 }).data.map(mapRawOrder);
    expect(byValue.every((o) => o.totals.total >= 10_000 && o.totals.total <= 20_000)).toBe(true);

    const byDate = list({ from: '2026-09-10', to: '2026-09-10', pageSize: 1000 }).data.map(mapRawOrder);
    expect(byDate.length).toBeGreaterThan(0);
    expect(byDate.every((o) => o.placedAt >= '2026-09-10T03:00:00.000Z' && o.placedAt < '2026-09-11T03:00:00.000Z')).toBe(true);

    const sample = mapRawOrder(list({}).data[0]!);
    const bySku = list({ q: sample.items[0]!.sku.toLowerCase(), pageSize: 1000 }).data.map(mapRawOrder);
    expect(bySku.some((o) => o.id === sample.id)).toBe(true);
    expect(list({ q: sample.channelOrderId }).data.map((e) => e.id)).toContain(sample.id);
  });

  it('ordena por qualquer coluna nas duas direções', () => {
    const asc = list({ sort: 'total', dir: 'asc', pageSize: 100 }).data.map((e) => mapRawOrder(e).totals.total);
    expect(asc).toEqual([...asc].sort((a, b) => a - b));
    const names = list({ sort: 'customer', dir: 'desc', pageSize: 50 }).data.map((e) => mapRawOrder(e).customer.name);
    expect(names).toEqual([...names].sort((a, b) => b.localeCompare(a, 'pt-BR')));
    for (const sort of ['status', 'channel', 'placedAt'] as const) {
      expect(list({ sort }).data).toHaveLength(25);
    }
  });

  it('reprocessa erros transitórios e rejeita erros de dados', () => {
    const local = createDb(400);
    const failures = local.listFailures().map(mapRawOrder);
    const transient = failures.find((o) => o.integration.error?.retryable);
    const permanent = failures.find((o) => o.integration.error && !o.integration.error.retryable);
    expect(transient && permanent).toBeTruthy();

    expect(local.reprocess(transient!.id).integration).toEqual({ synced: true });
    expect(local.listFailures().map((e) => e.id)).not.toContain(transient!.id);
    expect(() => local.reprocess(transient!.id)).toThrow(expect.objectContaining({ status: 409 }));

    expect(() => local.reprocess(permanent!.id)).toThrow(HttpError);
    expect(local.getOrder(permanent!.id).integration.error?.attempts).toBe(permanent!.integration.error!.attempts + 1);

    local.reset();
    expect(local.listFailures().map((e) => e.id)).toContain(transient!.id);
  });

  it('retorna 404 para pedido inexistente', () => {
    expect(() => db.getOrder('OP-999999')).toThrow(expect.objectContaining({ status: 404 }));
  });

  it('calcula métricas do período e do período anterior', () => {
    const metrics = db.metrics(30);
    expect(metrics.series).toHaveLength(30);
    expect(metrics.byChannel.reduce((sum, c) => sum + c.orders, 0)).toBe(metrics.kpis.orders);
    expect(metrics.byStatus.reduce((sum, s) => sum + s.orders, 0)).toBe(metrics.kpis.orders);
    expect(metrics.series.reduce((sum, d) => sum + d.orders, 0)).toBe(metrics.kpis.orders);
    expect(metrics.kpis.averageTicket).toBeGreaterThan(0);
    expect(metrics.previousKpis.orders).toBeGreaterThan(0);
  });
});

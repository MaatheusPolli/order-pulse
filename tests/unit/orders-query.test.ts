import { describe, expect, it } from 'vitest';
import {
  DEFAULT_ORDERS_QUERY,
  countActiveFilters,
  parseOrdersQuery,
  toOrdersSearchParams,
} from '@/features/orders/api/orders.query';

describe('query de pedidos na URL', () => {
  it('usa os padrões quando a URL está vazia', () => {
    expect(parseOrdersQuery(new URLSearchParams())).toEqual(DEFAULT_ORDERS_QUERY);
  });

  it('faz round-trip de todos os filtros', () => {
    const query = {
      ...DEFAULT_ORDERS_QUERY,
      page: 3,
      pageSize: 100,
      sort: 'total' as const,
      dir: 'asc' as const,
      q: 'silva',
      channels: ['vtex' as const, 'tray' as const],
      statuses: ['paid' as const],
      from: '2026-09-01',
      to: '2026-09-30',
      minTotal: 50,
      maxTotal: 500.5,
    };
    const params = toOrdersSearchParams(query);
    expect(params.toString()).toBe(
      'page=3&pageSize=100&sort=total&dir=asc&q=silva&channel=vtex%2Ctray&status=paid&from=2026-09-01&to=2026-09-30&minTotal=50&maxTotal=500.5',
    );
    expect(parseOrdersQuery(params)).toEqual(query);
  });

  it('omite valores padrão para manter a URL curta', () => {
    expect(toOrdersSearchParams(DEFAULT_ORDERS_QUERY).toString()).toBe('');
  });

  it('tolera valores inválidos editados à mão', () => {
    const query = parseOrdersQuery(
      new URLSearchParams('page=-2&pageSize=7&sort=hack&dir=x&channel=vtex,amazon&status=lost&from=ontem&minTotal=abc&maxTotal=-5'),
    );
    expect(query).toEqual({ ...DEFAULT_ORDERS_QUERY, channels: ['vtex'] });
  });

  it('mantém a ordem canônica de canais e status', () => {
    const query = parseOrdersQuery(new URLSearchParams('channel=tray,vtex&status=delivered,pending'));
    expect(query.channels).toEqual(['vtex', 'tray']);
    expect(query.statuses).toEqual(['pending', 'delivered']);
  });

  it('conta filtros ativos (período e faixa de valor contam uma vez)', () => {
    expect(countActiveFilters(DEFAULT_ORDERS_QUERY)).toBe(0);
    expect(
      countActiveFilters({ ...DEFAULT_ORDERS_QUERY, q: 'a', channels: ['vtex'], from: '2026-01-01', to: '2026-01-02', minTotal: 1, maxTotal: 2 }),
    ).toBe(4);
  });
});

import { CHANNELS, ORDER_STATUSES, isChannel, isOrderStatus } from '../types';
import type { Channel, OrderStatus } from '../types';

/**
 * Parâmetros da listagem. O mesmo formato é usado na URL da SPA e na query
 * string da API, então um link compartilhado reproduz exatamente a consulta.
 */
export const SORT_FIELDS = ['placedAt', 'total', 'customer', 'status', 'channel'] as const;
export type SortField = (typeof SORT_FIELDS)[number];
export type SortDir = 'asc' | 'desc';
export const PAGE_SIZES = [25, 50, 100, 1000] as const;

export interface OrdersQuery {
  page: number;
  pageSize: number;
  sort: SortField;
  dir: SortDir;
  q: string;
  channels: Channel[];
  statuses: OrderStatus[];
  /** YYYY-MM-DD, inclusivo */
  from: string;
  /** YYYY-MM-DD, inclusivo */
  to: string;
  /** Reais */
  minTotal: number | null;
  /** Reais */
  maxTotal: number | null;
}

export const DEFAULT_ORDERS_QUERY: OrdersQuery = {
  page: 1,
  pageSize: 25,
  sort: 'placedAt',
  dir: 'desc',
  q: '',
  channels: [],
  statuses: [],
  from: '',
  to: '',
  minTotal: null,
  maxTotal: null,
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const toPositiveInt = (value: string | null, fallback: number) => {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const toAmount = (value: string | null) => {
  if (value === null || value.trim() === '') return null;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
};

const toList = <T extends string>(value: string | null, guard: (v: string) => v is T, order: readonly T[]) => {
  const selected = new Set((value ?? '').split(',').filter(guard));
  return order.filter((item) => selected.has(item));
};

/** Lê parâmetros tolerando valores inválidos (link editado à mão não quebra a tela). */
export function parseOrdersQuery(params: URLSearchParams): OrdersQuery {
  const sort = params.get('sort');
  const pageSize = toPositiveInt(params.get('pageSize'), DEFAULT_ORDERS_QUERY.pageSize);
  const from = params.get('from') ?? '';
  const to = params.get('to') ?? '';
  return {
    page: toPositiveInt(params.get('page'), 1),
    pageSize: (PAGE_SIZES as readonly number[]).includes(pageSize) ? pageSize : DEFAULT_ORDERS_QUERY.pageSize,
    sort: (SORT_FIELDS as readonly string[]).includes(sort ?? '') ? (sort as SortField) : DEFAULT_ORDERS_QUERY.sort,
    dir: params.get('dir') === 'asc' ? 'asc' : 'desc',
    q: (params.get('q') ?? '').trim(),
    channels: toList(params.get('channel'), isChannel, CHANNELS),
    statuses: toList(params.get('status'), isOrderStatus, ORDER_STATUSES),
    from: DATE_RE.test(from) ? from : '',
    to: DATE_RE.test(to) ? to : '',
    minTotal: toAmount(params.get('minTotal')),
    maxTotal: toAmount(params.get('maxTotal')),
  };
}

/** Serializa omitindo valores padrão, para manter URLs curtas. */
export function toOrdersSearchParams(query: Partial<OrdersQuery>): URLSearchParams {
  const params = new URLSearchParams();
  const q = { ...DEFAULT_ORDERS_QUERY, ...query };
  if (q.page !== 1) params.set('page', String(q.page));
  if (q.pageSize !== DEFAULT_ORDERS_QUERY.pageSize) params.set('pageSize', String(q.pageSize));
  if (q.sort !== DEFAULT_ORDERS_QUERY.sort) params.set('sort', q.sort);
  if (q.dir !== DEFAULT_ORDERS_QUERY.dir) params.set('dir', q.dir);
  if (q.q) params.set('q', q.q);
  if (q.channels.length) params.set('channel', q.channels.join(','));
  if (q.statuses.length) params.set('status', q.statuses.join(','));
  if (q.from) params.set('from', q.from);
  if (q.to) params.set('to', q.to);
  if (q.minTotal !== null) params.set('minTotal', String(q.minTotal));
  if (q.maxTotal !== null) params.set('maxTotal', String(q.maxTotal));
  return params;
}

export function countActiveFilters(query: OrdersQuery): number {
  return [
    query.q,
    query.channels.length,
    query.statuses.length,
    query.from || query.to,
    query.minTotal !== null || query.maxTotal !== null,
  ].filter(Boolean).length;
}

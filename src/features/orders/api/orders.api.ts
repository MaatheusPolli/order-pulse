import { http } from '@/shared/lib/http';
import type { Paginated } from '@/shared/types/api';
import { mapRawOrder } from '../mappers';
import type { RawOrderEnvelope } from '../mappers';
import type { Order } from '../types';
import { toOrdersSearchParams } from './orders.query';
import type { OrdersQuery } from './orders.query';

export async function fetchOrders(query: OrdersQuery, signal?: AbortSignal): Promise<Paginated<Order>> {
  const response = await http.get<Paginated<RawOrderEnvelope>>('/orders', { params: toOrdersSearchParams(query), signal });
  return { data: response.data.map(mapRawOrder), meta: response.meta };
}

export async function fetchOrder(id: string, signal?: AbortSignal): Promise<Order> {
  return mapRawOrder(await http.get<RawOrderEnvelope>(`/orders/${encodeURIComponent(id)}`, { signal }));
}

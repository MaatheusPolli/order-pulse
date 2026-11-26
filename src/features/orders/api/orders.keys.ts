import type { OrdersQuery } from './orders.query';

/** Query keys centralizadas: invalidação sem strings mágicas espalhadas. */
export const ordersKeys = {
  all: ['orders'] as const,
  lists: () => [...ordersKeys.all, 'list'] as const,
  list: (query: OrdersQuery) => [...ordersKeys.lists(), query] as const,
  details: () => [...ordersKeys.all, 'detail'] as const,
  detail: (id: string) => [...ordersKeys.details(), id] as const,
};

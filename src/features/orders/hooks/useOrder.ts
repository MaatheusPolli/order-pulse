import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { Paginated } from '@/shared/types/api';
import { fetchOrder } from '../api/orders.api';
import { ordersKeys } from '../api/orders.keys';
import type { Order } from '../types';

export function useOrder(id: string) {
  const queryClient = useQueryClient();
  return useQuery<Order>({
    queryKey: ordersKeys.detail(id),
    queryFn: ({ signal }) => fetchOrder(id, signal),
    // Vindo da listagem, o pedido já está em cache: renderiza na hora e revalida em segundo plano.
    placeholderData: () =>
      queryClient
        .getQueriesData<Paginated<Order>>({ queryKey: ordersKeys.lists() })
        .flatMap(([, page]) => page?.data ?? [])
        .find((order) => order.id === id),
  });
}

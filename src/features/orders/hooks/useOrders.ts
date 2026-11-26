import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { fetchOrders } from '../api/orders.api';
import { ordersKeys } from '../api/orders.keys';
import type { OrdersQuery } from '../api/orders.query';

export function useOrders(query: OrdersQuery) {
  return useQuery({
    queryKey: ordersKeys.list(query),
    queryFn: ({ signal }) => fetchOrders(query, signal),
    // Mantém a página anterior visível enquanto a próxima carrega (sem "piscar" a tabela).
    placeholderData: keepPreviousData,
  });
}

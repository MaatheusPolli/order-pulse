import { useMutation, useQueryClient } from '@tanstack/react-query';
import { analyticsKeys } from '@/features/analytics/api/analytics.keys';
import { ordersKeys } from '@/features/orders/api/orders.keys';
import type { Order } from '@/features/orders/types';
import { reprocessFailure } from '../api/failures.api';
import type { IntegrationFailure } from '../api/failures.api';
import { failuresKeys } from '../api/failures.keys';

interface Options {
  onSuccess?: (order: Order) => void;
  onError?: (error: Error, id: string) => void;
}

/**
 * Reprocessamento otimista: a falha some da lista na hora; se o ERP recusar
 * de novo, a linha volta ao snapshot anterior.
 */
export function useReprocess({ onSuccess, onError }: Options = {}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: reprocessFailure,
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: failuresKeys.list() });
      const previous = queryClient.getQueryData<IntegrationFailure[]>(failuresKeys.list());
      queryClient.setQueryData<IntegrationFailure[]>(failuresKeys.list(), (current) =>
        current?.filter((failure) => failure.order.id !== id),
      );
      return { previous };
    },
    onError: (error, id, context) => {
      if (context?.previous) queryClient.setQueryData(failuresKeys.list(), context.previous);
      onError?.(error, id);
    },
    onSuccess: (order) => {
      queryClient.setQueryData(ordersKeys.detail(order.id), order);
      onSuccess?.(order);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: failuresKeys.all });
      void queryClient.invalidateQueries({ queryKey: ordersKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: analyticsKeys.all });
    },
  });
}

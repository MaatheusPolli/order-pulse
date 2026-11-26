import { mapRawOrder } from '@/features/orders/mappers';
import type { RawOrderEnvelope, RawPayload } from '@/features/orders/mappers';
import type { IntegrationError, Order } from '@/features/orders/types';
import { http } from '@/shared/lib/http';
import type { ListResponse } from '@/shared/types/api';

export interface IntegrationFailure {
  order: Order & { integration: { synced: false; error: IntegrationError } };
  /** Payload bruto do marketplace — exibido de propósito para diagnóstico. */
  payload: RawPayload;
}

const hasError = (order: Order): order is IntegrationFailure['order'] => Boolean(order.integration.error);

export async function fetchFailures(signal?: AbortSignal): Promise<IntegrationFailure[]> {
  const response = await http.get<ListResponse<RawOrderEnvelope>>('/failures', { signal });
  return response.data.flatMap((envelope) => {
    const order = mapRawOrder(envelope);
    return hasError(order) ? [{ order, payload: envelope.payload }] : [];
  });
}

export async function reprocessFailure(id: string): Promise<Order> {
  return mapRawOrder(await http.post<RawOrderEnvelope>(`/failures/${encodeURIComponent(id)}/reprocess`));
}

import type { IntegrationState, OrderEvent, OrderStatus } from '../types';

/** Converte reais (number ou string decimal) em centavos inteiros. */
export function toCents(value: number | string): number {
  const parsed = typeof value === 'string' ? Number.parseFloat(value.replace(',', '.')) : value;
  if (!Number.isFinite(parsed)) return 0;
  return Math.round(parsed * 100);
}

const EVENT_LABELS: Record<OrderStatus, string> = {
  pending: 'Pedido recebido',
  paid: 'Pagamento aprovado',
  invoiced: 'Nota fiscal emitida',
  shipped: 'Pedido enviado',
  delivered: 'Pedido entregue',
  canceled: 'Pedido cancelado',
};

export interface RawEvent {
  status: OrderStatus;
  at: string | null | undefined;
  /** Nome do evento/status no marketplace, exibido entre parênteses. */
  source?: string;
}

/**
 * Ordena eventos cronologicamente, descarta os sem data e colapsa repetições
 * consecutivos do mesmo status normalizado (ex.: `ready-for-handling` → `handling`
 * na VTEX são ambos "pago").
 */
export function buildTimeline(events: RawEvent[]): OrderEvent[] {
  const dated = events
    .filter((e): e is RawEvent & { at: string } => Boolean(e.at))
    .map((e) => ({ ...e, at: new Date(e.at).toISOString() }))
    .sort((a, b) => a.at.localeCompare(b.at));

  const timeline: OrderEvent[] = [];
  for (const event of dated) {
    if (timeline.at(-1)?.status === event.status) continue;
    timeline.push({
      status: event.status,
      at: event.at,
      description: event.source ? `${EVENT_LABELS[event.status]} (${event.source})` : EVENT_LABELS[event.status],
    });
  }
  return timeline;
}

/** Tray e outros ERPs brasileiros enviam data e hora locais (UTC-3) em campos separados. */
export function brLocalToIso(date: string, hour = '00:00:00'): string {
  return new Date(`${date}T${hour}-03:00`).toISOString();
}

/** Cópia defensiva: o modelo interno não compartilha referências com o payload bruto. */
export function copyIntegration(integration: IntegrationState): IntegrationState {
  return integration.error ? { synced: integration.synced, error: { ...integration.error } } : { synced: integration.synced };
}

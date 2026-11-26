import { formatDateTime } from '@/shared/lib/format';
import type { OrderEvent } from '../types';
import { StatusBadge } from './StatusBadge';

export function OrderTimeline({ events }: { events: OrderEvent[] }) {
  if (!events.length) return <p className="text-sm text-fg-muted">Nenhum evento registrado.</p>;

  return (
    <ol className="relative space-y-5 border-l border-border pl-5" aria-label="Linha do tempo do pedido">
      {[...events].reverse().map((event, index) => (
        <li key={`${event.status}-${event.at}`} className="relative">
          <span
            aria-hidden="true"
            className={`absolute -left-[27px] top-1 h-3 w-3 rounded-full border-2 border-surface ${index === 0 ? 'bg-brand' : 'bg-fg-muted/40'}`}
          />
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={event.status} />
            <time dateTime={event.at} className="text-xs text-fg-muted">
              {formatDateTime(event.at)}
            </time>
          </div>
          <p className="mt-1 text-sm">{event.description}</p>
        </li>
      ))}
    </ol>
  );
}

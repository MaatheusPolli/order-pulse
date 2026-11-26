import { Badge } from '@/shared/ui/Badge';
import type { BadgeTone } from '@/shared/ui/Badge';
import { STATUS_LABELS } from '../types';
import type { OrderStatus } from '../types';

const TONE: Record<OrderStatus, BadgeTone> = {
  pending: 'amber',
  paid: 'blue',
  invoiced: 'violet',
  shipped: 'teal',
  delivered: 'green',
  canceled: 'neutral',
};

export function StatusBadge({ status, rawStatus }: { status: OrderStatus; rawStatus?: string }) {
  return (
    <Badge tone={TONE[status]}>
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" />
      {STATUS_LABELS[status]}
      {rawStatus && <span className="sr-only"> (status original: {rawStatus})</span>}
    </Badge>
  );
}

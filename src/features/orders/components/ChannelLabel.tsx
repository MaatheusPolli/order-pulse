import { cn } from '@/shared/lib/cn';
import { CHANNEL_LABELS } from '../types';
import type { Channel } from '../types';

/** Cor de identidade do canal: variável CSS por tema, a mesma lida pelos gráficos do dashboard. */
const colorVar = (channel: Channel) => `var(--ch-${channel})`;

export function ChannelLabel({ channel, className }: { channel: Channel; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2 whitespace-nowrap', className)}>
      <span aria-hidden="true" className="h-2 w-2 rounded-full" style={{ backgroundColor: colorVar(channel) }} />
      {CHANNEL_LABELS[channel]}
    </span>
  );
}

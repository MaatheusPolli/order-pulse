import { Link } from 'react-router-dom';
import { ChannelLabel } from '@/features/orders/components/ChannelLabel';
import { formatNumber, formatPercent } from '@/shared/lib/format';
import type { ChannelMetric } from '../types';

/** Acima disso o canal é destacado como atenção. */
const ALERT_THRESHOLD = 0.06;

export function FailureRateByChannel({ data }: { data: ChannelMetric[] }) {
  const rows = data
    .map((d) => ({ ...d, rate: d.orders ? d.failures / d.orders : 0 }))
    .sort((a, b) => b.rate - a.rate);
  const max = Math.max(...rows.map((r) => r.rate), ALERT_THRESHOLD);

  return (
    <section className="card p-5" aria-labelledby="failure-rate-title">
      <div className="mb-4 flex items-start justify-between gap-2">
        <div>
          <h2 id="failure-rate-title" className="font-semibold">
            Taxa de falha por canal
          </h2>
          <p className="mt-0.5 text-sm text-fg-muted">Pedidos que não entraram no ERP.</p>
        </div>
        <Link to="/failures" className="text-sm font-medium text-brand hover:underline">
          Ver falhas
        </Link>
      </div>
      <ul className="space-y-4">
        {rows.map((row) => {
          const alert = row.rate >= ALERT_THRESHOLD;
          return (
            <li key={row.channel}>
              <div className="mb-1.5 flex items-center justify-between text-sm">
                <ChannelLabel channel={row.channel} />
                <span className="tabular-nums">
                  <strong className="font-semibold">{formatPercent(row.rate)}</strong>
                  <span className="text-fg-muted"> · {formatNumber(row.failures)} de {formatNumber(row.orders)}</span>
                  {alert && <span className="ml-2 text-xs font-medium text-red-700 dark:text-red-400">⚠ atenção</span>}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-surface-muted" aria-hidden="true">
                <div
                  className={alert ? 'h-full rounded-full bg-red-500' : 'h-full rounded-full bg-fg-muted/60'}
                  style={{ width: `${(row.rate / max) * 100}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

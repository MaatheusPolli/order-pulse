import { cn } from '@/shared/lib/cn';
import { formatPercent, relativeChange } from '@/shared/lib/format';
import { Skeleton } from '@/shared/ui/Skeleton';

interface KpiCardProps {
  label: string;
  value: string;
  current: number;
  previous: number;
  /** Para taxa de falha, subir é ruim. */
  higherIsBetter?: boolean;
  /** Variação em pontos percentuais em vez de relativa (para taxas). */
  absoluteDelta?: boolean;
}

export function KpiCard({ label, value, current, previous, higherIsBetter = true, absoluteDelta = false }: KpiCardProps) {
  const delta = absoluteDelta ? current - previous : relativeChange(current, previous);
  const good = delta === null || delta === 0 ? null : delta > 0 === higherIsBetter;
  const arrow = delta === null || delta === 0 ? '' : delta > 0 ? '▲' : '▼';
  const deltaText =
    delta === null
      ? 'sem base de comparação'
      : absoluteDelta
        ? `${delta > 0 ? '+' : ''}${(delta * 100).toFixed(1).replace('.', ',')} p.p.`
        : `${delta > 0 ? '+' : ''}${formatPercent(delta)}`;

  return (
    <article className="card p-5">
      <h2 className="text-sm font-medium text-fg-muted">{label}</h2>
      <p className="mt-2 text-3xl font-semibold tracking-tight tabular-nums">{value}</p>
      <p
        className={cn(
          'mt-2 text-xs font-medium',
          good === null && 'text-fg-muted',
          good === true && 'text-emerald-700 dark:text-emerald-400',
          good === false && 'text-red-700 dark:text-red-400',
        )}
      >
        {arrow && <span aria-hidden="true">{arrow} </span>}
        {deltaText}
        <span className="font-normal text-fg-muted"> vs. período anterior</span>
      </p>
    </article>
  );
}

export function KpiCardSkeleton() {
  return (
    <div className="card p-5" aria-hidden="true">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="mt-3 h-8 w-32" />
      <Skeleton className="mt-3 h-3 w-40" />
    </div>
  );
}

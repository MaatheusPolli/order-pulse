import { useSearchParams } from 'react-router-dom';
import { parseMetricPeriod } from '@/features/analytics/api/metrics.params';
import { ChannelBarChart } from '@/features/analytics/components/ChannelBarChart';
import { FailureRateByChannel } from '@/features/analytics/components/FailureRateByChannel';
import { KpiCard, KpiCardSkeleton } from '@/features/analytics/components/KpiCard';
import { OrdersTimeSeries } from '@/features/analytics/components/OrdersTimeSeries';
import { useMetrics } from '@/features/analytics/hooks/useMetrics';
import { METRIC_PERIODS } from '@/features/analytics/types';
import type { Metrics } from '@/features/analytics/types';
import { cn } from '@/shared/lib/cn';
import { formatCurrency, formatDate, formatNumber, formatPercent } from '@/shared/lib/format';
import { ErrorState } from '@/shared/ui/ErrorState';
import { PageHeader } from '@/shared/ui/PageHeader';
import { Skeleton } from '@/shared/ui/Skeleton';

function Dashboard({ metrics }: { metrics: Metrics }) {
  const { kpis, previousKpis } = metrics;
  return (
    <div className="space-y-6">
      <section aria-label="Indicadores" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Pedidos" value={formatNumber(kpis.orders)} current={kpis.orders} previous={previousKpis.orders} />
        <KpiCard label="Receita" value={formatCurrency(kpis.revenue)} current={kpis.revenue} previous={previousKpis.revenue} />
        <KpiCard
          label="Ticket médio"
          value={formatCurrency(kpis.averageTicket)}
          current={kpis.averageTicket}
          previous={previousKpis.averageTicket}
        />
        <KpiCard
          label="Taxa de falha de integração"
          value={formatPercent(kpis.failureRate)}
          current={kpis.failureRate}
          previous={previousKpis.failureRate}
          higherIsBetter={false}
          absoluteDelta
        />
      </section>

      <OrdersTimeSeries data={metrics.series} days={metrics.period.days} />

      <div className="grid gap-6 lg:grid-cols-2">
        <ChannelBarChart data={metrics.byChannel} />
        <FailureRateByChannel data={metrics.byChannel} />
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div role="status" aria-label="Carregando indicadores" className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <KpiCardSkeleton key={i} />
        ))}
      </div>
      <Skeleton className="h-80" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-80" />
        <Skeleton className="h-80" />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [params, setParams] = useSearchParams();
  const days = parseMetricPeriod(params.get('days'));
  const { data, isPending, isError, error, refetch, isPlaceholderData } = useMetrics(days);

  return (
    <>
      <PageHeader
        title="Dashboard"
        description={data ? `De ${formatDate(data.period.from)} a ${formatDate(data.period.to)}` : 'Visão consolidada dos canais'}
        actions={
          <div role="group" aria-label="Período" className="inline-flex rounded-lg border border-border bg-surface p-1">
            {METRIC_PERIODS.map((period) => (
              <button
                key={period}
                type="button"
                aria-pressed={days === period}
                onClick={() => setParams(period === 30 ? {} : { days: String(period) }, { replace: true })}
                className={cn(
                  'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                  days === period ? 'bg-brand text-brand-fg' : 'text-fg-muted hover:text-fg',
                )}
              >
                {period} dias
              </button>
            ))}
          </div>
        }
      />
      {isPending ? (
        <DashboardSkeleton />
      ) : isError ? (
        <div className="card">
          <ErrorState error={error} onRetry={() => void refetch()} />
        </div>
      ) : (
        <div className={cn(isPlaceholderData && 'opacity-70 transition-opacity')} aria-busy={isPlaceholderData}>
          <Dashboard metrics={data} />
        </div>
      )}
    </>
  );
}

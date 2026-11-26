import { useCallback, useMemo, useState } from 'react';
import type { IntegrationFailure } from '@/features/integration-failures/api/failures.api';
import { FailureTable } from '@/features/integration-failures/components/FailureTable';
import { PayloadViewer } from '@/features/integration-failures/components/PayloadViewer';
import { useFailures } from '@/features/integration-failures/hooks/useFailures';
import { useReprocess } from '@/features/integration-failures/hooks/useReprocess';
import { CHANNELS } from '@/features/orders/types';
import { cn } from '@/shared/lib/cn';
import { formatNumber } from '@/shared/lib/format';
import { EmptyState } from '@/shared/ui/EmptyState';
import { ErrorState } from '@/shared/ui/ErrorState';
import { PageHeader } from '@/shared/ui/PageHeader';
import { Skeleton } from '@/shared/ui/Skeleton';
import { ChannelLabel } from '@/features/orders/components/ChannelLabel';

interface Notice {
  tone: 'success' | 'error';
  message: string;
}

export default function FailuresPage() {
  const { data, isPending, isError, error, refetch } = useFailures();
  const [viewing, setViewing] = useState<IntegrationFailure | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);

  const reprocess = useReprocess({
    onSuccess: (order) => setNotice({ tone: 'success', message: `Pedido ${order.id} reprocessado e sincronizado com o ERP.` }),
    onError: (err, id) => setNotice({ tone: 'error', message: `Pedido ${id}: ${err.message}` }),
  });
  const { mutate } = reprocess;

  const handleReprocess = useCallback(
    (failure: IntegrationFailure) => {
      setNotice(null);
      mutate(failure.order.id);
    },
    [mutate],
  );

  const summary = useMemo(
    () => CHANNELS.map((channel) => ({ channel, count: data?.filter((f) => f.order.channel === channel).length ?? 0 })),
    [data],
  );

  return (
    <>
      <PageHeader
        title="Falhas de integração"
        description="Pedidos que não entraram no ERP. Erros transitórios costumam passar no reprocessamento; erros de dados exigem correção na origem."
      />

      <div aria-live="polite" aria-atomic="true" className="mb-4 empty:hidden">
        {notice && (
          <p
            role={notice.tone === 'error' ? 'alert' : 'status'}
            className={cn(
              'rounded-lg border px-4 py-3 text-sm',
              notice.tone === 'success'
                ? 'border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-100'
                : 'border-red-300 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-100',
            )}
          >
            {notice.message}
          </p>
        )}
      </div>

      {data && data.length > 0 && (
        <ul className="mb-4 flex flex-wrap gap-2" aria-label="Falhas por canal">
          {summary.map(({ channel, count }) => (
            <li key={channel} className="card flex items-center gap-2 px-3 py-1.5 text-sm">
              <ChannelLabel channel={channel} />
              <span className="font-semibold tabular-nums">{formatNumber(count)}</span>
            </li>
          ))}
        </ul>
      )}

      <section aria-label="Pedidos com falha" className="card overflow-hidden">
        {isPending ? (
          <div role="status" aria-label="Carregando falhas" className="space-y-3 p-4">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : isError ? (
          <ErrorState error={error} onRetry={() => void refetch()} />
        ) : data.length === 0 ? (
          <EmptyState title="Nenhuma falha pendente" description="Todos os pedidos foram sincronizados com o ERP." />
        ) : (
          <FailureTable
            failures={data}
            onViewPayload={setViewing}
            onReprocess={handleReprocess}
            reprocessingId={reprocess.isPending ? reprocess.variables : undefined}
          />
        )}
      </section>

      <PayloadViewer failure={viewing} onOpenChange={(open) => !open && setViewing(null)} />
    </>
  );
}

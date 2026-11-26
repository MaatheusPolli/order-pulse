import { useCallback } from 'react';
import { DEFAULT_ORDERS_QUERY, PAGE_SIZES, parseOrdersQuery, toOrdersSearchParams } from '@/features/orders/api/orders.query';
import type { OrdersQuery } from '@/features/orders/api/orders.query';
import { OrderFilters } from '@/features/orders/components/OrderFilters';
import { OrderTable, OrderTableSkeleton } from '@/features/orders/components/OrderTable';
import { useOrders } from '@/features/orders/hooks/useOrders';
import { useUrlFilters } from '@/shared/hooks/useUrlFilters';
import { Button } from '@/shared/ui/Button';
import { EmptyState } from '@/shared/ui/EmptyState';
import { ErrorState } from '@/shared/ui/ErrorState';
import { PageHeader } from '@/shared/ui/PageHeader';
import { Pagination } from '@/shared/ui/Pagination';

export default function OrdersPage() {
  const [query, setQuery] = useUrlFilters<OrdersQuery>(parseOrdersQuery, toOrdersSearchParams);
  const { data, isPending, isError, error, refetch, isPlaceholderData, isFetching } = useOrders(query);

  // Qualquer mudança de filtro volta para a página 1.
  const changeFilters = useCallback(
    (patch: Partial<OrdersQuery>) => setQuery({ ...patch, page: 1 }, { replace: true }),
    [setQuery],
  );
  const clearFilters = useCallback(
    () => setQuery((current) => ({ ...DEFAULT_ORDERS_QUERY, pageSize: current.pageSize, sort: current.sort, dir: current.dir })),
    [setQuery],
  );

  return (
    <>
      <PageHeader title="Pedidos" description="Todos os canais em uma única lista, com status normalizado." />
      <div className="space-y-4">
        <OrderFilters query={query} onChange={changeFilters} onClear={clearFilters} />

        <section aria-label="Resultados" className="card overflow-hidden">
          {isPending ? (
            <OrderTableSkeleton />
          ) : isError ? (
            <ErrorState error={error} onRetry={() => void refetch()} />
          ) : data.data.length === 0 ? (
            <EmptyState
              title="Nenhum pedido encontrado"
              description="Ajuste a busca ou remova alguns filtros para ver mais resultados."
              action={<Button onClick={clearFilters}>Limpar filtros</Button>}
            />
          ) : (
            <>
              <OrderTable
                orders={data.data}
                sort={query.sort}
                dir={query.dir}
                onSortChange={(sort, dir) => setQuery({ sort, dir, page: 1 })}
                isFetching={isPlaceholderData && isFetching}
              />
              <Pagination
                meta={data.meta}
                pageSizes={PAGE_SIZES}
                onPageChange={(page) => setQuery({ page })}
                onPageSizeChange={(pageSize) => setQuery({ pageSize, page: 1 })}
              />
            </>
          )}
        </section>
      </div>
    </>
  );
}

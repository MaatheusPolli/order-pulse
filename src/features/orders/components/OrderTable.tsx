import { createColumnHelper, flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';
import type { SortingState } from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useMemo, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/shared/lib/cn';
import { formatCurrency, formatDateTime } from '@/shared/lib/format';
import { Badge } from '@/shared/ui/Badge';
import { Icon } from '@/shared/ui/Icon';
import { Skeleton } from '@/shared/ui/Skeleton';
import { Table, Td, Th, Tr } from '@/shared/ui/Table';
import type { SortDir, SortField } from '../api/orders.query';
import type { Order } from '../types';
import { ChannelLabel } from './ChannelLabel';
import { StatusBadge } from './StatusBadge';

/** Abaixo disso o DOM completo é barato; acima, só as linhas visíveis são montadas. */
export const VIRTUALIZE_THRESHOLD = 100;
const ROW_HEIGHT = 53;

const SORT_LABELS: Record<SortField, string> = {
  placedAt: 'data',
  total: 'total',
  customer: 'cliente',
  status: 'status',
  channel: 'canal',
};

const column = createColumnHelper<Order>();

interface OrderTableProps {
  orders: Order[];
  sort: SortField;
  dir: SortDir;
  onSortChange: (sort: SortField, dir: SortDir) => void;
  isFetching?: boolean;
}

export function OrderTable({ orders, sort, dir, onSortChange, isFetching }: OrderTableProps) {
  const location = useLocation();

  const columns = useMemo(
    () => [
      column.accessor('id', {
        header: 'Pedido',
        enableSorting: false,
        cell: ({ row }) => (
          <Link
            to={`/orders/${row.original.id}`}
            state={{ from: `${location.pathname}${location.search}` }}
            className="font-medium text-brand hover:underline"
          >
            {row.original.id}
            <span className="block text-xs font-normal text-fg-muted">{row.original.channelOrderId}</span>
          </Link>
        ),
      }),
      column.accessor('channel', {
        header: 'Canal',
        cell: ({ getValue }) => <ChannelLabel channel={getValue()} />,
      }),
      column.accessor((o) => o.customer.name, {
        id: 'customer',
        header: 'Cliente',
        cell: ({ row }) => (
          <span className="block max-w-[14rem] truncate" title={row.original.customer.email}>
            {row.original.customer.name}
          </span>
        ),
      }),
      column.accessor('placedAt', {
        header: 'Data',
        cell: ({ getValue }) => (
          <time dateTime={getValue()} className="whitespace-nowrap tabular-nums">
            {formatDateTime(getValue())}
          </time>
        ),
      }),
      column.accessor('status', {
        header: 'Status',
        cell: ({ row }) => <StatusBadge status={row.original.status} rawStatus={row.original.rawStatus} />,
      }),
      column.accessor((o) => o.integration.synced, {
        id: 'integration',
        header: 'ERP',
        enableSorting: false,
        cell: ({ row }) =>
          row.original.integration.error ? (
            <Badge tone="red">
              <span title={row.original.integration.error.message}>Falha</span>
            </Badge>
          ) : (
            <span className="text-xs text-fg-muted">Sincronizado</span>
          ),
      }),
      column.accessor((o) => o.totals.total, {
        id: 'total',
        header: 'Total',
        meta: { align: 'right' },
        cell: ({ getValue }) => <span className="whitespace-nowrap tabular-nums">{formatCurrency(getValue())}</span>,
      }),
    ],
    [location.pathname, location.search],
  );

  const sorting: SortingState = [{ id: sort, desc: dir === 'desc' }];
  const table = useReactTable({
    data: orders,
    columns,
    state: { sorting },
    manualSorting: true,
    manualPagination: true,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
  });
  const rows = table.getRowModel().rows;

  const scrollRef = useRef<HTMLDivElement>(null);
  const virtualize = rows.length > VIRTUALIZE_THRESHOLD;
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 12,
    enabled: virtualize,
  });
  const virtualRows = virtualizer.getVirtualItems();
  const visible = virtualize ? virtualRows.map((v) => rows[v.index]!) : rows;
  const paddingTop = virtualize && virtualRows.length ? virtualRows[0]!.start : 0;
  const paddingBottom = virtualize && virtualRows.length ? virtualizer.getTotalSize() - virtualRows.at(-1)!.end : 0;

  return (
    <div
      ref={scrollRef}
      className={cn('overflow-auto', virtualize && 'max-h-[70vh]', isFetching && 'opacity-70 transition-opacity')}
      aria-busy={isFetching}
      tabIndex={virtualize ? 0 : undefined}
      role={virtualize ? 'region' : undefined}
      aria-label={virtualize ? 'Lista de pedidos (rolável)' : undefined}
    >
      <Table aria-rowcount={rows.length + 1}>
        <caption className="sr-only">
          Pedidos de todos os canais, ordenados por {SORT_LABELS[sort]} ({dir === 'asc' ? 'crescente' : 'decrescente'})
        </caption>
        <thead>
          {table.getHeaderGroups().map((group) => (
            <tr key={group.id}>
              {group.headers.map((header) => {
                const canSort = header.column.getCanSort();
                const active = header.column.id === sort;
                const align = header.column.columnDef.meta?.align;
                return (
                  <Th
                    key={header.id}
                    aria-sort={active ? (dir === 'asc' ? 'ascending' : 'descending') : canSort ? 'none' : undefined}
                    className={align === 'right' ? 'text-right' : undefined}
                  >
                    {canSort ? (
                      <button
                        type="button"
                        className={cn('inline-flex items-center gap-1 uppercase hover:text-fg', active && 'text-fg')}
                        onClick={() =>
                          onSortChange(header.column.id as SortField, active && dir === 'desc' ? 'asc' : 'desc')
                        }
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        <Icon name={active ? (dir === 'asc' ? 'sortAsc' : 'sortDesc') : 'sort'} className="h-3.5 w-3.5" />
                      </button>
                    ) : (
                      flexRender(header.column.columnDef.header, header.getContext())
                    )}
                  </Th>
                );
              })}
            </tr>
          ))}
        </thead>
        <tbody>
          {paddingTop > 0 && (
            <tr aria-hidden="true">
              <td colSpan={columns.length} style={{ height: paddingTop, padding: 0 }} />
            </tr>
          )}
          {visible.map((row) => (
            <Tr key={row.id} aria-rowindex={row.index + 2} style={{ height: ROW_HEIGHT }}>
              {row.getVisibleCells().map((cell) => (
                <Td key={cell.id} className={cell.column.columnDef.meta?.align === 'right' ? 'text-right' : undefined}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </Td>
              ))}
            </Tr>
          ))}
          {paddingBottom > 0 && (
            <tr aria-hidden="true">
              <td colSpan={columns.length} style={{ height: paddingBottom, padding: 0 }} />
            </tr>
          )}
        </tbody>
      </Table>
    </div>
  );
}

export function OrderTableSkeleton({ rows = 10 }: { rows?: number }) {
  return (
    <div role="status" aria-label="Carregando pedidos" className="divide-y divide-border">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-4 px-3 py-3">
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="hidden h-4 w-28 sm:block" />
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-4 w-20" />
        </div>
      ))}
    </div>
  );
}

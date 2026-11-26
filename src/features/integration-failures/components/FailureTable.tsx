import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import type { SortingState } from '@tanstack/react-table';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChannelLabel } from '@/features/orders/components/ChannelLabel';
import { cn } from '@/shared/lib/cn';
import { formatCurrency, formatDateTime } from '@/shared/lib/format';
import { Badge } from '@/shared/ui/Badge';
import { Button } from '@/shared/ui/Button';
import { Icon } from '@/shared/ui/Icon';
import { Table, Td, Th, Tr } from '@/shared/ui/Table';
import type { IntegrationFailure } from '../api/failures.api';

const column = createColumnHelper<IntegrationFailure>();

interface FailureTableProps {
  failures: IntegrationFailure[];
  onViewPayload: (failure: IntegrationFailure) => void;
  onReprocess: (failure: IntegrationFailure) => void;
  reprocessingId?: string;
}

export function FailureTable({ failures, onViewPayload, onReprocess, reprocessingId }: FailureTableProps) {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'occurredAt', desc: true }]);

  const columns = useMemo(
    () => [
      column.accessor((f) => f.order.id, {
        id: 'order',
        header: 'Pedido',
        cell: ({ row }) => (
          <Link to={`/orders/${row.original.order.id}`} className="font-medium text-brand hover:underline">
            {row.original.order.id}
            <span className="block text-xs font-normal text-fg-muted">{row.original.order.customer.name}</span>
          </Link>
        ),
      }),
      column.accessor((f) => f.order.channel, {
        id: 'channel',
        header: 'Canal',
        cell: ({ getValue }) => <ChannelLabel channel={getValue()} />,
      }),
      column.accessor((f) => f.order.integration.error.code, {
        id: 'error',
        header: 'Erro',
        cell: ({ row }) => {
          const error = row.original.order.integration.error;
          return (
            <div className="max-w-md">
              <div className="flex flex-wrap items-center gap-2">
                <code className="font-mono text-xs font-semibold">{error.code}</code>
                <Badge tone={error.retryable ? 'amber' : 'red'}>{error.retryable ? 'Transitório' : 'Dados'}</Badge>
              </div>
              <p className="mt-0.5 text-xs text-fg-muted">{error.message}</p>
            </div>
          );
        },
      }),
      column.accessor((f) => f.order.integration.error.attempts, {
        id: 'attempts',
        header: 'Tentativas',
        meta: { align: 'right' },
        cell: ({ getValue }) => <span className="tabular-nums">{getValue()}</span>,
      }),
      column.accessor((f) => f.order.integration.error.occurredAt, {
        id: 'occurredAt',
        header: 'Última falha',
        cell: ({ getValue }) => (
          <time dateTime={getValue()} className="whitespace-nowrap tabular-nums">
            {formatDateTime(getValue())}
          </time>
        ),
      }),
      column.accessor((f) => f.order.totals.total, {
        id: 'total',
        header: 'Total',
        meta: { align: 'right' },
        cell: ({ getValue }) => <span className="whitespace-nowrap tabular-nums">{formatCurrency(getValue())}</span>,
      }),
      column.display({
        id: 'actions',
        header: () => <span className="sr-only">Ações</span>,
        cell: ({ row }) => (
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => onViewPayload(row.original)} aria-label={`Ver payload do pedido ${row.original.order.id}`}>
              <Icon name="code" />
              <span className="hidden md:inline">Payload</span>
            </Button>
            <Button
              size="sm"
              variant="primary"
              onClick={() => onReprocess(row.original)}
              disabled={reprocessingId === row.original.order.id}
              aria-label={`Reprocessar pedido ${row.original.order.id}`}
            >
              <Icon name="refresh" />
              <span className="hidden md:inline">Reprocessar</span>
            </Button>
          </div>
        ),
      }),
    ],
    [onViewPayload, onReprocess, reprocessingId],
  );

  const table = useReactTable({
    data: failures,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId: (row) => row.order.id,
  });

  return (
    <div className="overflow-x-auto">
      <Table>
        <caption className="sr-only">Pedidos com falha de sincronização com o ERP</caption>
        <thead>
          {table.getHeaderGroups().map((group) => (
            <tr key={group.id}>
              {group.headers.map((header) => {
                const sorted = header.column.getIsSorted();
                const align = header.column.columnDef.meta?.align;
                return (
                  <Th
                    key={header.id}
                    aria-sort={sorted ? (sorted === 'asc' ? 'ascending' : 'descending') : header.column.getCanSort() ? 'none' : undefined}
                    className={align === 'right' ? 'text-right' : undefined}
                  >
                    {header.column.getCanSort() ? (
                      <button
                        type="button"
                        onClick={header.column.getToggleSortingHandler()}
                        className={cn('inline-flex items-center gap-1 uppercase hover:text-fg', sorted && 'text-fg')}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        <Icon name={sorted === 'asc' ? 'sortAsc' : sorted === 'desc' ? 'sortDesc' : 'sort'} className="h-3.5 w-3.5" />
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
          {table.getRowModel().rows.map((row) => (
            <Tr key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <Td key={cell.id} className={cell.column.columnDef.meta?.align === 'right' ? 'text-right' : undefined}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </Td>
              ))}
            </Tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}

import { formatNumber } from '../lib/format';
import type { PageMeta } from '../types/api';
import { Button } from './Button';
import { Icon } from './Icon';

interface PaginationProps {
  meta: PageMeta;
  pageSizes: readonly number[];
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

export function Pagination({ meta, pageSizes, onPageChange, onPageSizeChange }: PaginationProps) {
  const first = meta.total === 0 ? 0 : (meta.page - 1) * meta.pageSize + 1;
  const last = Math.min(meta.page * meta.pageSize, meta.total);

  return (
    <nav aria-label="Paginação" className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
      <p className="text-fg-muted" aria-live="polite">
        {formatNumber(first)}–{formatNumber(last)} de {formatNumber(meta.total)} pedidos
      </p>
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 text-fg-muted">
          Por página
          <select
            className="input h-8 w-auto py-0 pr-8"
            value={meta.pageSize}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
          >
            {pageSizes.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            aria-label="Página anterior"
            disabled={meta.page <= 1}
            onClick={() => onPageChange(meta.page - 1)}
          >
            <Icon name="chevronLeft" />
          </Button>
          <span className="min-w-[5.5rem] text-center tabular-nums">
            {meta.page} / {meta.totalPages}
          </span>
          <Button
            size="sm"
            aria-label="Próxima página"
            disabled={meta.page >= meta.totalPages}
            onClick={() => onPageChange(meta.page + 1)}
          >
            <Icon name="chevronRight" />
          </Button>
        </div>
      </div>
    </nav>
  );
}

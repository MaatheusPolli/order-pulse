import { useCallback } from 'react';
import { Button } from '@/shared/ui/Button';
import { DebouncedInput } from '@/shared/ui/DebouncedInput';
import { Icon } from '@/shared/ui/Icon';
import { ToggleGroup } from '@/shared/ui/ToggleGroup';
import { countActiveFilters } from '../api/orders.query';
import type { OrdersQuery } from '../api/orders.query';
import { CHANNELS, ORDER_STATUSES, STATUS_LABELS } from '../types';
import { ChannelLabel } from './ChannelLabel';

type FilterPatch = Partial<Omit<OrdersQuery, 'page' | 'pageSize' | 'sort' | 'dir'>>;

interface OrderFiltersProps {
  query: OrdersQuery;
  onChange: (patch: FilterPatch) => void;
  onClear: () => void;
}

const parseAmount = (value: string) => {
  const parsed = Number.parseFloat(value.replace(',', '.'));
  return value.trim() === '' || !Number.isFinite(parsed) ? null : parsed;
};

export function OrderFilters({ query, onChange, onClear }: OrderFiltersProps) {
  const active = countActiveFilters(query);
  const commitSearch = useCallback((q: string) => onChange({ q: q.trim() }), [onChange]);
  const commitMin = useCallback((v: string) => onChange({ minTotal: parseAmount(v) }), [onChange]);
  const commitMax = useCallback((v: string) => onChange({ maxTotal: parseAmount(v) }), [onChange]);

  return (
    <section aria-label="Filtros" className="card space-y-4 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label htmlFor="order-search" className="label">
            Buscar
          </label>
          <div className="relative">
            <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-muted" />
            <DebouncedInput
              id="order-search"
              type="search"
              className="input pl-9"
              placeholder="Nº do pedido, cliente, e-mail ou SKU"
              value={query.q}
              onCommit={commitSearch}
            />
          </div>
        </div>
        <Button onClick={onClear} disabled={active === 0} aria-label="Limpar filtros">
          <Icon name="x" />
          Limpar{active > 0 ? ` (${active})` : ''}
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ToggleGroup
          legend="Canal"
          options={CHANNELS}
          selected={query.channels}
          onChange={(channels) => onChange({ channels })}
          renderLabel={(channel) => <ChannelLabel channel={channel} />}
        />
        <ToggleGroup
          legend="Status"
          options={ORDER_STATUSES}
          selected={query.statuses}
          onChange={(statuses) => onChange({ statuses })}
          renderLabel={(status) => STATUS_LABELS[status]}
        />
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div>
          <label htmlFor="filter-from" className="label">
            De
          </label>
          <input
            id="filter-from"
            type="date"
            className="input"
            value={query.from}
            max={query.to || undefined}
            onChange={(event) => onChange({ from: event.target.value })}
          />
        </div>
        <div>
          <label htmlFor="filter-to" className="label">
            Até
          </label>
          <input
            id="filter-to"
            type="date"
            className="input"
            value={query.to}
            min={query.from || undefined}
            onChange={(event) => onChange({ to: event.target.value })}
          />
        </div>
        <div>
          <label htmlFor="filter-min" className="label">
            Valor mín. (R$)
          </label>
          <DebouncedInput
            id="filter-min"
            type="number"
            inputMode="decimal"
            min={0}
            className="input"
            value={query.minTotal?.toString() ?? ''}
            onCommit={commitMin}
          />
        </div>
        <div>
          <label htmlFor="filter-max" className="label">
            Valor máx. (R$)
          </label>
          <DebouncedInput
            id="filter-max"
            type="number"
            inputMode="decimal"
            min={0}
            className="input"
            value={query.maxTotal?.toString() ?? ''}
            onCommit={commitMax}
          />
        </div>
      </div>
    </section>
  );
}

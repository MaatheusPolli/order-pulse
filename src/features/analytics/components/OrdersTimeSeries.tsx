import { useState } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { TooltipProps } from 'recharts';
import { cn } from '@/shared/lib/cn';
import { formatCompactCurrency, formatCurrency, formatDayMonth, formatNumber } from '@/shared/lib/format';
import { Table, Td, Th } from '@/shared/ui/Table';
import { useChartColors } from '../hooks/useChartColors';
import type { DailyMetric } from '../types';
import { ChartCard } from './ChartCard';

type Measure = 'orders' | 'revenue';

const MEASURES: Record<Measure, { label: string; format: (v: number) => string; axis: (v: number) => string }> = {
  orders: { label: 'Pedidos', format: (v) => `${formatNumber(v)} pedidos`, axis: formatNumber },
  revenue: { label: 'Receita', format: formatCurrency, axis: formatCompactCurrency },
};

function SeriesTooltip({ active, payload, label, measure }: TooltipProps<number, string> & { measure: Measure }) {
  const value = payload?.[0]?.value;
  if (!active || value === undefined || typeof label !== 'string') return null;
  return (
    <div className="card px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold">{formatDayMonth(label)}</p>
      <p>{MEASURES[measure].format(value)}</p>
    </div>
  );
}

/**
 * Pedidos e receita têm escalas diferentes: em vez de eixo duplo, um seletor
 * alterna a medida exibida.
 */
export function OrdersTimeSeries({ data, days }: { data: DailyMetric[]; days: number }) {
  const [measure, setMeasure] = useState<Measure>('orders');
  const colors = useChartColors();
  const peak = data.reduce<DailyMetric | null>((best, d) => (!best || d[measure] > best[measure] ? d : best), null);

  return (
    <ChartCard
      title={`${MEASURES[measure].label} por dia`}
      description={`Últimos ${days} dias${peak ? ` · pico em ${formatDayMonth(peak.date)}: ${MEASURES[measure].format(peak[measure])}` : ''}`}
      actions={
        <div role="group" aria-label="Medida" className="inline-flex rounded-md border border-border p-0.5">
          {(Object.keys(MEASURES) as Measure[]).map((key) => (
            <button
              key={key}
              type="button"
              aria-pressed={measure === key}
              onClick={() => setMeasure(key)}
              className={cn(
                'rounded px-2.5 py-1 text-xs font-medium',
                measure === key ? 'bg-surface-muted text-fg' : 'text-fg-muted hover:text-fg',
              )}
            >
              {MEASURES[key].label}
            </button>
          ))}
        </div>
      }
      chart={
        <div className="h-64" role="img" aria-label={`Série diária de ${MEASURES[measure].label.toLowerCase()}. Use "Ver tabela" para os valores.`}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="series-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={colors.series} stopOpacity={0.25} />
                  <stop offset="100%" stopColor={colors.series} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke={colors.grid} strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickFormatter={formatDayMonth}
                tick={{ fill: colors.axis, fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                minTickGap={24}
              />
              <YAxis
                tickFormatter={MEASURES[measure].axis}
                tick={{ fill: colors.axis, fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                width={64}
              />
              <Tooltip
                content={<SeriesTooltip measure={measure} />}
                cursor={{ stroke: colors.axis, strokeDasharray: '4 4' }}
              />
              <Area
                type="monotone"
                dataKey={measure}
                stroke={colors.series}
                strokeWidth={2}
                fill="url(#series-fill)"
                activeDot={{ r: 5, stroke: colors.surface, strokeWidth: 2 }}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      }
      table={
        <Table>
          <thead>
            <tr>
              <Th>Dia</Th>
              <Th className="text-right">Pedidos</Th>
              <Th className="text-right">Receita</Th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.date}>
                <Td>{formatDayMonth(d.date)}</Td>
                <Td className="text-right tabular-nums">{formatNumber(d.orders)}</Td>
                <Td className="text-right tabular-nums">{formatCurrency(d.revenue)}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      }
    />
  );
}

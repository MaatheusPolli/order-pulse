import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { TooltipProps } from 'recharts';
import { CHANNEL_LABELS } from '@/features/orders/types';
import { formatCurrency, formatNumber, formatPercent } from '@/shared/lib/format';
import { Table, Td, Th } from '@/shared/ui/Table';
import { useChartColors } from '../hooks/useChartColors';
import type { ChannelMetric } from '../types';
import { ChartCard } from './ChartCard';

interface Row extends ChannelMetric {
  label: string;
}

function ChannelTooltip({ active, payload }: TooltipProps<number, string>) {
  const row = payload?.[0]?.payload as Row | undefined;
  if (!active || !row) return null;
  return (
    <div className="card px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-semibold">{row.label}</p>
      <p>{formatNumber(row.orders)} pedidos</p>
      <p>{formatCurrency(row.revenue)} em receita</p>
      <p className="text-fg-muted">
        {formatNumber(row.failures)} falhas ({formatPercent(row.orders ? row.failures / row.orders : 0)})
      </p>
    </div>
  );
}

export function ChannelBarChart({ data }: { data: ChannelMetric[] }) {
  const colors = useChartColors();
  const rows: Row[] = [...data].sort((a, b) => b.orders - a.orders).map((d) => ({ ...d, label: CHANNEL_LABELS[d.channel] }));

  return (
    <ChartCard
      title="Pedidos por canal"
      description="Volume no período; passe o mouse para ver receita e falhas."
      chart={
        <div className="h-64" role="img" aria-label={rows.map((r) => `${r.label}: ${r.orders} pedidos`).join('; ')}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 48, bottom: 0, left: 8 }} barCategoryGap={10}>
              <CartesianGrid horizontal={false} stroke={colors.grid} strokeDasharray="3 3" />
              <XAxis type="number" tick={{ fill: colors.axis, fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis
                type="category"
                dataKey="label"
                width={104}
                tick={{ fill: colors.axis, fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<ChannelTooltip />} cursor={{ fill: colors.grid, opacity: 0.35 }} />
              <Bar dataKey="orders" radius={[0, 4, 4, 0]} isAnimationActive={false}>
                {rows.map((row) => (
                  <Cell key={row.channel} fill={colors.channels[row.channel]} />
                ))}
                <LabelList dataKey="orders" position="right" fill={colors.axis} fontSize={12} formatter={formatNumber} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      }
      table={
        <Table>
          <thead>
            <tr>
              <Th>Canal</Th>
              <Th className="text-right">Pedidos</Th>
              <Th className="text-right">Receita</Th>
              <Th className="text-right">Falhas</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.channel}>
                <Td>{row.label}</Td>
                <Td className="text-right tabular-nums">{formatNumber(row.orders)}</Td>
                <Td className="text-right tabular-nums">{formatCurrency(row.revenue)}</Td>
                <Td className="text-right tabular-nums">{formatNumber(row.failures)}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      }
    />
  );
}

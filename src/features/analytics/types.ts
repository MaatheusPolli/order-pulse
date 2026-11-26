import type { Channel, OrderStatus } from '../orders/types';

export interface Kpis {
  orders: number;
  /** Centavos, exclui cancelados */
  revenue: number;
  /** Centavos */
  averageTicket: number;
  /** 0..1 — pedidos com erro de integração / pedidos do período */
  failureRate: number;
}

export interface ChannelMetric {
  channel: Channel;
  orders: number;
  revenue: number;
  failures: number;
}

export interface DailyMetric {
  /** YYYY-MM-DD */
  date: string;
  orders: number;
  revenue: number;
}

export interface Metrics {
  period: { from: string; to: string; days: number };
  kpis: Kpis;
  previousKpis: Kpis;
  byChannel: ChannelMetric[];
  byStatus: { status: OrderStatus; orders: number }[];
  series: DailyMetric[];
}

export const METRIC_PERIODS = [7, 30, 90] as const;
export type MetricPeriod = (typeof METRIC_PERIODS)[number];

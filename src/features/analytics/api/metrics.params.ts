import { METRIC_PERIODS } from '../types';
import type { MetricPeriod } from '../types';

export const DEFAULT_METRIC_PERIOD: MetricPeriod = 30;

export function parseMetricPeriod(value: string | null): MetricPeriod {
  const parsed = Number(value);
  return (METRIC_PERIODS as readonly number[]).includes(parsed) ? (parsed as MetricPeriod) : DEFAULT_METRIC_PERIOD;
}

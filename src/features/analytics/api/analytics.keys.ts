import type { MetricPeriod } from '../types';

export const analyticsKeys = {
  all: ['analytics'] as const,
  metrics: (days: MetricPeriod) => [...analyticsKeys.all, 'metrics', days] as const,
};

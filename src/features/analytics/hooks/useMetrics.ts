import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { fetchMetrics } from '../api/analytics.api';
import { analyticsKeys } from '../api/analytics.keys';
import type { MetricPeriod } from '../types';

export function useMetrics(days: MetricPeriod) {
  return useQuery({
    queryKey: analyticsKeys.metrics(days),
    queryFn: ({ signal }) => fetchMetrics(days, signal),
    placeholderData: keepPreviousData,
  });
}

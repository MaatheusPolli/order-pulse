import { http } from '@/shared/lib/http';
import type { Metrics, MetricPeriod } from '../types';

export function fetchMetrics(days: MetricPeriod, signal?: AbortSignal): Promise<Metrics> {
  return http.get<Metrics>('/metrics', { params: { days }, signal });
}

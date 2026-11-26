import { describe, expect, it } from 'vitest';
import {
  formatCurrency,
  formatDateTime,
  formatDayMonth,
  formatDocument,
  formatPercent,
  relativeChange,
} from '@/shared/lib/format';
import { highlightJson } from '@/features/integration-failures/lib/highlight-json';
import { parseMetricPeriod } from '@/features/analytics/api/metrics.params';

const nbsp = (value: string) => value.replace(/\u00a0/g, ' ');

describe('formatadores', () => {
  it('formata centavos como BRL', () => {
    expect(nbsp(formatCurrency(123_456))).toBe('R$ 1.234,56');
  });

  it('formata datas no fuso de São Paulo', () => {
    expect(formatDateTime('2026-09-30T02:30:00.000Z')).toBe('29/09/2026, 23:30');
    expect(formatDayMonth('2026-09-05')).toBe('05/09');
  });

  it('formata CPF e CNPJ; mantém outros formatos', () => {
    expect(formatDocument('52998224725')).toBe('529.982.247-25');
    expect(formatDocument('11222333000181')).toBe('11.222.333/0001-81');
    expect(formatDocument('ABC')).toBe('ABC');
  });

  it('calcula variação relativa e percentual', () => {
    expect(relativeChange(120, 100)).toBeCloseTo(0.2);
    expect(relativeChange(10, 0)).toBeNull();
    expect(nbsp(formatPercent(0.0456))).toBe('4,6%');
  });

  it('período de métricas só aceita 7, 30 ou 90', () => {
    expect(parseMetricPeriod('7')).toBe(7);
    expect(parseMetricPeriod('90')).toBe(90);
    expect(parseMetricPeriod('15')).toBe(30);
    expect(parseMetricPeriod(null)).toBe(30);
  });
});

describe('highlightJson', () => {
  it('preserva o texto e marca chaves, strings, números e literais', () => {
    const json = JSON.stringify({ id: 'A', total: 10.5, ok: true, x: null }, null, 2);
    const nodes = highlightJson(json);
    const text = nodes.map((n) => (typeof n === 'string' ? n : (n as { props: { children: string } }).props.children)).join('');
    expect(text).toBe(json);
    expect(nodes.filter((n) => typeof n !== 'string')).toHaveLength(8);
  });
});

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const compactCurrency = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  notation: 'compact',
  maximumFractionDigits: 1,
});
const integer = new Intl.NumberFormat('pt-BR');
const percent = new Intl.NumberFormat('pt-BR', { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 });
const dateTime = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
  timeZone: 'America/Sao_Paulo',
});
const date = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeZone: 'America/Sao_Paulo' });
const dayMonth = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'UTC' });

/** Valores monetários do domínio são centavos. */
export const formatCurrency = (cents: number) => currency.format(cents / 100);
export const formatCompactCurrency = (cents: number) => compactCurrency.format(cents / 100);
export const formatNumber = (value: number) => integer.format(value);
export const formatPercent = (ratio: number) => percent.format(ratio);
export const formatDateTime = (iso: string) => dateTime.format(new Date(iso));
export const formatDate = (iso: string) => date.format(new Date(iso));
/** Recebe `YYYY-MM-DD` (dia já no fuso local do negócio). */
export const formatDayMonth = (day: string) => dayMonth.format(new Date(`${day}T12:00:00Z`));

export function formatDocument(document: string): string {
  const digits = document.replace(/\D/g, '');
  if (digits.length === 11) return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  if (digits.length === 14) return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  return document;
}

/** Variação relativa entre dois períodos; `null` quando não há base de comparação. */
export function relativeChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return (current - previous) / previous;
}

import { screen, waitFor, within } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import { describe, expect, it } from 'vitest';
import { formatCurrency as currency, formatNumber, formatPercent as percent } from '@/shared/lib/format';

import { db } from '../msw/handlers';
import { server } from '../msw/server';
import { renderApp } from '../utils';

// toHaveTextContent normaliza espaços; Intl usa NBSP entre "R$" e o valor.
const formatCurrency = (cents: number) => currency(cents).replace(/\u00a0/g, ' ');
const formatPercent = (ratio: number) => percent(ratio).replace(/\u00a0/g, ' ');

const kpi = (label: string) => screen.getByRole('heading', { name: label, level: 2 }).closest('article')!;

describe('Dashboard', () => {
  it('mostra os KPIs do período padrão (30 dias)', async () => {
    const { kpis } = db.metrics(30);
    renderApp('/');

    expect(await screen.findByText(formatNumber(kpis.orders))).toBeInTheDocument();
    expect(kpi('Receita')).toHaveTextContent(formatCurrency(kpis.revenue));
    expect(kpi('Ticket médio')).toHaveTextContent(formatCurrency(kpis.averageTicket));
    expect(kpi('Taxa de falha de integração')).toHaveTextContent(formatPercent(kpis.failureRate));
    expect(kpi('Pedidos')).toHaveTextContent('vs. período anterior');
    expect(screen.getByRole('button', { name: '30 dias', pressed: true })).toBeInTheDocument();
  });

  it('troca de período atualiza a URL e os números', async () => {
    const { user, searchParams } = renderApp('/');
    await screen.findByRole('heading', { name: 'Pedidos por canal' });

    await user.click(screen.getByRole('button', { name: '7 dias' }));
    expect(searchParams().get('days')).toBe('7');
    await waitFor(() => expect(kpi('Pedidos')).toHaveTextContent(formatNumber(db.metrics(7).kpis.orders)));
    expect(screen.getByRole('heading', { name: 'Pedidos por dia' }).nextSibling).toHaveTextContent('Últimos 7 dias');
  });

  it('gráficos têm visão em tabela com os mesmos dados', async () => {
    const { byChannel, series } = db.metrics(30);
    const { user } = renderApp('/');
    const channelFigure = (await screen.findByRole('heading', { name: 'Pedidos por canal' })).closest('figure')!;

    await user.click(within(channelFigure).getByRole('button', { name: 'Ver tabela' }));
    const rows = within(within(channelFigure).getByRole('table')).getAllByRole('row').slice(1);
    expect(rows).toHaveLength(4);
    const vtex = byChannel.find((c) => c.channel === 'vtex')!;
    expect(rows.find((r) => r.textContent?.startsWith('VTEX'))).toHaveTextContent(formatCurrency(vtex.revenue));

    const seriesFigure = screen.getByRole('heading', { name: 'Pedidos por dia' }).closest('figure')!;
    await user.click(within(seriesFigure).getByRole('button', { name: 'Receita' }));
    expect(within(seriesFigure).getByRole('heading', { name: 'Receita por dia' })).toBeInTheDocument();
    await user.click(within(seriesFigure).getByRole('button', { name: 'Ver tabela' }));
    expect(within(within(seriesFigure).getByRole('table')).getAllByRole('row')).toHaveLength(series.length + 1);
  });

  it('destaca canais com taxa de falha alta', async () => {
    renderApp('/');
    const section = (await screen.findByRole('heading', { name: 'Taxa de falha por canal' })).closest('section')!;
    expect(within(section).getAllByRole('listitem')).toHaveLength(4);
    expect(within(section).getByRole('link', { name: 'Ver falhas' })).toHaveAttribute('href', '/failures');
  });

  it('mostra erro e permite tentar novamente', async () => {
    server.use(http.get('/api/metrics', () => HttpResponse.json({ message: 'Métricas indisponíveis' }, { status: 500 })));
    renderApp('/');
    expect(await screen.findByRole('alert')).toHaveTextContent('Métricas indisponíveis');
  });
});

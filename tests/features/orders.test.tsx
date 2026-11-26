import { screen, waitFor, within } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import { describe, expect, it } from 'vitest';
import { mapRawOrder } from '@/features/orders/mappers';
import { DEFAULT_ORDERS_QUERY } from '@/features/orders/api/orders.query';
import { db } from '../msw/handlers';
import { server } from '../msw/server';
import { renderApp } from '../utils';

const table = () => screen.findByRole('table');
const bodyRows = async () => within(await table()).getAllByRole('row').slice(1);
const newest = () => mapRawOrder(db.listOrders(DEFAULT_ORDERS_QUERY).data[0]!);

describe('Pedidos', () => {
  it('mostra skeleton, depois a tabela paginada com status normalizado', async () => {
    renderApp('/orders');
    expect(screen.getByRole('status', { name: /carregando/i })).toBeInTheDocument();

    expect(await bodyRows()).toHaveLength(25);
    expect(screen.queryByRole('status', { name: 'Carregando pedidos' })).not.toBeInTheDocument();
    expect(screen.getByText('1–25 de 1.500 pedidos')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: new RegExp(newest().id) })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /data/i })).toHaveAttribute('aria-sort', 'descending');
  });

  it('filtro de canal altera a URL e refaz a consulta', async () => {
    const { user, searchParams } = renderApp('/orders');
    await table();

    await user.click(screen.getByRole('button', { name: 'Tray', pressed: false }));

    await waitFor(() => expect(searchParams().get('channel')).toBe('tray'));
    await waitFor(async () => {
      const channels = (await bodyRows()).map((row) => within(row).getAllByRole('cell')[1]!.textContent);
      expect(new Set(channels)).toEqual(new Set(['Tray']));
    });
    expect(screen.getByRole('button', { name: 'Tray', pressed: true })).toBeInTheDocument();
  });

  it('busca com debounce, volta à página 1 e mostra estado vazio', async () => {
    const { user, searchParams } = renderApp('/orders?page=3');
    await table();

    await user.type(screen.getByRole('searchbox', { name: 'Buscar' }), 'pedido-que-nao-existe');

    expect(await screen.findByText('Nenhum pedido encontrado')).toBeInTheDocument();
    expect(searchParams().get('q')).toBe('pedido-que-nao-existe');
    expect(searchParams().get('page')).toBeNull();

    await user.click(screen.getAllByRole('button', { name: /limpar filtros/i })[0]!);
    expect(await bodyRows()).toHaveLength(25);
    expect(searchParams().toString()).toBe('');
    expect(screen.getByRole('searchbox', { name: 'Buscar' })).toHaveValue('');
  });

  it('lê filtros da URL (link compartilhado) e aplica status, período e valor', async () => {
    renderApp('/orders?status=canceled&minTotal=100&from=2026-07-01&to=2026-09-30');
    const rows = await bodyRows();
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) expect(within(row).getByText('Cancelado')).toBeInTheDocument();
    expect(screen.getByLabelText('Valor mín. (R$)')).toHaveValue(100);
    expect(screen.getByLabelText('De')).toHaveValue('2026-07-01');
    expect(screen.getByRole('button', { name: /limpar filtros/i })).toHaveTextContent('Limpar (3)');
  });

  it('ordena pela coluna e navega entre páginas', async () => {
    const { user, searchParams } = renderApp('/orders');
    await table();

    await user.click(screen.getByRole('button', { name: /total/i }));
    await waitFor(() => expect(searchParams().get('sort')).toBe('total'));
    await user.click(screen.getByRole('button', { name: /total/i }));
    await waitFor(() => expect(searchParams().get('dir')).toBe('asc'));
    expect(screen.getByRole('columnheader', { name: /total/i })).toHaveAttribute('aria-sort', 'ascending');

    await user.click(screen.getByRole('button', { name: 'Próxima página' }));
    await waitFor(() => expect(searchParams().get('page')).toBe('2'));
    expect(await screen.findByText('26–50 de 1.500 pedidos')).toBeInTheDocument();

    await user.selectOptions(screen.getByRole('combobox', { name: 'Por página' }), '50');
    await waitFor(() => expect(searchParams().get('pageSize')).toBe('50'));
    expect(searchParams().get('page')).toBeNull();
  });

  it('com 1.000 linhas por página, virtualiza e não monta todas no DOM', async () => {
    renderApp('/orders?pageSize=1000');
    expect(await screen.findByRole('region', { name: /lista de pedidos/i })).toBeInTheDocument();
    expect(within(await table()).getAllByRole('row').length).toBeLessThan(100);
  });

  it('mostra erro com opção de tentar novamente', async () => {
    server.use(http.get('/api/orders', () => HttpResponse.json({ message: 'Hub fora do ar' }, { status: 503 })));
    const { user } = renderApp('/orders');

    expect(await screen.findByRole('alert')).toHaveTextContent('Hub fora do ar');
    server.resetHandlers();
    await user.click(screen.getByRole('button', { name: /tentar novamente/i }));
    expect(await bodyRows()).toHaveLength(25);
  });
});

describe('Detalhe do pedido', () => {
  it('abre o detalhe e volta mantendo os filtros', async () => {
    const { user, location } = renderApp('/orders?channel=vtex&sort=total');
    const [firstRow] = await bodyRows();
    const link = within(firstRow!).getByRole('link');
    const id = link.textContent!.slice(0, 9);

    await user.click(link);
    expect(await screen.findByRole('heading', { level: 1, name: `Pedido ${id}` })).toBeInTheDocument();
    const order = mapRawOrder(db.getOrder(id));
    expect(screen.getByText(`Status original:`)).toHaveTextContent(order.rawStatus);
    expect(screen.getByRole('list', { name: 'Linha do tempo do pedido' }).children).toHaveLength(order.timeline.length);
    for (const item of order.items) expect(screen.getByText(item.sku)).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: /voltar para pedidos/i }));
    await waitFor(() => expect(location().pathname).toBe('/orders'));
    expect(location().search).toBe('?channel=vtex&sort=total');
  });

  it('acessado direto pela URL busca o pedido na API', async () => {
    const order = newest();
    renderApp(`/orders/${order.id}`);
    expect(await screen.findByRole('heading', { name: `Pedido ${order.id}` })).toBeInTheDocument();
    expect(screen.getByText(order.customer.email)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /voltar para pedidos/i })).toHaveAttribute('href', '/orders');
  });

  it('mostra aviso de falha de integração quando o pedido não sincronizou', async () => {
    const failed = mapRawOrder(db.listFailures()[0]!);
    renderApp(`/orders/${failed.id}`);
    expect(await screen.findByRole('alert')).toHaveTextContent(failed.integration.error!.code);
  });

  it('mostra "não encontrado" para id inexistente', async () => {
    renderApp('/orders/OP-999999');
    expect(await screen.findByText('Pedido não encontrado')).toBeInTheDocument();
  });
});

describe('Navegação', () => {
  it('rota desconhecida mostra 404 e tema alterna e persiste', async () => {
    const { user } = renderApp('/rota-inexistente');
    expect(await screen.findByText('Página não encontrada')).toBeInTheDocument();

    const [toggle] = screen.getAllByRole('button', { name: /ativar tema escuro/i });
    await user.click(toggle!);
    expect(document.documentElement).toHaveClass('dark');
    expect(localStorage.getItem('order-pulse:theme')).toBe('dark');
  });
});

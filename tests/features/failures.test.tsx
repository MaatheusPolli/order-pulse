import { screen, waitFor, within } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import { describe, expect, it } from 'vitest';
import { mapRawOrder } from '@/features/orders/mappers';
import { db } from '../msw/handlers';
import { server } from '../msw/server';
import { renderApp } from '../utils';

const failures = () => db.listFailures().map(mapRawOrder);
const rowFor = async (id: string) => {
  const link = await screen.findByRole('link', { name: new RegExp(id) });
  return link.closest('tr')!;
};

describe('Falhas de integração', () => {
  it('lista as falhas com erro, tipo e tentativas', async () => {
    renderApp('/failures');
    const table = await screen.findByRole('table');
    expect(within(table).getAllByRole('row')).toHaveLength(failures().length + 1);

    const first = failures()[0]!;
    const row = await rowFor(first.id);
    expect(within(row).getByText(first.integration.error!.code)).toBeInTheDocument();
    expect(within(row).getByText(first.integration.error!.retryable ? 'Transitório' : 'Dados')).toBeInTheDocument();
    // contador no menu lateral
    expect(screen.getByRole('link', { name: new RegExp(`Falhas.*${failures().length}`) })).toBeInTheDocument();
  });

  it('reprocessar remove a linha de forma otimista e confirma sucesso', async () => {
    const target = failures().find((o) => o.integration.error!.retryable)!;
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => (release = resolve));
    server.use(
      http.post('/api/failures/:id/reprocess', async () => {
        await gate;
        return HttpResponse.json(db.reprocess(target.id));
      }),
    );
    const { user } = renderApp('/failures');
    const row = await rowFor(target.id);

    await user.click(within(row).getByRole('button', { name: `Reprocessar pedido ${target.id}` }));
    // a resposta ainda não chegou, mas a linha já saiu da lista
    await waitFor(() => expect(screen.queryByRole('link', { name: new RegExp(target.id) })).not.toBeInTheDocument());

    release();
    expect(await screen.findByRole('status', { name: '' })).toHaveTextContent(`Pedido ${target.id} reprocessado`);
    await waitFor(() => expect(screen.queryByRole('link', { name: new RegExp(target.id) })).not.toBeInTheDocument());
  });

  it('reverte a remoção otimista quando o servidor responde 500', async () => {
    const target = failures()[0]!;
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => (release = resolve));
    server.use(
      http.post('/api/failures/:id/reprocess', async () => {
        await gate;
        return HttpResponse.json({ message: 'ERP indisponível' }, { status: 500 });
      }),
    );
    const { user } = renderApp('/failures');
    const row = await rowFor(target.id);

    await user.click(within(row).getByRole('button', { name: `Reprocessar pedido ${target.id}` }));
    await waitFor(() => expect(screen.queryByRole('link', { name: new RegExp(target.id) })).not.toBeInTheDocument());

    release();
    expect(await screen.findByRole('alert')).toHaveTextContent(`Pedido ${target.id}: ERP indisponível`);
    expect(await rowFor(target.id)).toBeInTheDocument();
  });

  it('erro de dados volta para a lista com mensagem do ERP (422)', async () => {
    const target = failures().find((o) => !o.integration.error!.retryable)!;
    const { user } = renderApp('/failures');
    const row = await rowFor(target.id);

    await user.click(within(row).getByRole('button', { name: `Reprocessar pedido ${target.id}` }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Reprocessamento falhou');
    const restored = await rowFor(target.id);
    await waitFor(() =>
      expect(within(restored).getAllByRole('cell')[3]).toHaveTextContent(String(target.integration.error!.attempts + 1)),
    );
  });

  it('abre o payload bruto do marketplace em um diálogo acessível', async () => {
    const target = failures()[0]!;
    const { user } = renderApp('/failures');
    const row = await rowFor(target.id);

    await user.click(within(row).getByRole('button', { name: `Ver payload do pedido ${target.id}` }));
    const dialog = await screen.findByRole('dialog', { name: `Payload do pedido ${target.id}` });
    expect(within(dialog).getByLabelText('JSON do payload')).toHaveTextContent(target.channelOrderId);

    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('mostra estado vazio quando não há falhas', async () => {
    server.use(http.get('/api/failures', () => HttpResponse.json({ data: [] })));
    renderApp('/failures');
    expect(await screen.findByText('Nenhuma falha pendente')).toBeInTheDocument();
  });

  it('mostra erro quando a API falha', async () => {
    server.use(http.get('/api/failures', () => HttpResponse.error()));
    renderApp('/failures');
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível conectar à API');
  });
});

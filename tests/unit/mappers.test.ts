import { describe, expect, it } from 'vitest';
import { mapRawOrder } from '@/features/orders/mappers';
import { normalizeMagentoStatus } from '@/features/orders/mappers/magento.mapper';
import { normalizeMeliStatus } from '@/features/orders/mappers/meli.mapper';
import { brLocalToIso, buildTimeline, toCents } from '@/features/orders/mappers/shared';
import { normalizeTrayStatus } from '@/features/orders/mappers/tray.mapper';
import { normalizeVtexStatus } from '@/features/orders/mappers/vtex.mapper';
import { envelopes, magentoOrder, meliOrder, vtexOrder } from '../fixtures/channels';

describe('mappers por canal', () => {
  it('VTEX: centavos, totais do array `totals` e envio via courierStatus', () => {
    const order = mapRawOrder(envelopes.vtex);
    expect(order).toMatchObject({
      id: 'OP-000001',
      channel: 'vtex',
      channelOrderId: '1438960510281-01',
      status: 'shipped',
      rawStatus: 'invoiced',
      customer: { name: 'Cliente Alfa', document: '52998224725' },
      totals: { products: 26_980, shipping: 1_588, discount: 2_698, total: 25_870 },
      delivery: { city: 'São Paulo', state: 'SP', carrier: 'Correios SEDEX', trackingCode: 'QB123456789BR' },
    });
    expect(order.items).toEqual([
      { sku: 'TEN-0042-P', name: 'Tênis de Corrida Pulse 42', quantity: 1, unitPrice: 19_990, total: 19_990 },
      { sku: 'MEI-0001', name: 'Meia Esportiva (par)', quantity: 2, unitPrice: 3_495, total: 6_990 },
    ]);
    // handling/ready-for-handling colapsam em um único "pago"
    expect(order.timeline.map((e) => e.status)).toEqual(['pending', 'paid', 'invoiced', 'shipped']);
  });

  it('Mercado Livre: reais → centavos, total = itens + frete, status do shipment', () => {
    const order = mapRawOrder(envelopes.mercadolivre);
    expect(order).toMatchObject({
      channelOrderId: '2000009876543',
      status: 'shipped',
      rawStatus: 'paid/shipped',
      totals: { products: 14_990, shipping: 2_190, discount: 0, total: 17_180 },
      delivery: { state: 'PR', trackingCode: 'MEL1234567890' },
      placedAt: '2026-09-20T17:05:10.000Z',
    });
    expect(order.timeline.map((e) => e.status)).toEqual(['pending', 'paid', 'invoiced', 'shipped']);
  });

  it('Magento: desconto negativo, datas UTC sem fuso e histórico invertido', () => {
    const order = mapRawOrder(envelopes.magento);
    expect(order).toMatchObject({
      channelOrderId: '000000991',
      status: 'shipped',
      rawStatus: 'processing',
      totals: { products: 39_980, shipping: 0, discount: 3_998, total: 35_982 },
      delivery: { receiver: 'Cliente Gama', street: 'Rua XV de Novembro, 50, Centro', carrier: 'Jadlog' },
      placedAt: '2026-09-20T13:05:10.000Z',
    });
    expect(order.timeline.map((e) => e.status)).toEqual(['pending', 'paid', 'invoiced', 'shipped']);
    expect(order.timeline[0]!.description).toBe('Pedido recebido (pending)');
  });

  it('Tray: números como string e data/hora locais (UTC-3)', () => {
    const order = mapRawOrder(envelopes.tray);
    expect(order).toMatchObject({
      channelOrderId: '81234',
      status: 'shipped',
      rawStatus: 'ENVIADO',
      totals: { products: 8_990, shipping: 1_500, discount: 0, total: 10_490 },
      placedAt: '2026-09-20T13:05:10.000Z',
      integration: { synced: false, error: { code: 'ERP_TIMEOUT' } },
    });
    expect(order.items[0]).toEqual({ sku: 'GAR-750', name: 'Garrafa Térmica 750ml', quantity: 1, unitPrice: 8_990, total: 8_990 });
    expect(order.timeline.map((e) => e.status)).toEqual(['pending', 'paid', 'invoiced', 'shipped']);
  });

  it('todos os canais convergem para o mesmo status normalizado', () => {
    const statuses = Object.values(envelopes).map((e) => mapRawOrder(e).status);
    expect(new Set(statuses)).toEqual(new Set(['shipped']));
  });
});

describe('normalização de status', () => {
  const vtex = (status: typeof vtexOrder.status, courier?: 'shipped' | 'delivered') =>
    normalizeVtexStatus({
      status,
      packageAttachment: {
        packages: courier
          ? [{ ...vtexOrder.packageAttachment.packages[0]!, courierStatus: { status: courier, finished: courier === 'delivered', shippedDate: '', deliveredDate: null } }]
          : [],
      },
    });

  it.each([
    ['order-created', undefined, 'pending'],
    ['payment-pending', undefined, 'pending'],
    ['payment-approved', undefined, 'paid'],
    ['handling', undefined, 'paid'],
    ['invoiced', undefined, 'invoiced'],
    ['invoiced', 'shipped', 'shipped'],
    ['invoiced', 'delivered', 'delivered'],
    ['cancellation-requested', undefined, 'canceled'],
    ['canceled', undefined, 'canceled'],
  ] as const)('VTEX %s (+courier %s) → %s', (status, courier, expected) => {
    expect(vtex(status, courier)).toBe(expected);
  });

  it.each([
    ['payment_required', 'pending', null, 'pending'],
    ['paid', 'handling', null, 'paid'],
    ['paid', 'ready_to_ship', { number: '1', date: '' }, 'invoiced'],
    ['paid', 'shipped', null, 'shipped'],
    ['paid', 'delivered', null, 'delivered'],
    ['cancelled', 'cancelled', null, 'canceled'],
    ['paid', 'cancelled', null, 'canceled'],
  ] as const)('Mercado Livre %s/%s → %s', (status, shipping, invoice, expected) => {
    expect(normalizeMeliStatus({ status, shipping: { ...meliOrder.shipping, status: shipping }, invoice })).toBe(expected);
  });

  const noDocs = { shipping_assignments: [], invoices: [], shipments: [] };
  it.each([
    ['pending', noDocs, 'pending'],
    ['pending_payment', noDocs, 'pending'],
    ['holded', noDocs, 'pending'],
    ['processing', noDocs, 'paid'],
    ['processing', { ...noDocs, invoices: magentoOrder.extension_attributes.invoices }, 'invoiced'],
    ['processing', magentoOrder.extension_attributes, 'shipped'],
    ['complete', noDocs, 'shipped'],
    ['delivered', noDocs, 'delivered'],
    ['canceled', noDocs, 'canceled'],
    ['closed', noDocs, 'canceled'],
  ] as const)('Magento %s → %s', (status, extension_attributes, expected) => {
    expect(normalizeMagentoStatus({ status, extension_attributes })).toBe(expected);
  });

  it.each([
    ['AGUARDANDO PAGAMENTO', 'pending'],
    ['PAGAMENTO APROVADO', 'paid'],
    ['EM SEPARAÇÃO', 'paid'],
    ['NOTA FISCAL EMITIDA', 'invoiced'],
    ['A ENVIAR', 'invoiced'],
    ['ENVIADO', 'shipped'],
    ['ENTREGUE', 'delivered'],
    ['FINALIZADO', 'delivered'],
    ['CANCELADO', 'canceled'],
    ['cancelado aut', 'canceled'],
    ['STATUS CUSTOMIZADO DO LOJISTA', 'pending'],
  ])('Tray %s → %s', (status, expected) => {
    expect(normalizeTrayStatus(status)).toBe(expected);
  });
});

describe('helpers dos mappers', () => {
  it('toCents lida com number, string e valores inválidos', () => {
    expect(toCents(0.1 + 0.2)).toBe(30);
    expect(toCents('104,90')).toBe(10_490);
    expect(toCents('abc')).toBe(0);
  });

  it('brLocalToIso converte horário de Brasília para UTC', () => {
    expect(brLocalToIso('2026-09-20', '21:30:00')).toBe('2026-09-21T00:30:00.000Z');
    expect(brLocalToIso('2026-09-20')).toBe('2026-09-20T03:00:00.000Z');
  });

  it('buildTimeline ordena, ignora eventos sem data e colapsa repetidos', () => {
    const timeline = buildTimeline([
      { status: 'paid', at: '2026-01-02T00:00:00Z' },
      { status: 'pending', at: '2026-01-01T00:00:00Z', source: 'created' },
      { status: 'paid', at: '2026-01-03T00:00:00Z' },
      { status: 'shipped', at: null },
    ]);
    expect(timeline).toEqual([
      { status: 'pending', at: '2026-01-01T00:00:00.000Z', description: 'Pedido recebido (created)' },
      { status: 'paid', at: '2026-01-02T00:00:00.000Z', description: 'Pagamento aprovado' },
    ]);
  });
});

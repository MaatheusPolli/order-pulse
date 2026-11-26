import type { Order, OrderStatus } from '../types';
import type { MeliOrder, RawOrderEnvelope } from './raw.types';
import { buildTimeline, copyIntegration, toCents } from './shared';

/**
 * No Mercado Livre o status do pedido só vai até `paid`; o restante do ciclo
 * vive no shipment (`shipping.status`) e na nota fiscal anexada.
 */
export function normalizeMeliStatus(order: Pick<MeliOrder, 'status' | 'shipping' | 'invoice'>): OrderStatus {
  if (order.status === 'cancelled' || order.shipping.status === 'cancelled') return 'canceled';
  if (order.status !== 'paid') return 'pending';
  switch (order.shipping.status) {
    case 'delivered':
      return 'delivered';
    case 'shipped':
      return 'shipped';
    default:
      return order.invoice ? 'invoiced' : 'paid';
  }
}

type MeliEnvelope = Extract<RawOrderEnvelope, { channel: 'mercadolivre' }>;

export function mapMeliOrder(envelope: MeliEnvelope): Order {
  const raw = envelope.payload;
  const items = raw.order_items.map((line) => {
    const unitPrice = toCents(line.unit_price);
    return {
      sku: line.item.seller_sku,
      name: line.item.title,
      quantity: line.quantity,
      unitPrice,
      total: unitPrice * line.quantity,
    };
  });
  const history = raw.shipping.status_history;
  const address = raw.shipping.receiver_address;

  return {
    id: envelope.id,
    channel: 'mercadolivre',
    channelOrderId: String(raw.id),
    status: normalizeMeliStatus(raw),
    rawStatus: `${raw.status}/${raw.shipping.status}`,
    customer: {
      name: `${raw.buyer.first_name} ${raw.buyer.last_name}`.trim(),
      email: raw.buyer.email,
      document: raw.buyer.billing_info.doc_number,
    },
    items,
    totals: {
      products: items.reduce((sum, item) => sum + item.total, 0),
      shipping: toCents(raw.shipping.cost),
      discount: toCents(raw.coupon.amount),
      // `paid_amount` é zero até o pagamento; o total do pedido é itens (já com cupom) + frete.
      total: toCents(raw.total_amount) + toCents(raw.shipping.cost),
    },
    delivery: {
      receiver: address.receiver_name,
      street: address.address_line,
      city: address.city.name,
      state: address.state.id.replace(/^BR-/, ''),
      postalCode: address.zip_code,
      carrier: raw.shipping.tracking_method ?? undefined,
      trackingCode: raw.shipping.tracking_number ?? undefined,
      estimatedAt: raw.shipping.estimated_delivery_time.date,
    },
    placedAt: new Date(raw.date_created).toISOString(),
    timeline: buildTimeline([
      { status: 'pending', at: raw.date_created, source: 'date_created' },
      { status: 'paid', at: raw.status === 'paid' ? raw.date_closed : null, source: 'paid' },
      { status: 'invoiced', at: raw.invoice?.date, source: 'invoice' },
      { status: 'shipped', at: history.date_shipped, source: 'shipped' },
      { status: 'delivered', at: history.date_delivered, source: 'delivered' },
      { status: 'canceled', at: history.date_cancelled, source: 'cancelled' },
    ]),
    integration: copyIntegration(envelope.integration),
  };
}

import type { Order, OrderStatus } from '../types';
import type { MagentoOrder, MagentoStatus, RawOrderEnvelope } from './raw.types';
import { buildTimeline, copyIntegration, toCents } from './shared';

const STATUS_MAP: Record<MagentoStatus, OrderStatus> = {
  pending: 'pending',
  pending_payment: 'pending',
  holded: 'pending',
  processing: 'paid',
  complete: 'shipped',
  delivered: 'delivered',
  canceled: 'canceled',
  closed: 'canceled',
};

/**
 * Magento usa `processing` tanto para "pago" quanto para "faturado" e
 * "parcialmente enviado" — a distinção vem das invoices e shipments.
 */
export function normalizeMagentoStatus(order: Pick<MagentoOrder, 'status' | 'extension_attributes'>): OrderStatus {
  if (order.status === 'processing') {
    if (order.extension_attributes.shipments?.length) return 'shipped';
    if (order.extension_attributes.invoices?.length) return 'invoiced';
  }
  return STATUS_MAP[order.status] ?? 'pending';
}

const HISTORY_ENTITY_STATUS: Partial<Record<MagentoOrder['status_histories'][number]['entity_name'], OrderStatus>> = {
  invoice: 'invoiced',
  shipment: 'shipped',
};

/** Magento grava datas em UTC no formato `YYYY-MM-DD HH:mm:ss`, sem sufixo de fuso. */
const magentoDateToIso = (value: string) => new Date(`${value.replace(' ', 'T')}Z`).toISOString();

type MagentoEnvelope = Extract<RawOrderEnvelope, { channel: 'magento' }>;

export function mapMagentoOrder(envelope: MagentoEnvelope): Order {
  const raw = envelope.payload;
  const shipping = raw.extension_attributes.shipping_assignments[0]?.shipping;
  const track = raw.extension_attributes.shipments?.[0]?.tracks[0];
  const address = shipping?.address;

  return {
    id: envelope.id,
    channel: 'magento',
    channelOrderId: raw.increment_id,
    status: normalizeMagentoStatus(raw),
    rawStatus: raw.status,
    customer: {
      name: `${raw.customer_firstname} ${raw.customer_lastname}`.trim(),
      email: raw.customer_email,
      document: raw.customer_taxvat,
      phone: address?.telephone,
    },
    items: raw.items.map((item) => ({
      sku: item.sku,
      name: item.name,
      quantity: item.qty_ordered,
      unitPrice: toCents(item.price),
      total: toCents(item.row_total),
    })),
    totals: {
      products: toCents(raw.subtotal),
      shipping: toCents(raw.shipping_amount),
      discount: Math.abs(toCents(raw.discount_amount)),
      total: toCents(raw.grand_total),
    },
    delivery: {
      receiver: address ? `${address.firstname} ${address.lastname}` : '',
      street: address?.street.join(', ') ?? '',
      city: address?.city ?? '',
      state: address?.region_code ?? '',
      postalCode: address?.postcode ?? '',
      carrier: track?.carrier_code ?? shipping?.method,
      trackingCode: track?.track_number,
    },
    placedAt: magentoDateToIso(raw.created_at),
    timeline: buildTimeline(
      raw.status_histories.map((h) => ({
        status: HISTORY_ENTITY_STATUS[h.entity_name] ?? STATUS_MAP[h.status] ?? 'pending',
        at: magentoDateToIso(h.created_at),
        source: h.entity_name === 'order' ? h.status : h.entity_name,
      })),
    ),
    integration: copyIntegration(envelope.integration),
  };
}

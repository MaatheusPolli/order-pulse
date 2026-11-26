import type { Order, OrderStatus } from '../types';
import type { RawOrderEnvelope, VtexOrder, VtexStatus } from './raw.types';
import { buildTimeline, copyIntegration } from './shared';

const STATUS_MAP: Record<VtexStatus, OrderStatus> = {
  'order-created': 'pending',
  'payment-pending': 'pending',
  'payment-approved': 'paid',
  'ready-for-handling': 'paid',
  handling: 'paid',
  invoiced: 'invoiced',
  'cancellation-requested': 'canceled',
  canceled: 'canceled',
};

/**
 * Na VTEX o status do OMS para em `invoiced`; envio e entrega vêm do
 * `courierStatus` do pacote (tracking da transportadora).
 */
export function normalizeVtexStatus(order: Pick<VtexOrder, 'status' | 'packageAttachment'>): OrderStatus {
  const base = STATUS_MAP[order.status] ?? 'pending';
  if (base !== 'invoiced') return base;
  const courier = order.packageAttachment.packages[0]?.courierStatus;
  if (courier?.status === 'delivered' || courier?.finished) return 'delivered';
  if (courier?.status === 'shipped') return 'shipped';
  return 'invoiced';
}

type VtexEnvelope = Extract<RawOrderEnvelope, { channel: 'vtex' }>;

export function mapVtexOrder(envelope: VtexEnvelope): Order {
  const raw = envelope.payload;
  const total = (id: string) => raw.totals.find((t) => t.id === id)?.value ?? 0;
  const pkg = raw.packageAttachment.packages[0];
  const address = raw.shippingData.address;
  const logistics = raw.shippingData.logisticsInfo[0];

  return {
    id: envelope.id,
    channel: 'vtex',
    channelOrderId: raw.orderId,
    status: normalizeVtexStatus(raw),
    rawStatus: raw.status,
    customer: {
      name: `${raw.clientProfileData.firstName} ${raw.clientProfileData.lastName}`.trim(),
      email: raw.clientProfileData.email,
      document: raw.clientProfileData.document,
      phone: raw.clientProfileData.phone,
    },
    items: raw.items.map((item) => ({
      sku: item.refId,
      name: item.name,
      quantity: item.quantity,
      unitPrice: item.sellingPrice,
      total: item.sellingPrice * item.quantity,
    })),
    totals: {
      products: total('Items'),
      shipping: total('Shipping'),
      discount: Math.abs(total('Discounts')),
      total: raw.value,
    },
    delivery: {
      receiver: address.receiverName,
      street: `${address.street}, ${address.number} - ${address.neighborhood}`,
      city: address.city,
      state: address.state,
      postalCode: address.postalCode,
      carrier: pkg?.courier ?? logistics?.selectedSla,
      trackingCode: pkg?.trackingNumber ?? undefined,
      estimatedAt: logistics?.shippingEstimateDate,
    },
    placedAt: new Date(raw.creationDate).toISOString(),
    timeline: buildTimeline([
      ...raw.statusHistory.map((h) => ({ status: STATUS_MAP[h.status] ?? 'pending', at: h.date, source: h.status })),
      { status: 'invoiced', at: pkg?.issuanceDate, source: 'invoice' },
      { status: 'shipped', at: pkg?.courierStatus?.shippedDate, source: 'courierStatus' },
      { status: 'delivered', at: pkg?.courierStatus?.deliveredDate, source: 'courierStatus' },
    ]),
    integration: copyIntegration(envelope.integration),
  };
}

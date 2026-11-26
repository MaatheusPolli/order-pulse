import type { Order, OrderStatus } from '../types';
import type { RawOrderEnvelope, TrayStatus } from './raw.types';
import { brLocalToIso, buildTimeline, copyIntegration, toCents } from './shared';

const STATUS_MAP: Record<TrayStatus, OrderStatus> = {
  'AGUARDANDO PAGAMENTO': 'pending',
  'PAGAMENTO APROVADO': 'paid',
  'EM SEPARAÇÃO': 'paid',
  'NOTA FISCAL EMITIDA': 'invoiced',
  'A ENVIAR': 'invoiced',
  ENVIADO: 'shipped',
  ENTREGUE: 'delivered',
  FINALIZADO: 'delivered',
  CANCELADO: 'canceled',
  'CANCELADO AUT': 'canceled',
};

/** Tray permite status customizados pelo lojista; os desconhecidos caem em `pending`. */
export function normalizeTrayStatus(status: string): OrderStatus {
  return STATUS_MAP[status.trim().toUpperCase() as TrayStatus] ?? 'pending';
}

type TrayEnvelope = Extract<RawOrderEnvelope, { channel: 'tray' }>;

export function mapTrayOrder(envelope: TrayEnvelope): Order {
  const raw = envelope.payload.Order;
  const address = raw.Customer.CustomerAddresses[0]?.CustomerAddress;

  return {
    id: envelope.id,
    channel: 'tray',
    channelOrderId: raw.id,
    status: normalizeTrayStatus(raw.status),
    rawStatus: raw.status,
    customer: {
      name: raw.Customer.name,
      email: raw.Customer.email,
      document: raw.Customer.cpf,
      phone: raw.Customer.cellphone,
    },
    items: raw.ProductsSold.map(({ ProductsSold: item }) => {
      const quantity = Number.parseInt(item.quantity, 10);
      const unitPrice = toCents(item.price);
      return { sku: item.reference, name: item.name, quantity, unitPrice, total: unitPrice * quantity };
    }),
    totals: {
      products: toCents(raw.partial_total),
      shipping: toCents(raw.shipment_value),
      discount: toCents(raw.discount),
      total: toCents(raw.total),
    },
    delivery: {
      receiver: address?.recipient ?? raw.Customer.name,
      street: address ? `${address.address}, ${address.number} - ${address.neighborhood}` : '',
      city: address?.city ?? '',
      state: address?.state ?? '',
      postalCode: address?.zip_code ?? '',
      carrier: raw.shipment || undefined,
      trackingCode: raw.sending_code || undefined,
      estimatedAt: raw.estimated_delivery_date ? brLocalToIso(raw.estimated_delivery_date) : undefined,
    },
    placedAt: brLocalToIso(raw.date, raw.hour),
    timeline: buildTimeline(
      raw.OrderStatusHistory.map((h) => ({
        status: normalizeTrayStatus(h.status),
        at: brLocalToIso(h.date, h.hour),
        source: h.status,
      })),
    ),
    integration: copyIntegration(envelope.integration),
  };
}

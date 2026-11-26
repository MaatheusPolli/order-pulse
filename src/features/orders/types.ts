/**
 * Modelo interno de pedido. A UI só conhece estes tipos — o formato de cada
 * marketplace fica confinado em `mappers/`.
 *
 * Valores monetários são inteiros em centavos para evitar erros de ponto flutuante.
 */
export const CHANNELS = ['vtex', 'mercadolivre', 'magento', 'tray'] as const;
export type Channel = (typeof CHANNELS)[number];

export const ORDER_STATUSES = ['pending', 'paid', 'invoiced', 'shipped', 'delivered', 'canceled'] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export interface Customer {
  name: string;
  email: string;
  document: string;
  phone?: string;
}

export interface OrderItem {
  sku: string;
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface OrderTotals {
  products: number;
  shipping: number;
  discount: number;
  total: number;
}

export interface Delivery {
  receiver: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  carrier?: string;
  trackingCode?: string;
  estimatedAt?: string;
}

export interface OrderEvent {
  status: OrderStatus;
  at: string;
  description: string;
}

export interface IntegrationError {
  code: string;
  message: string;
  occurredAt: string;
  attempts: number;
  retryable: boolean;
}

export interface IntegrationState {
  synced: boolean;
  error?: IntegrationError;
}

export interface Order {
  id: string;
  channel: Channel;
  channelOrderId: string;
  status: OrderStatus;
  /** Status original do marketplace, preservado para auditoria. */
  rawStatus: string;
  customer: Customer;
  items: OrderItem[];
  totals: OrderTotals;
  delivery: Delivery;
  placedAt: string;
  timeline: OrderEvent[];
  integration: IntegrationState;
}

export const CHANNEL_LABELS: Record<Channel, string> = {
  vtex: 'VTEX',
  mercadolivre: 'Mercado Livre',
  magento: 'Magento',
  tray: 'Tray',
};

export const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Pendente',
  paid: 'Pago',
  invoiced: 'Faturado',
  shipped: 'Enviado',
  delivered: 'Entregue',
  canceled: 'Cancelado',
};

export const isChannel = (value: string): value is Channel => (CHANNELS as readonly string[]).includes(value);
export const isOrderStatus = (value: string): value is OrderStatus =>
  (ORDER_STATUSES as readonly string[]).includes(value);

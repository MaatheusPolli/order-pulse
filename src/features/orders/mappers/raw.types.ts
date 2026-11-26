/**
 * Formatos brutos (simplificados, mas fiéis à nomenclatura) de cada marketplace.
 * Nada fora de `mappers/` e do mock server deve importar estes tipos.
 */

// ---------------------------------------------------------------- VTEX (OMS)
export type VtexStatus =
  | 'order-created'
  | 'payment-pending'
  | 'payment-approved'
  | 'ready-for-handling'
  | 'handling'
  | 'invoiced'
  | 'cancellation-requested'
  | 'canceled';

export interface VtexOrder {
  orderId: string;
  sequence: string;
  status: VtexStatus;
  statusDescription: string;
  creationDate: string;
  /** Centavos */
  value: number;
  totals: { id: 'Items' | 'Discounts' | 'Shipping' | 'Tax'; name: string; value: number }[];
  items: {
    id: string;
    refId: string;
    name: string;
    quantity: number;
    /** Centavos */
    sellingPrice: number;
  }[];
  clientProfileData: {
    email: string;
    firstName: string;
    lastName: string;
    document: string;
    phone: string;
  };
  shippingData: {
    address: {
      receiverName: string;
      postalCode: string;
      city: string;
      state: string;
      street: string;
      number: string;
      neighborhood: string;
    };
    logisticsInfo: { selectedSla: string; shippingEstimateDate: string }[];
  };
  packageAttachment: {
    packages: {
      invoiceNumber: string;
      issuanceDate: string;
      trackingNumber: string | null;
      courier: string | null;
      courierStatus: {
        status: 'shipped' | 'delivered';
        finished: boolean;
        shippedDate: string;
        deliveredDate: string | null;
      } | null;
    }[];
  };
  statusHistory: { status: VtexStatus; date: string }[];
}

// ------------------------------------------------------------- Mercado Livre
export type MeliOrderStatus = 'confirmed' | 'payment_required' | 'payment_in_process' | 'paid' | 'cancelled';
export type MeliShippingStatus = 'pending' | 'handling' | 'ready_to_ship' | 'shipped' | 'delivered' | 'cancelled';

export interface MeliOrder {
  id: number;
  status: MeliOrderStatus;
  date_created: string;
  date_closed: string | null;
  total_amount: number;
  paid_amount: number;
  currency_id: 'BRL';
  coupon: { id: string | null; amount: number };
  order_items: {
    item: { id: string; title: string; seller_sku: string };
    quantity: number;
    unit_price: number;
  }[];
  buyer: {
    id: number;
    nickname: string;
    first_name: string;
    last_name: string;
    email: string;
    billing_info: { doc_type: 'CPF' | 'CNPJ'; doc_number: string };
  };
  shipping: {
    id: number;
    status: MeliShippingStatus;
    substatus: string | null;
    logistic_type: 'fulfillment' | 'cross_docking' | 'drop_off';
    tracking_number: string | null;
    tracking_method: string | null;
    cost: number;
    estimated_delivery_time: { date: string };
    receiver_address: {
      receiver_name: string;
      address_line: string;
      zip_code: string;
      city: { name: string };
      state: { id: string; name: string };
    };
    status_history: {
      date_handling: string | null;
      date_ready_to_ship: string | null;
      date_shipped: string | null;
      date_delivered: string | null;
      date_cancelled: string | null;
    };
  };
  invoice: { number: string; date: string } | null;
}

// ------------------------------------------------------------ Magento 2 REST
export type MagentoStatus =
  | 'pending'
  | 'pending_payment'
  | 'holded'
  | 'processing'
  | 'complete'
  | 'delivered'
  | 'canceled'
  | 'closed';

export interface MagentoOrder {
  entity_id: number;
  increment_id: string;
  state: 'new' | 'pending_payment' | 'holded' | 'processing' | 'complete' | 'canceled' | 'closed';
  status: MagentoStatus;
  created_at: string;
  base_currency_code: 'BRL';
  subtotal: number;
  shipping_amount: number;
  discount_amount: number;
  grand_total: number;
  customer_email: string;
  customer_firstname: string;
  customer_lastname: string;
  customer_taxvat: string;
  items: { sku: string; name: string; qty_ordered: number; price: number; row_total: number }[];
  extension_attributes: {
    shipping_assignments: {
      shipping: {
        method: string;
        address: {
          firstname: string;
          lastname: string;
          street: string[];
          city: string;
          region_code: string;
          postcode: string;
          telephone: string;
        };
      };
    }[];
    invoices?: { increment_id: string; created_at: string }[];
    shipments?: { increment_id: string; created_at: string; tracks: { carrier_code: string; track_number: string }[] }[];
  };
  status_histories: { comment: string | null; created_at: string; status: MagentoStatus; entity_name: 'order' | 'invoice' | 'shipment' }[];
}

// -------------------------------------------------------------------- Tray
export type TrayStatus =
  | 'AGUARDANDO PAGAMENTO'
  | 'PAGAMENTO APROVADO'
  | 'EM SEPARAÇÃO'
  | 'NOTA FISCAL EMITIDA'
  | 'A ENVIAR'
  | 'ENVIADO'
  | 'ENTREGUE'
  | 'FINALIZADO'
  | 'CANCELADO'
  | 'CANCELADO AUT';

/** A API da Tray devolve números como string e data/hora em campos separados. */
export interface TrayOrder {
  Order: {
    id: string;
    status: TrayStatus;
    date: string;
    hour: string;
    partial_total: string;
    shipment_value: string;
    discount: string;
    total: string;
    shipment: string;
    sending_code: string;
    estimated_delivery_date: string;
    Customer: {
      name: string;
      email: string;
      cpf: string;
      cellphone: string;
      CustomerAddresses: {
        CustomerAddress: { recipient: string; address: string; number: string; neighborhood: string; city: string; state: string; zip_code: string };
      }[];
    };
    ProductsSold: { ProductsSold: { reference: string; name: string; quantity: string; price: string } }[];
    OrderStatusHistory: { status: TrayStatus; date: string; hour: string }[];
  };
}

// --------------------------------------------------------------- Envelope
export type RawPayload = VtexOrder | MeliOrder | MagentoOrder | TrayOrder;

interface IntegrationErrorDTO {
  code: string;
  message: string;
  occurredAt: string;
  attempts: number;
  retryable: boolean;
}

interface EnvelopeBase {
  /** Id interno do hub de integração. */
  id: string;
  receivedAt: string;
  integration: { synced: boolean; error?: IntegrationErrorDTO };
}

export type RawOrderEnvelope =
  | (EnvelopeBase & { channel: 'vtex'; payload: VtexOrder })
  | (EnvelopeBase & { channel: 'mercadolivre'; payload: MeliOrder })
  | (EnvelopeBase & { channel: 'magento'; payload: MagentoOrder })
  | (EnvelopeBase & { channel: 'tray'; payload: TrayOrder });

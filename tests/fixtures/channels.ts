import type { MagentoOrder, MeliOrder, RawOrderEnvelope, TrayOrder, VtexOrder } from '@/features/orders/mappers/raw.types';

/**
 * Fixtures no formato real de cada marketplace (dados anonimizados). Cada uma
 * representa um pedido "enviado", mas cada canal expressa isso de um jeito.
 */
const synced = { synced: true } as const;

export const vtexOrder: VtexOrder = {
  orderId: '1438960510281-01',
  sequence: '502819',
  status: 'invoiced',
  statusDescription: 'Faturado',
  creationDate: '2026-09-20T13:05:10.000Z',
  value: 25_870,
  totals: [
    { id: 'Items', name: 'Total dos Itens', value: 26_980 },
    { id: 'Discounts', name: 'Total dos Descontos', value: -2_698 },
    { id: 'Shipping', name: 'Total do Frete', value: 1_588 },
    { id: 'Tax', name: 'Total da Taxa', value: 0 },
  ],
  items: [
    { id: '1', refId: 'TEN-0042-P', name: 'Tênis de Corrida Pulse 42', quantity: 1, sellingPrice: 19_990 },
    { id: '2', refId: 'MEI-0001', name: 'Meia Esportiva (par)', quantity: 2, sellingPrice: 3_495 },
  ],
  clientProfileData: {
    email: 'cliente.a@example.com',
    firstName: 'Cliente',
    lastName: 'Alfa',
    document: '52998224725',
    phone: '+5511999990000',
  },
  shippingData: {
    address: {
      receiverName: 'Cliente Alfa',
      postalCode: '01310-100',
      city: 'São Paulo',
      state: 'SP',
      street: 'Avenida Paulista',
      number: '1000',
      neighborhood: 'Bela Vista',
    },
    logisticsInfo: [{ selectedSla: 'Normal', shippingEstimateDate: '2026-09-27T13:05:10.000Z' }],
  },
  packageAttachment: {
    packages: [
      {
        invoiceNumber: '000123',
        issuanceDate: '2026-09-21T10:00:00.000Z',
        trackingNumber: 'QB123456789BR',
        courier: 'Correios SEDEX',
        courierStatus: { status: 'shipped', finished: false, shippedDate: '2026-09-21T18:00:00.000Z', deliveredDate: null },
      },
    ],
  },
  statusHistory: [
    { status: 'order-created', date: '2026-09-20T13:05:10.000Z' },
    { status: 'payment-pending', date: '2026-09-20T13:05:40.000Z' },
    { status: 'payment-approved', date: '2026-09-20T13:30:00.000Z' },
    { status: 'ready-for-handling', date: '2026-09-20T13:40:00.000Z' },
    { status: 'handling', date: '2026-09-20T14:10:00.000Z' },
    { status: 'invoiced', date: '2026-09-21T10:00:00.000Z' },
  ],
};

export const meliOrder: MeliOrder = {
  id: 2_000_009_876_543,
  status: 'paid',
  date_created: '2026-09-20T13:05:10.000-04:00',
  date_closed: '2026-09-20T13:06:00.000-04:00',
  total_amount: 149.9,
  paid_amount: 171.8,
  currency_id: 'BRL',
  coupon: { id: null, amount: 0 },
  order_items: [{ item: { id: 'MLB3000000042', title: 'Fone Bluetooth Wave', seller_sku: 'FON-WAVE-PT' }, quantity: 1, unit_price: 149.9 }],
  buyer: {
    id: 123456,
    nickname: 'CLIENTEBETA',
    first_name: 'Cliente',
    last_name: 'Beta',
    email: 'cliente.b@example.com',
    billing_info: { doc_type: 'CPF', doc_number: '11144477735' },
  },
  shipping: {
    id: 43_000_000_001,
    status: 'shipped',
    substatus: null,
    logistic_type: 'drop_off',
    tracking_number: 'MEL1234567890',
    tracking_method: 'Mercado Envios',
    cost: 21.9,
    estimated_delivery_time: { date: '2026-09-25T00:00:00.000-03:00' },
    receiver_address: {
      receiver_name: 'Cliente Beta',
      address_line: 'Rua das Flores 100',
      zip_code: '80010000',
      city: { name: 'Curitiba' },
      state: { id: 'BR-PR', name: 'Paraná' },
    },
    status_history: {
      date_handling: '2026-09-20T13:06:00.000-04:00',
      date_ready_to_ship: '2026-09-21T09:00:00.000-04:00',
      date_shipped: '2026-09-21T15:00:00.000-04:00',
      date_delivered: null,
      date_cancelled: null,
    },
  },
  invoice: { number: '4567', date: '2026-09-21T08:30:00.000-04:00' },
};

export const magentoOrder: MagentoOrder = {
  entity_id: 991,
  increment_id: '000000991',
  state: 'processing',
  status: 'processing',
  created_at: '2026-09-20 13:05:10',
  base_currency_code: 'BRL',
  subtotal: 399.8,
  shipping_amount: 0,
  discount_amount: -39.98,
  grand_total: 359.82,
  customer_email: 'cliente.c@example.com',
  customer_firstname: 'Cliente',
  customer_lastname: 'Gama',
  customer_taxvat: '39053344705',
  items: [{ sku: 'MOC-URB-22', name: 'Mochila Urbana 22L', qty_ordered: 2, price: 199.9, row_total: 399.8 }],
  extension_attributes: {
    shipping_assignments: [
      {
        shipping: {
          method: 'jadlog_package',
          address: {
            firstname: 'Cliente',
            lastname: 'Gama',
            street: ['Rua XV de Novembro, 50', 'Centro'],
            city: 'Joinville',
            region_code: 'SC',
            postcode: '89201-000',
            telephone: '(47) 99999-0000',
          },
        },
      },
    ],
    invoices: [{ increment_id: '000000501', created_at: '2026-09-21 10:00:00' }],
    shipments: [{ increment_id: '000000301', created_at: '2026-09-21 18:00:00', tracks: [{ carrier_code: 'Jadlog', track_number: 'JD000111222' }] }],
  },
  status_histories: [
    { comment: 'Rastreio JD000111222.', created_at: '2026-09-21 18:00:00', status: 'processing', entity_name: 'shipment' },
    { comment: 'Fatura criada.', created_at: '2026-09-21 10:00:00', status: 'processing', entity_name: 'invoice' },
    { comment: 'Pagamento capturado.', created_at: '2026-09-20 13:30:00', status: 'processing', entity_name: 'order' },
    { comment: null, created_at: '2026-09-20 13:05:10', status: 'pending', entity_name: 'order' },
  ],
};

export const trayOrder: TrayOrder = {
  Order: {
    id: '81234',
    status: 'ENVIADO',
    date: '2026-09-20',
    hour: '10:05:10',
    partial_total: '89.90',
    shipment_value: '15.00',
    discount: '0.00',
    total: '104.90',
    shipment: 'Correios PAC',
    sending_code: 'PX987654321BR',
    estimated_delivery_date: '2026-09-30',
    Customer: {
      name: 'Cliente Delta',
      email: 'cliente.d@example.com',
      cpf: '86288366757',
      cellphone: '(11) 98888-7777',
      CustomerAddresses: [
        {
          CustomerAddress: {
            recipient: 'Cliente Delta',
            address: 'Rua Tiradentes',
            number: '77',
            neighborhood: 'Centro',
            city: 'Campinas',
            state: 'SP',
            zip_code: '13010-000',
          },
        },
      ],
    },
    ProductsSold: [{ ProductsSold: { reference: 'GAR-750', name: 'Garrafa Térmica 750ml', quantity: '1', price: '89.90' } }],
    OrderStatusHistory: [
      { status: 'AGUARDANDO PAGAMENTO', date: '2026-09-20', hour: '10:05:10' },
      { status: 'PAGAMENTO APROVADO', date: '2026-09-20', hour: '10:20:00' },
      { status: 'EM SEPARAÇÃO', date: '2026-09-20', hour: '14:00:00' },
      { status: 'NOTA FISCAL EMITIDA', date: '2026-09-21', hour: '09:00:00' },
      { status: 'ENVIADO', date: '2026-09-21', hour: '16:00:00' },
    ],
  },
};

export const envelopes = {
  vtex: { id: 'OP-000001', channel: 'vtex', receivedAt: '2026-09-20T13:05:30.000Z', integration: synced, payload: vtexOrder },
  mercadolivre: { id: 'OP-000002', channel: 'mercadolivre', receivedAt: '2026-09-20T17:05:30.000Z', integration: synced, payload: meliOrder },
  magento: { id: 'OP-000003', channel: 'magento', receivedAt: '2026-09-20T13:05:30.000Z', integration: synced, payload: magentoOrder },
  tray: {
    id: 'OP-000004',
    channel: 'tray',
    receivedAt: '2026-09-20T13:05:30.000Z',
    integration: {
      synced: false,
      error: { code: 'ERP_TIMEOUT', message: 'Timeout', occurredAt: '2026-09-20T13:10:00.000Z', attempts: 2, retryable: true },
    },
    payload: trayOrder,
  },
} satisfies Record<string, RawOrderEnvelope>;

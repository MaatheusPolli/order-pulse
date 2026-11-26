import { Faker, base } from '@faker-js/faker';
import type {
  MagentoOrder,
  MagentoStatus,
  MeliOrder,
  MeliShippingStatus,
  RawOrderEnvelope,
  TrayOrder,
  TrayStatus,
  VtexOrder,
  VtexStatus,
} from '../../../src/features/orders/mappers/raw.types';
import type { Channel } from '../../../src/features/orders/types';

/**
 * Gera pedidos no formato bruto de cada marketplace. Seed e data de referência
 * fixas: os mesmos dados em toda execução (prints do README, testes e E2E).
 */
// Só o locale `base` (números, strings, helpers): mantém o chunk da demo leve.
// Nomes e endereços vêm de listas curadas abaixo.
const faker = new Faker({ locale: [base] });

export const SEED = 20260930;
export const REFERENCE_DATE = new Date('2026-09-30T18:00:00.000Z');
export const DEFAULT_ORDER_COUNT = 1500;
const HISTORY_DAYS = 90;

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

type Stage = 'pending' | 'paid' | 'invoiced' | 'shipped' | 'delivered';

interface Product {
  sku: string;
  name: string;
  price: number;
}

interface OrderSpec {
  seq: number;
  channel: Channel;
  customer: { firstName: string; lastName: string; email: string; document: string; phone: string };
  address: { receiver: string; street: string; number: string; neighborhood: string; city: string; state: string; zip: string };
  items: { product: Product; quantity: number }[];
  products: number;
  shipping: number;
  discount: number;
  total: number;
  carrier: string;
  tracking: string;
  invoiceNumber: string;
  placedAt: Date;
  estimatedAt: Date;
  paidAt?: Date;
  invoicedAt?: Date;
  shippedAt?: Date;
  deliveredAt?: Date;
  canceledAt?: Date;
  stage: Stage;
}

const CHANNEL_WEIGHTS: { value: Channel; weight: number }[] = [
  { value: 'mercadolivre', weight: 38 },
  { value: 'vtex', weight: 27 },
  { value: 'magento', weight: 18 },
  { value: 'tray', weight: 17 },
];

/** Taxa de falha de integração por canal — Tray e Magento têm payloads mais "criativos". */
const FAILURE_RATE: Record<Channel, number> = { vtex: 0.03, mercadolivre: 0.05, magento: 0.08, tray: 0.1 };

const ERROR_CATALOG = [
  { code: 'ERP_TIMEOUT', message: 'Timeout ao enviar pedido ao ERP (30s sem resposta).', retryable: true },
  { code: 'RATE_LIMITED', message: 'ERP recusou a requisição por limite de taxa (HTTP 429).', retryable: true },
  { code: 'PRICE_MISMATCH', message: 'Divergência entre o preço do marketplace e a tabela do ERP.', retryable: true },
  { code: 'SKU_NOT_FOUND', message: 'SKU {sku} não cadastrado no ERP.', retryable: false },
  { code: 'INVALID_DOCUMENT', message: 'CPF/CNPJ do cliente rejeitado pela validação fiscal.', retryable: false },
  { code: 'MISSING_ADDRESS_NUMBER', message: 'Endereço de entrega sem número; campo obrigatório no ERP.', retryable: false },
] as const;

const CARRIERS = ['Correios SEDEX', 'Correios PAC', 'Jadlog', 'Loggi', 'Total Express'];

// Listas curadas: os geradores pt_BR do faker produzem nomes de produto e cidade pouco verossímeis.
const PRODUCTS = [
  'Tênis de Corrida Pulse', 'Fone Bluetooth Wave', 'Garrafa Térmica 750ml', 'Mochila Urbana 22L', 'Camiseta Dry Fit',
  'Smartwatch Fit Pro', 'Cafeteira Italiana 6 Xícaras', 'Luminária de Mesa LED', 'Mouse Sem Fio Ergo', 'Teclado Mecânico TKL',
  'Kit Panelas Antiaderente', 'Jogo de Toalhas Algodão', 'Caixa de Som Portátil', 'Carregador Turbo USB-C', 'Capa Protetora Slim',
  'Air Fryer 4L', 'Liquidificador Power 900W', 'Tapete de Yoga', 'Halter Emborrachado 5kg', 'Óculos de Sol Polarizado',
  'Perfume Amadeirado 100ml', 'Hidratante Corporal 400ml', 'Cadeira Gamer Reclinável', 'Suporte para Notebook', 'Webcam Full HD',
  'Bolsa Transversal Couro', 'Relógio Analógico Aço', 'Jaqueta Corta-Vento', 'Calça Jogger', 'Boné Aba Curva',
];
const VARIANTS = ['Preto', 'Branco', 'Azul', 'Grafite', 'Verde', 'Vermelho'];
const CITIES: [string, string][] = [
  ['São Paulo', 'SP'], ['Campinas', 'SP'], ['Rio de Janeiro', 'RJ'], ['Niterói', 'RJ'], ['Belo Horizonte', 'MG'],
  ['Uberlândia', 'MG'], ['Curitiba', 'PR'], ['Londrina', 'PR'], ['Porto Alegre', 'RS'], ['Caxias do Sul', 'RS'],
  ['Florianópolis', 'SC'], ['Joinville', 'SC'], ['Salvador', 'BA'], ['Recife', 'PE'], ['Fortaleza', 'CE'],
  ['Goiânia', 'GO'], ['Brasília', 'DF'], ['Manaus', 'AM'], ['Belém', 'PA'], ['Vitória', 'ES'],
];
const FIRST_NAMES = [
  'Ana', 'Beatriz', 'Camila', 'Daniela', 'Fernanda', 'Gabriela', 'Helena', 'Isabela', 'Juliana', 'Larissa', 'Mariana',
  'Patrícia', 'Renata', 'Sofia', 'Vanessa', 'André', 'Bruno', 'Carlos', 'Diego', 'Eduardo', 'Felipe', 'Gustavo',
  'Henrique', 'Igor', 'João', 'Lucas', 'Marcelo', 'Paulo', 'Rafael', 'Rodrigo', 'Thiago', 'Vinícius',
];
const LAST_NAMES = [
  'Silva', 'Santos', 'Oliveira', 'Souza', 'Rodrigues', 'Ferreira', 'Alves', 'Pereira', 'Lima', 'Gomes', 'Costa',
  'Ribeiro', 'Martins', 'Carvalho', 'Almeida', 'Lopes', 'Soares', 'Fernandes', 'Vieira', 'Barbosa', 'Rocha', 'Dias',
  'Nascimento', 'Andrade', 'Moreira', 'Nunes', 'Marques', 'Machado', 'Mendes', 'Freitas',
];
const STREETS = [
  'Rua das Flores', 'Avenida Brasil', 'Rua XV de Novembro', 'Rua São João', 'Avenida Paulista', 'Rua Sete de Setembro',
  'Rua Tiradentes', 'Avenida Getúlio Vargas', 'Rua Dom Pedro II', 'Rua Marechal Deodoro', 'Rua da Paz', 'Alameda Santos',
];
const EMAIL_PROVIDERS = ['gmail.com', 'hotmail.com', 'outlook.com', 'uol.com.br', 'yahoo.com.br'];

const slug = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const NEIGHBORHOODS = ['Centro', 'Jardim América', 'Vila Nova', 'Boa Vista', 'Santa Mônica', 'Bela Vista', 'Jardim Paulista', 'São José', 'Vila Mariana', 'Alto da Glória'];

const addMs = (date: Date, ms: number) => new Date(date.getTime() + ms);
const between = (min: number, max: number) => faker.number.int({ min: Math.round(min), max: Math.round(max) });
const reais = (cents: number) => Math.round(cents) / 100;

function cpf(): string {
  const digits = Array.from({ length: 9 }, () => faker.number.int(9));
  for (const weightStart of [10, 11]) {
    const sum = digits.reduce((acc, digit, i) => acc + digit * (weightStart - i), 0);
    const rest = (sum * 10) % 11;
    digits.push(rest === 10 ? 0 : rest);
  }
  return digits.join('');
}

function buildCatalog(): Product[] {
  return Array.from({ length: 80 }, (_, i) => ({
    sku: `SKU-${String(10_000 + i * 37).padStart(6, '0')}`,
    name: `${PRODUCTS[i % PRODUCTS.length]} ${VARIANTS[Math.floor(i / PRODUCTS.length) % VARIANTS.length]}`,
    price: faker.helpers.weightedArrayElement([
      { value: between(1_990, 9_990), weight: 5 },
      { value: between(9_990, 39_990), weight: 4 },
      { value: between(39_990, 129_990), weight: 1 },
    ]),
  }));
}

/** Menos pedidos no fim de semana e leve tendência de alta — gráfico com cara de dado real. */
function randomPlacedAt(): Date {
  for (;;) {
    const daysAgo = faker.number.float({ min: 0, max: HISTORY_DAYS });
    const date = new Date(REFERENCE_DATE.getTime() - daysAgo * DAY);
    const weekday = date.getUTCDay();
    const weekendFactor = weekday === 0 || weekday === 6 ? 0.55 : 1;
    const trend = 0.7 + 0.3 * (1 - daysAgo / HISTORY_DAYS);
    if (faker.number.float() < weekendFactor * trend) return date;
  }
}

function buildSpec(seq: number, catalog: Product[]): OrderSpec {
  const channel = faker.helpers.weightedArrayElement(CHANNEL_WEIGHTS);
  const firstName = faker.helpers.arrayElement(FIRST_NAMES);
  const lastName = faker.helpers.arrayElement(LAST_NAMES);
  const [city, state] = faker.helpers.arrayElement(CITIES);
  const items = faker.helpers
    .arrayElements(catalog, { min: 1, max: 4 })
    .map((product) => ({ product, quantity: faker.helpers.weightedArrayElement([{ value: 1, weight: 8 }, { value: 2, weight: 3 }, { value: 3, weight: 1 }]) }));
  const products = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const shipping = products >= 19_900 && faker.datatype.boolean(0.7) ? 0 : between(990, 4_990);
  const discount = faker.datatype.boolean(0.2) ? Math.round(products * faker.helpers.arrayElement([0.05, 0.1, 0.15])) : 0;

  const placedAt = randomPlacedAt();
  const canceled = faker.datatype.boolean(0.07);
  // Parte dos pedidos "empaca" numa etapa (ex.: aguardando faturamento) mesmo com idade suficiente.
  const stuckAt = faker.datatype.boolean(0.15) ? faker.helpers.arrayElement<Stage>(['pending', 'paid', 'invoiced', 'shipped']) : null;

  const spec: OrderSpec = {
    seq,
    channel,
    customer: {
      firstName,
      lastName,
      email: `${slug(firstName)}${faker.helpers.arrayElement(['.', '_', ''])}${slug(lastName)}${faker.helpers.maybe(() => faker.number.int(99), { probability: 0.4 }) ?? ''}@${faker.helpers.arrayElement(EMAIL_PROVIDERS)}`,
      document: cpf(),
      phone: faker.helpers.replaceSymbols('(##) 9####-####'),
    },
    address: {
      receiver: `${firstName} ${lastName}`,
      street: faker.helpers.arrayElement(STREETS),
      number: String(faker.number.int({ min: 1, max: 3999 })),
      neighborhood: faker.helpers.arrayElement(NEIGHBORHOODS),
      city,
      state,
      zip: faker.helpers.replaceSymbols('#####-###'),
    },
    items,
    products,
    shipping,
    discount,
    total: products - discount + shipping,
    carrier: channel === 'mercadolivre' ? 'Mercado Envios' : faker.helpers.arrayElement(CARRIERS),
    tracking: `${faker.string.alpha({ length: 2, casing: 'upper' })}${faker.string.numeric(9)}BR`,
    invoiceNumber: faker.string.numeric(6),
    placedAt,
    estimatedAt: addMs(placedAt, between(3, 12) * DAY),
    stage: 'pending',
  };

  const steps: [Stage, number, number][] = [
    // Boleto/Pix agendado compensa em até 3 dias; cartão aprova em minutos.
    faker.datatype.boolean(0.25) ? ['paid', 12 * HOUR, 72 * HOUR] : ['paid', 5 * MINUTE, 8 * HOUR],
    ['invoiced', 2 * HOUR, 30 * HOUR],
    ['shipped', 2 * HOUR, 26 * HOUR],
    ['delivered', 2 * DAY, 9 * DAY],
  ];
  let cursor = placedAt;
  let stuck = stuckAt === 'pending';
  for (const [stage, min, max] of steps) {
    if (stuck) break;
    const at = addMs(cursor, between(min, max));
    if (at > REFERENCE_DATE) break;
    if (stage === 'paid') spec.paidAt = at;
    if (stage === 'invoiced') spec.invoicedAt = at;
    if (stage === 'shipped') spec.shippedAt = at;
    if (stage === 'delivered') spec.deliveredAt = at;
    spec.stage = stage;
    cursor = at;
    stuck = stuckAt === stage;
  }

  // Pedido não pago há mais de 3 dias expira; alguns outros são cancelados antes do envio.
  const expired = spec.stage === 'pending' && REFERENCE_DATE.getTime() - placedAt.getTime() > 3 * DAY;
  if (expired || (canceled && (spec.stage === 'pending' || spec.stage === 'paid'))) {
    const canceledAt = addMs(cursor, between(30 * MINUTE, expired ? 3 * DAY : 20 * HOUR));
    if (canceledAt <= REFERENCE_DATE) spec.canceledAt = canceledAt;
  }

  return spec;
}

// ------------------------------------------------------------------ formatos

const iso = (date: Date) => date.toISOString();
/** Magento: `YYYY-MM-DD HH:mm:ss` em UTC */
const magentoDate = (date: Date) => date.toISOString().slice(0, 19).replace('T', ' ');
/** Tray: data e hora locais (UTC-3) separadas */
const trayDate = (date: Date) => {
  const local = new Date(date.getTime() - 3 * HOUR).toISOString();
  return { date: local.slice(0, 10), hour: local.slice(11, 19) };
};

function toVtex(spec: OrderSpec): VtexOrder {
  const history: { status: VtexStatus; date: Date }[] = [
    { status: 'order-created', date: spec.placedAt },
    { status: 'payment-pending', date: addMs(spec.placedAt, MINUTE) },
  ];
  if (spec.paidAt) {
    const limit = spec.invoicedAt ?? spec.canceledAt ?? REFERENCE_DATE;
    history.push({ status: 'payment-approved', date: spec.paidAt });
    for (const [status, offset] of [['ready-for-handling', 10 * MINUTE], ['handling', 45 * MINUTE]] as const) {
      const date = addMs(spec.paidAt, offset);
      if (date < limit) history.push({ status, date });
    }
  }
  if (spec.invoicedAt) history.push({ status: 'invoiced', date: spec.invoicedAt });
  if (spec.canceledAt) {
    history.push({ status: 'cancellation-requested', date: addMs(spec.canceledAt, -5 * MINUTE) });
    history.push({ status: 'canceled', date: spec.canceledAt });
  }
  const status = history.at(-1)!.status;

  return {
    orderId: `${1_500_000_000_000 + spec.seq * 7_919}-01`,
    sequence: String(500_000 + spec.seq),
    status,
    statusDescription: status,
    creationDate: iso(spec.placedAt),
    value: spec.total,
    totals: [
      { id: 'Items', name: 'Total dos Itens', value: spec.products },
      { id: 'Discounts', name: 'Total dos Descontos', value: -spec.discount },
      { id: 'Shipping', name: 'Total do Frete', value: spec.shipping },
      { id: 'Tax', name: 'Total da Taxa', value: 0 },
    ],
    items: spec.items.map(({ product, quantity }, i) => ({
      id: String(i + 1),
      refId: product.sku,
      name: product.name,
      quantity,
      sellingPrice: product.price,
    })),
    clientProfileData: {
      email: spec.customer.email,
      firstName: spec.customer.firstName,
      lastName: spec.customer.lastName,
      document: spec.customer.document,
      phone: spec.customer.phone,
    },
    shippingData: {
      address: {
        receiverName: spec.address.receiver,
        postalCode: spec.address.zip,
        city: spec.address.city,
        state: spec.address.state,
        street: spec.address.street,
        number: spec.address.number,
        neighborhood: spec.address.neighborhood,
      },
      logisticsInfo: [{ selectedSla: spec.carrier, shippingEstimateDate: iso(spec.estimatedAt) }],
    },
    packageAttachment: {
      packages: spec.invoicedAt
        ? [
            {
              invoiceNumber: spec.invoiceNumber,
              issuanceDate: iso(spec.invoicedAt),
              trackingNumber: spec.shippedAt ? spec.tracking : null,
              courier: spec.shippedAt ? spec.carrier : null,
              courierStatus: spec.shippedAt
                ? {
                    status: spec.deliveredAt ? 'delivered' : 'shipped',
                    finished: Boolean(spec.deliveredAt),
                    shippedDate: iso(spec.shippedAt),
                    deliveredDate: spec.deliveredAt ? iso(spec.deliveredAt) : null,
                  }
                : null,
            },
          ]
        : [],
    },
    statusHistory: history.map((h) => ({ status: h.status, date: iso(h.date) })),
  };
}

function toMeli(spec: OrderSpec): MeliOrder {
  const shippingStatus: MeliShippingStatus = spec.canceledAt
    ? 'cancelled'
    : ({ pending: 'pending', paid: 'handling', invoiced: 'ready_to_ship', shipped: 'shipped', delivered: 'delivered' } as const)[spec.stage];
  const paid = Boolean(spec.paidAt);
  const itemsTotal = spec.products - spec.discount;

  return {
    id: 2_000_008_000_000 + spec.seq * 104_729,
    status: spec.canceledAt ? 'cancelled' : paid ? 'paid' : faker.helpers.arrayElement(['payment_required', 'payment_in_process'] as const),
    date_created: iso(spec.placedAt),
    date_closed: spec.paidAt ? iso(spec.paidAt) : null,
    total_amount: reais(itemsTotal),
    paid_amount: paid ? reais(spec.total) : 0,
    currency_id: 'BRL',
    coupon: { id: spec.discount ? `CUPOM${faker.string.alphanumeric({ length: 5, casing: 'upper' })}` : null, amount: reais(spec.discount) },
    order_items: spec.items.map(({ product, quantity }) => ({
      item: { id: `MLB${3_000_000_000 + Number(product.sku.slice(4))}`, title: product.name, seller_sku: product.sku },
      quantity,
      unit_price: reais(product.price),
    })),
    buyer: {
      id: 100_000_000 + spec.seq * 31,
      nickname: `${spec.customer.firstName}${spec.customer.lastName}`.toUpperCase().normalize('NFD').replace(/[^A-Z]/g, '').slice(0, 14),
      first_name: spec.customer.firstName,
      last_name: spec.customer.lastName,
      email: spec.customer.email,
      billing_info: { doc_type: 'CPF', doc_number: spec.customer.document },
    },
    shipping: {
      id: 43_000_000_000 + spec.seq * 13,
      status: shippingStatus,
      substatus: shippingStatus === 'ready_to_ship' ? 'ready_to_print' : null,
      logistic_type: faker.helpers.arrayElement(['fulfillment', 'cross_docking', 'drop_off'] as const),
      tracking_number: spec.shippedAt ? spec.tracking : null,
      tracking_method: spec.shippedAt ? spec.carrier : null,
      cost: reais(spec.shipping),
      estimated_delivery_time: { date: iso(spec.estimatedAt) },
      receiver_address: {
        receiver_name: spec.address.receiver,
        address_line: `${spec.address.street} ${spec.address.number}`,
        zip_code: spec.address.zip.replace('-', ''),
        city: { name: spec.address.city },
        state: { id: `BR-${spec.address.state}`, name: spec.address.state },
      },
      status_history: {
        date_handling: spec.paidAt ? iso(spec.paidAt) : null,
        date_ready_to_ship: spec.invoicedAt ? iso(spec.invoicedAt) : null,
        date_shipped: spec.shippedAt ? iso(spec.shippedAt) : null,
        date_delivered: spec.deliveredAt ? iso(spec.deliveredAt) : null,
        date_cancelled: spec.canceledAt ? iso(spec.canceledAt) : null,
      },
    },
    invoice: spec.invoicedAt ? { number: spec.invoiceNumber, date: iso(spec.invoicedAt) } : null,
  };
}

function toMagento(spec: OrderSpec): MagentoOrder {
  const status: MagentoStatus = spec.canceledAt
    ? 'canceled'
    : ({
        pending: faker.helpers.arrayElement(['pending', 'pending_payment'] as const),
        paid: 'processing',
        invoiced: 'processing',
        shipped: 'complete',
        delivered: 'delivered',
      } as const)[spec.stage];
  const state: MagentoOrder['state'] =
    status === 'pending' ? 'new' : status === 'delivered' ? 'complete' : status;

  const histories: MagentoOrder['status_histories'] = [
    { comment: 'Pedido recebido pela loja.', created_at: magentoDate(spec.placedAt), status: 'pending', entity_name: 'order' },
  ];
  if (spec.paidAt) histories.push({ comment: 'Pagamento capturado.', created_at: magentoDate(spec.paidAt), status: 'processing', entity_name: 'order' });
  if (spec.invoicedAt) histories.push({ comment: `Fatura #${spec.invoiceNumber} criada.`, created_at: magentoDate(spec.invoicedAt), status: 'processing', entity_name: 'invoice' });
  if (spec.shippedAt) histories.push({ comment: `Rastreio ${spec.tracking}.`, created_at: magentoDate(spec.shippedAt), status: 'complete', entity_name: 'shipment' });
  if (spec.deliveredAt) histories.push({ comment: 'Entrega confirmada pela transportadora.', created_at: magentoDate(spec.deliveredAt), status: 'delivered', entity_name: 'order' });
  if (spec.canceledAt) histories.push({ comment: null, created_at: magentoDate(spec.canceledAt), status: 'canceled', entity_name: 'order' });

  return {
    entity_id: 10_000 + spec.seq,
    increment_id: String(100_000_000 + spec.seq).padStart(9, '0'),
    state,
    status,
    created_at: magentoDate(spec.placedAt),
    base_currency_code: 'BRL',
    subtotal: reais(spec.products),
    shipping_amount: reais(spec.shipping),
    discount_amount: -reais(spec.discount),
    grand_total: reais(spec.total),
    customer_email: spec.customer.email,
    customer_firstname: spec.customer.firstName,
    customer_lastname: spec.customer.lastName,
    customer_taxvat: spec.customer.document,
    items: spec.items.map(({ product, quantity }) => ({
      sku: product.sku,
      name: product.name,
      qty_ordered: quantity,
      price: reais(product.price),
      row_total: reais(product.price * quantity),
    })),
    extension_attributes: {
      shipping_assignments: [
        {
          shipping: {
            method: `${spec.carrier.toLowerCase().replace(/\s+/g, '_')}`,
            address: {
              firstname: spec.customer.firstName,
              lastname: spec.customer.lastName,
              street: [`${spec.address.street}, ${spec.address.number}`, spec.address.neighborhood],
              city: spec.address.city,
              region_code: spec.address.state,
              postcode: spec.address.zip,
              telephone: spec.customer.phone,
            },
          },
        },
      ],
      invoices: spec.invoicedAt ? [{ increment_id: spec.invoiceNumber, created_at: magentoDate(spec.invoicedAt) }] : [],
      shipments: spec.shippedAt
        ? [{ increment_id: spec.invoiceNumber, created_at: magentoDate(spec.shippedAt), tracks: [{ carrier_code: spec.carrier, track_number: spec.tracking }] }]
        : [],
    },
    // Magento devolve o histórico do mais recente para o mais antigo.
    status_histories: histories.reverse(),
  };
}

function toTray(spec: OrderSpec): TrayOrder {
  const history: { status: TrayStatus; at: Date }[] = [{ status: 'AGUARDANDO PAGAMENTO', at: spec.placedAt }];
  if (spec.paidAt) {
    history.push({ status: 'PAGAMENTO APROVADO', at: spec.paidAt });
    const picking = addMs(spec.paidAt, 2 * HOUR);
    if (picking < (spec.invoicedAt ?? spec.canceledAt ?? REFERENCE_DATE)) history.push({ status: 'EM SEPARAÇÃO', at: picking });
  }
  if (spec.invoicedAt) {
    history.push({ status: 'NOTA FISCAL EMITIDA', at: spec.invoicedAt });
    const ready = addMs(spec.invoicedAt, 30 * MINUTE);
    if (ready < (spec.shippedAt ?? REFERENCE_DATE)) history.push({ status: 'A ENVIAR', at: ready });
  }
  if (spec.shippedAt) history.push({ status: 'ENVIADO', at: spec.shippedAt });
  if (spec.deliveredAt) {
    history.push({ status: 'ENTREGUE', at: spec.deliveredAt });
    const closed = addMs(spec.deliveredAt, 7 * DAY);
    if (closed < REFERENCE_DATE) history.push({ status: 'FINALIZADO', at: closed });
  }
  if (spec.canceledAt) history.push({ status: spec.paidAt ? 'CANCELADO' : 'CANCELADO AUT', at: spec.canceledAt });

  const placed = trayDate(spec.placedAt);
  const address = spec.address;
  return {
    Order: {
      id: String(80_000 + spec.seq),
      status: history.at(-1)!.status,
      date: placed.date,
      hour: placed.hour,
      partial_total: reais(spec.products).toFixed(2),
      shipment_value: reais(spec.shipping).toFixed(2),
      discount: reais(spec.discount).toFixed(2),
      total: reais(spec.total).toFixed(2),
      shipment: spec.carrier,
      sending_code: spec.shippedAt ? spec.tracking : '',
      estimated_delivery_date: trayDate(spec.estimatedAt).date,
      Customer: {
        name: `${spec.customer.firstName} ${spec.customer.lastName}`,
        email: spec.customer.email,
        cpf: spec.customer.document,
        cellphone: spec.customer.phone,
        CustomerAddresses: [
          {
            CustomerAddress: {
              recipient: address.receiver,
              address: address.street,
              number: address.number,
              neighborhood: address.neighborhood,
              city: address.city,
              state: address.state,
              zip_code: address.zip,
            },
          },
        ],
      },
      ProductsSold: spec.items.map(({ product, quantity }) => ({
        ProductsSold: { reference: product.sku, name: product.name, quantity: String(quantity), price: reais(product.price).toFixed(2) },
      })),
      OrderStatusHistory: history.map((h) => ({ status: h.status, ...trayDate(h.at) })),
    },
  };
}

function buildIntegration(spec: OrderSpec, receivedAt: Date): RawOrderEnvelope['integration'] {
  if (spec.canceledAt || !faker.datatype.boolean(FAILURE_RATE[spec.channel])) return { synced: true };
  const error = faker.helpers.arrayElement(ERROR_CATALOG);
  const occurredAt = addMs(receivedAt, between(MINUTE, 20 * MINUTE));
  return {
    synced: false,
    error: {
      code: error.code,
      message: error.message.replace('{sku}', spec.items[0]!.product.sku),
      occurredAt: iso(occurredAt > REFERENCE_DATE ? REFERENCE_DATE : occurredAt),
      attempts: between(1, 5),
      retryable: error.retryable,
    },
  };
}

export function generateEnvelopes(count = DEFAULT_ORDER_COUNT): RawOrderEnvelope[] {
  faker.seed(SEED);
  faker.setDefaultRefDate(REFERENCE_DATE);
  const catalog = buildCatalog();
  const specs = Array.from({ length: count }, (_, i) => buildSpec(i, catalog)).sort(
    (a, b) => a.placedAt.getTime() - b.placedAt.getTime(),
  );

  return specs.map((spec, index) => {
    spec.seq = index + 1;
    const receivedAt = addMs(spec.placedAt, between(1_000, 90_000));
    const base = {
      id: `OP-${String(spec.seq).padStart(6, '0')}`,
      receivedAt: iso(receivedAt > REFERENCE_DATE ? REFERENCE_DATE : receivedAt),
      integration: buildIntegration(spec, receivedAt),
    };
    switch (spec.channel) {
      case 'vtex':
        return { ...base, channel: 'vtex', payload: toVtex(spec) };
      case 'mercadolivre':
        return { ...base, channel: 'mercadolivre', payload: toMeli(spec) };
      case 'magento':
        return { ...base, channel: 'magento', payload: toMagento(spec) };
      case 'tray':
        return { ...base, channel: 'tray', payload: toTray(spec) };
    }
  });
}

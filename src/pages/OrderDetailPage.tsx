import type { ReactNode } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { ChannelLabel } from '@/features/orders/components/ChannelLabel';
import { OrderTimeline } from '@/features/orders/components/OrderTimeline';
import { StatusBadge } from '@/features/orders/components/StatusBadge';
import { useOrder } from '@/features/orders/hooks/useOrder';
import type { Order } from '@/features/orders/types';
import { ApiError } from '@/shared/lib/http';
import { formatCurrency, formatDate, formatDateTime, formatDocument } from '@/shared/lib/format';
import { EmptyState } from '@/shared/ui/EmptyState';
import { ErrorState } from '@/shared/ui/ErrorState';
import { Icon } from '@/shared/ui/Icon';
import { Skeleton } from '@/shared/ui/Skeleton';
import { Table, Td, Th } from '@/shared/ui/Table';

function Section({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  return (
    <section className={`card p-5 ${className ?? ''}`} aria-labelledby={`section-${title}`}>
      <h2 id={`section-${title}`} className="mb-4 text-sm font-semibold uppercase tracking-wide text-fg-muted">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-fg-muted">{label}</dt>
      <dd className="mt-0.5 text-sm">{children}</dd>
    </div>
  );
}

function BackLink() {
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/orders';
  return (
    <Link to={from} className="mb-4 inline-flex items-center gap-1.5 text-sm text-fg-muted hover:text-fg">
      <Icon name="arrowLeft" />
      Voltar para pedidos
    </Link>
  );
}

function OrderDetail({ order }: { order: Order }) {
  const { totals, customer, delivery, integration } = order;
  return (
    <>
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Pedido {order.id}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-fg-muted">
            <ChannelLabel channel={order.channel} className="text-fg" />
            <span>
              Nº no canal: <span className="font-mono">{order.channelOrderId}</span>
            </span>
            <span>Realizado em {formatDateTime(order.placedAt)}</span>
          </p>
        </div>
        <div className="text-right">
          <StatusBadge status={order.status} />
          <p className="mt-1 text-xs text-fg-muted">
            Status original: <code className="font-mono">{order.rawStatus}</code>
          </p>
        </div>
      </header>

      {integration.error && (
        <div role="alert" className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-100">
          <p>
            <strong className="font-semibold">Falha de integração com o ERP ({integration.error.code}):</strong>{' '}
            {integration.error.message}
          </p>
          <Link to="/failures" className="font-medium underline">
            Ver em Falhas de integração
          </Link>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Section title="Itens">
            <div className="-mx-5 overflow-x-auto">
              <Table>
                <thead>
                  <tr>
                    <Th className="pl-5">Produto</Th>
                    <Th className="text-right">Qtd.</Th>
                    <Th className="text-right">Unitário</Th>
                    <Th className="pr-5 text-right">Total</Th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item) => (
                    <tr key={item.sku}>
                      <Td className="pl-5">
                        {item.name}
                        <span className="block font-mono text-xs text-fg-muted">{item.sku}</span>
                      </Td>
                      <Td className="text-right tabular-nums">{item.quantity}</Td>
                      <Td className="text-right tabular-nums">{formatCurrency(item.unitPrice)}</Td>
                      <Td className="pr-5 text-right tabular-nums">{formatCurrency(item.total)}</Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
            <dl className="ml-auto mt-4 max-w-xs space-y-1.5 text-sm tabular-nums">
              <div className="flex justify-between">
                <dt className="text-fg-muted">Produtos</dt>
                <dd>{formatCurrency(totals.products)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-fg-muted">Frete</dt>
                <dd>{totals.shipping === 0 ? 'Grátis' : formatCurrency(totals.shipping)}</dd>
              </div>
              {totals.discount > 0 && (
                <div className="flex justify-between">
                  <dt className="text-fg-muted">Desconto</dt>
                  <dd>−{formatCurrency(totals.discount)}</dd>
                </div>
              )}
              <div className="flex justify-between border-t border-border pt-1.5 text-base font-semibold">
                <dt>Total</dt>
                <dd>{formatCurrency(totals.total)}</dd>
              </div>
            </dl>
          </Section>

          <Section title="Linha do tempo">
            <OrderTimeline events={order.timeline} />
          </Section>
        </div>

        <div className="space-y-6">
          <Section title="Cliente">
            <dl className="space-y-3">
              <Field label="Nome">{customer.name}</Field>
              <Field label="E-mail">
                <a href={`mailto:${customer.email}`} className="text-brand hover:underline">
                  {customer.email}
                </a>
              </Field>
              <Field label="CPF/CNPJ">{formatDocument(customer.document)}</Field>
              {customer.phone && <Field label="Telefone">{customer.phone}</Field>}
            </dl>
          </Section>

          <Section title="Entrega">
            <dl className="space-y-3">
              <Field label="Destinatário">{delivery.receiver}</Field>
              <Field label="Endereço">
                {delivery.street}
                <br />
                {delivery.city}/{delivery.state} · CEP {delivery.postalCode}
              </Field>
              {delivery.carrier && <Field label="Transportadora">{delivery.carrier}</Field>}
              {delivery.trackingCode && (
                <Field label="Rastreio">
                  <span className="font-mono">{delivery.trackingCode}</span>
                </Field>
              )}
              {delivery.estimatedAt && <Field label="Previsão">{formatDate(delivery.estimatedAt)}</Field>}
            </dl>
          </Section>
        </div>
      </div>
    </>
  );
}

function DetailSkeleton() {
  return (
    <div role="status" aria-label="Carregando pedido">
      <Skeleton className="mb-2 h-8 w-64" />
      <Skeleton className="mb-6 h-4 w-96 max-w-full" />
      <div className="grid gap-6 lg:grid-cols-3">
        <Skeleton className="h-72 lg:col-span-2" />
        <Skeleton className="h-72" />
      </div>
    </div>
  );
}

export default function OrderDetailPage() {
  const { id = '' } = useParams();
  const { data, isPending, isError, error, refetch } = useOrder(id);

  return (
    <>
      <BackLink />
      {isPending ? (
        <DetailSkeleton />
      ) : isError ? (
        error instanceof ApiError && error.status === 404 ? (
          <div className="card">
            <EmptyState title="Pedido não encontrado" description={`Não existe pedido com o identificador ${id}.`} />
          </div>
        ) : (
          <div className="card">
            <ErrorState error={error} onRetry={() => void refetch()} />
          </div>
        )
      ) : (
        <OrderDetail order={data} />
      )}
    </>
  );
}

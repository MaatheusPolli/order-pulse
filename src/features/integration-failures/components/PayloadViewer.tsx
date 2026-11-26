import * as Dialog from '@radix-ui/react-dialog';
import { useMemo, useState } from 'react';
import { CHANNEL_LABELS } from '@/features/orders/types';
import { Button } from '@/shared/ui/Button';
import { Icon } from '@/shared/ui/Icon';
import type { IntegrationFailure } from '../api/failures.api';
import { highlightJson } from '../lib/highlight-json';

interface PayloadViewerProps {
  failure: IntegrationFailure | null;
  onOpenChange: (open: boolean) => void;
}

export function PayloadViewer({ failure, onOpenChange }: PayloadViewerProps) {
  const [copied, setCopied] = useState(false);
  const json = useMemo(() => (failure ? JSON.stringify(failure.payload, null, 2) : ''), [failure]);
  const highlighted = useMemo(() => highlightJson(json), [json]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(json);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <Dialog.Root open={failure !== null} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" />
        <Dialog.Content className="card fixed left-1/2 top-1/2 z-50 flex max-h-[85vh] w-[min(56rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col p-0 focus:outline-none">
          {failure && (
            <>
              <div className="flex items-start justify-between gap-4 border-b border-border p-5">
                <div>
                  <Dialog.Title className="text-lg font-semibold">Payload do pedido {failure.order.id}</Dialog.Title>
                  <Dialog.Description className="mt-1 text-sm text-fg-muted">
                    Formato original {CHANNEL_LABELS[failure.order.channel]} recebido pelo hub ·{' '}
                    <span className="font-mono">{failure.order.integration.error.code}</span>
                  </Dialog.Description>
                </div>
                <Dialog.Close asChild>
                  <Button variant="ghost" size="sm" aria-label="Fechar">
                    <Icon name="x" />
                  </Button>
                </Dialog.Close>
              </div>
              <div className="border-b border-border bg-red-50 px-5 py-3 text-sm text-red-900 dark:bg-red-950 dark:text-red-100">
                {failure.order.integration.error.message}
              </div>
              <pre
                tabIndex={0}
                aria-label="JSON do payload"
                className="min-h-0 flex-1 overflow-auto bg-surface-muted p-5 font-mono text-xs leading-relaxed"
              >
                <code>{highlighted}</code>
              </pre>
              <div className="flex justify-end gap-2 border-t border-border p-4">
                <Button onClick={() => void copy()}>
                  <Icon name="copy" />
                  {copied ? 'Copiado!' : 'Copiar JSON'}
                </Button>
                <Dialog.Close asChild>
                  <Button variant="primary">Fechar</Button>
                </Dialog.Close>
              </div>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

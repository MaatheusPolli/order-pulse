import type { ReactNode } from 'react';
import { Icon } from './Icon';

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div role="status" className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
      <span className="mb-1 rounded-full bg-surface-muted p-3 text-fg-muted">
        <Icon name="inbox" className="h-6 w-6" />
      </span>
      <p className="font-semibold">{title}</p>
      {description && <p className="max-w-sm text-sm text-fg-muted">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

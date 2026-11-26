import { Button } from './Button';
import { Icon } from './Icon';

interface ErrorStateProps {
  title?: string;
  error?: unknown;
  onRetry?: () => void;
}

export function ErrorState({ title = 'Não foi possível carregar os dados', error, onRetry }: ErrorStateProps) {
  const message = error instanceof Error ? error.message : undefined;
  return (
    <div role="alert" className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
      <span className="mb-1 rounded-full bg-red-100 p-3 text-red-700 dark:bg-red-950 dark:text-red-300">
        <Icon name="alert" className="h-6 w-6" />
      </span>
      <p className="font-semibold">{title}</p>
      {message && <p className="max-w-md text-sm text-fg-muted">{message}</p>}
      {onRetry && (
        <Button className="mt-2" onClick={onRetry}>
          <Icon name="refresh" className="h-4 w-4" />
          Tentar novamente
        </Button>
      )}
    </div>
  );
}

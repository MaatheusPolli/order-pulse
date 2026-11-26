import { useRouteError } from 'react-router-dom';
import { ErrorState } from '@/shared/ui/ErrorState';

/** Fallback para erros inesperados de renderização (inclui falha ao baixar um chunk). */
export function RouteError() {
  const error = useRouteError();
  return (
    <main className="mx-auto max-w-xl p-8">
      <div className="card">
        <ErrorState title="Algo deu errado" error={error} onRetry={() => window.location.reload()} />
      </div>
    </main>
  );
}

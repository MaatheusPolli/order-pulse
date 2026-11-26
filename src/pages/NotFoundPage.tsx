import { Link } from 'react-router-dom';
import { EmptyState } from '@/shared/ui/EmptyState';

export default function NotFoundPage() {
  return (
    <div className="card">
      <EmptyState
        title="Página não encontrada"
        description="O endereço acessado não existe."
        action={
          <Link to="/" className="font-medium text-brand hover:underline">
            Ir para o dashboard
          </Link>
        }
      />
    </div>
  );
}

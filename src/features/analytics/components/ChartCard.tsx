import { useId, useState } from 'react';
import type { ReactNode } from 'react';
import { Button } from '@/shared/ui/Button';

interface ChartCardProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  chart: ReactNode;
  /** Visão em tabela: alternativa acessível e para quem prefere os números. */
  table: ReactNode;
}

export function ChartCard({ title, description, actions, chart, table }: ChartCardProps) {
  const [showTable, setShowTable] = useState(false);
  const titleId = useId();

  return (
    <figure className="card flex flex-col p-5" aria-labelledby={titleId}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <figcaption>
          <h2 id={titleId} className="font-semibold">
            {title}
          </h2>
          {description && <p className="mt-0.5 text-sm text-fg-muted">{description}</p>}
        </figcaption>
        <div className="flex items-center gap-2">
          {actions}
          <Button size="sm" variant="ghost" aria-pressed={showTable} onClick={() => setShowTable((v) => !v)}>
            {showTable ? 'Ver gráfico' : 'Ver tabela'}
          </Button>
        </div>
      </div>
      {showTable ? <div className="max-h-80 overflow-auto">{table}</div> : chart}
    </figure>
  );
}

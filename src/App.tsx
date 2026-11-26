import { Suspense } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useFailures } from '@/features/integration-failures/hooks/useFailures';
import { cn } from '@/shared/lib/cn';
import { Icon } from '@/shared/ui/Icon';
import type { IconName } from '@/shared/ui/Icon';
import { Skeleton } from '@/shared/ui/Skeleton';
import { ThemeToggle } from '@/shared/ui/ThemeToggle';

const NAV: { to: string; label: string; icon: IconName; end?: boolean }[] = [
  { to: '/', label: 'Dashboard', icon: 'chart', end: true },
  { to: '/orders', label: 'Pedidos', icon: 'list' },
  { to: '/failures', label: 'Falhas', icon: 'plug' },
];

function FailuresCount() {
  const { data } = useFailures();
  if (!data?.length) return null;
  return (
    <span className="ml-auto rounded-full bg-red-600 px-1.5 py-0.5 text-[11px] font-semibold leading-none text-white">
      <span className="sr-only">(</span>
      {data.length}
      <span className="sr-only"> pendentes)</span>
    </span>
  );
}

function Logo() {
  return (
    <span className="flex items-center gap-2 font-semibold tracking-tight">
      <svg viewBox="0 0 24 24" className="h-6 w-6 text-brand" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 12h4l3-8 4 16 3-8h6" />
      </svg>
      OrderPulse
    </span>
  );
}

function PageFallback() {
  return (
    <div role="status" aria-label="Carregando página" className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-64" />
    </div>
  );
}

export function App() {
  const location = useLocation();

  return (
    <div className="min-h-screen md:grid md:grid-cols-[15rem_1fr]">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-brand focus:px-3 focus:py-2 focus:text-brand-fg"
      >
        Pular para o conteúdo
      </a>

      <aside className="sticky top-0 z-30 border-b border-border bg-surface md:h-screen md:border-b-0 md:border-r">
        <div className="flex items-center justify-between px-4 py-3 md:px-5 md:py-5">
          <Logo />
          <div className="md:hidden">
            <ThemeToggle />
          </div>
        </div>
        <nav aria-label="Principal" className="px-2 pb-2 md:px-3">
          <ul className="flex gap-1 md:flex-col">
            {NAV.map((item) => (
              <li key={item.to} className="flex-1 md:flex-none">
                <NavLink
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center justify-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors md:justify-start',
                      isActive ? 'bg-brand/10 text-fg' : 'text-fg-muted hover:bg-surface-muted hover:text-fg',
                    )
                  }
                >
                  <Icon name={item.icon} />
                  {item.label}
                  {item.to === '/failures' && <FailuresCount />}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className="absolute bottom-0 left-0 right-0 hidden items-center justify-between border-t border-border px-5 py-4 md:flex">
          <div className="flex items-center gap-2 text-sm">
            <span aria-hidden="true" className="grid h-8 w-8 place-items-center rounded-full bg-brand/15 text-xs font-semibold text-brand">
              OP
            </span>
            <span>
              <span className="block font-medium leading-tight">Operação</span>
              <span className="block text-xs text-fg-muted">demo@orderpulse.dev</span>
            </span>
          </div>
          <ThemeToggle />
        </div>
      </aside>

      <main id="main" tabIndex={-1} className="mx-auto w-full max-w-7xl px-4 py-6 md:px-8 md:py-8">
        <Suspense key={location.pathname.split('/')[1]} fallback={<PageFallback />}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
}

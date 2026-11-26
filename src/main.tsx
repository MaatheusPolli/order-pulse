import { QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { createQueryClient } from './shared/lib/query-client';
import { createRouter } from './router';
import './styles/index.css';

async function enableMocking() {
  // Build de demonstração (`--mode msw`, deploy estático): a API mockada roda no service worker.
  if (import.meta.env.MODE !== 'msw' && import.meta.env.VITE_ENABLE_MSW !== 'true') return;
  const { startMockWorker } = await import('./mocks/browser');
  await startMockWorker();
}

const queryClient = createQueryClient();

void enableMocking().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={createRouter()} />
      </QueryClientProvider>
    </StrictMode>,
  );
});

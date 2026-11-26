import { QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { createQueryClient } from '@/shared/lib/query-client';
import { routes } from '@/router';

/** Renderiza a aplicação inteira (rotas reais + React Query) numa URL inicial. */
export function renderApp(url = '/') {
  const queryClient = createQueryClient();
  queryClient.setDefaultOptions({ queries: { ...queryClient.getDefaultOptions().queries, retry: false } });
  const router = createMemoryRouter(routes, { initialEntries: [url] });
  const user = userEvent.setup();
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  const location = () => router.state.location;
  const searchParams = () => new URLSearchParams(router.state.location.search);
  return { ...utils, user, router, queryClient, location, searchParams };
}

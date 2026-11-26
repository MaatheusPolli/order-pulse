import { setupWorker } from 'msw/browser';
import { createDb } from '../../mock-server/src/data/db';
import { createHandlers } from './handlers';

/** Demo estática (deploy público): a API roda dentro do service worker. */
export async function startMockWorker() {
  const worker = setupWorker(...createHandlers(createDb(), { latency: 300 }));
  await worker.start({
    onUnhandledRequest: 'bypass',
    quiet: true,
    serviceWorker: { url: `${import.meta.env.BASE_URL}mockServiceWorker.js` },
  });
}

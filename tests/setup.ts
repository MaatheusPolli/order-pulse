import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { db } from './msw/handlers';
import { server } from './msw/server';

// jsdom não implementa estas APIs usadas por Recharts, Radix e useTheme.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver;
window.matchMedia ??= ((query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: () => {},
  removeListener: () => {},
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => false,
})) as typeof window.matchMedia;

// O ambiente jsdom substitui o AbortSignal global, e o Request/fetch do Node valida o sinal
// contra esse global ("Expected signal to be an instance of AbortSignal"). O React Query
// passa sempre um sinal, então toda requisição falhava como "sem conexão". O MSW substitui
// o fetch em server.listen(), por isso o adaptador é instalado depois dele: o cancelamento
// é repassado manualmente ao fetch interceptado, sem alterar a aplicação.
function installAbortSignalBridge() {
  const baseFetch = globalThis.fetch.bind(globalThis);
  globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    const signal = init?.signal;
    if (!signal) return baseFetch(input, init);
    const rest: RequestInit = { ...init };
    delete rest.signal;
    if (signal.aborted) return Promise.reject(new DOMException('The operation was aborted.', 'AbortError'));
    return new Promise<Response>((resolve, reject) => {
      const onAbort = () => reject(new DOMException('The operation was aborted.', 'AbortError'));
      signal.addEventListener('abort', onAbort, { once: true });
      baseFetch(input, rest)
        .then(resolve, reject)
        .finally(() => signal.removeEventListener('abort', onAbort));
    });
  }) as typeof fetch;
}

// O react-router cria um `new Request(url, { signal })` em TODA navegação (createClientSideRequest).
// Com o AbortSignal do jsdom, o Request nativo do Node rejeita o sinal, a navegação falha e a URL
// nunca muda. Como o cancelamento de navegação não é usado nos testes, o sinal estrangeiro é
// descartado só nessa criação de Request. O AbortController do jsdom segue intacto para a aplicação.
// Precisa rodar depois do server.listen(), pois o MSW também envolve o Request global.
function installForeignSignalRequestBridge() {
  const NativeRequest = globalThis.Request;
  globalThis.Request = new Proxy(NativeRequest, {
    construct(target, args: [RequestInfo | URL, RequestInit?]) {
      try {
        return Reflect.construct(target, args);
      } catch (error) {
        const init = args[1];
        if (!init?.signal || !(error instanceof TypeError)) throw error;
        const rest: RequestInit = { ...init };
        delete rest.signal;
        return Reflect.construct(target, [args[0], rest]);
      }
    },
  });
}

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
  installAbortSignalBridge();
  installForeignSignalRequestBridge();
});
afterEach(() => {
  cleanup();
  server.resetHandlers();
  db.reset();
  localStorage.clear();
  document.documentElement.classList.remove('dark');
});
afterAll(() => server.close());

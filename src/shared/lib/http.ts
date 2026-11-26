import type { ApiErrorBody } from '../types/api';

export const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? '/api';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly code?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type Params = URLSearchParams | Record<string, string | number | undefined>;

function buildUrl(path: string, params?: Params): string {
  const search =
    params instanceof URLSearchParams
      ? params
      : new URLSearchParams(
          Object.entries(params ?? {})
            .filter((entry): entry is [string, string | number] => entry[1] !== undefined)
            .map(([key, value]) => [key, String(value)]),
        );
  const query = search.toString();
  return `${API_URL}${path}${query ? `?${query}` : ''}`;
}

async function request<T>(method: 'GET' | 'POST', path: string, options: { params?: Params; signal?: AbortSignal } = {}) {
  let response: Response;
  try {
    response = await fetch(buildUrl(path, options.params), {
      method,
      signal: options.signal,
      headers: { Accept: 'application/json' },
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new ApiError(0, 'Não foi possível conectar à API. Verifique sua conexão.');
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as ApiErrorBody | null;
    throw new ApiError(response.status, body?.message ?? `Erro ${response.status} ao chamar a API.`, body?.code);
  }
  return (await response.json()) as T;
}

export const http = {
  get: <T>(path: string, options?: { params?: Params; signal?: AbortSignal }) => request<T>('GET', path, options),
  post: <T>(path: string, options?: { signal?: AbortSignal }) => request<T>('POST', path, options),
};

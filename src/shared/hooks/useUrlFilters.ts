import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Estado de UI guardado na query string: link compartilhável e o botão
 * "voltar" do navegador restaura filtros/paginação.
 */
export function useUrlFilters<T>(parse: (params: URLSearchParams) => T, serialize: (value: T) => URLSearchParams) {
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = useMemo(() => parse(searchParams), [parse, searchParams]);

  const setFilters = useCallback(
    (patch: Partial<T> | ((current: T) => Partial<T>), options: { replace?: boolean } = {}) => {
      setSearchParams(
        (current) => {
          const value = parse(current);
          const next = typeof patch === 'function' ? patch(value) : patch;
          return serialize({ ...value, ...next });
        },
        { replace: options.replace },
      );
    },
    [parse, serialize, setSearchParams],
  );

  return [filters, setFilters] as const;
}

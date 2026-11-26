import { useQuery } from '@tanstack/react-query';
import { fetchFailures } from '../api/failures.api';
import { failuresKeys } from '../api/failures.keys';

export function useFailures() {
  return useQuery({
    queryKey: failuresKeys.list(),
    queryFn: ({ signal }) => fetchFailures(signal),
  });
}

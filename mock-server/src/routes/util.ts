export function toSearchParams(query: unknown): URLSearchParams {
  const params = new URLSearchParams();
  if (query && typeof query === 'object') {
    for (const [key, value] of Object.entries(query)) {
      if (typeof value === 'string') params.set(key, value);
    }
  }
  return params;
}

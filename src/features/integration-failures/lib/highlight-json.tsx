import type { ReactNode } from 'react';

const TOKEN_RE = /("(?:\\.|[^"\\])*")(\s*:)?|\b(true|false|null)\b|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g;

/** Realce de sintaxe mínimo para JSON — sem dependência extra. */
export function highlightJson(json: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let last = 0;
  for (const match of json.matchAll(TOKEN_RE)) {
    const index = match.index ?? 0;
    if (index > last) nodes.push(json.slice(last, index));
    const [token, str, colon, literal, num] = match;
    const key = `${index}`;
    if (str && colon) {
      nodes.push(<span key={key} className="text-sky-700 dark:text-sky-300">{str}</span>, colon);
    } else if (str) {
      nodes.push(<span key={key} className="text-emerald-700 dark:text-emerald-300">{str}</span>);
    } else if (literal) {
      nodes.push(<span key={key} className="text-violet-700 dark:text-violet-300">{literal}</span>);
    } else if (num) {
      nodes.push(<span key={key} className="text-amber-700 dark:text-amber-300">{num}</span>);
    } else {
      nodes.push(token);
    }
    last = index + token.length;
  }
  if (last < json.length) nodes.push(json.slice(last));
  return nodes;
}

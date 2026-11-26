// Mede o bundle inicial (o que o index.html carrega antes de qualquer rota lazy)
// e falha se passar do orçamento definido no planejamento.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const BUDGET_KB = 200;
const dist = fileURLToPath(new URL('../dist/', import.meta.url));
const html = readFileSync(join(dist, 'index.html'), 'utf8');
const base = process.env.VITE_BASE ?? '/';

const assets = [...html.matchAll(/(?:src|href)="([^"]+\.(?:js|css))"/g)].map(([, url]) => url.replace(base, ''));
const rows = assets.map((file) => ({ file, gzipKB: gzipSync(readFileSync(join(dist, file))).length / 1024 }));
const total = rows.reduce((sum, r) => sum + r.gzipKB, 0);

for (const r of rows) console.log(`${r.gzipKB.toFixed(1).padStart(7)} KB  ${r.file}`);
console.log(`${total.toFixed(1).padStart(7)} KB  total inicial (gzip) — orçamento ${BUDGET_KB} KB`);

if (total > BUDGET_KB) {
  console.error('Bundle inicial acima do orçamento.');
  process.exit(1);
}

// Gera os prints do README e os quadros do GIF a partir do build de demo.
// Uso: npm run build:demo && npm run preview & node scripts/capture-demo.mjs [dirQuadros]
// Depois: python3 scripts/make-gif.py [dirQuadros] docs/demo.gif
import { mkdirSync } from 'node:fs';
import { chromium } from '@playwright/test';

const BASE = process.env.DEMO_URL ?? 'http://localhost:4173';
const framesDir = process.argv[2] ?? 'docs/frames';
const shotsDir = 'docs/screenshots';
mkdirSync(framesDir, { recursive: true });
mkdirSync(shotsDir, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo' });
await page.addInitScript(() => {
  if (!sessionStorage.getItem('theme-set')) {
    localStorage.setItem('order-pulse:theme', 'light');
    sessionStorage.setItem('theme-set', '1');
  }
});

let frame = 0;
const snap = async (hold = 1) => {
  await page.waitForTimeout(250);
  for (let i = 0; i < hold; i += 1) {
    await page.screenshot({ path: `${framesDir}/${String(frame).padStart(3, '0')}.png` });
    frame += 1;
  }
};
const shot = (name) => page.screenshot({ path: `${shotsDir}/${name}.png` });
const settle = () => page.waitForLoadState('networkidle').then(() => page.waitForTimeout(400));

// Dashboard
await page.goto(`${BASE}/`);
await page.getByText('Pedidos por canal').waitFor();
await settle();
await shot('dashboard');
await snap(4);
await page.getByRole('button', { name: '90 dias' }).click();
await settle();
await snap(3);
const bar = page.locator('figure').filter({ hasText: 'Pedidos por canal' }).locator('.recharts-bar-rectangle').first();
await bar.hover();
await snap(3);

// Pedidos: filtros → detalhe → voltar
await page.getByRole('link', { name: 'Pedidos', exact: true }).click();
await page.locator('tbody tr').first().waitFor();
await settle();
await shot('orders');
await snap(3);
await page.getByRole('button', { name: 'Tray', pressed: false }).click();
await settle();
await snap(2);
await page.getByRole('button', { name: 'Enviado', pressed: false }).click();
await settle();
await snap(3);
await page.locator('tbody tr').first().getByRole('link').click();
await page.getByRole('list', { name: 'Linha do tempo do pedido' }).waitFor();
await settle();
await shot('order-detail');
await snap(4);
await page.getByRole('link', { name: 'Voltar para pedidos' }).click();
await settle();
await snap(2);

// Falhas: payload + reprocessar
await page.getByRole('link', { name: /Falhas/ }).click();
await page.locator('tbody tr').first().waitFor();
await settle();
await shot('failures');
await snap(3);
const row = page.locator('tbody tr').filter({ hasText: 'Transitório' }).first();
await row.getByRole('button', { name: /Ver payload/ }).click();
await page.getByRole('dialog').waitFor();
await settle();
await shot('payload');
await snap(4);
await page.keyboard.press('Escape');
await page.waitForTimeout(300);
await row.getByRole('button', { name: /Reprocessar/ }).click();
await page.getByRole('status').filter({ hasText: 'reprocessado' }).waitFor();
await snap(4);

// Tema escuro
await page.getByRole('link', { name: 'Dashboard' }).click();
await page.getByRole('button', { name: 'Ativar tema escuro' }).first().click();
await settle();
await shot('dashboard-dark');
await snap(5);

await browser.close();
console.log(`${frame} quadros em ${framesDir}, prints em ${shotsDir}`);

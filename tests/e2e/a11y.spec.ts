import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const ROUTES = [
  { path: '/', ready: 'Pedidos por canal' },
  { path: '/orders', ready: 'Pedidos' },
  { path: '/orders/OP-001400', ready: 'Pedido OP-001400' },
  { path: '/failures', ready: 'Falhas de integração' },
];

for (const theme of ['light', 'dark'] as const) {
  for (const route of ROUTES) {
    test(`axe sem violações sérias/críticas em ${route.path} (${theme})`, async ({ page }) => {
      await page.addInitScript((t) => localStorage.setItem('order-pulse:theme', t), theme);
      await page.goto(route.path);
      await expect(page.getByRole('heading', { name: route.ready }).first()).toBeVisible();
      await expect(page.getByRole('status', { name: /carregando/i })).toHaveCount(0);

      const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
      const blocking = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
      expect(
        blocking.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target.join(' ')).slice(0, 5) })),
      ).toEqual([]);
    });
  }
}

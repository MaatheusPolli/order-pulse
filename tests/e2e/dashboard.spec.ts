import { expect, test } from '@playwright/test';

test.describe('Dashboard', () => {
  test('KPIs, troca de período, tooltip e navegação para falhas', async ({ page }) => {
    await page.goto('/');
    const orders = page.locator('article').filter({ has: page.getByRole('heading', { name: 'Pedidos', exact: true }) });
    await expect(orders).toContainText('vs. período anterior');
    const value30 = await orders.locator('p').first().innerText();

    await page.getByRole('button', { name: '7 dias' }).click();
    await expect(page).toHaveURL(/days=7/);
    await expect(page.getByText('Últimos 7 dias')).toBeVisible();
    await expect(orders.locator('p').first()).not.toHaveText(value30);

    // Tooltip ao passar o mouse na barra de um canal.
    const channelChart = page.locator('figure').filter({ has: page.getByRole('heading', { name: 'Pedidos por canal' }) });
    const bars = channelChart.locator('.recharts-bar-rectangle');
    await expect(bars).toHaveCount(4);
    await bars.first().hover();
    await expect(channelChart.locator('.recharts-tooltip-wrapper')).toContainText(/pedidos.*em receita/s);

    await page.getByRole('link', { name: 'Ver falhas' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Falhas de integração');
  });

  test('tema escuro persiste após recarregar', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Ativar tema escuro' }).first().click();
    await expect(page.locator('html')).toHaveClass(/dark/);
    await page.reload();
    await expect(page.locator('html')).toHaveClass(/dark/);
    await expect(page.getByRole('button', { name: 'Ativar tema claro' }).first()).toBeVisible();
  });
});

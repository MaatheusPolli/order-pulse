import { expect, test } from '@playwright/test';

test.describe('Pedidos', () => {
  test('filtrar → abrir detalhe → voltar mantendo filtros', async ({ page }) => {
    await page.goto('/orders');
    const rows = page.locator('tbody tr');
    await expect(rows).toHaveCount(25);

    await page.getByRole('button', { name: 'Mercado Livre', pressed: false }).click();
    await page.getByRole('button', { name: 'Entregue', pressed: false }).click();
    await expect(page).toHaveURL(/channel=mercadolivre/);
    await expect(page).toHaveURL(/status=delivered/);
    await expect(rows.first()).toContainText('Mercado Livre');
    await expect(rows.first()).toContainText('Entregue');

    await page.getByRole('searchbox', { name: 'Buscar' }).fill('silva');
    await expect(page).toHaveURL(/q=silva/);
    await expect(rows.first()).toContainText(/silva/i);
    const filteredUrl = page.url();

    const firstLink = rows.first().getByRole('link');
    const id = (await firstLink.innerText()).split('\n')[0]!;
    await firstLink.click();

    await expect(page.getByRole('heading', { level: 1 })).toHaveText(`Pedido ${id}`);
    await expect(page.getByRole('list', { name: 'Linha do tempo do pedido' })).toBeVisible();
    await expect(page.getByText('Status original:')).toContainText('paid/delivered');

    await page.getByRole('link', { name: 'Voltar para pedidos' }).click();
    await expect(page).toHaveURL(filteredUrl);
    await expect(page.getByRole('button', { name: 'Mercado Livre', pressed: true })).toBeVisible();
    await expect(page.getByRole('searchbox', { name: 'Buscar' })).toHaveValue('silva');

    // O botão "voltar" do navegador também restaura o estado.
    await firstLink.click();
    await page.goBack();
    await expect(page).toHaveURL(filteredUrl);
  });

  test('1.000 linhas virtualizadas com scroll até o fim', async ({ page }) => {
    await page.goto('/orders?pageSize=1000');
    const region = page.getByRole('region', { name: /lista de pedidos/i });
    await expect(region).toBeVisible();

    const mounted = await page.locator('tbody tr:not([aria-hidden])').count();
    expect(mounted).toBeLessThan(80);

    await region.evaluate((el) => el.scrollTo({ top: el.scrollHeight }));
    await expect(page.locator('tbody tr[aria-rowindex="1001"]')).toBeVisible();
    await expect(page.getByText('1–1.000 de 1.500 pedidos')).toBeVisible();
  });

  test('link compartilhado reproduz a consulta', async ({ page }) => {
    await page.goto('/orders?status=canceled&sort=total&dir=asc');
    await expect(page.getByRole('columnheader', { name: /total/i })).toHaveAttribute('aria-sort', 'ascending');
    const statuses = await page.locator('tbody tr td:nth-child(5)').allInnerTexts();
    expect(statuses.every((s) => s.includes('Cancelado'))).toBe(true);
  });
});

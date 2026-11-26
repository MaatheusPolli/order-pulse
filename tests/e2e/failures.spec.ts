import { expect, test } from '@playwright/test';

test.describe('Falhas de integração', () => {
  test('reprocessar erro transitório remove a falha e atualiza o contador', async ({ page }) => {
    await page.goto('/failures');
    const rows = page.locator('tbody tr');
    await expect(rows.first()).toBeVisible();
    const before = await rows.count();

    const row = rows.filter({ hasText: 'Transitório' }).first();
    const id = (await row.getByRole('link').innerText()).split('\n')[0]!;
    await row.getByRole('button', { name: `Reprocessar pedido ${id}` }).click();

    await expect(page.getByRole('status').filter({ hasText: 'reprocessado' })).toContainText(`Pedido ${id}`);
    await expect(rows).toHaveCount(before - 1);
    await expect(page.getByRole('link', { name: new RegExp(`Falhas.*${before - 1}`) })).toBeVisible();

    // O pedido agora aparece como sincronizado no detalhe (navegação client-side:
    // recarregar a página recriaria o banco em memória do service worker).
    await page.getByRole('link', { name: 'Pedidos', exact: true }).click();
    await page.getByRole('searchbox', { name: 'Buscar' }).fill(id);
    await page.locator('tbody tr').first().getByRole('link', { name: new RegExp(id) }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(`Pedido ${id}`);
    await expect(page.getByText('Falha de integração com o ERP')).toHaveCount(0);
  });

  test('erro de dados volta para a lista com a mensagem do ERP', async ({ page }) => {
    await page.goto('/failures');
    const row = page.locator('tbody tr').filter({ hasText: 'Dados' }).first();
    const id = (await row.getByRole('link').innerText()).split('\n')[0]!;
    await row.getByRole('button', { name: `Reprocessar pedido ${id}` }).click();

    await expect(page.getByRole('alert')).toContainText('Reprocessamento falhou');
    await expect(page.getByRole('link', { name: new RegExp(id) })).toBeVisible();
  });

  test('payload bruto abre em diálogo e fecha com Esc', async ({ page }) => {
    await page.goto('/failures');
    const row = page.locator('tbody tr').first();
    const id = (await row.getByRole('link').innerText()).split('\n')[0]!;
    await row.getByRole('button', { name: `Ver payload do pedido ${id}` }).click();

    const dialog = page.getByRole('dialog', { name: `Payload do pedido ${id}` });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByLabel('JSON do payload')).toContainText('{');
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
  });
});

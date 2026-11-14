import { expect, test } from '@playwright/test';
import { DJANGO_API_URL, NODE_API_URL } from '../fixtures/apiClients.js';
import { QA_MEDIA } from '../fixtures/testData.js';

test.describe('Catálogo público y control de visitante (E2E-01, E2E-02)', () => {
  test('E2E-01: Invitada explora catálogo, busca, filtra por tipo y abre detalle sin ver obras ocultas ni notas privadas', async ({ page }) => {
    const pageErrors = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    await page.goto('/');
    await expect(page.getByText(QA_MEDIA.BLADE_RUNNER)).toBeVisible();
    await expect(page.getByText(QA_MEDIA.STRANGER_THINGS)).toBeVisible();
    await expect(page.getByText(QA_MEDIA.HIDDEN)).toHaveCount(0);

    // Buscar por título
    await page.getByPlaceholder(/Titulo, productora o sinopsis/i).fill('Blade');
    await page.getByRole('button', { name: 'Buscar' }).click();
    await expect(page.getByText(QA_MEDIA.BLADE_RUNNER)).toBeVisible();
    await expect(page.getByText(QA_MEDIA.STRANGER_THINGS)).toHaveCount(0);

    // Filtrar por serie
    await page.getByPlaceholder(/Titulo, productora o sinopsis/i).fill('');
    await page.locator('select[name="media_type"]').selectOption('SERIE');
    await page.getByRole('button', { name: 'Buscar' }).click();
    await expect(page.getByText(QA_MEDIA.STRANGER_THINGS)).toBeVisible();

    // Abrir detalle público
    await page.getByText(QA_MEDIA.STRANGER_THINGS).first().click();
    await expect(page).toHaveURL(/\/media\/\d+/);
    await expect(page.getByRole('heading', { name: QA_MEDIA.STRANGER_THINGS })).toBeVisible();
    await expect(page.getByRole('button', { name: /Inicia sesi[oó]n para guardar/i })).toBeVisible();
    await expect(page.getByText(/rating promedio|reseñas/i)).toHaveCount(0);

    expect(pageErrors).toEqual([]);
  });

  test('E2E-02: Invitada no puede visitar rutas privadas ni acceder a APIs protegidas', async ({ page, request }) => {
    for (const privatePath of ['/my-tracking', '/new-entry', '/recommendations', '/admin/submissions']) {
      await page.goto(privatePath);
      await expect(page).toHaveURL(/\/login/);
    }

    const trackingRes = await request.get(`${DJANGO_API_URL}/tracking/`);
    expect(trackingRes.status()).toBe(401);

    const recRes = await request.post(`${NODE_API_URL}/recommendations`, {
      data: { prompt: 'kdrama' },
    });
    expect(recRes.status()).toBe(401);
  });
});

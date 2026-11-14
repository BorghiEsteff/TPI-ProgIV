import { expect, test } from '@playwright/test';
import {
  DJANGO_API_URL,
  DJANGO_GRAPHQL_URL,
  NODE_API_URL,
  NODE_GRAPHQL_URL,
  uiLogin,
} from '../fixtures/apiClients.js';
import { QA_MEDIA } from '../fixtures/testData.js';
import { QA_USERS } from '../fixtures/users.js';

test.describe('REST, GraphQL, rutas heredadas y resiliencia (E2E-32..E2E-36)', () => {
  test('E2E-32, E2E-33: REST y GraphQL filtran ocultas; /api/v1/reviews retorna 410 y /watch-rooms redirige', async ({ page, request }) => {
    // Buscar ID de obra oculta no aparece en REST público
    const listRes = await request.get(`${DJANGO_API_URL}/media/?search=Obra+Oculta`);
    expect(listRes.status()).toBe(200);
    expect((await listRes.json()).results).toEqual([]);

    // GraphQL Django solo retorna activas
    const gqlDjango = await request.post(DJANGO_GRAPHQL_URL, {
      data: { query: '{ allMediaItems { id title } }' },
    });
    expect(gqlDjango.status()).toBe(200);
    const titles = (await gqlDjango.json()).data.allMediaItems.map((m) => m.title);
    expect(titles).not.toContain(QA_MEDIA.HIDDEN);

    // Node /api/v1/reviews cerrado (410 Gone)
    const legacyRev = await request.get(`${NODE_API_URL}/reviews/media/1`);
    expect(legacyRev.status()).toBe(410);

    // Node GraphQL no tiene reviewsByMedia
    const gqlNode = await request.post(NODE_GRAPHQL_URL, {
      data: { query: '{ reviewsByMedia(mediaItemId: 1) { id } }' },
    });
    expect((await gqlNode.json()).errors).toBeDefined();

    // /watch-rooms/1 redirige fuera
    await page.goto('/watch-rooms/1');
    await expect(page).toHaveURL(/\/$/);
  });

  test('E2E-35 (fallo controlado de red): Si falla el guardado de nota privada, la UI muestra error y no éxito falso', async ({ page }) => {
    await uiLogin(page, QA_USERS.A);
    await page.goto('/my-tracking');

    await page.route('**/api/v1/personal-notes/**', (route) => {
      if (route.request().method() === 'PUT') {
        route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify({ error: { message: 'Servicio de notas no disponible.' } }),
        });
      } else {
        route.continue();
      }
    });

    const firstCard = page.locator('.card').first();
    if ((await firstCard.count()) > 0) {
      await firstCard.getByRole('button', { name: /Guardar nota privada/i }).click();
      await expect(firstCard.getByText(/Servicio de notas no disponible|No se pudo guardar/i)).toBeVisible();
      await expect(firstCard.getByText('Nota privada guardada.')).toHaveCount(0);
    }
  });

  test('E2E-36: Navegación atrás/adelante y recarga mantienen estado consistente', async ({ page }) => {
    await page.goto('/');
    await page.getByText(QA_MEDIA.BLADE_RUNNER).first().click();
    await expect(page).toHaveURL(/\/media\/\d+/);
    await page.goBack();
    await expect(page).toHaveURL(/\/$/);
    await page.goForward();
    await expect(page).toHaveURL(/\/media\/\d+/);
    await page.reload();
    await expect(page.getByRole('heading', { name: QA_MEDIA.BLADE_RUNNER })).toBeVisible();
  });
});

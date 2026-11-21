import { expect, test } from '@playwright/test';
import { NODE_API_URL, apiLogin, uiLogin } from '../fixtures/apiClients.js';
import { QA_MEDIA } from '../fixtures/testData.js';
import { QA_USERS } from '../fixtures/users.js';

test.describe('Chat de recomendaciones IA (acceso flotante único)', () => {
  test('E2E-27..E2E-29: /recommendations redirige a / y el panel flotante cubre degraded:true, degraded:false y 503', async ({
    page,
  }) => {
    await uiLogin(page, QA_USERS.A);
    await page.goto('/recommendations');
    await expect(page).toHaveURL(/\/$/);

    // El navbar ya no muestra un enlace independiente "Recomendaciones IA"
    await expect(page.getByRole('link', { name: /Recomendaciones IA/i })).toHaveCount(0);

    await page.getByTestId('clapperboard-launcher').click();
    await expect(page.getByTestId('floating-ai-panel')).toBeVisible();

    // Escenario A: Fallback determinista (degraded: true)
    await page.route('**/api/v1/recommendations', async (route) => {
      const body = route.request().postDataJSON() || {};
      if (String(body.prompt || '').includes('2099')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            message: 'No tengo coincidencias de ese tipo en el catálogo publicado.',
            degraded: true,
            recommendations: [],
          }),
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'Estas obras del catálogo coinciden con tu búsqueda.',
          degraded: true,
          recommendations: [
            {
              media_item_id: 3,
              title: QA_MEDIA.KDRAMA_2026,
              media_type: 'SERIE',
              reason: 'Coincidencia de romance coreano 2026 en catálogo.',
            },
          ],
        }),
      });
    });

    const promptInput = page.getByLabel(/Describe qué querés ver en CineTrack/i);
    await promptInput.fill('quiero un kdrama romántico del 2026');
    await page.getByRole('button', { name: /Enviar/i }).click();

    await expect(page.getByTestId('floating-ai-panel').getByText(QA_MEDIA.KDRAMA_2026)).toBeVisible();
    await expect(page.getByText(/Modo limitado:/i)).toBeVisible();

    // Sin coincidencias
    await promptInput.fill('quiero un kdrama romántico del 2099');
    await page.getByRole('button', { name: /Enviar/i }).click();
    await expect(page.getByText(/No tengo coincidencias de ese tipo en el catálogo/i)).toBeVisible();

    // Escenario B: Respuesta IA exitosa (degraded: false -> desaparece Modo limitado)
    await page.unroute('**/api/v1/recommendations');
    await page.route('**/api/v1/recommendations', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'Sugerencia personalizada del catálogo.',
          degraded: false,
          recommendations: [
            {
              media_item_id: 3,
              title: QA_MEDIA.KDRAMA_2026,
              media_type: 'SERIE',
              reason: 'Romance ambientado en Seúl.',
            },
          ],
        }),
      });
    });

    await promptInput.fill('recomendame un romance coreano');
    await page.getByRole('button', { name: /Enviar/i }).click();
    await expect(page.getByTestId('floating-ai-panel').getByText(QA_MEDIA.KDRAMA_2026).last()).toBeVisible();
    await expect(page.getByText(/Modo limitado:/i)).toHaveCount(0);

    // Escenario C: Error controlado de proveedor (503) sin fuga técnica
    await page.unroute('**/api/v1/recommendations');
    await page.route('**/api/v1/recommendations', async (route) => {
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({
          error: { message: 'El asistente de recomendaciones no está disponible temporalmente.' },
        }),
      });
    });

    await promptInput.fill('algo de ciencia ficción');
    await page.getByRole('button', { name: /Enviar/i }).click();
    await expect(page.getByText(/no está disponible en este momento/i)).toBeVisible();
  });

  test('E2E-30, E2E-31: Visitante 401, prompt > 500 chars 422 y sin fuga de obras ocultas', async ({
    request,
  }) => {
    const anonRes = await request.post(`${NODE_API_URL}/recommendations`, {
      data: { prompt: 'kdrama' },
    });
    expect(anonRes.status()).toBe(401);

    const { access: accessToken } = await apiLogin(request, QA_USERS.A);
    const longRes = await request.post(`${NODE_API_URL}/recommendations`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      data: { prompt: 'a'.repeat(501) },
    });
    expect(longRes.status()).toBe(422);

    const validRes = await request.post(`${NODE_API_URL}/recommendations`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      data: { prompt: 'recomendame un romance o drama del catalogo' },
    });
    expect(validRes.status()).toBe(200);
    const body = await validRes.json();
    const recTitles = (body.recommendations || []).map((r) => r.title);
    expect(recTitles).not.toContain(QA_MEDIA.PENDING_ISOLATED_A);
    expect(recTitles).not.toContain(QA_MEDIA.PENDING_ISOLATED_B);
  });
});

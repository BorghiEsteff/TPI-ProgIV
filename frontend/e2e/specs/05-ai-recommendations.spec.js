import { expect, test } from '@playwright/test';
import { NODE_API_URL, apiLogin, uiLogin } from '../fixtures/apiClients.js';
import { QA_MEDIA } from '../fixtures/testData.js';
import { QA_USERS } from '../fixtures/users.js';

test.describe('Chat de recomendaciones IA (E2E-27..E2E-31)', () => {
  test('E2E-27, E2E-28, E2E-29: Consulta kdrama 2026 devuelve ficha real aprobada, sin coincidencias responde honesto y modo determinista', async ({ page }) => {
    await uiLogin(page, QA_USERS.A);
    await page.goto('/recommendations');

    await page.getByPlaceholder(/kdrama romántico/i).fill('quiero un kdrama romántico del 2026');
    await page.getByRole('button', { name: /Pedir recomendaciones/i }).click();

    await expect(page.getByText(QA_MEDIA.KDRAMA_2026)).toBeVisible();
    await expect(page.getByText('Modo limitado')).toBeVisible();

    // Consulta sin coincidencias
    await page.getByPlaceholder(/kdrama romántico/i).fill('quiero un kdrama romántico del 2099');
    await page.getByRole('button', { name: /Pedir recomendaciones/i }).click();
    await expect(page.getByText(/No tengo coincidencias de ese tipo en el catálogo/i)).toBeVisible();
  });

  test('E2E-30, E2E-31: Visitante 401, prompt > 500 chars 422 y sin fuga de obras ocultas', async ({ request }) => {
    const anonRes = await request.post(`${NODE_API_URL}/recommendations`, {
      data: { prompt: 'kdrama' },
    });
    expect(anonRes.status()).toBe(401);

    const loginA = await apiLogin(request, QA_USERS.A);
    const longRes = await request.post(`${NODE_API_URL}/recommendations`, {
      headers: { Authorization: `Bearer ${loginA.access}` },
      data: { prompt: 'a'.repeat(501) },
    });
    expect(longRes.status()).toBe(422);

    const validRes = await request.post(`${NODE_API_URL}/recommendations`, {
      headers: { Authorization: `Bearer ${loginA.access}` },
      data: { prompt: 'Obra Oculta QA' },
    });
    expect(validRes.status()).toBe(200);
    const body = await validRes.json();
    const titles = (body.recommendations || []).map((r) => r.title || '');
    expect(titles).not.toContain('Obra Oculta QA');

    // Direct check against FastAPI recommender: unmatched strict criteria returns []
    const strictRes = await request.post('http://127.0.0.1:8002/ai/recommend', {
      data: {
        prompt: 'kdrama del 2099',
        candidates: [{ id: 1, title: 'Dune QA', media_type: 'PELICULA', release_year: 2021, genres: ['Ciencia Ficcion'] }],
      },
    });
    expect(strictRes.status()).toBe(200);
    const strictBody = await strictRes.json();
    expect(strictBody.recommendations).toEqual([]);
  });
});

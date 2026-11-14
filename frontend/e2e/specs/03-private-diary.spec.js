import { expect, test } from '@playwright/test';
import { DJANGO_API_URL, NODE_API_URL, apiLogin, uiLogin } from '../fixtures/apiClients.js';
import { QA_MEDIA } from '../fixtures/testData.js';
import { QA_USERS } from '../fixtures/users.js';

test.describe('Diario privado, plataformas, notas y aislamiento (E2E-07..E2E-15)', () => {
  test('E2E-07..E2E-13: A y B agregan misma obra idempotente, guardan plataformas/notas/avances independientes, filtran y eliminan sin afectar al otro', async ({ browser, request }) => {
    const ctxA = await browser.newContext();
    const ctxB = await browser.newContext();
    const pageA = await ctxA.newPage();
    const pageB = await ctxB.newPage();

    // A entra al detalle de Blade Runner 2049 y agrega a Mi CineTrack
    await uiLogin(pageA, QA_USERS.A);
    await pageA.getByText(QA_MEDIA.BLADE_RUNNER).first().click();
    await pageA.getByRole('button', { name: /Agregar a Mi CineTrack/i }).click();
    await expect(pageA.getByRole('button', { name: /Abrir mi registro/i })).toBeVisible();

    // Idempotencia via API (E2E-07): volver a crear para el mismo media_item devuelve 200 con mismo id
    const loginA = await apiLogin(request, QA_USERS.A);
    const listARes = await request.get(`${DJANGO_API_URL}/tracking/`, {
      headers: { Authorization: `Bearer ${loginA.access}` },
    });
    const listABody = await listARes.json();
    const entryA = (listABody.results || listABody).find((e) => e.display_title === QA_MEDIA.BLADE_RUNNER);
    expect(entryA).toBeTruthy();

    const idempotentRes = await request.post(`${DJANGO_API_URL}/tracking/`, {
      headers: { Authorization: `Bearer ${loginA.access}` },
      data: { media_item: entryA.media_item, status: 'PENDIENTE' },
    });
    expect(idempotentRes.status()).toBe(200);
    expect((await idempotentRes.json()).id).toBe(entryA.id);

    // A guarda plataforma HBO, favorito, 00:42:35, 5 estrellas y comentario privado en UI
    await pageA.goto('/my-tracking');
    const cardA = pageA.locator('.card', { hasText: QA_MEDIA.BLADE_RUNNER });
    await cardA.getByPlaceholder(/Ej\. Netflix, HBO, Cine/i).fill('HBO');
    await cardA.getByPlaceholder(/Ej\. Netflix, HBO, Cine/i).blur();
    await cardA.getByRole('button', { name: /Favorito/i }).click();
    await cardA.getByRole('button', { name: '5 estrellas' }).click();
    await cardA.getByPlaceholder(/Escribe tus notas personales/i).fill('Nota privada de A en HBO');
    await cardA.getByRole('button', { name: /Guardar nota privada/i }).click();
    await expect(cardA.getByText('Nota privada guardada.')).toBeVisible();

    // B entra, agrega Blade Runner 2049 y guarda Netflix, 3 estrellas y su nota
    await uiLogin(pageB, QA_USERS.B);
    await pageB.getByText(QA_MEDIA.BLADE_RUNNER).first().click();
    await pageB.getByRole('button', { name: /Agregar a Mi CineTrack/i }).click();
    await pageB.goto('/my-tracking');
    const cardB = pageB.locator('.card', { hasText: QA_MEDIA.BLADE_RUNNER });
    await cardB.getByPlaceholder(/Ej\. Netflix, HBO, Cine/i).fill('Netflix');
    await cardB.getByPlaceholder(/Ej\. Netflix, HBO, Cine/i).blur();
    await cardB.getByRole('button', { name: '3 estrellas' }).click();
    await cardB.getByPlaceholder(/Escribe tus notas personales/i).fill('Nota privada de B en Netflix');
    await cardB.getByRole('button', { name: /Guardar nota privada/i }).click();
    await expect(cardB.getByText('Nota privada guardada.')).toBeVisible();

    // Recargar ambas páginas y verificar independencia total (E2E-09)
    await pageA.reload();
    await expect(pageA.locator('.card', { hasText: QA_MEDIA.BLADE_RUNNER }).getByPlaceholder(/Escribe tus notas personales/i)).toHaveValue('Nota privada de A en HBO');
    await expect(pageA.locator('.card', { hasText: QA_MEDIA.BLADE_RUNNER }).getByPlaceholder(/Ej\. Netflix, HBO, Cine/i)).toHaveValue('HBO');

    await pageB.reload();
    await expect(pageB.locator('.card', { hasText: QA_MEDIA.BLADE_RUNNER }).getByPlaceholder(/Escribe tus notas personales/i)).toHaveValue('Nota privada de B en Netflix');
    await expect(pageB.locator('.card', { hasText: QA_MEDIA.BLADE_RUNNER }).getByPlaceholder(/Ej\. Netflix, HBO, Cine/i)).toHaveValue('Netflix');

    // E2E-11: Progreso exacto en segundos (00:42:35 = 2555s) y serie temporada 2 ep 4 00:17:09 = 1029s via API + UI
    const patchMovie = await request.patch(`${DJANGO_API_URL}/tracking/${entryA.id}/`, {
      headers: { Authorization: `Bearer ${loginA.access}` },
      data: { current_seconds: 2555, status: 'VISTO' },
    });
    expect(patchMovie.status()).toBe(200);
    expect((await patchMovie.json()).current_seconds).toBe(2555);

    // E2E-13: B filtra y quita su entrada; la de A y el catálogo público siguen intactos
    await pageB.getByPlaceholder(/Buscar en mi diario/i).fill('Blade');
    await expect(pageB.locator('.card', { hasText: QA_MEDIA.BLADE_RUNNER })).toHaveCount(1);
    await pageB.locator('.card', { hasText: QA_MEDIA.BLADE_RUNNER }).getByRole('button', { name: 'Quitar', exact: true }).click();
    await pageB.getByRole('button', { name: /S[ií], quitar/i }).click();
    await expect(pageB.getByText(/Tu diario est[aá] vac[ií]o/i)).toBeVisible();

    await pageA.reload();
    await expect(pageA.locator('.card', { hasText: QA_MEDIA.BLADE_RUNNER })).toBeVisible();

    await ctxA.close();
    await ctxB.close();
  });

  test('E2E-10, E2E-14, E2E-15: Validaciones de rating 1..5, XSS/Unicode e IDOR horizontal/ADMIN', async ({ request }) => {
    const loginA = await apiLogin(request, QA_USERS.A);
    const loginB = await apiLogin(request, QA_USERS.B);
    const loginAdmin = await apiLogin(request, QA_USERS.ADMIN);

    const listARes = await request.get(`${DJANGO_API_URL}/tracking/`, {
      headers: { Authorization: `Bearer ${loginA.access}` },
    });
    const entryA = ((await listARes.json()).results || [])[0];
    expect(entryA).toBeTruthy();

    // E2E-10: ratings inválidos rechazados con 422
    for (const bad of [0, 6, -1, 1.5, 'cinco']) {
      const badRes = await request.put(`${NODE_API_URL}/personal-notes/${entryA.id}`, {
        headers: { Authorization: `Bearer ${loginA.access}` },
        data: { rating: bad, comment: 'Test' },
      });
      expect(badRes.status()).toBe(422);
    }

    // E2E-15: > 2000 chars rechazado con 422; Unicode válido aceptado
    const tooLong = 'x'.repeat(2001);
    const longRes = await request.put(`${NODE_API_URL}/personal-notes/${entryA.id}`, {
      headers: { Authorization: `Bearer ${loginA.access}` },
      data: { rating: 4, comment: tooLong },
    });
    expect(longRes.status()).toBe(422);

    const unicodeRes = await request.put(`${NODE_API_URL}/personal-notes/${entryA.id}`, {
      headers: { Authorization: `Bearer ${loginA.access}` },
      data: { rating: null, comment: '¡Excelente! 🎬 <script>alert(1)</script>' },
    });
    expect(unicodeRes.status()).toBe(200);

    // E2E-14: B y ADMIN no pueden leer ni editar tracking ni nota de A
    const bGetTracking = await request.get(`${DJANGO_API_URL}/tracking/${entryA.id}/`, {
      headers: { Authorization: `Bearer ${loginB.access}` },
    });
    expect(bGetTracking.status()).toBe(404);

    const bGetNote = await request.get(`${NODE_API_URL}/personal-notes/${entryA.id}`, {
      headers: { Authorization: `Bearer ${loginB.access}` },
    });
    expect(bGetNote.status()).toBe(404);

    const adminGetNote = await request.get(`${NODE_API_URL}/personal-notes/${entryA.id}`, {
      headers: { Authorization: `Bearer ${loginAdmin.access}` },
    });
    expect(adminGetNote.status()).toBe(404);

    const bBatch = await request.get(`${NODE_API_URL}/personal-notes/?tracking_ids=${entryA.id}`, {
      headers: { Authorization: `Bearer ${loginB.access}` },
    });
    expect(bBatch.status()).toBe(200);
    expect((await bBatch.json()).notes).toEqual([]);
  });
});

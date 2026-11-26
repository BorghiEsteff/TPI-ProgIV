import { expect, test } from '@playwright/test';
import { DJANGO_API_URL, apiLogin, uiLogin } from '../fixtures/apiClients.js';
import { QA_MEDIA } from '../fixtures/testData.js';
import { QA_USERS } from '../fixtures/users.js';

const SCREENSHOT_DIR = '../docs/qa/screenshots/unified-2026-11-21';

test.describe('Mi CineTrack Unificado — Matriz Lote 03 (MC-01..MC-25)', () => {
  test('MC-01..MC-10, MC-14, MC-15: Editor único, idempotencia, preservación de segundos, historial VISTO/ABANDONADO y fallo controlado', async ({
    page,
    request,
  }) => {
    const pageErrors = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    const { access } = await apiLogin(request, QA_USERS.C);
    const authHeaders = { Authorization: `Bearer ${access}` };

    await uiLogin(page, QA_USERS.C);

    // MC-14: Agregar obra publicada desde tab "+ Agregar obra"
    await page.goto('/my-tracking?view=add');
    await expect(page.getByTestId('add-work-section')).toBeVisible();
    await page.getByTestId('quick-add-catalog-search').fill('Stranger Things');
    const addStrangerBtn = page
      .locator('.list-group-item', { hasText: QA_MEDIA.STRANGER_THINGS })
      .getByRole('button', { name: /Agregar a Mi CineTrack/i });
    await expect(addStrangerBtn).toBeVisible();
    await addStrangerBtn.click();
    await expect(page.getByText(/se agreg[oó] a tu diario personal/i)).toBeVisible();

    // MC-15: Intentar agregar dos veces la misma obra (idempotencia)
    await page.getByTestId('tab-add-work').click();
    await page.getByTestId('quick-add-catalog-search').fill('Stranger Things');
    await addStrangerBtn.click();
    await expect(page.getByText(/ya estaba en tu diario/i)).toBeVisible();

    // Obtener ID del tracking recién creado
    const listRes = await request.get(`${DJANGO_API_URL}/tracking/?search=Stranger`, {
      headers: authHeaders,
    });
    const listBody = await listRes.json();
    const serieEntry = (listBody.results || listBody).find(
      (e) => e.display_title === QA_MEDIA.STRANGER_THINGS
    );
    expect(serieEntry).toBeTruthy();

    const serieCard = page.getByTestId(`tracking-card-${serieEntry.id}`);
    await expect(serieCard).toBeVisible();

    // MC-01 & MC-06: Abrir editor, guardar T2E11 00:24 (1440s) VIENDO
    await serieCard.getByRole('button', { name: /Editar progreso/i }).click();
    await serieCard.getByLabel(/Estado/i).selectOption('VIENDO');
    await serieCard.getByLabel(/Temp\./i).fill('2');
    await serieCard.getByLabel(/Ep\./i).fill('11');
    await serieCard.getByLabel(/Horas/i).fill('0');
    await serieCard.getByLabel(/Minutos/i).fill('24');
    await serieCard.getByRole('button', { name: /Guardar progreso/i }).click();
    await expect(page.getByText(/Tu diario personal se actualiz[oó] correctamente/i)).toBeVisible();

    // Cambiar episodio a 12: prepara 00:00 SIN guardar en DB aún; Cancelar revierte (MC-06)
    await serieCard.getByLabel(/Ep\./i).fill('12');
    await expect(serieCard.getByLabel(/Horas/i)).toHaveValue('0');
    await expect(serieCard.getByLabel(/Minutos/i)).toHaveValue('0');

    const beforeSaveRes = await request.get(`${DJANGO_API_URL}/tracking/${serieEntry.id}/`, {
      headers: authHeaders,
    });
    const beforeSave = await beforeSaveRes.json();
    expect(beforeSave.current_episode_number).toBe(11);
    expect(beforeSave.current_seconds).toBe(1440);

    await serieCard.getByRole('button', { name: /Cancelar/i }).click();
    const afterCancelRes = await request.get(`${DJANGO_API_URL}/tracking/${serieEntry.id}/`, {
      headers: authHeaders,
    });
    expect((await afterCancelRes.json()).current_episode_number).toBe(11);

    // Reabrir, cambiar a E12 y Guardar progreso -> T2E12 00:00 sin VISTO automático
    await serieCard.getByRole('button', { name: /Editar progreso/i }).click();
    await serieCard.getByLabel(/Ep\./i).fill('12');
    await serieCard.getByRole('button', { name: /Guardar progreso/i }).click();
    await expect(serieCard).toContainText('T2 · E12');

    // Marcar VISTO (obra terminada) y recargar (MC-07)
    await serieCard.getByLabel(/Estado/i).selectOption('VISTO');
    await Promise.all([
      page.waitForResponse(
        (res) =>
          res.url().includes(`/api/v1/tracking/${serieEntry.id}/`) &&
          res.request().method() === 'PATCH' &&
          res.status() === 200
      ),
      serieCard.getByRole('button', { name: /Guardar progreso/i }).click(),
    ]);
    await page.reload();
    const reloadedSerie = page.getByTestId(`tracking-card-${serieEntry.id}`);
    await expect(reloadedSerie).toContainText('T2 · E12');
    await expect(reloadedSerie).toContainText('VISTO');

    const historyAfterVistoRes = await request.get(`${DJANGO_API_URL}/tracking/${serieEntry.id}/`, {
      headers: authHeaders,
    });
    const historyAfterVisto = (await historyAfterVistoRes.json()).episode_history;

    // MC-02: En serie ya VISTO, editar solo capítulo a T2E13 NO agrega T2E13 a episode_history
    await reloadedSerie.getByRole('button', { name: /Editar progreso/i }).click();
    await reloadedSerie.getByLabel(/Ep\./i).fill('13');
    await Promise.all([
      page.waitForResponse(
        (res) =>
          res.url().includes(`/api/v1/tracking/${serieEntry.id}/`) &&
          res.request().method() === 'PATCH' &&
          res.status() === 200
      ),
      reloadedSerie.getByRole('button', { name: /Guardar progreso/i }).click(),
    ]);

    const afterChRes = await request.get(`${DJANGO_API_URL}/tracking/${serieEntry.id}/`, {
      headers: authHeaders,
    });
    const afterCh = await afterChRes.json();
    expect(afterCh.current_episode_number).toBe(13);
    expect(afterCh.episode_history).toEqual(historyAfterVisto);

    // MC-03: En serie ya VISTO, editar solo plataforma preserva historial y segundos
    await reloadedSerie.getByLabel(/Plataforma/i).fill('Disney+');
    await Promise.all([
      page.waitForResponse(
        (res) =>
          res.url().includes(`/api/v1/tracking/${serieEntry.id}/`) &&
          res.request().method() === 'PATCH' &&
          res.status() === 200
      ),
      reloadedSerie.getByRole('button', { name: /Guardar progreso/i }).click(),
    ]);
    const afterPlatRes = await request.get(`${DJANGO_API_URL}/tracking/${serieEntry.id}/`, {
      headers: authHeaders,
    });
    const afterPlat = await afterPlatRes.json();
    expect(afterPlat.watch_platform).toBe('Disney+');
    expect(afterPlat.episode_history).toEqual(historyAfterVisto);

    // MC-10: Pasar de VISTO -> ABANDONADO limpia finished_at pero conserva historial
    await reloadedSerie.getByLabel(/Estado/i).selectOption('ABANDONADO');
    await Promise.all([
      page.waitForResponse(
        (res) =>
          res.url().includes(`/api/v1/tracking/${serieEntry.id}/`) &&
          res.request().method() === 'PATCH' &&
          res.status() === 200
      ),
      reloadedSerie.getByRole('button', { name: /Guardar progreso/i }).click(),
    ]);
    const afterAbandonRes = await request.get(`${DJANGO_API_URL}/tracking/${serieEntry.id}/`, {
      headers: authHeaders,
    });
    const afterAbandon = await afterAbandonRes.json();
    expect(afterAbandon.status).toBe('ABANDONADO');
    expect(afterAbandon.finished_at).toBeNull();
    expect(afterAbandon.episode_history).toEqual(historyAfterVisto);

    // MC-04, MC-05, MC-08, MC-09: Película con 01:24:35 (5075s)
    const mediaListRes = await request.get(`${DJANGO_API_URL}/media/?search=Blade`);
    const bladeItem = (await mediaListRes.json()).results[0];
    const filmCreateRes = await request.post(`${DJANGO_API_URL}/tracking/`, {
      headers: authHeaders,
      data: { media_item: bladeItem.id, status: 'VIENDO', current_seconds: 5075, watch_platform: 'Netflix' },
    });
    const filmEntry = await filmCreateRes.json();
    await page.reload();
    const filmCard = page.getByTestId(`tracking-card-${filmEntry.id}`);
    await filmCard.getByRole('button', { name: /Editar progreso/i }).click();

    // MC-08: En película NO existen controles de Temp./Ep.
    await expect(filmCard.getByLabel(/Temp\./i)).toHaveCount(0);
    await expect(filmCard.getByLabel(/Ep\./i)).toHaveCount(0);

    // MC-04: Editar solo favorito y guardar conserva 5075s exactos
    await filmCard.getByLabel(/Marcar como Favorito/i).check();
    await Promise.all([
      page.waitForResponse(
        (res) =>
          res.url().includes(`/api/v1/tracking/${filmEntry.id}/`) &&
          res.request().method() === 'PATCH' &&
          res.status() === 200
      ),
      filmCard.getByRole('button', { name: /Guardar progreso/i }).click(),
    ]);
    const filmSecCheck = await request.get(`${DJANGO_API_URL}/tracking/${filmEntry.id}/`, {
      headers: authHeaders,
    });
    expect((await filmSecCheck.json()).current_seconds).toBe(5075);

    // MC-09: Minutos inválidos >= 60 bloquean sin guardar
    await filmCard.getByLabel(/Minutos/i).fill('75');
    await filmCard.getByRole('button', { name: /Guardar progreso/i }).click();
    await expect(filmCard.getByText(/Los minutos deben estar entre 0 y 59/i)).toBeVisible();

    // MC-05: Editar horas=1, minutos=30 -> 5400s exactos
    await filmCard.getByLabel(/Horas/i).fill('1');
    await filmCard.getByLabel(/Minutos/i).fill('30');
    await Promise.all([
      page.waitForResponse(
        (res) =>
          res.url().includes(`/api/v1/tracking/${filmEntry.id}/`) &&
          res.request().method() === 'PATCH' &&
          res.status() === 200
      ),
      filmCard.getByRole('button', { name: /Guardar progreso/i }).click(),
    ]);
    const filmUpdatedCheck = await request.get(`${DJANGO_API_URL}/tracking/${filmEntry.id}/`, {
      headers: authHeaders,
    });
    expect((await filmUpdatedCheck.json()).current_seconds).toBe(5400);

    // Guardado fallido controlado (no anuncia éxito falso)
    await page.route(`**/api/v1/tracking/${filmEntry.id}/`, async (route) => {
      if (route.request().method() === 'PATCH') {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ detail: 'Error simulado al guardar progreso.' }),
        });
        return;
      }
      await route.continue();
    });
    await filmCard.getByLabel(/Plataforma/i).fill('Prime');
    await filmCard.getByRole('button', { name: /Guardar progreso/i }).click();
    await expect(page.locator('.alert-danger')).toBeVisible();
    await page.unroute(`**/api/v1/tracking/${filmEntry.id}/`);

    // Limpiar registros de prueba creados para QA_USERS.C
    await request.delete(`${DJANGO_API_URL}/tracking/${filmEntry.id}/`, { headers: authHeaders });
    await request.delete(`${DJANGO_API_URL}/tracking/${serieEntry.id}/`, { headers: authHeaders });
    expect(pageErrors).toEqual([]);
  });

  test('MC-11, MC-12, MC-22, MC-23, MC-24: Puntuación/opinión tras recarga, búsqueda disney privada vs pública y filtros coherentes', async ({
    page,
    request,
  }) => {
    const { access } = await apiLogin(request, QA_USERS.C);
    const authHeaders = { Authorization: `Bearer ${access}` };
    const mediaListRes = await request.get(`${DJANGO_API_URL}/media/?search=Stranger`);
    const strangerItem = (await mediaListRes.json()).results[0];
    const createRes = await request.post(`${DJANGO_API_URL}/tracking/`, {
      headers: authHeaders,
      data: { media_item: strangerItem.id, status: 'VIENDO', watch_platform: 'Disney+' },
    });
    const entry = await createRes.json();

    // MC-23: Búsqueda pública "disney" retorna 0 resultados legítimos sin filtrar datos privados
    await page.goto('/');
    await page.getByPlaceholder(/Titulo, productora o sinopsis/i).fill('disney');
    await page.getByRole('button', { name: 'Buscar' }).click();
    await expect(page.getByText(/No se encontraron obras/i)).toBeVisible();

    // MC-22: Búsqueda "disney" en diario privado propio encuentra el registro por watch_platform=Disney+
    await uiLogin(page, QA_USERS.C);
    await page.goto('/my-tracking');
    const searchResponsePromise = page.waitForResponse(
      (res) => res.url().includes('/api/v1/tracking/') && res.url().includes('search=disney') && res.status() === 200
    );
    await page.getByPlaceholder(/Buscar en mi diario/i).fill('disney');
    await searchResponsePromise;
    const card = page.getByTestId(`tracking-card-${entry.id}`);
    await expect(card).toBeVisible();

    // MC-11 & MC-12: Guardar 5 estrellas y opinión Unicode y verificar tras recargar
    await card.getByRole('button', { name: '5 estrellas' }).click();
    await card.getByPlaceholder(/Escribe tus notas personales/i).fill('Excelente obra — ñandú & café');
    await card.getByRole('button', { name: /Guardar nota privada/i }).click();
    await expect(card.getByText('Nota privada guardada.')).toBeVisible();

    await page.reload();
    const reloadedCard = page.getByTestId(`tracking-card-${entry.id}`);
    await expect(reloadedCard.getByPlaceholder(/Escribe tus notas personales/i)).toHaveValue(
      'Excelente obra — ñandú & café'
    );

    // MC-24: Filtrar por VIENDO mantiene conteo y tarjeta coherente
    await page.getByRole('button', { name: /^VIENDO /i }).click();
    await expect(reloadedCard).toBeVisible();

    await request.delete(`${DJANGO_API_URL}/tracking/${entry.id}/`, { headers: authHeaders });
  });

  test('MC-19, MC-20, MC-25: Navegación unificada, rutas legacy, cero overflow y capturas desktop/mobile', async ({
    page,
  }, testInfo) => {
    const isMobile = testInfo.project.name.includes('mobile');
    await uiLogin(page, QA_USERS.A);

    const toggler = page.locator('button.navbar-toggler');
    if (await toggler.isVisible()) {
      await toggler.click();
    }
    const navbar = page.locator('#cinetrack-navbar');
    await expect(navbar.getByRole('link', { name: 'Catálogo', exact: true })).toBeVisible();
    await expect(navbar.getByRole('link', { name: 'Mi CineTrack', exact: true })).toBeVisible();
    await expect(navbar.getByRole('link', { name: /Agregar Obra/i })).toHaveCount(0);
    await expect(navbar.getByRole('link', { name: /Mis Propuestas/i })).toHaveCount(0);
    await expect(navbar.getByRole('link', { name: /Recomendaciones IA/i })).toHaveCount(0);

    // Redirecciones de compatibilidad
    await page.goto('/new-entry');
    await expect(page).toHaveURL(/\/my-tracking\?view=add/);
    await expect(page.getByTestId('add-work-section')).toBeVisible();
    if (!isMobile) {
      await page.screenshot({ path: `${SCREENSHOT_DIR}/tab-agregar-obra-desktop.png`, fullPage: false });
    }

    await page.goto('/my-submissions');
    await expect(page).toHaveURL(/\/my-tracking\?view=proposals/);
    await expect(page.getByTestId('my-proposals-section')).toBeVisible();
    if (!isMobile) {
      await page.screenshot({ path: `${SCREENSHOT_DIR}/tab-mis-propuestas-desktop.png`, fullPage: false });
    }

    await page.getByTestId('tab-my-works').click();
    await expect(page).toHaveURL(/\/my-tracking$/);

    const hasOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 2
    );
    expect(hasOverflow).toBe(false);

    if (isMobile) {
      await page.screenshot({ path: `${SCREENSHOT_DIR}/mi-cinetrack-mobile.png`, fullPage: false });
      await page.getByTestId('clapperboard-launcher').click();
      await expect(page.getByTestId('floating-ai-panel')).toBeVisible();
      await page.screenshot({ path: `${SCREENSHOT_DIR}/chatbot-ia-mobile.png`, fullPage: false });
    } else {
      await page.screenshot({ path: `${SCREENSHOT_DIR}/mi-cinetrack-desktop.png`, fullPage: false });
      const toggleEditor = page.locator('[data-testid^="toggle-editor-"]').first();
      if ((await toggleEditor.count()) > 0) {
        await toggleEditor.click();
        await page.screenshot({
          path: `${SCREENSHOT_DIR}/mi-cinetrack-editor-desktop.png`,
          fullPage: false,
        });
      }
      await page.getByTestId('clapperboard-launcher').click();
      await expect(page.getByTestId('floating-ai-panel')).toBeVisible();
      await page.screenshot({ path: `${SCREENSHOT_DIR}/chatbot-ia-desktop.png`, fullPage: false });
    }
  });
});

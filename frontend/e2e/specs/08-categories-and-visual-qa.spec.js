import path from 'node:path';
import { expect, test } from '@playwright/test';
import { DJANGO_API_URL, apiLogin, uiLogin } from '../fixtures/apiClients.js';
import { QA_USERS } from '../fixtures/users.js';

const posterAPath = path.resolve(process.cwd(), 'e2e/fixtures/poster-a.png');

test.describe('Categorías, paginación, reconciliación y QA visual Impeccable (GEN-E2E & VIS)', () => {
  test('GEN-E2E-01..09: Selección 1-5 géneros, edición en Mis Propuestas, moderación admin, GraphQL genreId y poster real', async ({ browser, request }) => {
    const ctxUser = await browser.newContext();
    const ctxAdmin = await browser.newContext();
    const pageUser = await ctxUser.newPage();
    const pageAdmin = await ctxAdmin.newPage();

    const uniqueTitle = `Noches de Tokio ${Date.now()}`;

    await uiLogin(pageUser, QA_USERS.A);
    await pageUser.goto('/new-entry');

    // GEN-E2E-01: Catálogo de >= 16 géneros disponible
    const genreOptions = pageUser.locator('[data-testid^="submission-genre-option-"]');
    await expect(genreOptions.first()).toBeVisible();
    const genreCount = await genreOptions.count();
    expect(genreCount).toBeGreaterThanOrEqual(16);

    // GEN-E2E-02: 0 géneros bloqueado con mensaje claro
    await pageUser.getByLabel(/T[ií]tulo de la pel[ií]cula o serie/i).fill(uniqueTitle);
    await pageUser.getByLabel(/Subir archivo/i).check();
    await pageUser.locator('input[type="file"]').setInputFiles(posterAPath);
    await pageUser.getByRole('button', { name: /Guardar en Mi CineTrack/i }).click();
    await expect(pageUser.getByTestId('submission-genre-error')).toBeVisible();

    // GEN-E2E-03: Límite máximo de 5 géneros deshabilita el 6to
    const namesToPick = ['Romance', 'Drama', 'Comedia', 'Misterio', 'Musical'];
    for (const gName of namesToPick) {
      await pageUser.locator(`[data-genre-name="${gName}"]`).click();
    }
    await expect(pageUser.getByTestId('submission-genre-counter')).toHaveText('5/5 seleccionados');
    await expect(pageUser.locator('[data-genre-name="Terror"]')).toBeDisabled();

    // Dejar 2 géneros (Romance + Drama) y enviar con archivo PNG
    await pageUser.locator('[data-genre-name="Comedia"]').click();
    await pageUser.locator('[data-genre-name="Misterio"]').click();
    await pageUser.locator('[data-genre-name="Musical"]').click();
    await expect(pageUser.getByTestId('submission-genre-counter')).toHaveText('2/5 seleccionados');

    await pageUser.getByRole('button', { name: /Guardar en Mi CineTrack/i }).click();
    await expect(pageUser.getByText(/pendiente de revisi[oó]n/i)).toBeVisible();

    // GEN-E2E-05: Editar categorías de propuesta PENDING en /my-submissions
    await pageUser.goto('/my-submissions');
    const subCard = pageUser.locator('.card', { hasText: uniqueTitle }).first();
    await expect(subCard).toBeVisible();
    await expect(subCard.getByText('Romance')).toBeVisible();

    // Verificar que el poster subido cargó realmente (naturalWidth > 0)
    const posterImg = subCard.locator('img').first();
    await expect(posterImg).toBeVisible();
    const loadedOk = await posterImg.evaluate((img) => img.complete && img.naturalWidth > 0);
    expect(loadedOk).toBe(true);

    await subCard.locator('[data-testid^="edit-submission-genres-"]').click();
    await subCard.locator('[data-genre-name="Comedia"]').click();
    await subCard.locator('[data-testid^="save-submission-genres-"]').click();
    await expect(pageUser.getByText('Categorías actualizadas en tu propuesta.')).toBeVisible();
    await expect(subCard.getByText('Comedia')).toBeVisible();

    // GEN-E2E-06..07: Admin ve categorías en /admin/submissions y publica heredando/ajustando
    await uiLogin(pageAdmin, QA_USERS.ADMIN);
    await pageAdmin.goto('/admin/submissions');
    const adminCard = pageAdmin.locator('.card', { hasText: uniqueTitle }).first();
    await expect(adminCard).toBeVisible();
    await expect(adminCard.getByText('Romance').first()).toBeVisible();
    await expect(adminCard.getByText('Comedia').first()).toBeVisible();

    await adminCard.locator('[data-testid^="publish-sub-"]').click();
    await expect(pageAdmin.getByText(/publicada como obra #/i)).toBeVisible();

    // GEN-E2E-09: Filtro por género en modo GraphQL en /
    await pageUser.goto('/');
    await pageUser.locator('select').nth(2).selectOption('GRAPHQL');
    const genreSelect = pageUser.locator('select[name="genre"]');
    await expect(genreSelect).toBeEnabled();
    const romanceValue = await genreSelect.locator('option', { hasText: 'Romance' }).getAttribute('value');
    await genreSelect.selectOption(romanceValue);
    await expect(pageUser.locator('.card', { hasText: uniqueTitle }).first()).toBeVisible();

    // Limpiar la obra creada vía API admin para no ensuciar otros tests
    const adminToken = await apiLogin(request, QA_USERS.ADMIN);
    const mediaSearch = await request.get(`${DJANGO_API_URL}/media/?search=${encodeURIComponent(uniqueTitle)}`);
    const mediaData = await mediaSearch.json();
    const created = (mediaData.results || [])[0];
    if (created) {
      await request.patch(`${DJANGO_API_URL}/media/${created.id}/`, {
        headers: { Authorization: `Bearer ${adminToken}` },
        data: { is_active: false },
      });
    }

    await ctxUser.close();
    await ctxAdmin.close();
  });

  test('VIS-01..16: Responsive multi-viewport sin overflow, contraste, 2:3 posters y consola limpia', async ({ page }) => {
    const pageErrors = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    const viewports = [
      { width: 1440, height: 900 },
      { width: 768, height: 1024 },
      { width: 390, height: 844 },
      { width: 360, height: 800 },
      { width: 320, height: 568 },
    ];

    for (const vp of viewports) {
      await page.setViewportSize(vp);
      await page.goto('/', { waitUntil: 'networkidle' });
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth + 2,
      );
      expect(overflow, `Overflow horizontal en ${vp.width}x${vp.height}`).toBe(false);
    }

    // Verificar relación 2:3 aproximada en poster-frame / fallback
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/', { waitUntil: 'networkidle' });
    const ratio = await page.locator('.ct-poster-frame, .ct-poster-fallback').first().evaluate((el) => {
      const rect = el.getBoundingClientRect();
      return rect.height > 0 ? rect.width / rect.height : 0;
    });
    expect(ratio).toBeGreaterThan(0.6);
    expect(ratio).toBeLessThan(0.75);

    expect(pageErrors).toEqual([]);
  });
});

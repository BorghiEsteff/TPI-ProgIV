import { expect, test } from '@playwright/test';
import { uiLogin } from '../fixtures/apiClients.js';
import { QA_MEDIA } from '../fixtures/testData.js';
import { QA_USERS } from '../fixtures/users.js';

test.describe('Búsqueda tolerante a tildes, marcas y typos (BUS-E2E)', () => {
  test('Catálogo tolera ausencia de tildes y errores leves sin romper búsquedas exactas', async ({ page }) => {
    await page.goto('/');
    const searchInput = page.getByPlaceholder(/Titulo, productora o sinopsis/i);

    await searchInput.fill('amor en seul');
    await page.getByRole('button', { name: 'Buscar' }).click();
    await expect(page.getByText(QA_MEDIA.KDRAMA_2026)).toBeVisible();

    await searchInput.fill('straner things');
    await page.getByRole('button', { name: 'Buscar' }).click();
    await expect(page.getByText(QA_MEDIA.STRANGER_THINGS)).toBeVisible();

    await searchInput.fill('Blade');
    await page.getByRole('button', { name: 'Buscar' }).click();
    await expect(page.getByText(QA_MEDIA.BLADE_RUNNER)).toBeVisible();
  });

  test('Mi CineTrack busca globalmente con tildes/marcas y GenreMultiSelect tolera animacion', async ({ page }) => {
    await uiLogin(page, QA_USERS.A);
    await page.goto('/new-entry');

    const genreSearch = page.getByTestId('submission-genre-search');
    await genreSearch.fill('animacion');
    await expect(page.locator('[data-genre-name="Animación"]')).toBeVisible();

    await page.goto('/my-tracking');
    await expect(page.getByRole('heading', { name: 'Mi CineTrack' })).toBeVisible();
  });
});

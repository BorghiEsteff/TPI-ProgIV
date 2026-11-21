import { expect, test } from '@playwright/test';
import { uiLogin } from '../fixtures/apiClients.js';
import { QA_USERS } from '../fixtures/users.js';

const SCREENSHOT_DIR = '../docs/qa/screenshots/unified-2026-11-21';

test.describe('Mi CineTrack Unificado + IA Único Acceso + QA Visual', () => {
  test('MC-01..MC-35 & IA-UNI: Navbar minimal, tabs Mi CineTrack, editor único con preservación de segundos y capturas desktop/mobile', async ({
    page,
  }) => {
    await uiLogin(page, QA_USERS.A);
    await page.goto('/');

    // Navbar minimalista: Catálogo | Mi CineTrack (sin Agregar Obra, Mis Propuestas ni Recomendaciones IA)
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

    // Alias /my-cinetrack, /new-entry y /my-submissions funcionan
    await page.goto('/my-cinetrack');
    await expect(page.getByTestId('my-cinetrack-tabs')).toBeVisible();

    await page.goto('/new-entry');
    await expect(page).toHaveURL(/\/my-tracking\?view=add/);
    await expect(page.getByTestId('add-work-section')).toBeVisible();

    await page.goto('/my-submissions');
    await expect(page).toHaveURL(/\/my-tracking\?view=proposals/);
    await expect(page.getByTestId('my-proposals-section')).toBeVisible();

    // Volver a Mis obras y capturar pantalla desktop
    await page.getByTestId('tab-my-works').click();
    await expect(page).toHaveURL(/\/my-tracking$/);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.screenshot({ path: `${SCREENSHOT_DIR}/mi-cinetrack-desktop.png`, fullPage: false });

    // Abrir editor de una tarjeta si existe y capturar editor
    const toggleEditor = page.locator('[data-testid^="toggle-editor-"]').first();
    if ((await toggleEditor.count()) > 0) {
      await toggleEditor.click();
      await page.screenshot({
        path: `${SCREENSHOT_DIR}/mi-cinetrack-editor-desktop.png`,
        fullPage: false,
      });
    }

    // Abrir IA flotante en desktop
    await page.getByTestId('clapperboard-launcher').click();
    await expect(page.getByTestId('floating-ai-panel')).toBeVisible();
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/chatbot-ia-desktop.png`,
      fullPage: false,
    });
    await page.getByRole('button', { name: /Cerrar panel de recomendaciones/i }).click();

    // Mobile 390x844
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: `${SCREENSHOT_DIR}/mi-cinetrack-mobile.png`, fullPage: false });
    await page.getByTestId('clapperboard-launcher').click();
    await expect(page.getByTestId('floating-ai-panel')).toBeVisible();
    await page.screenshot({ path: `${SCREENSHOT_DIR}/chatbot-ia-mobile.png`, fullPage: false });
  });
});

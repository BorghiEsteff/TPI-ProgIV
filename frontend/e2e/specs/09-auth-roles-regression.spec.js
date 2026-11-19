import { expect, test } from '@playwright/test';
import { DJANGO_API_URL, uiLogin } from '../fixtures/apiClients.js';
import { QA_USERS } from '../fixtures/users.js';

async function ensureNavbarOpen(page) {
  const toggler = page.locator('.navbar-toggler');
  if (await toggler.isVisible()) {
    const expanded = await toggler.getAttribute('aria-expanded');
    if (expanded !== 'true') {
      await toggler.click();
    }
  }
}

test.describe('Regresión integral de autenticación, roles y sesiones (P1)', () => {
  test('AUTH-01..10: Login USER/ADMIN, email en mayúsculas, cambio de cuenta en mismo contexto, recarga, 403 y token inválido', async ({ page, request }) => {
    const pageErrors = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    // 1. Credenciales erróneas -> 401 claro, sin tokens en localStorage
    await page.goto('/login');
    await page.fill('input[name="email"]', QA_USERS.A.email);
    await page.fill('input[name="password"]', 'WrongPassword999!');
    await page.click('button[type="submit"]');
    await expect(page.getByRole('alert')).toBeVisible();
    const tokenAfterFail = await page.evaluate(() => localStorage.getItem('cinetrack_access_token'));
    expect(tokenAfterFail).toBeNull();

    // 2. Login USER con email en MAYÚSCULAS -> éxito y navegación a Mi CineTrack
    await page.fill('input[name="email"]', QA_USERS.A.email.toUpperCase());
    await page.fill('input[name="password"]', QA_USERS.A.password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/$/);
    await ensureNavbarOpen(page);
    await expect(page.locator('.ct-navbar').getByText(QA_USERS.A.username)).toBeVisible();
    await expect(page.locator('.ct-navbar').getByText('Moderación')).toHaveCount(0);

    // 3. USER en ruta admin -> bloqueado en UI y 403 en API
    await page.goto('/admin/submissions');
    await expect(page.getByText(/Acceso restringido/i)).toBeVisible();
    const userToken = await page.evaluate(() => localStorage.getItem('cinetrack_access_token'));
    const adminApiRes = await request.get(`${DJANGO_API_URL}/admin/submissions/`, {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    expect(adminApiRes.status()).toBe(403);

    // 4. USER navega a /my-tracking, recarga (persiste identidad) y cierra sesión sin dejar ruta previa para el siguiente login
    await page.goto('/my-tracking');
    await page.reload();
    await expect(page).toHaveURL(/\/my-tracking/);
    await ensureNavbarOpen(page);
    await expect(page.locator('.ct-navbar').getByText(QA_USERS.A.username)).toBeVisible();

    await page.getByRole('button', { name: /Cerrar Sesión/i }).click();
    await expect(page).toHaveURL(/\/login/);

    // 5. Login ADMIN en el mismo contexto -> aterriza en / (no en /my-tracking) y accede a Moderación
    await page.fill('input[name="email"]', QA_USERS.ADMIN.email);
    await page.fill('input[name="password"]', QA_USERS.ADMIN.password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/$/);
    await ensureNavbarOpen(page);
    await expect(page.locator('.ct-navbar').getByText('Moderación')).toBeVisible();

    await page.goto('/admin/submissions');
    await expect(page.getByRole('heading', { name: /Cola de Moderación/i })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('heading', { name: /Cola de Moderación/i })).toBeVisible();

    // 6. Logout ADMIN y login USER en el mismo contexto -> desaparece Moderación y datos admin
    await ensureNavbarOpen(page);
    await page.getByRole('button', { name: /Cerrar Sesión/i }).click();
    await expect(page).toHaveURL(/\/login/);
    await page.fill('input[name="email"]', QA_USERS.B.email);
    await page.fill('input[name="password"]', QA_USERS.B.password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/$/);
    await ensureNavbarOpen(page);
    await expect(page.locator('.ct-navbar').getByText(QA_USERS.B.username)).toBeVisible();
    await expect(page.locator('.ct-navbar').getByText('Moderación')).toHaveCount(0);

    // 7. Token inválido/corrupto en localStorage -> recuperación segura a /login sin bucle infinito
    await page.evaluate(() => {
      localStorage.setItem('cinetrack_access_token', 'invalid.jwt.token');
      localStorage.setItem('cinetrack_refresh_token', 'invalid.refresh.token');
    });
    await page.goto('/my-tracking');
    await expect(page).toHaveURL(/\/login/);
    const clearedToken = await page.evaluate(() => localStorage.getItem('cinetrack_access_token'));
    expect(clearedToken).toBeNull();

    // 8. Login rápido por helper sigue funcionando
    await uiLogin(page, QA_USERS.A);
    await ensureNavbarOpen(page);
    await expect(page.locator('.ct-navbar').getByText(QA_USERS.A.username)).toBeVisible();

    expect(pageErrors).toEqual([]);
  });
});

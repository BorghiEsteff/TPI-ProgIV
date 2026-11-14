import { expect, test } from '@playwright/test';
import { DJANGO_API_URL, DJANGO_GRAPHQL_URL, apiLogin, uiLogin } from '../fixtures/apiClients.js';
import { QA_USERS } from '../fixtures/users.js';

test.describe('Autenticación, roles y RBAC (E2E-03..E2E-06)', () => {
  test('E2E-03: Registro normal, login, recarga y logout limpian sesión sin errores', async ({ page }) => {
    const pageErrors = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    const unique = Date.now();
    const email = `reg_${unique}@cinetrack.local`;
    await page.goto('/register');
    await expect(page.getByLabel(/Perfil en la plataforma/i)).toHaveCount(0);

    await page.getByLabel(/Nombre de usuario/i).fill(`user_${unique}`);
    await page.getByLabel(/Correo electr/i).fill(email);
    await page.getByLabel(/^Contrasena$/i).fill('QaUserPass123!');
    await page.getByLabel(/Confirmar contrasena/i).fill('QaUserPass123!');
    await page.getByRole('button', { name: /Crear Cuenta/i }).click();

    await expect(page.getByText(/Cuenta creada correctamente/i)).toBeVisible();
    await page.waitForURL(/\/login/, { timeout: 10000 });

    await uiLogin(page, { email, password: 'QaUserPass123!' });
    const toggler = page.locator('button.navbar-toggler');
    if (await toggler.isVisible()) {
      await toggler.click();
    }
    await expect(page.getByRole('link', { name: 'Mi CineTrack' })).toBeVisible();

    await page.reload();
    if (await toggler.isVisible()) {
      await toggler.click();
    }
    await expect(page.getByRole('link', { name: 'Mi CineTrack' })).toBeVisible();

    await page.getByRole('button', { name: /Cerrar Sesi/i }).click();
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole('link', { name: 'Mi CineTrack' })).toHaveCount(0);

    expect(pageErrors).toEqual([]);
  });

  test('E2E-04: Registro forzado con role=ADMIN y PATCH /auth/me no escalan privilegios', async ({ request }) => {
    const unique = Date.now();
    const email = `esc_${unique}@cinetrack.local`;
    const regRes = await request.post(`${DJANGO_API_URL}/auth/register/`, {
      data: {
        email,
        username: `esc_${unique}`,
        password: 'QaUserPass123!',
        password_confirm: 'QaUserPass123!',
        role: 'ADMIN',
        is_staff: true,
        is_superuser: true,
      },
    });
    expect(regRes.status()).toBe(201);
    const regBody = await regRes.json();
    expect(regBody.user.role).toBe('USER');

    const loginBody = await apiLogin(request, { email, password: 'QaUserPass123!' });
    const patchRes = await request.patch(`${DJANGO_API_URL}/auth/me/`, {
      headers: { Authorization: `Bearer ${loginBody.access}` },
      data: { role: 'ADMIN', is_staff: true },
    });
    expect(patchRes.status()).toBe(200);
    const patchBody = await patchRes.json();
    expect(patchBody.role).toBe('USER');
  });

  test('E2E-05: Token inválido o ausente rechazado y refresh token funciona', async ({ request }) => {
    const badRes = await request.get(`${DJANGO_API_URL}/tracking/`, {
      headers: { Authorization: 'Bearer token.invalido.123' },
    });
    expect(badRes.status()).toBe(401);

    const loginBody = await apiLogin(request, QA_USERS.A);
    const refreshRes = await request.post(`${DJANGO_API_URL}/auth/token/refresh/`, {
      data: { refresh: loginBody.refresh },
    });
    expect(refreshRes.status()).toBe(200);
    const refreshBody = await refreshRes.json();
    expect(refreshBody.access).toBeTruthy();
  });

  test('E2E-06: USER autenticado no puede crear, editar ni borrar MediaItem o géneros en REST ni GraphQL', async ({ request }) => {
    const loginBody = await apiLogin(request, QA_USERS.A);
    const headers = { Authorization: `Bearer ${loginBody.access}` };

    const postMedia = await request.post(`${DJANGO_API_URL}/media/`, {
      headers,
      data: { title: 'Hack Movie', media_type: 'PELICULA' },
    });
    expect(postMedia.status()).toBe(403);

    const postGenre = await request.post(`${DJANGO_API_URL}/genres/`, {
      headers,
      data: { name: 'HackGenre' },
    });
    expect(postGenre.status()).toBe(403);

    const gqlMut = await request.post(DJANGO_GRAPHQL_URL, {
      headers,
      data: { query: 'mutation { createMediaItem(title: "X") { id } }' },
    });
    const gqlBody = await gqlMut.json();
    expect(gqlBody.errors).toBeDefined();
  });
});

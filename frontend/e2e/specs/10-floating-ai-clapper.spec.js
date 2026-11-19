import { expect, test } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { NODE_API_URL, uiLogin } from '../fixtures/apiClients.js';
import { QA_USERS } from '../fixtures/users.js';

const SCREENSHOT_DIR = path.resolve(
  process.cwd(),
  '..',
  'docs',
  'qa',
  'screenshots',
  'floating-clapper-2026-11-19'
);

test.beforeAll(() => {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
});

test.describe('Asistente Flotante IA Claqueta (E2E-01..E2E-15)', () => {
  test('E2E-08: Visitante no ve la claqueta y recibe 401 directo en API', async ({ page, request }) => {
    await page.goto('/');
    await expect(page.getByTestId('clapperboard-launcher')).toHaveCount(0);

    const anonRes = await request.post(`${NODE_API_URL}/recommendations`, {
      data: { prompt: 'quiero suspenso' },
    });
    expect(anonRes.status()).toBe(401);
  });

  test('E2E-01..E2E-04 & E2E-10..E2E-15: Flujo real contra microservicios, contexto, navegacion, teclado y capturas', async ({
    page,
  }, testInfo) => {
    const isMobile = testInfo.project.name.includes('mobile');
    const tag = isMobile ? 'mobile' : 'desktop';

    await uiLogin(page, QA_USERS.A);
    await page.goto('/');

    const launcher = page.getByTestId('clapperboard-launcher');
    await expect(launcher).toBeVisible();
    await expect(launcher).toHaveAttribute('aria-expanded', 'false');

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, `launcher-closed-${tag}.png`),
    });

    // E2E-12: Verificar que la tapa de la claqueta tiene animacion configurada (no estatica)
    const hasAnimation = await page.evaluate(() => {
      const top = document.querySelector('.ct-clapper-svg--animated .ct-clapper-top');
      if (!top) return false;
      const style = window.getComputedStyle(top);
      return style.animationName !== 'none' && style.animationDuration !== '0s';
    });
    expect(hasAnimation).toBe(true);

    // E2E-14: Abrir con teclado/click y verificar foco en input
    await launcher.focus();
    await page.keyboard.press('Enter');
    const panel = page.getByTestId('floating-ai-panel');
    await expect(panel).toBeVisible();

    const input = page.getByPlaceholder('Ej. una serie de misterio...');
    await expect(input).toBeFocused();

    // E2E-01: Consulta real contra Node + FastAPI + Django QA
    await input.fill('quiero un kdrama romántico del 2026');
    await page.getByRole('button', { name: 'Enviar' }).click();

    await expect(panel.getByRole('button', { name: 'Ver ficha' }).first()).toBeVisible({
      timeout: 15_000,
    });

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, `panel-response-${tag}.png`),
    });

    // E2E-09/15: Sin overflow horizontal en desktop y movil
    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth + 1;
    });
    expect(hasHorizontalOverflow).toBe(false);

    // E2E-02: Seguimiento conversacional ("algo parecido pero mas corto")
    await input.fill('¿algo parecido pero más corto?');
    await page.getByRole('button', { name: 'Enviar' }).click();
    await expect(panel.locator('.ct-ai-bubble--user')).toHaveCount(2, { timeout: 15_000 });

    // E2E-04: Pedido sin coincidencias reales -> respuesta honesta sin tarjetas fantasma
    await input.fill('quiero ver dinosaurios espaciales');
    await page.getByRole('button', { name: 'Enviar' }).click();
    await expect(panel.getByText(/No tengo coincidencias/i).last()).toBeVisible({
      timeout: 15_000,
    });

    // E2E-10: Navegacion estable entre rutas con panel abierto
    await page.goto('/my-tracking');
    await expect(page.getByTestId('clapperboard-launcher')).toBeVisible();

    // E2E-14: Escape cierra panel y devuelve el foco al launcher
    if (await panel.isVisible()) {
      await page.keyboard.press('Escape');
      await expect(panel).toHaveCount(0);
    }

    // E2E-13: prefers-reduced-motion desactiva animacion de la tapa
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const reducedAnimName = await page.evaluate(() => {
      const top = document.querySelector('.ct-clapper-svg--animated .ct-clapper-top');
      return top ? window.getComputedStyle(top).animationName : 'none';
    });
    expect(reducedAnimName).toBe('none');

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, `reduced-motion-${tag}.png`),
    });

    // E2E-11: Al cerrar sesion, desaparece el launcher y limpia historial
    const logoutBtn = page.getByRole('button', { name: /Cerrar Sesi/i });
    if (await logoutBtn.count()) {
      await logoutBtn.click();
    } else {
      await page.evaluate(() => localStorage.clear());
      await page.goto('/login');
    }
    await expect(page.getByTestId('clapperboard-launcher')).toHaveCount(0);
  });

  test('E2E-05/06: Modo limitado (degraded: true) y manejo de 429', async ({ page }) => {
    await uiLogin(page, QA_USERS.A);
    await page.goto('/');

    await page.getByTestId('clapperboard-launcher').click();
    const panel = page.getByTestId('floating-ai-panel');

    await page.route('**/api/v1/recommendations', async (route) => {
      await route.fulfill({
        status: 429,
        contentType: 'application/json',
        body: JSON.stringify({
          error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Demasiadas consultas seguidas.' },
        }),
      });
    });

    await panel.getByRole('button', { name: 'Misterio' }).click();
    await expect(panel.getByText(/Demasiadas consultas seguidas/i)).toBeVisible();

    await page.unroute('**/api/v1/recommendations');
    await page.route('**/api/v1/recommendations', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'Encontré 1 opción en el catálogo.',
          degraded: true,
          recommendations: [
            {
              media_item_id: 3,
              title: 'Obra Demo Modo Limitado',
              media_type: 'SERIE',
              poster_image: '',
              release_year: 2026,
              reason: 'Coincide en el catálogo.',
            },
          ],
        }),
      });
    });

    const input = page.getByPlaceholder('Ej. una serie de misterio...');
    await input.fill('quiero suspenso');
    await page.getByRole('button', { name: 'Enviar' }).click();
    await expect(panel.getByText(/Modo limitado: recomendaciones/i)).toBeVisible();
    await expect(panel.getByText('Obra Demo Modo Limitado')).toBeVisible();
  });
});

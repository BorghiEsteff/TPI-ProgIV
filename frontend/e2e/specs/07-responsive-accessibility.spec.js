import { expect, test } from '@playwright/test';
import { uiLogin } from '../fixtures/apiClients.js';
import { QA_USERS } from '../fixtures/users.js';

test.describe('Responsive, accesibilidad y consola limpia (E2E-37..E2E-40)', () => {
  test('E2E-37..E2E-40: Flujo principal sin overflow horizontal ni errores JS, con controles accesibles por teclado', async ({ page }) => {
    const pageErrors = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    await page.goto('/');
    const hasOverflowHome = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 2
    );
    expect(hasOverflowHome).toBe(false);

    await uiLogin(page, QA_USERS.A);
    await page.goto('/my-tracking');
    const hasOverflowTracking = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 2
    );
    expect(hasOverflowTracking).toBe(false);

    // Accesibilidad: botones de estrellas tienen aria-label accesible
    const starBtn = page.getByRole('button', { name: '4 estrellas' }).first();
    if ((await starBtn.count()) > 0) {
      await starBtn.focus();
      await expect(starBtn).toBeFocused();
    }

    await page.goto('/recommendations');
    const hasOverflowRec = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 2
    );
    expect(hasOverflowRec).toBe(false);

    expect(pageErrors).toEqual([]);
  });
});

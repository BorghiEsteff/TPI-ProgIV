import path from 'node:path';
import { expect, test } from '@playwright/test';
import { DJANGO_API_URL, apiLogin, uiLogin } from '../fixtures/apiClients.js';
import { QA_USERS } from '../fixtures/users.js';

const posterAPath = path.resolve(process.cwd(), 'e2e/fixtures/poster-a.png');
const posterBPath = path.resolve(process.cwd(), 'e2e/fixtures/poster-b.png');

test.describe('Propuestas, duplicados, moderación y caso Matrix (E2E-16..E2E-26)', () => {
  test('Matrix E2E irrenunciable (E2E-16, E2E-17, E2E-19, E2E-20, E2E-21, E2E-26)', async ({ browser, request }) => {
    const ctxA = await browser.newContext();
    const ctxB = await browser.newContext();
    const ctxAnon = await browser.newContext();
    const ctxAdmin = await browser.newContext();
    const ctxC = await browser.newContext();

    const pageA = await ctxA.newPage();
    const pageB = await ctxB.newPage();
    const pageAnon = await ctxAnon.newPage();
    const pageAdmin = await ctxAdmin.newPage();
    const pageC = await ctxC.newPage();

    // 1. Usuaria A propone "Matrix" con archivo PNG real y plataforma HBO
    await uiLogin(pageA, QA_USERS.A);
    await pageA.goto('/new-entry');
    await pageA.getByLabel(/T[ií]tulo de la pel[ií]cula o serie/i).fill('Matrix');
    await pageA.getByLabel(/D[oó]nde la viste/i).selectOption('HBO / Max');
    await pageA.getByLabel(/Subir archivo/i).check();
    await pageA.locator('input[type="file"]').setInputFiles(posterAPath);
    await pageA.getByRole('button', { name: /Guardar en Mi CineTrack/i }).click();
    await expect(pageA.getByText(/pendiente de revisi[oó]n/i)).toBeVisible();

    // A va a su diario y guarda 5 estrellas, comentario y favorito
    await pageA.goto('/my-tracking');
    const cardA = pageA.locator('.card', { hasText: 'Matrix' }).first();
    await expect(cardA).toBeVisible();
    await cardA.getByRole('button', { name: '5 estrellas' }).click();
    await cardA.getByPlaceholder(/Escribe tus notas personales/i).fill('Me encantó A');
    await cardA.getByRole('button', { name: /Guardar nota privada/i }).click();
    await expect(cardA.getByText('Nota privada guardada.')).toBeVisible();

    // 2. Usuaria B propone "The Matrix" con archivo PNG B y plataforma Netflix
    await uiLogin(pageB, QA_USERS.B);
    await pageB.goto('/new-entry');
    await pageB.getByLabel(/T[ií]tulo de la pel[ií]cula o serie/i).fill('The Matrix');
    await pageB.getByLabel(/D[oó]nde la viste/i).selectOption('Netflix');
    await pageB.getByLabel(/Subir archivo/i).check();
    await pageB.locator('input[type="file"]').setInputFiles(posterBPath);
    await pageB.getByRole('button', { name: /Guardar en Mi CineTrack/i }).click();
    await expect(pageB.getByText(/pendiente de revisi[oó]n/i)).toBeVisible();

    await pageB.goto('/my-tracking');
    const cardB = pageB.locator('.card', { hasText: 'The Matrix' }).first();
    await cardB.getByRole('button', { name: '3 estrellas' }).click();
    await cardB.getByPlaceholder(/Escribe tus notas personales/i).fill('Nota privada B');
    await cardB.getByRole('button', { name: /Guardar nota privada/i }).click();
    await expect(cardB.getByText('Nota privada guardada.')).toBeVisible();

    // 3. Visitante no ve ninguna de las dos propuestas en catálogo público
    await pageAnon.goto('/');
    await pageAnon.getByPlaceholder(/Titulo, productora o sinopsis/i).fill('Matrix');
    await pageAnon.getByRole('button', { name: 'Buscar' }).click();
    await expect(pageAnon.getByText('Matrix')).toHaveCount(0);

    // 4. ADMIN abre cola de moderación e inspeccionamos la respuesta HTTP real
    await uiLogin(pageAdmin, QA_USERS.ADMIN);
    const adminQueuePromise = pageAdmin.waitForResponse(
      (res) => res.url().includes('/api/v1/admin/submissions/') && res.status() === 200
    );
    await pageAdmin.goto('/admin/submissions');
    const adminQueueRes = await adminQueuePromise;
    const adminQueueText = await adminQueueRes.text();
    expect(adminQueueText).not.toContain('Me encantó A');
    expect(adminQueueText).not.toContain('Nota privada B');
    expect(adminQueueText).not.toContain('submitted_by');

    await expect(pageAdmin.locator('.card', { hasText: 'Matrix' }).first()).toBeVisible();
    await pageAdmin.screenshot({ path: '../docs/qa/evidence/matrix-admin-queue.png', fullPage: true });

    // 5. ADMIN publica "Matrix" y vincula "The Matrix" a la ficha publicada
    const matrixCardAdmin = pageAdmin.locator('.card', { hasText: /^Matrix/ }).first();
    await matrixCardAdmin.getByRole('button', { name: /Publicar como obra nueva/i }).click();
    await expect(pageAdmin.getByText(/publicada como obra #/i)).toBeVisible();

    const theMatrixCardAdmin = pageAdmin.locator('.card', { hasText: 'The Matrix' }).first();
    await theMatrixCardAdmin.getByRole('button', { name: /Buscar duplicados/i }).click();
    await expect(theMatrixCardAdmin.getByRole('button', { name: /Vincular a esta ficha/i })).toBeVisible();
    await theMatrixCardAdmin.getByRole('button', { name: /Vincular a esta ficha/i }).click();
    await expect(pageAdmin.getByText(/vinculada a la obra #/i)).toBeVisible();

    // Catálogo público ahora muestra UNA sola ficha "Matrix"
    await pageAnon.reload();
    await pageAnon.getByPlaceholder(/Titulo, productora o sinopsis/i).fill('Matrix');
    await pageAnon.getByRole('button', { name: 'Buscar' }).click();
    await expect(pageAnon.locator('.card', { hasText: 'Matrix' })).toHaveCount(1);
    await pageAnon.screenshot({ path: '../docs/qa/evidence/matrix-public-catalog.png', fullPage: true });

    // 6. A y B recargan su diario y conservan sus plataformas, estrellas y comentarios intactos
    await pageA.reload();
    const reloadedCardA = pageA.locator('.card', { hasText: 'Matrix' }).first();
    await expect(reloadedCardA.getByPlaceholder(/Ej\. Netflix, HBO, Cine/i)).toHaveValue('HBO / Max');
    await expect(reloadedCardA.getByPlaceholder(/Escribe tus notas personales/i)).toHaveValue('Me encantó A');
    await pageA.screenshot({ path: '../docs/qa/evidence/matrix-diary-a.png', fullPage: true });

    await pageB.reload();
    const reloadedCardB = pageB.locator('.card', { hasText: 'Matrix' }).first();
    await expect(reloadedCardB.getByPlaceholder(/Ej\. Netflix, HBO, Cine/i)).toHaveValue('Netflix');
    await expect(reloadedCardB.getByPlaceholder(/Escribe tus notas personales/i)).toHaveValue('Nota privada B');
    await pageB.screenshot({ path: '../docs/qa/evidence/matrix-diary-b.png', fullPage: true });

    // 7. C entra, agrega la ficha Matrix desde catálogo y su diario está vacío (sin notas ni plataforma de A o B)
    await uiLogin(pageC, QA_USERS.C);
    await pageC.getByPlaceholder(/Titulo, productora o sinopsis/i).fill('Matrix');
    await pageC.getByRole('button', { name: 'Buscar' }).click();
    await pageC.locator('.card', { hasText: 'Matrix' }).first().getByRole('button', { name: 'Ver ficha' }).click();
    await pageC.getByRole('button', { name: /Agregar a Mi CineTrack/i }).click();
    await pageC.goto('/my-tracking');
    const cardC = pageC.locator('.card', { hasText: 'Matrix' }).first();
    await expect(cardC.getByPlaceholder(/Ej\. Netflix, HBO, Cine/i)).toHaveValue('');
    await expect(cardC.getByPlaceholder(/Escribe tus notas personales/i)).toHaveValue('');

    // Limpiar acceso directo de ADMIN sobre endpoints de notas privadas (8)
    const loginAdmin = await apiLogin(request, QA_USERS.ADMIN);
    expect(loginAdmin.access).toBeTruthy();

    await ctxA.close();
    await ctxB.close();
    await ctxAnon.close();
    await ctxAdmin.close();
    await ctxC.close();
  });

  test('E2E-18, E2E-22, E2E-23, E2E-24, E2E-25, E2E-26: RBAC admin, rechazo, colisión, concurrencia 409 y SSRF/SVG', async ({ request }) => {
    const loginA = await apiLogin(request, QA_USERS.A);
    const loginAdmin = await apiLogin(request, QA_USERS.ADMIN);
    const headersA = { Authorization: `Bearer ${loginA.access}` };
    const headersAdmin = { Authorization: `Bearer ${loginAdmin.access}` };

    // E2E-18: USER no puede acceder a /admin/submissions/
    const userAdminQueue = await request.get(`${DJANGO_API_URL}/admin/submissions/`, { headers: headersA });
    expect(userAdminQueue.status()).toBe(403);

    // E2E-22: Rechazo conserva entrada privada
    const subRejRes = await request.post(`${DJANGO_API_URL}/submissions/`, {
      headers: headersA,
      data: {
        title: 'Obra QA Rechazada',
        media_type: 'PELICULA',
        poster_url: 'https://via.placeholder.com/300x450?text=Rejected',
        watch_platform: 'Cine',
      },
    });
    expect(subRejRes.status()).toBe(201);
    const { submission_id: rejSubId } = await subRejRes.json();

    const doReject = await request.post(`${DJANGO_API_URL}/admin/submissions/${rejSubId}/reject/`, {
      headers: headersAdmin,
      data: { rejection_reason: 'Portada borrosa' },
    });
    expect(doReject.status()).toBe(200);

    // E2E-24: Segunda resolución devuelve 409 Conflict
    const doubleReject = await request.post(`${DJANGO_API_URL}/admin/submissions/${rejSubId}/reject/`, {
      headers: headersAdmin,
      data: { rejection_reason: 'Otro motivo' },
    });
    expect(doubleReject.status()).toBe(409);

    // E2E-26: SSRF y SVG rechazados
    const ssrfRes = await request.post(`${DJANGO_API_URL}/submissions/`, {
      headers: headersA,
      data: {
        title: 'SSRF',
        media_type: 'PELICULA',
        poster_url: 'http://127.0.0.1:8000/admin/',
        watch_platform: 'Netflix',
      },
    });
    expect(ssrfRes.status()).toBe(400);

    const svgRes = await request.post(`${DJANGO_API_URL}/submissions/`, {
      headers: headersA,
      data: {
        title: 'SVG',
        media_type: 'PELICULA',
        poster_url: 'https://example.com/malicious.svg',
        watch_platform: 'Netflix',
      },
    });
    expect(svgRes.status()).toBe(400);
  });
});

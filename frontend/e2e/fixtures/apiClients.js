export const DJANGO_API_URL = process.env.QA_DJANGO_API_URL || 'http://127.0.0.1:8000/api/v1';
export const DJANGO_GRAPHQL_URL = process.env.QA_DJANGO_GRAPHQL_URL || 'http://127.0.0.1:8000/graphql/';
export const NODE_API_URL = process.env.QA_NODE_API_URL || 'http://127.0.0.1:5000/api/v1';
export const NODE_GRAPHQL_URL = process.env.QA_NODE_GRAPHQL_URL || 'http://127.0.0.1:5000/graphql';
export const AI_SERVICE_URL = process.env.QA_AI_URL || 'http://127.0.0.1:8002';

export async function apiLogin(request, user) {
  const res = await request.post(`${DJANGO_API_URL}/auth/login/`, {
    data: { email: user.email, password: user.password },
  });
  if (!res.ok()) {
    throw new Error(`Login failed for ${user.email}: ${res.status()}`);
  }
  const body = await res.json();
  return body;
}

export async function uiLogin(page, user) {
  await page.goto('/login');
  await page.getByLabel(/Correo electr/i).fill(user.email);
  await page.getByLabel(/Contrase/i).fill(user.password);
  await page.getByRole('button', { name: /^Ingresar$/i }).click();
  await page.waitForURL((url) => !url.pathname.endsWith('/login'));
}

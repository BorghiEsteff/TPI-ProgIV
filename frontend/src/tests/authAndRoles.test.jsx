import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AppNavbar from '../components/layout/AppNavbar';
import ProtectedRoute from '../components/layout/ProtectedRoute';
import RoleGuard from '../components/layout/RoleGuard';
import { AuthProvider } from '../context/AuthContext';
import LoginPage from '../pages/LoginPage';
import * as authService from '../services/authService';

vi.mock('../services/authService', () => ({
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  getProfile: vi.fn(),
  getStoredToken: vi.fn(),
  getStoredUser: vi.fn(),
}));

describe('AuthContext, LoginPage, AppNavbar, ProtectedRoute y RoleGuard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authService.getStoredToken.mockReturnValue(null);
    authService.getStoredUser.mockReturnValue(null);
  });

  it('LoginPage normaliza email a minusculas, evita redirigir USER a /admin y muestra Moderacion solo a ADMIN', async () => {
    const user = userEvent.setup();
    authService.login.mockResolvedValueOnce({
      access: 'tok-user',
      refresh: 'ref-user',
      user: { id: 2, username: 'qa_user_a', role: 'USER' },
    });

    render(
      <AuthProvider>
        <MemoryRouter initialEntries={[{ pathname: '/login', state: { from: { pathname: '/admin/submissions' } } }]}>
          <AppNavbar />
          <Routes>
            <Route path="/" element={<div>Catalogo Inicio</div>} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/admin/submissions" element={<div>Admin Cola</div>} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    );

    await user.type(screen.getByLabelText(/Correo electronico/i), 'QA_A@CINETRACK.LOCAL');
    await user.type(screen.getByLabelText(/Contrase[nñ]a/i), 'QaUserPass123!');
    await user.click(screen.getByRole('button', { name: /Ingresar/i }));

    await waitFor(() => {
      expect(authService.login).toHaveBeenCalledWith({
        email: 'qa_a@cinetrack.local',
        password: 'QaUserPass123!',
      });
    });

    // USER no debe aterrizar en /admin/submissions sino en /
    expect(await screen.findByText('Catalogo Inicio')).toBeInTheDocument();
    expect(screen.getByText('qa_user_a')).toBeInTheDocument();
    expect(screen.queryByText('Moderación')).not.toBeInTheDocument();
  });

  it('LoginPage muestra error claro ante credenciales 401 sin autenticar', async () => {
    const user = userEvent.setup();
    authService.login.mockRejectedValueOnce({ status: 401, message: 'Credenciales inválidas' });

    render(
      <AuthProvider>
        <MemoryRouter initialEntries={['/login']}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    );

    await user.type(screen.getByLabelText(/Correo electronico/i), 'bad@cinetrack.local');
    await user.type(screen.getByLabelText(/Contrase[nñ]a/i), 'Wrong123!');
    await user.click(screen.getByRole('button', { name: /Ingresar/i }));

    expect(await screen.findByText(/Credenciales inválidas/i)).toBeInTheDocument();
  });

  it('RoleGuard y ProtectedRoute bloquean acceso no autorizado y permiten ADMIN hidratado', async () => {
    authService.getStoredToken.mockReturnValue('tok-admin');
    authService.getStoredUser.mockReturnValue({ id: 1, username: 'qa_admin', role: 'ADMIN' });
    authService.getProfile.mockResolvedValue({ id: 1, username: 'qa_admin', role: 'ADMIN' });

    render(
      <AuthProvider>
        <MemoryRouter initialEntries={['/admin/submissions']}>
          <AppNavbar />
          <Routes>
            <Route path="/login" element={<div>Login View</div>} />
            <Route element={<ProtectedRoute />}>
              <Route
                path="/admin/submissions"
                element={
                  <RoleGuard allowedRoles={['ADMIN']} fallback="message">
                    <div>Panel Admin Visible</div>
                  </RoleGuard>
                }
              />
            </Route>
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    );

    expect(await screen.findByText('Panel Admin Visible')).toBeInTheDocument();
    expect(screen.getByText('Moderación')).toBeInTheDocument();
  });

  it('AuthContext limpia sesion automaticamente si token almacenado falla al hidratar /auth/me/', async () => {
    authService.getStoredToken.mockReturnValue('expired-token');
    authService.getStoredUser.mockReturnValue({ id: 1, username: 'old_admin', role: 'ADMIN' });
    authService.getProfile.mockRejectedValueOnce({ status: 401, message: 'Token inválido' });

    render(
      <AuthProvider>
        <MemoryRouter initialEntries={['/my-tracking']}>
          <Routes>
            <Route path="/login" element={<div>Redirigido a Login</div>} />
            <Route element={<ProtectedRoute />}>
              <Route path="/my-tracking" element={<div>Mi Diario Privado</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    );

    expect(await screen.findByText('Redirigido a Login')).toBeInTheDocument();
    expect(authService.logout).toHaveBeenCalled();
  });
});

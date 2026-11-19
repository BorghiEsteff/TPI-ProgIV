import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import FloatingRecommendationChat from '../components/recommendations/FloatingRecommendationChat';
import * as useAuthModule from '../hooks/useAuth';
import * as recommendationService from '../services/recommendationService';
import * as trackingService from '../services/trackingService';

vi.mock('../services/recommendationService', () => ({
  askRecommendations: vi.fn(),
}));

vi.mock('../services/trackingService', () => ({
  createTracking: vi.fn(),
}));

describe('FloatingRecommendationChat y ClapperboardLauncher (UI-01..UI-16)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  it('UI-01: no se muestra a visitantes no autenticados', () => {
    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      isAuthenticated: false,
      user: null,
    });

    render(
      <MemoryRouter>
        <FloatingRecommendationChat />
      </MemoryRouter>
    );

    expect(screen.queryByTestId('clapperboard-launcher')).not.toBeInTheDocument();
  });

  it('UI-02/03/04/15/16: abre y cierra con teclado, maneja foco, Escape y usa SVG local sin hosts externos', async () => {
    const user = userEvent.setup();
    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      isAuthenticated: true,
      user: { id: 1, username: 'fan_series', role: 'USER' },
    });

    render(
      <MemoryRouter>
        <FloatingRecommendationChat />
      </MemoryRouter>
    );

    const launcher = screen.getByTestId('clapperboard-launcher');
    expect(launcher).toHaveAttribute('aria-expanded', 'false');
    expect(launcher).toHaveAttribute('title', '¿Qué veo hoy?');
    expect(launcher.querySelector('svg')).toBeTruthy();

    await user.click(launcher);
    expect(launcher).toHaveAttribute('aria-expanded', 'true');
    const panel = screen.getByTestId('floating-ai-panel');
    expect(panel).toBeInTheDocument();

    const input = screen.getByPlaceholderText('Ej. una serie de misterio...');
    await waitFor(() => expect(input).toHaveFocus());

    await user.keyboard('{Escape}');
    expect(screen.queryByTestId('floating-ai-panel')).not.toBeInTheDocument();
    expect(launcher).toHaveFocus();
  });

  it('UI-05/06/07/08/11: envia consulta, evita duplicados, muestra tarjeta con /media/<id> y modo limitado', async () => {
    const user = userEvent.setup();
    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      isAuthenticated: true,
      user: { id: 1, username: 'fan_series', role: 'USER' },
    });

    let resolveReq;
    recommendationService.askRecommendations.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveReq = resolve;
        })
    );

    render(
      <MemoryRouter>
        <FloatingRecommendationChat />
      </MemoryRouter>
    );

    await user.click(screen.getByTestId('clapperboard-launcher'));
    const input = screen.getByPlaceholderText('Ej. una serie de misterio...');
    expect(input).toHaveAttribute('maxLength', '300');

    await user.type(input, 'Quiero una serie de misterio');
    const sendBtn = screen.getByRole('button', { name: 'Enviar' });
    await user.click(sendBtn);
    await user.click(sendBtn);

    expect(recommendationService.askRecommendations).toHaveBeenCalledTimes(1);
    expect(sendBtn).toBeDisabled();

    resolveReq({
      message: 'Encontré 1 opción en el catálogo.',
      degraded: true,
      recommendations: [
        {
          media_item_id: 12,
          title: 'Dark',
          media_type: 'SERIE',
          poster_image: '',
          release_year: 2017,
          reason: 'Suspenso y misterio en tres generaciones.',
        },
      ],
    });

    await waitFor(() => {
      expect(screen.getByText('Dark')).toBeInTheDocument();
    });

    expect(screen.getByText(/Modo limitado/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ver ficha' })).toHaveAttribute('href', '/media/12');

    trackingService.createTracking.mockResolvedValue({ id: 99 });
    await user.click(screen.getByRole('button', { name: 'Agregar' }));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'En Mi CineTrack' })).toBeDisabled();
    });
  });

  it('UI-09/10/12/13: maneja error 429, sin coincidencias y limpia historial al cerrar sesion', async () => {
    const user = userEvent.setup();
    const authSpy = vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      isAuthenticated: true,
      user: { id: 1, username: 'fan_series', role: 'USER' },
    });

    const { rerender } = render(
      <MemoryRouter>
        <FloatingRecommendationChat />
      </MemoryRouter>
    );

    await user.click(screen.getByTestId('clapperboard-launcher'));

    recommendationService.askRecommendations.mockRejectedValueOnce({
      status: 429,
      message: 'Rate limit',
    });

    await user.click(screen.getByRole('button', { name: 'Misterio' }));
    await waitFor(() => {
      expect(screen.getByText(/Demasiadas consultas seguidas/i)).toBeInTheDocument();
    });

    recommendationService.askRecommendations.mockResolvedValueOnce({
      message: 'No tengo coincidencias de ese tipo en el catálogo.',
      recommendations: [],
      degraded: false,
    });
    const input = screen.getByPlaceholderText('Ej. una serie de misterio...');
    await user.type(input, 'Romance');
    await user.click(screen.getByRole('button', { name: 'Enviar' }));
    await waitFor(() => {
      expect(screen.getByText(/No tengo coincidencias/i)).toBeInTheDocument();
    });

    // Cerrar sesion: oculta el widget y limpia historial al volver a iniciar sesion
    authSpy.mockReturnValue({ isAuthenticated: false, user: null });
    rerender(
      <MemoryRouter>
        <FloatingRecommendationChat />
      </MemoryRouter>
    );
    expect(screen.queryByTestId('clapperboard-launcher')).not.toBeInTheDocument();

    authSpy.mockReturnValue({
      isAuthenticated: true,
      user: { id: 2, username: 'otro_usuario', role: 'USER' },
    });
    rerender(
      <MemoryRouter>
        <FloatingRecommendationChat />
      </MemoryRouter>
    );
    await user.click(screen.getByTestId('clapperboard-launcher'));
    expect(screen.queryByText(/No tengo coincidencias/i)).not.toBeInTheDocument();
  });
});

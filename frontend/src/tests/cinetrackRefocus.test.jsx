import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, test, vi } from 'vitest';
import PersonalNoteEditor from '../components/notes/PersonalNoteEditor';
import StarRating from '../components/notes/StarRating';
import FloatingRecommendationChat from '../components/recommendations/FloatingRecommendationChat';
import * as recommendationService from '../services/recommendationService';
import * as trackingService from '../services/trackingService';
import RegisterPage from '../pages/RegisterPage';
import { AuthContext } from '../context/AuthContext';

vi.mock('../services/recommendationService', () => ({
  askRecommendations: vi.fn(),
}));

vi.mock('../services/trackingService', () => ({
  createTracking: vi.fn(),
}));

if (typeof window !== 'undefined' && !window.HTMLElement.prototype.scrollIntoView) {
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
}

describe('Componentes Reenfocados de CineTrack (P3/P5)', () => {
  test('StarRating permite seleccionar 1..5 estrellas y limpiar a null', () => {
    const onChange = vi.fn();
    render(<StarRating value={3} onChange={onChange} />);

    fireEvent.click(screen.getByLabelText('5 estrellas'));
    expect(onChange).toHaveBeenCalledWith(5);

    fireEvent.click(screen.getByLabelText('Quitar puntuación'));
    expect(onChange).toHaveBeenCalledWith(null);
  });

  test('PersonalNoteEditor envía valoración entera 1..5 y comentario privado', async () => {
    const onSave = vi.fn().mockResolvedValue({});
    render(<PersonalNoteEditor initialRating={null} initialComment="" onSave={onSave} />);

    fireEvent.click(screen.getByLabelText('4 estrellas'));
    fireEvent.change(screen.getByPlaceholderText(/Escribe tus notas personales/i), {
      target: { value: 'Muy buena película' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Guardar nota privada/i }));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith({
        rating: 4,
        comment: 'Muy buena película',
      });
    });
  });

  test('FloatingRecommendationChat es el único acceso visual de IA y permite agregar a Mi CineTrack', async () => {
    recommendationService.askRecommendations.mockResolvedValue({
      message: 'Encontré una serie:',
      degraded: false,
      recommendations: [
        {
          media_item_id: 12,
          title: 'Amor en Seúl 2026',
          media_type: 'SERIE',
          reason: 'Kdrama romántico 2026',
        },
      ],
    });
    trackingService.createTracking.mockResolvedValue({ id: 99 });

    render(
      <MemoryRouter>
        <AuthContext.Provider value={{ isAuthenticated: true, user: { id: 1, username: 'ana' } }}>
          <FloatingRecommendationChat />
        </AuthContext.Provider>
      </MemoryRouter>
    );

    fireEvent.click(screen.getByTestId('clapperboard-launcher'));
    fireEvent.change(screen.getByLabelText(/Describe qué querés ver en CineTrack/i), {
      target: { value: 'quiero un kdrama romántico del 2026' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Enviar/i }));

    await waitFor(() => {
      expect(screen.getByText('Amor en Seúl 2026')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Agregar' }));
    await waitFor(() => {
      expect(trackingService.createTracking).toHaveBeenCalledWith({
        media_item: 12,
        status: 'PENDIENTE',
      });
    });
  });

  test('RegisterPage no muestra selector de rol', () => {
    render(
      <MemoryRouter>
        <AuthContext.Provider value={{ register: vi.fn(), isAuthenticated: false }}>
          <RegisterPage />
        </AuthContext.Provider>
      </MemoryRouter>
    );

    expect(screen.queryByLabelText(/Perfil en la plataforma/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/CRITIC/i)).not.toBeInTheDocument();
  });
});

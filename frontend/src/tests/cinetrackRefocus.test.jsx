import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, test, vi } from 'vitest';
import PersonalNoteEditor from '../components/notes/PersonalNoteEditor';
import StarRating from '../components/notes/StarRating';
import RecommendationChat from '../components/recommendations/RecommendationChat';
import RegisterPage from '../pages/RegisterPage';
import { AuthContext } from '../context/AuthContext';

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

  test('RecommendationChat muestra recomendaciones reales y permite agregar a Mi CineTrack', async () => {
    const onAsk = vi.fn().mockResolvedValue({
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
    const onAddToDiary = vi.fn().mockResolvedValue({});

    render(
      <MemoryRouter>
        <RecommendationChat onAsk={onAsk} onAddToDiary={onAddToDiary} />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText(/kdrama romántico/i), {
      target: { value: 'quiero un kdrama romántico del 2026' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Pedir recomendaciones/i }));

    await waitFor(() => {
      expect(screen.getByText('Amor en Seúl 2026')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Agregar a Mi CineTrack/i }));
    await waitFor(() => {
      expect(onAddToDiary).toHaveBeenCalledWith(12);
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

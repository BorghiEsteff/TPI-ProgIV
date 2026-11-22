import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, test, vi } from 'vitest';
import GenreMultiSelect from '../components/common/GenreMultiSelect';
import MyTrackingPage from '../pages/MyTrackingPage';
import * as personalNoteService from '../services/personalNoteService';
import * as trackingService from '../services/trackingService';
import { normalizeSearchText } from '../utils/textSearch';

describe('Búsqueda tolerante en Frontend (BUS-15..19)', () => {
  test('normalizeSearchText elimina tildes, normaliza espacios y preserva ñ', () => {
    expect(normalizeSearchText('  Ciencia   Ficción ')).toBe('ciencia ficcion');
    expect(normalizeSearchText('Animación')).toBe('animacion');
    expect(normalizeSearchText('La niña de mis ojos')).toBe('la niña de mis ojos');
    expect(normalizeSearchText('La nina de mis ojos')).not.toBe('la niña de mis ojos');
  });

  test('BUS-19: GenreMultiSelect encuentra géneros acentuados sin tildes y conserva selección', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const genres = [
      { id: 1, name: 'Animación' },
      { id: 2, name: 'Ciencia Ficción' },
      { id: 3, name: 'Drama' },
    ];

    render(<GenreMultiSelect genres={genres} selectedIds={[3]} onChange={onChange} />);

    const searchInput = screen.getByTestId('genre-select-search');
    await user.type(searchInput, 'animacion');
    expect(screen.getByTestId('genre-select-option-1')).toHaveTextContent(/Animación/);
    expect(screen.queryByTestId('genre-select-option-2')).not.toBeInTheDocument();

    await user.clear(searchInput);
    await user.type(searchInput, 'ficcion');
    expect(screen.getByTestId('genre-select-option-2')).toHaveTextContent(/Ciencia Ficción/);

    await user.click(screen.getByTestId('genre-select-option-2'));
    expect(onChange).toHaveBeenCalledWith([3, 2]);
  });

  test('BUS-15/16/18: MyTrackingPage consulta al backend con search y mantiene barra de filtros con 0 resultados', async () => {
    const user = userEvent.setup();
    const getMyTrackingSpy = vi.spyOn(trackingService, 'getMyTracking').mockResolvedValue({
      data: {
        count: 1,
        results: [
          {
            id: 10,
            media_item: 1,
            display_title: 'Así aprenderás',
            display_media_type: 'PELICULA',
            status: 'VISTO',
            is_favorite: true,
            watch_platform: 'Disney+',
            current_seconds: 0,
          },
        ],
      },
      isDegraded: false,
    });
    vi.spyOn(trackingService, 'getReconciliations').mockResolvedValue([]);
    vi.spyOn(trackingService, 'getTrackingSummary').mockResolvedValue({
      TODOS: 27,
      PENDIENTE: 20,
      VIENDO: 5,
      VISTO: 2,
      ABANDONADO: 0,
      FAVORITOS: 1,
    });
    vi.spyOn(personalNoteService, 'getNotesBatch').mockResolvedValue([]);

    render(
      <MemoryRouter>
        <MyTrackingPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Así aprenderás')).toBeInTheDocument();
    });

    getMyTrackingSpy.mockResolvedValueOnce({
      data: { count: 0, results: [] },
      isDegraded: false,
    });

    const input = screen.getByPlaceholderText('Buscar en mi diario...');
    await user.type(input, 'disney +');

    await waitFor(() => {
      expect(getMyTrackingSpy).toHaveBeenLastCalledWith(
        expect.objectContaining({ search: 'disney +', page: 1, page_size: 20 })
      );
    });
    expect(screen.getByPlaceholderText('Buscar en mi diario...')).toBeInTheDocument();
    expect(screen.getByText('Sin coincidencias')).toBeInTheDocument();
  });
});

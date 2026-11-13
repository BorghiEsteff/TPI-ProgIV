import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import MediaCard from '../components/catalog/MediaCard';
import MediaFilterBar from '../components/catalog/MediaFilterBar';

describe('Botones e interacciones de Catalogo', () => {
  it('MediaFilterBar dispara callbacks al cambiar tipo, genero, modo de consulta, buscar y limpiar', async () => {
    const user = userEvent.setup();
    const onFilterChange = vi.fn();
    const onQueryModeChange = vi.fn();
    const onSubmit = vi.fn();
    const onReset = vi.fn();

    render(
      <MediaFilterBar
        filters={{ search: '', media_type: '', genre: '' }}
        genres={[
          { id: 1, name: 'Ciencia Ficcion' },
          { id: 2, name: 'Drama' },
        ]}
        queryMode="REST"
        onFilterChange={onFilterChange}
        onQueryModeChange={onQueryModeChange}
        onSubmit={onSubmit}
        onReset={onReset}
      />
    );

    const selects = screen.getAllByRole('combobox');
    // selects[0]: Tipo, selects[1]: Genero, selects[2]: Modo de consulta
    await user.selectOptions(selects[0], 'SERIE');
    expect(onFilterChange).toHaveBeenCalledWith({
      search: '',
      media_type: 'SERIE',
      genre: '',
    });

    await user.selectOptions(selects[1], '1');
    expect(onFilterChange).toHaveBeenCalledWith({
      search: '',
      media_type: '',
      genre: '1',
    });

    await user.selectOptions(selects[2], 'GRAPHQL');
    expect(onQueryModeChange).toHaveBeenCalledWith('GRAPHQL');

    await user.click(screen.getByRole('button', { name: 'Buscar' }));
    expect(onSubmit).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: 'Limpiar' }));
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it('MediaCard muestra enlaces de detalle/sala y ejecuta onTrackMedia solo cuando hay sesion', async () => {
    const user = userEvent.setup();
    const onTrackMedia = vi.fn();
    const sampleMedia = {
      id: 42,
      title: 'Dark',
      media_type: 'SERIE',
      release_date: '2017-12-01',
      producer: 'Netflix',
      synopsis: 'Viajes en el tiempo en Winden.',
      genres: [{ id: 1, name: 'Ciencia Ficcion' }],
    };

    const { rerender } = render(
      <MemoryRouter>
        <MediaCard
          item={sampleMedia}
          isAuthenticated={false}
          onTrackMedia={onTrackMedia}
        />
      </MemoryRouter>
    );

    expect(screen.getByRole('button', { name: 'Detalle y Resenas' })).toHaveAttribute(
      'href',
      '/media/42'
    );
    expect(screen.getByRole('button', { name: 'Sala en Vivo' })).toHaveAttribute(
      'href',
      '/watch-rooms/42'
    );
    expect(
      screen.queryByRole('button', { name: 'Agregar a Mi Progreso' })
    ).not.toBeInTheDocument();

    rerender(
      <MemoryRouter>
        <MediaCard
          item={sampleMedia}
          isAuthenticated={true}
          isTracked={false}
          onTrackMedia={onTrackMedia}
        />
      </MemoryRouter>
    );

    const trackBtn = screen.getByRole('button', { name: 'Agregar a Mi Progreso' });
    await user.click(trackBtn);
    expect(onTrackMedia).toHaveBeenCalledWith(sampleMedia);
  });
});


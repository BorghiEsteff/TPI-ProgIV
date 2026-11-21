import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import TrackingProgressEditor from '../components/tracking/TrackingProgressEditor';

describe('TrackingProgressEditor unificado', () => {
  const baseFilmProgress = {
    id: 7,
    media_item: 10,
    watch_platform: 'Netflix',
    status: 'VIENDO',
    current_seconds: 5075, // 01:24:35
    current_season_number: 1,
    current_episode_number: 1,
    is_favorite: false,
    media_item_detail: {
      id: 10,
      title: 'Inception',
      media_type: 'PELICULA',
    },
  };

  const baseSeriesProgress = {
    id: 8,
    media_item: 11,
    watch_platform: 'Disney+',
    status: 'VIENDO',
    current_seconds: 1500, // 00:25:00
    current_season_number: 1,
    current_episode_number: 3,
    is_favorite: false,
    media_item_detail: {
      id: 11,
      title: 'Dark',
      media_type: 'SERIE',
    },
  };

  it('preserva segundos exactos (01:24:35) si solo se edita plataforma u otro campo sin tocar tiempo', async () => {
    const user = userEvent.setup();
    const onUpdateProgress = vi.fn().mockResolvedValue({});
    const onDeleteProgress = vi.fn();

    render(
      <TrackingProgressEditor
        progress={baseFilmProgress}
        onUpdateProgress={onUpdateProgress}
        onDeleteProgress={onDeleteProgress}
      />
    );

    // En película no se muestran inputs de temporada/episodio
    expect(screen.queryByLabelText(/Temp\./i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Ep\./i)).not.toBeInTheDocument();

    const platformInput = screen.getByLabelText(/Plataforma/i);
    await user.clear(platformInput);
    await user.type(platformInput, 'HBO');

    await user.selectOptions(screen.getByLabelText(/Estado/i), 'VISTO');
    await user.click(screen.getByRole('button', { name: /Guardar progreso/i }));

    expect(onUpdateProgress).toHaveBeenCalledWith(7, {
      watch_platform: 'HBO',
      status: 'VISTO',
      is_favorite: false,
    });
  });

  it('envia current_seconds calculado cuando el usuario edita horas y minutos', async () => {
    const user = userEvent.setup();
    const onUpdateProgress = vi.fn().mockResolvedValue({});

    render(
      <TrackingProgressEditor
        progress={baseFilmProgress}
        onUpdateProgress={onUpdateProgress}
        onDeleteProgress={vi.fn()}
      />
    );

    const hours = screen.getByLabelText(/Horas/i);
    const minutes = screen.getByLabelText(/Minutos/i);
    await user.clear(hours);
    await user.type(hours, '1');
    await user.clear(minutes);
    await user.type(minutes, '30');

    await user.click(screen.getByRole('button', { name: /Guardar progreso/i }));

    expect(onUpdateProgress).toHaveBeenCalledWith(7, {
      watch_platform: 'Netflix',
      status: 'VIENDO',
      is_favorite: false,
      current_seconds: 5400,
    });
  });

  it('en SERIE al cambiar episodio prepara 00:00 sin autoguardar y permite quitar del diario', async () => {
    const user = userEvent.setup();
    const onUpdateProgress = vi.fn().mockResolvedValue({});
    const onDeleteProgress = vi.fn();

    render(
      <TrackingProgressEditor
        progress={baseSeriesProgress}
        onUpdateProgress={onUpdateProgress}
        onDeleteProgress={onDeleteProgress}
      />
    );

    const epInput = screen.getByLabelText(/Ep\./i);
    await user.clear(epInput);
    await user.type(epInput, '4');

    expect(onUpdateProgress).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/Horas/i)).toHaveValue(0);
    expect(screen.getByLabelText(/Minutos/i)).toHaveValue(0);

    await user.click(screen.getByRole('button', { name: /Guardar progreso/i }));
    expect(onUpdateProgress).toHaveBeenCalledWith(8, {
      watch_platform: 'Disney+',
      status: 'VIENDO',
      is_favorite: false,
      current_season_number: 1,
      current_episode_number: 4,
      current_seconds: 0,
    });

    await user.click(screen.getByRole('button', { name: /Quitar del diario/i }));
    expect(onDeleteProgress).toHaveBeenCalledWith(baseSeriesProgress);
  });
});

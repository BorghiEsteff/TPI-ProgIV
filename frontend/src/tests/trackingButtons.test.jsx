import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import SecondsInputControl from '../components/tracking/SecondsInputControl';

describe('Botones e interacciones de Tracking en Segundos', () => {
  const baseProgress = {
    id: 7,
    media_item: 10,
    status: 'PENDIENTE',
    current_seconds: 0,
    current_season_number: 1,
    current_episode_number: 1,
    is_favorite: false,
    media_item_detail: {
      id: 10,
      title: 'Inception',
      media_type: 'PELICULA',
    },
  };

  it('suma +30s, +5m y +15m en formato HH:MM:SS y envia payload exacto al guardar', async () => {
    const user = userEvent.setup();
    const onUpdateProgress = vi.fn();
    const onDeleteProgress = vi.fn();

    render(
      <SecondsInputControl
        progress={baseProgress}
        onUpdateProgress={onUpdateProgress}
        onDeleteProgress={onDeleteProgress}
      />
    );

    const timeInput = screen.getByPlaceholderText('00:00:00');
    expect(timeInput).toHaveValue('00:00:00');

    await user.click(screen.getByRole('button', { name: '+30s' }));
    expect(timeInput).toHaveValue('00:00:30');

    await user.click(screen.getByRole('button', { name: '+5m' }));
    expect(timeInput).toHaveValue('00:05:30');

    await user.click(screen.getByRole('button', { name: '+15m' }));
    expect(timeInput).toHaveValue('00:20:30');

    await user.selectOptions(screen.getByRole('combobox'), 'VIENDO');
    await user.click(screen.getByRole('checkbox', { name: 'Favorito' }));
    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    // 30 + 300 + 900 = 1230 segundos
    expect(onUpdateProgress).toHaveBeenCalledWith(7, {
      status: 'VIENDO',
      current_seconds: 1230,
      is_favorite: true,
    });
  });

  it('invoca onDeleteProgress al presionar Eliminar', async () => {
    const user = userEvent.setup();
    const onUpdateProgress = vi.fn();
    const onDeleteProgress = vi.fn();

    render(
      <SecondsInputControl
        progress={baseProgress}
        onUpdateProgress={onUpdateProgress}
        onDeleteProgress={onDeleteProgress}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Eliminar' }));
    expect(onDeleteProgress).toHaveBeenCalledWith(baseProgress);
  });
});


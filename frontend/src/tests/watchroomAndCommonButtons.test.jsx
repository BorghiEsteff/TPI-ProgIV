import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import ConfirmModal from '../components/common/ConfirmModal';
import ErrorMessage from '../components/common/ErrorMessage';
import LiveChatBox from '../components/watchroom/LiveChatBox';
import PlaybackSyncBar from '../components/watchroom/PlaybackSyncBar';

describe('Botones de WatchRoom y Componentes Comunes', () => {
  it('PlaybackSyncBar dispara Play/Pausa, saltos de tiempo, salto manual y guardado en Django', async () => {
    const user = userEvent.setup();
    const onTogglePlay = vi.fn();
    const onSeekDelta = vi.fn();
    const onJumpToSecond = vi.fn();
    const onSaveToMyTracking = vi.fn();

    render(
      <PlaybackSyncBar
        playbackState={{
          isPlaying: false,
          currentTimeSeconds: 120,
          updatedBy: 'admin_cinetrack',
          updatedAt: '2026-11-12T20:00:00Z',
        }}
        isConnected={true}
        isSavingTracking={false}
        onTogglePlay={onTogglePlay}
        onSeekDelta={onSeekDelta}
        onJumpToSecond={onJumpToSecond}
        onSaveToMyTracking={onSaveToMyTracking}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Reproducir Sala' }));
    expect(onTogglePlay).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: '-15s' }));
    expect(onSeekDelta).toHaveBeenCalledWith(-15);

    await user.click(screen.getByRole('button', { name: '+15s' }));
    expect(onSeekDelta).toHaveBeenCalledWith(15);

    await user.click(screen.getByRole('button', { name: '+1m' }));
    expect(onSeekDelta).toHaveBeenCalledWith(60);

    const jumpInput = screen.getByPlaceholderText('Ir al segundo...');
    await user.type(jumpInput, '450');
    await user.click(screen.getByRole('button', { name: 'Saltar' }));
    expect(onJumpToSecond).toHaveBeenCalledWith(450);

    await user.click(
      screen.getByRole('button', { name: 'Guardar posicion actual en Mi Progreso' })
    );
    expect(onSaveToMyTracking).toHaveBeenCalledWith(120);
  });

  it('LiveChatBox envia mensaje de chat al instante', async () => {
    const user = userEvent.setup();
    const onSendMessage = vi.fn();

    render(
      <LiveChatBox
        isConnected={true}
        participants={[{ id: '1', username: 'fan_series', role: 'USER' }]}
        messages={[]}
        onSendMessage={onSendMessage}
      />
    );

    const input = screen.getByPlaceholderText('Enviar un mensaje a la sala...');
    await user.type(input, 'Arrancamos en 3, 2, 1');
    await user.click(screen.getByRole('button', { name: 'Enviar' }));

    expect(onSendMessage).toHaveBeenCalledWith('Arrancamos en 3, 2, 1');
    expect(input).toHaveValue('');
  });

  it('ErrorMessage ejecuta onRetry y ConfirmModal ejecuta onConfirm y onCancel', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    const onConfirm = vi.fn();
    const onCancel = vi.fn();

    render(
      <>
        <ErrorMessage error={{ status: 503, message: 'Servicio no disponible' }} onRetry={onRetry} />
        <ConfirmModal
          show={true}
          title="Confirmar borrado"
          body="Seguro que desea eliminar?"
          confirmLabel="Eliminar"
          cancelLabel="Cancelar"
          onConfirm={onConfirm}
          onCancel={onCancel}
        />
      </>
    );

    await user.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(onRetry).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onCancel).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: 'Eliminar' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});


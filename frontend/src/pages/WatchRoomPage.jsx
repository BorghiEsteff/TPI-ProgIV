import { useCallback, useEffect, useState } from 'react';
import { Alert, Container } from 'react-bootstrap';
import { useParams } from 'react-router-dom';
import DegradedBanner from '../components/common/DegradedBanner';
import ErrorMessage from '../components/common/ErrorMessage';
import LoadingSpinner from '../components/common/LoadingSpinner';
import WatchRoomPanel from '../components/watchroom/WatchRoomPanel';
import { useWatchRoom } from '../hooks/useWatchRoom';
import * as catalogService from '../services/catalogService';
import * as trackingService from '../services/trackingService';
import { formatSecondsToHHMMSS } from '../utils/timeFormat';

const WatchRoomPage = () => {
  const { mediaId } = useParams();

  const [media, setMedia] = useState(null);
  const [loadingMedia, setLoadingMedia] = useState(true);
  const [mediaError, setMediaError] = useState(null);
  const [isDegraded, setIsDegraded] = useState(false);

  const [isSavingTracking, setIsSavingTracking] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const {
    isConnected,
    socketError,
    participants,
    playbackState,
    messages,
    emitPlaybackSync,
    emitChatMessage,
  } = useWatchRoom(mediaId);

  const loadMedia = useCallback(async () => {
    setLoadingMedia(true);
    setMediaError(null);
    try {
      const { data, isDegraded: degraded } = await catalogService.getMediaDetail(mediaId);
      setMedia(data);
      setIsDegraded(Boolean(degraded));
    } catch (err) {
      setMediaError(err);
    } finally {
      setLoadingMedia(false);
    }
  }, [mediaId]);

  useEffect(() => {
    loadMedia();
  }, [loadMedia]);

  const handleTogglePlay = () => {
    const nextPlaying = !playbackState.isPlaying;
    emitPlaybackSync(
      nextPlaying,
      playbackState.currentTimeSeconds,
      nextPlaying ? 'PLAYING' : 'PAUSED'
    );
  };

  const handleSeekDelta = (deltaSeconds) => {
    const target = Math.max(0, playbackState.currentTimeSeconds + deltaSeconds);
    emitPlaybackSync(playbackState.isPlaying, target, 'SEEKING');
  };

  const handleJumpToSecond = (second) => {
    emitPlaybackSync(playbackState.isPlaying, Math.max(0, second), 'SEEKING');
  };

  const handleSaveToMyTracking = async (currentSeconds) => {
    setIsSavingTracking(true);
    setFeedback(null);
    try {
      const { data } = await trackingService.getMyTracking({ media_item: mediaId });
      const list = Array.isArray(data) ? data : data?.results || [];
      const existing = list.find(
        (entry) => Number(entry.media_item) === Number(mediaId)
      );

      if (existing) {
        await trackingService.updateTrackingSeconds(existing.id, {
          current_seconds: currentSeconds,
          status: existing.status === 'PENDIENTE' ? 'VIENDO' : existing.status,
        });
      } else {
        await trackingService.createTracking({
          media_item: Number(mediaId),
          status: 'VIENDO',
          current_seconds: currentSeconds,
        });
      }

      setFeedback({
        variant: 'success',
        text: `Posicion ${formatSecondsToHHMMSS(currentSeconds)} guardada en Mi Progreso (PostgreSQL).`,
      });
    } catch (err) {
      setFeedback({
        variant: 'danger',
        text: err.message || 'No se pudo guardar la posicion en Mi Progreso.',
      });
    } finally {
      setIsSavingTracking(false);
    }
  };

  return (
    <Container className="py-4">
      <DegradedBanner show={isDegraded} mode="catalog" />

      {socketError && <ErrorMessage error={socketError} />}

      {feedback && (
        <Alert
          variant={feedback.variant}
          dismissible
          onClose={() => setFeedback(null)}
          className="my-3"
        >
          {feedback.text}
        </Alert>
      )}

      {loadingMedia && <LoadingSpinner message="Preparando WatchRoom..." />}

      {!loadingMedia && mediaError && (
        <ErrorMessage error={mediaError} onRetry={loadMedia} />
      )}

      {!loadingMedia && !mediaError && (
        <WatchRoomPanel
          media={media || { id: mediaId, title: `Obra #${mediaId}` }}
          isConnected={isConnected}
          participants={participants}
          playbackState={playbackState}
          messages={messages}
          isSavingTracking={isSavingTracking}
          onTogglePlay={handleTogglePlay}
          onSeekDelta={handleSeekDelta}
          onJumpToSecond={handleJumpToSecond}
          onSaveToMyTracking={handleSaveToMyTracking}
          onSendMessage={emitChatMessage}
        />
      )}
    </Container>
  );
};

export default WatchRoomPage;


import { Badge, Button, Card } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import LiveChatBox from './LiveChatBox';
import PlaybackSyncBar from './PlaybackSyncBar';

const WatchRoomPanel = ({
  media,
  isConnected,
  participants,
  playbackState,
  messages,
  isSavingTracking,
  onTogglePlay,
  onSeekDelta,
  onJumpToSecond,
  onSaveToMyTracking,
  onSendMessage,
}) => {
  return (
    <div>
      <Card className="shadow-sm border-secondary-subtle mb-4">
        <Card.Body className="d-flex justify-content-between align-items-center flex-wrap gap-2">
          <div>
            <div className="d-flex align-items-center gap-2 flex-wrap">
              <h1 className="h4 mb-0">
                WatchRoom: {media?.title || 'Sala de Visualizacion'}
              </h1>
              {media?.media_type && (
                <Badge bg={media.media_type === 'SERIE' ? 'info' : 'primary'} text={media.media_type === 'SERIE' ? 'dark' : 'light'}>
                  {media.media_type}
                </Badge>
              )}
            </div>
            <p className="text-muted small mb-0 mt-1">
              Sala sincronizada mediante Socket.IO (Node.js :5000) con persistencia de progreso en PostgreSQL (Django :8000).
            </p>
          </div>

          {media?.id && (
            <Button as={Link} to={`/media/${media.id}`} variant="outline-secondary" size="sm">
              Volver a la Ficha
            </Button>
          )}
        </Card.Body>
      </Card>

      <PlaybackSyncBar
        playbackState={playbackState}
        isConnected={isConnected}
        isSavingTracking={isSavingTracking}
        onTogglePlay={onTogglePlay}
        onSeekDelta={onSeekDelta}
        onJumpToSecond={onJumpToSecond}
        onSaveToMyTracking={onSaveToMyTracking}
      />

      <LiveChatBox
        isConnected={isConnected}
        participants={participants}
        messages={messages}
        onSendMessage={onSendMessage}
      />
    </div>
  );
};

export default WatchRoomPanel;


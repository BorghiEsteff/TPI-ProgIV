import { useState } from 'react';
import { Badge, Button, Card, Col, Form, InputGroup, ProgressBar, Row, Spinner } from 'react-bootstrap';
import { formatDateTime, formatSecondsToHHMMSS } from '../../utils/timeFormat';

const PlaybackSyncBar = ({
  playbackState,
  isConnected = false,
  isSavingTracking = false,
  onTogglePlay,
  onSeekDelta,
  onJumpToSecond,
  onSaveToMyTracking,
}) => {
  const [jumpInput, setJumpInput] = useState('');
  const { isPlaying, currentTimeSeconds, updatedBy, updatedAt } = playbackState;

  const handleJumpSubmit = (e) => {
    e.preventDefault();
    const parsed = parseInt(jumpInput, 10);
    if (Number.isNaN(parsed) || parsed < 0) return;
    onJumpToSecond(parsed);
    setJumpInput('');
  };

  return (
    <Card className="shadow-sm border-secondary-subtle mb-4">
      <Card.Body>
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
          <div>
            <Card.Title as="h5" className="mb-1">
              Control de Reproduccion Sincronizada
            </Card.Title>
            <div className="text-muted small">
              {updatedBy
                ? `Ultima sincronizacion por ${updatedBy} (${formatDateTime(updatedAt)})`
                : 'Sin eventos de sincronizacion recibidos aun'}
            </div>
          </div>

          <Badge bg={isPlaying ? 'success' : 'secondary'}>
            {isPlaying ? 'REPRODUCIENDO' : 'EN PAUSA'}
          </Badge>
        </div>

        <div className="d-flex justify-content-between align-items-center mb-2">
          <span className="fs-4 fw-bold font-monospace">
            {formatSecondsToHHMMSS(currentTimeSeconds)}
          </span>
          <span className="text-muted small">{currentTimeSeconds} segundos acumulados</span>
        </div>

        <ProgressBar
          now={Math.min(100, (currentTimeSeconds % 3600) / 36)}
          variant={isPlaying ? 'success' : 'secondary'}
          animated={isPlaying}
          className="mb-3"
          style={{ height: '10px' }}
        />

        <Row className="g-2 align-items-center">
          <Col md={7} className="d-flex flex-wrap gap-2">
            <Button
              variant={isPlaying ? 'warning' : 'primary'}
              size="sm"
              disabled={!isConnected}
              onClick={onTogglePlay}
            >
              {isPlaying ? 'Pausar Sala' : 'Reproducir Sala'}
            </Button>
            <Button
              variant="outline-secondary"
              size="sm"
              disabled={!isConnected}
              onClick={() => onSeekDelta(-15)}
            >
              -15s
            </Button>
            <Button
              variant="outline-secondary"
              size="sm"
              disabled={!isConnected}
              onClick={() => onSeekDelta(15)}
            >
              +15s
            </Button>
            <Button
              variant="outline-secondary"
              size="sm"
              disabled={!isConnected}
              onClick={() => onSeekDelta(60)}
            >
              +1m
            </Button>
          </Col>

          <Col md={5}>
            <Form onSubmit={handleJumpSubmit}>
              <InputGroup size="sm">
                <Form.Control
                  type="number"
                  min={0}
                  placeholder="Ir al segundo..."
                  value={jumpInput}
                  onChange={(e) => setJumpInput(e.target.value)}
                  disabled={!isConnected}
                />
                <Button type="submit" variant="outline-dark" disabled={!isConnected}>
                  Saltar
                </Button>
              </InputGroup>
            </Form>
          </Col>
        </Row>

        {onSaveToMyTracking && (
          <div className="mt-3 pt-3 border-top d-flex justify-content-end">
            <Button
              variant="outline-success"
              size="sm"
              disabled={isSavingTracking}
              onClick={() => onSaveToMyTracking(currentTimeSeconds)}
            >
              {isSavingTracking ? (
                <>
                  <Spinner as="span" animation="border" size="sm" className="me-2" />
                  Guardando posicion...
                </>
              ) : (
                'Guardar posicion actual en Mi Progreso'
              )}
            </Button>
          </div>
        )}
      </Card.Body>
    </Card>
  );
};

export default PlaybackSyncBar;


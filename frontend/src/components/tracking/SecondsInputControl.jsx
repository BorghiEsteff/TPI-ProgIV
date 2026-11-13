import { useEffect, useState } from 'react';
import { Button, Col, Form, InputGroup, Row, Spinner } from 'react-bootstrap';
import { formatSecondsToHHMMSS, parseHHMMSSToSeconds } from '../../utils/timeFormat';

const SecondsInputControl = ({
  progress,
  isSaving = false,
  onUpdateProgress,
  onDeleteProgress,
}) => {
  const media = progress.media_item_detail || {};
  const isSerie = media.media_type === 'SERIE';

  const [status, setStatus] = useState(progress.status || 'PENDIENTE');
  const [timeInput, setTimeInput] = useState(
    formatSecondsToHHMMSS(progress.current_seconds || 0)
  );
  const [seasonNumber, setSeasonNumber] = useState(progress.current_season_number || 1);
  const [episodeNumber, setEpisodeNumber] = useState(progress.current_episode_number || 1);
  const [isFavorite, setIsFavorite] = useState(Boolean(progress.is_favorite));
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    setStatus(progress.status || 'PENDIENTE');
    setTimeInput(formatSecondsToHHMMSS(progress.current_seconds || 0));
    setSeasonNumber(progress.current_season_number || 1);
    setEpisodeNumber(progress.current_episode_number || 1);
    setIsFavorite(Boolean(progress.is_favorite));
  }, [progress]);

  const applyQuickIncrement = (deltaSeconds) => {
    setLocalError('');
    const current = parseHHMMSSToSeconds(timeInput);
    const baseSeconds = current !== null ? current : progress.current_seconds || 0;
    const nextSeconds = Math.max(0, baseSeconds + deltaSeconds);
    setTimeInput(formatSecondsToHHMMSS(nextSeconds));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setLocalError('');

    const parsedSeconds = parseHHMMSSToSeconds(timeInput);
    if (parsedSeconds === null || parsedSeconds < 0) {
      setLocalError('Formato invalido. Use HH:MM:SS (ej. 01:15:30) o segundos enteros.');
      return;
    }

    const payload = {
      status,
      current_seconds: parsedSeconds,
      is_favorite: isFavorite,
    };

    if (isSerie) {
      payload.current_season_number = Math.max(1, Number(seasonNumber) || 1);
      payload.current_episode_number = Math.max(1, Number(episodeNumber) || 1);
    }

    onUpdateProgress(progress.id, payload);
  };

  return (
    <Form onSubmit={handleSubmit} className="mt-3 pt-3 border-top">
      <Row className="g-2 align-items-end">
        <Col md={4}>
          <Form.Label className="small fw-semibold">Tiempo (HH:MM:SS)</Form.Label>
          <InputGroup size="sm">
            <Form.Control
              type="text"
              value={timeInput}
              onChange={(e) => setTimeInput(e.target.value)}
              placeholder="00:00:00"
              disabled={isSaving}
            />
            <Button
              type="button"
              variant="outline-secondary"
              disabled={isSaving}
              onClick={() => applyQuickIncrement(30)}
            >
              +30s
            </Button>
            <Button
              type="button"
              variant="outline-secondary"
              disabled={isSaving}
              onClick={() => applyQuickIncrement(300)}
            >
              +5m
            </Button>
            <Button
              type="button"
              variant="outline-secondary"
              disabled={isSaving}
              onClick={() => applyQuickIncrement(900)}
            >
              +15m
            </Button>
          </InputGroup>
        </Col>

        <Col md={3}>
          <Form.Label className="small fw-semibold">Estado</Form.Label>
          <Form.Select
            size="sm"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            disabled={isSaving}
          >
            <option value="PENDIENTE">PENDIENTE</option>
            <option value="VIENDO">VIENDO</option>
            <option value="VISTO">VISTO</option>
            <option value="ABANDONADO">ABANDONADO</option>
          </Form.Select>
        </Col>

        {isSerie && (
          <>
            <Col xs={6} md={1}>
              <Form.Label className="small fw-semibold">Temp.</Form.Label>
              <Form.Control
                type="number"
                size="sm"
                min={1}
                value={seasonNumber}
                onChange={(e) => setSeasonNumber(e.target.value)}
                disabled={isSaving}
              />
            </Col>
            <Col xs={6} md={1}>
              <Form.Label className="small fw-semibold">Ep.</Form.Label>
              <Form.Control
                type="number"
                size="sm"
                min={1}
                value={episodeNumber}
                onChange={(e) => setEpisodeNumber(e.target.value)}
                disabled={isSaving}
              />
            </Col>
          </>
        )}

        <Col md={isSerie ? 3 : 5} className="d-flex align-items-center justify-content-end gap-2">
          <Form.Check
            type="switch"
            id={`fav-switch-${progress.id}`}
            label="Favorito"
            checked={isFavorite}
            onChange={(e) => setIsFavorite(e.target.checked)}
            disabled={isSaving}
            className="small me-2"
          />

          <Button type="submit" variant="primary" size="sm" disabled={isSaving}>
            {isSaving ? (
              <>
                <Spinner
                  as="span"
                  animation="border"
                  size="sm"
                  role="status"
                  aria-hidden="true"
                  className="me-1"
                />
                Guardando
              </>
            ) : (
              'Guardar'
            )}
          </Button>

          <Button
            type="button"
            variant="outline-danger"
            size="sm"
            disabled={isSaving}
            onClick={() => onDeleteProgress(progress)}
          >
            Eliminar
          </Button>
        </Col>
      </Row>

      {localError && <div className="text-danger small mt-2">{localError}</div>}
    </Form>
  );
};

export default SecondsInputControl;


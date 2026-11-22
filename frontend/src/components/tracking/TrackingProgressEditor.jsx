import { useEffect, useState } from 'react';
import { Alert, Button, Col, Form, InputGroup, Row, Spinner } from 'react-bootstrap';
import { hmsToSeconds, secondsToHMS } from '../../utils/timeFormat';

const STATUS_OPTIONS = [
  { value: 'PENDIENTE', label: 'PENDIENTE' },
  { value: 'VIENDO', label: 'VIENDO' },
  { value: 'VISTO', label: 'VISTO (obra terminada)' },
  { value: 'ABANDONADO', label: 'ABANDONADO' },
];

const parseStrictNonNegativeInt = (raw) => {
  const str = String(raw ?? '').trim();
  if (!/^\d+$/.test(str)) return null;
  return Number.parseInt(str, 10);
};

const TrackingProgressEditor = ({
  progress,
  isSaving = false,
  durationMinutes = null,
  onUpdateProgress,
  onDeleteProgress,
  onCancel,
}) => {
  const media = progress.media_item_detail || {};
  const isSerie =
    media.media_type === 'SERIE' || progress.display_media_type === 'SERIE';

  const initialHMS = secondsToHMS(progress.current_seconds || 0);

  const [watchPlatform, setWatchPlatform] = useState(progress.watch_platform || '');
  const [status, setStatus] = useState(progress.status || 'PENDIENTE');
  const [seasonInput, setSeasonInput] = useState(String(progress.current_season_number || 1));
  const [episodeInput, setEpisodeInput] = useState(String(progress.current_episode_number || 1));
  const [hoursInput, setHoursInput] = useState(String(initialHMS.hours));
  const [minutesInput, setMinutesInput] = useState(String(initialHMS.minutes));
  const [timeEdited, setTimeEdited] = useState(false);
  const [isFavorite, setIsFavorite] = useState(Boolean(progress.is_favorite));
  const [episodeChangedHint, setEpisodeChangedHint] = useState(false);
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    const hms = secondsToHMS(progress.current_seconds || 0);
    setWatchPlatform(progress.watch_platform || '');
    setStatus(progress.status || 'PENDIENTE');
    setSeasonInput(String(progress.current_season_number || 1));
    setEpisodeInput(String(progress.current_episode_number || 1));
    setHoursInput(String(hms.hours));
    setMinutesInput(String(hms.minutes));
    setTimeEdited(false);
    setIsFavorite(Boolean(progress.is_favorite));
    setEpisodeChangedHint(false);
    setLocalError('');
  }, [progress]);

  const handleResetToCurrent = () => {
    const hms = secondsToHMS(progress.current_seconds || 0);
    setWatchPlatform(progress.watch_platform || '');
    setStatus(progress.status || 'PENDIENTE');
    setSeasonInput(String(progress.current_season_number || 1));
    setEpisodeInput(String(progress.current_episode_number || 1));
    setHoursInput(String(hms.hours));
    setMinutesInput(String(hms.minutes));
    setTimeEdited(false);
    setIsFavorite(Boolean(progress.is_favorite));
    setEpisodeChangedHint(false);
    setLocalError('');
    if (onCancel) onCancel();
  };

  const handleEpisodeOrSeasonChange = (field, nextVal) => {
    if (field === 'season') {
      setSeasonInput(nextVal);
    } else {
      setEpisodeInput(nextVal);
    }
    const origSeason = String(progress.current_season_number || 1);
    const origEpisode = String(progress.current_episode_number || 1);
    const nextSeason = field === 'season' ? nextVal : seasonInput;
    const nextEpisode = field === 'episode' ? nextVal : episodeInput;
    if (nextSeason !== origSeason || nextEpisode !== origEpisode) {
      setHoursInput('0');
      setMinutesInput('0');
      setTimeEdited(true);
      setEpisodeChangedHint(true);
    } else {
      const hms = secondsToHMS(progress.current_seconds || 0);
      setHoursInput(String(hms.hours));
      setMinutesInput(String(hms.minutes));
      setTimeEdited(false);
      setEpisodeChangedHint(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');

    const parsedHours = parseStrictNonNegativeInt(hoursInput);
    const parsedMinutes = parseStrictNonNegativeInt(minutesInput);
    if (parsedHours === null || parsedHours < 0) {
      setLocalError('Las horas deben ser un número entero mayor o igual a 0.');
      return;
    }
    if (parsedMinutes === null || parsedMinutes < 0 || parsedMinutes > 59) {
      setLocalError('Los minutos deben estar entre 0 y 59.');
      return;
    }

    const payload = {
      watch_platform: watchPlatform.trim(),
      status,
      is_favorite: isFavorite,
    };

    if (isSerie) {
      const parsedSeason = parseStrictNonNegativeInt(seasonInput);
      const parsedEpisode = parseStrictNonNegativeInt(episodeInput);
      if (parsedSeason === null || parsedSeason < 1) {
        setLocalError('La temporada debe ser un número entero mayor o igual a 1.');
        return;
      }
      if (parsedEpisode === null || parsedEpisode < 1) {
        setLocalError('El episodio debe ser un número entero mayor o igual a 1.');
        return;
      }
      payload.current_season_number = parsedSeason;
      payload.current_episode_number = parsedEpisode;
    }

    // Preservar current_seconds exactos si el usuario no tocó horas/minutos ni cambió de capítulo
    if (timeEdited) {
      payload.current_seconds = hmsToSeconds(parsedHours, parsedMinutes, 0);
    }

    await onUpdateProgress(progress.id, payload);
  };

  return (
    <Form
      noValidate
      onSubmit={handleSubmit}
      className="mt-3 pt-3 border-top"
      data-testid={`tracking-editor-${progress.id}`}
    >
      <Row className="g-2 align-items-end">
        <Col xs={12} sm={6} md={3}>
          <Form.Label htmlFor={`platform-${progress.id}`} className="small fw-semibold mb-1">
            Plataforma
          </Form.Label>
          <Form.Control
            id={`platform-${progress.id}`}
            size="sm"
            type="text"
            value={watchPlatform}
            onChange={(e) => setWatchPlatform(e.target.value)}
            placeholder="Ej. Netflix, Disney+, Cine"
            disabled={isSaving}
          />
        </Col>

        <Col xs={12} sm={6} md={3}>
          <Form.Label htmlFor={`status-${progress.id}`} className="small fw-semibold mb-1">
            Estado
          </Form.Label>
          <Form.Select
            id={`status-${progress.id}`}
            size="sm"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            disabled={isSaving}
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Form.Select>
        </Col>

        {isSerie && (
          <>
            <Col xs={6} sm={3} md={1}>
              <Form.Label htmlFor={`season-${progress.id}`} className="small fw-semibold mb-1">
                Temp.
              </Form.Label>
              <Form.Control
                id={`season-${progress.id}`}
                size="sm"
                type="number"
                min={1}
                value={seasonInput}
                onChange={(e) => handleEpisodeOrSeasonChange('season', e.target.value)}
                disabled={isSaving}
              />
            </Col>
            <Col xs={6} sm={3} md={1}>
              <Form.Label htmlFor={`episode-${progress.id}`} className="small fw-semibold mb-1">
                Ep.
              </Form.Label>
              <Form.Control
                id={`episode-${progress.id}`}
                size="sm"
                type="number"
                min={1}
                value={episodeInput}
                onChange={(e) => handleEpisodeOrSeasonChange('episode', e.target.value)}
                disabled={isSaving}
              />
            </Col>
          </>
        )}

        <Col xs={12} sm={6} md={isSerie ? 4 : 6}>
          <Form.Label htmlFor={`hours-${progress.id}`} className="small fw-semibold mb-1">
            {isSerie ? 'Posición del capítulo actual' : 'Posición actual'}
            {durationMinutes ? ` (duración: ${durationMinutes} min)` : ''}
          </Form.Label>
          <InputGroup size="sm">
            <Form.Control
              id={`hours-${progress.id}`}
              type="number"
              min={0}
              aria-label="Horas"
              value={hoursInput}
              onChange={(e) => {
                setHoursInput(e.target.value);
                setTimeEdited(true);
              }}
              disabled={isSaving}
            />
            <InputGroup.Text>h</InputGroup.Text>
            <Form.Control
              id={`minutes-${progress.id}`}
              type="number"
              min={0}
              max={59}
              aria-label="Minutos"
              value={minutesInput}
              onChange={(e) => {
                setMinutesInput(e.target.value);
                setTimeEdited(true);
              }}
              disabled={isSaving}
            />
            <InputGroup.Text>min</InputGroup.Text>
          </InputGroup>
        </Col>
      </Row>

      {episodeChangedHint && (
        <div className="small text-info mt-2">
          Al cambiar de temporada o episodio, el tiempo se prepara en 00:00 y solo se guardará al presionar Guardar progreso.
        </div>
      )}

      {localError && (
        <Alert variant="danger" className="py-1 px-2 small mt-2 mb-0">
          {localError}
        </Alert>
      )}

      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mt-3">
        <Form.Check
          type="switch"
          id={`fav-switch-${progress.id}`}
          label={isFavorite ? '★ En Favoritos' : '☆ Marcar como Favorito'}
          checked={isFavorite}
          onChange={(e) => setIsFavorite(e.target.checked)}
          disabled={isSaving}
          className="small"
        />

        <div className="d-flex flex-wrap gap-2">
          {onCancel && (
            <Button
              type="button"
              variant="outline-secondary"
              size="sm"
              disabled={isSaving}
              onClick={handleResetToCurrent}
            >
              Cancelar
            </Button>
          )}

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
                Guardando...
              </>
            ) : (
              'Guardar progreso'
            )}
          </Button>

          <Button
            type="button"
            variant="outline-danger"
            size="sm"
            disabled={isSaving}
            onClick={() => onDeleteProgress(progress)}
          >
            Quitar del diario
          </Button>
        </div>
      </div>
    </Form>
  );
};

export default TrackingProgressEditor;

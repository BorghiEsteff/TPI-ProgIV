import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  ButtonGroup,
  Card,
  Col,
  Container,
  Form,
  Row,
} from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import ConfirmModal from '../components/common/ConfirmModal';
import EmptyState from '../components/common/EmptyState';
import ErrorMessage from '../components/common/ErrorMessage';
import LoadingSpinner from '../components/common/LoadingSpinner';
import PersonalNoteEditor from '../components/notes/PersonalNoteEditor';
import ProgressTrackerBar from '../components/tracking/ProgressTrackerBar';
import SecondsInputControl from '../components/tracking/SecondsInputControl';
import StatusBadge from '../components/tracking/StatusBadge';
import * as personalNoteService from '../services/personalNoteService';
import * as trackingService from '../services/trackingService';

const STATUS_FILTERS = ['TODOS', 'PENDIENTE', 'VIENDO', 'VISTO', 'ABANDONADO', 'FAVORITOS'];

const getCurrentEpisodeDuration = (progress) => {
  const media = progress.media_item_detail;
  if (!media || media.media_type !== 'SERIE' || !Array.isArray(media.seasons)) {
    return null;
  }
  const season = media.seasons.find(
    (s) => Number(s.season_number) === Number(progress.current_season_number)
  );
  const episode = season?.episodes?.find(
    (ep) => Number(ep.episode_number) === Number(progress.current_episode_number)
  );
  return episode?.duration_minutes || null;
};

const MyTrackingPage = () => {
  const navigate = useNavigate();
  const [records, setRecords] = useState([]);
  const [notesByTrackingId, setNotesByTrackingId] = useState({});
  const [activeStatusFilter, setActiveStatusFilter] = useState('TODOS');
  const [searchTerm, setSearchTerm] = useState('');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [savingId, setSavingId] = useState(null);
  const [savingNoteId, setSavingNoteId] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadTracking = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await trackingService.getMyTracking();
      const list = Array.isArray(data) ? data : data?.results || [];
      setRecords(list);

      const ids = list.map((item) => item.id).filter(Boolean);
      if (ids.length > 0) {
        try {
          const notes = await personalNoteService.getNotesBatch(ids);
          const map = {};
          notes.forEach((n) => {
            map[n.trackingEntryId] = n;
          });
          setNotesByTrackingId(map);
        } catch {
          // Las notas privadas pueden estar temporalmente no disponibles sin bloquear el avance
        }
      }
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTracking();
  }, [loadTracking]);

  const handleUpdateProgress = async (id, payload) => {
    setSavingId(id);
    setFeedback(null);
    try {
      const updated = await trackingService.updateTrackingSeconds(id, payload);
      setRecords((prev) =>
        prev.map((item) => (Number(item.id) === Number(id) ? updated : item))
      );
      setFeedback({
        variant: 'success',
        text: 'Tu diario personal se actualizó correctamente.',
      });
    } catch (err) {
      setFeedback({
        variant: 'danger',
        text: err.message || 'No se pudo actualizar tu registro.',
      });
    } finally {
      setSavingId(null);
    }
  };

  const handleSaveNote = async (trackingId, { rating, comment }) => {
    setSavingNoteId(trackingId);
    try {
      const saved = await personalNoteService.upsertNote(trackingId, { rating, comment });
      setNotesByTrackingId((prev) => ({
        ...prev,
        [trackingId]: saved,
      }));
    } finally {
      setSavingNoteId(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setFeedback(null);
    try {
      await trackingService.deleteTracking(deleteTarget.id);
      setRecords((prev) =>
        prev.filter((item) => Number(item.id) !== Number(deleteTarget.id))
      );
      setFeedback({
        variant: 'info',
        text: 'Obra quitada de tu diario personal.',
      });
      setDeleteTarget(null);
    } catch (err) {
      setFeedback({
        variant: 'danger',
        text: err.message || 'No se pudo quitar la obra de tu diario.',
      });
    } finally {
      setDeleting(false);
    }
  };

  const countsByStatus = useMemo(() => {
    const counts = {
      TODOS: records.length,
      PENDIENTE: 0,
      VIENDO: 0,
      VISTO: 0,
      ABANDONADO: 0,
      FAVORITOS: 0,
    };
    records.forEach((item) => {
      const key = String(item.status || 'PENDIENTE').toUpperCase();
      if (key in counts) counts[key] += 1;
      if (item.is_favorite) counts.FAVORITOS += 1;
    });
    return counts;
  }, [records]);

  const filteredRecords = useMemo(() => {
    return records.filter((item) => {
      if (activeStatusFilter === 'FAVORITOS' && !item.is_favorite) return false;
      if (
        activeStatusFilter !== 'TODOS' &&
        activeStatusFilter !== 'FAVORITOS' &&
        String(item.status || '').toUpperCase() !== activeStatusFilter
      ) {
        return false;
      }
      if (searchTerm.trim()) {
        const title = (item.display_title || item.media_item_detail?.title || '').toLowerCase();
        if (!title.includes(searchTerm.trim().toLowerCase())) return false;
      }
      return true;
    });
  }, [records, activeStatusFilter, searchTerm]);

  return (
    <Container className="py-4">
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
        <div>
          <h1 className="h3 mb-1">Mi CineTrack</h1>
          <p className="text-muted small mb-0">
            Tu diario privado de series y películas: plataforma, estado, avance, estrellas y notas personales.
          </p>
        </div>
        <div className="d-flex gap-2">
          <Button as={Link} to="/new-entry" variant="primary" size="sm">
            + Agregar obra nueva
          </Button>
          <Button as={Link} to="/" variant="outline-secondary" size="sm">
            Explorar catálogo
          </Button>
        </div>
      </div>

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

      {!loading && !error && records.length > 0 && (
        <Row className="g-2 align-items-center mb-4">
          <Col lg={8} className="overflow-auto">
            <ButtonGroup size="sm">
              {STATUS_FILTERS.map((statusKey) => (
                <Button
                  key={statusKey}
                  variant={activeStatusFilter === statusKey ? 'dark' : 'outline-secondary'}
                  onClick={() => setActiveStatusFilter(statusKey)}
                >
                  {statusKey}{' '}
                  <Badge
                    bg={activeStatusFilter === statusKey ? 'light' : 'secondary'}
                    text={activeStatusFilter === statusKey ? 'dark' : 'light'}
                  >
                    {countsByStatus[statusKey]}
                  </Badge>
                </Button>
              ))}
            </ButtonGroup>
          </Col>
          <Col lg={4}>
            <Form.Control
              size="sm"
              type="search"
              placeholder="Buscar en mi diario..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </Col>
        </Row>
      )}

      {loading && <LoadingSpinner message="Cargando tu diario privado..." />}
      {!loading && error && <ErrorMessage error={error} onRetry={loadTracking} />}

      {!loading && !error && records.length === 0 && (
        <EmptyState
          title="Tu diario está vacío"
          description="Explora el catálogo público o agrega una obra nueva para registrar tu progreso y notas privadas."
          actionLabel="Explorar catálogo"
          onAction={() => navigate('/')}
        />
      )}

      {!loading && !error && records.length > 0 && filteredRecords.length === 0 && (
        <EmptyState
          title="Sin coincidencias"
          description="No hay entradas que coincidan con los filtros seleccionados."
          actionLabel="Ver todas"
          onAction={() => {
            setActiveStatusFilter('TODOS');
            setSearchTerm('');
          }}
        />
      )}

      {!loading && !error && filteredRecords.length > 0 && (
        <div className="d-flex flex-column gap-3">
          {filteredRecords.map((item) => {
            const title = item.display_title || item.media_item_detail?.title || `Obra #${item.id}`;
            const poster = item.display_poster_url || item.media_item_detail?.poster_image || '';
            const mediaType = item.display_media_type || item.media_item_detail?.media_type || 'PELICULA';
            const isSerie = mediaType === 'SERIE';
            const durationMinutes = getCurrentEpisodeDuration(item);
            const note = notesByTrackingId[item.id] || { rating: null, comment: '' };

            return (
              <Card key={item.id} className="shadow-sm">
                <Card.Body>
                  <Row className="g-3">
                    {poster && (
                      <Col xs={4} sm={3} md={2}>
                        <img
                          src={poster}
                          alt={`Portada de ${title}`}
                          className="img-fluid rounded w-100"
                          style={{ maxHeight: 170, objectFit: 'cover' }}
                        />
                      </Col>
                    )}

                    <Col xs={poster ? 8 : 12} sm={poster ? 9 : 12} md={poster ? 10 : 12}>
                      <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-2">
                        <div>
                          <div className="d-flex align-items-center gap-2 flex-wrap">
                            {item.media_item ? (
                              <Link to={`/media/${item.media_item}`} className="h5 mb-0 text-decoration-none">
                                {title}
                              </Link>
                            ) : (
                              <span className="h5 mb-0">{title}</span>
                            )}
                            <StatusBadge status={item.status} />
                            <Badge bg="secondary">{isSerie ? 'Serie' : 'Película'}</Badge>
                            {item.submission_status === 'PENDING' && (
                              <Badge bg="warning" text="dark">
                                Pendiente de revisión
                              </Badge>
                            )}
                            {item.submission_status === 'REJECTED' && (
                              <Badge bg="danger">No publicada</Badge>
                            )}
                          </div>

                          {item.submission_status === 'REJECTED' && item.submission_rejection_reason && (
                            <div className="small text-danger mt-1">
                              Motivo: {item.submission_rejection_reason}
                            </div>
                          )}
                        </div>

                        <div className="d-flex gap-2">
                          <Button
                            size="sm"
                            variant={item.is_favorite ? 'warning' : 'outline-secondary'}
                            disabled={savingId === item.id}
                            onClick={() =>
                              handleUpdateProgress(item.id, { is_favorite: !item.is_favorite })
                            }
                          >
                            {item.is_favorite ? '★ Favorito' : '☆ Favorito'}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline-danger"
                            onClick={() => setDeleteTarget(item)}
                          >
                            Quitar
                          </Button>
                        </div>
                      </div>

                      <Row className="g-2 mb-3 align-items-center">
                        <Col sm={6} md={4}>
                          <Form.Label className="small text-muted mb-1">Plataforma donde la ves</Form.Label>
                          <Form.Control
                            size="sm"
                            defaultValue={item.watch_platform || ''}
                            placeholder="Ej. Netflix, HBO, Cine"
                            onBlur={(e) => {
                              const val = e.target.value.trim();
                              if (val !== (item.watch_platform || '')) {
                                handleUpdateProgress(item.id, { watch_platform: val });
                              }
                            }}
                          />
                        </Col>

                        {isSerie && (
                          <>
                            <Col xs={6} sm={3} md={2}>
                              <Form.Label className="small text-muted mb-1">Temporada</Form.Label>
                              <Form.Control
                                size="sm"
                                type="number"
                                min={1}
                                defaultValue={item.current_season_number || 1}
                                onBlur={(e) => {
                                  const num = Math.max(1, Number(e.target.value) || 1);
                                  if (num !== item.current_season_number) {
                                    handleUpdateProgress(item.id, { current_season_number: num });
                                  }
                                }}
                              />
                            </Col>
                            <Col xs={6} sm={3} md={2}>
                              <Form.Label className="small text-muted mb-1">Episodio</Form.Label>
                              <Form.Control
                                size="sm"
                                type="number"
                                min={1}
                                defaultValue={item.current_episode_number || 1}
                                onBlur={(e) => {
                                  const num = Math.max(1, Number(e.target.value) || 1);
                                  if (num !== item.current_episode_number) {
                                    handleUpdateProgress(item.id, { current_episode_number: num });
                                  }
                                }}
                              />
                            </Col>
                          </>
                        )}
                      </Row>

                      <ProgressTrackerBar
                        currentSeconds={item.current_seconds || 0}
                        durationMinutes={durationMinutes}
                        isSerie={isSerie}
                        seasonNumber={item.current_season_number}
                        episodeNumber={item.current_episode_number}
                      />

                      <div className="mt-2">
                        <SecondsInputControl
                          progress={item}
                          isSaving={savingId === item.id}
                          onUpdateProgress={handleUpdateProgress}
                          onDeleteProgress={setDeleteTarget}
                        />
                      </div>

                      <PersonalNoteEditor
                        initialRating={note.rating}
                        initialComment={note.comment}
                        saving={savingNoteId === item.id}
                        onSave={(notePayload) => handleSaveNote(item.id, notePayload)}
                      />
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            );
          })}
        </div>
      )}

      <ConfirmModal
        show={Boolean(deleteTarget)}
        title="Quitar de Mi CineTrack"
        message="Esta acción quitará la obra y sus notas de tu diario personal. No afectará al catálogo público."
        confirmLabel="Sí, quitar"
        confirmVariant="danger"
        loading={deleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </Container>
  );
};

export default MyTrackingPage;

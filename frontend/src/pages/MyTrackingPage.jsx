import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Badge, Button, ButtonGroup, Card, Container } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import ConfirmModal from '../components/common/ConfirmModal';
import DegradedBanner from '../components/common/DegradedBanner';
import EmptyState from '../components/common/EmptyState';
import ErrorMessage from '../components/common/ErrorMessage';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ProgressTrackerBar from '../components/tracking/ProgressTrackerBar';
import SecondsInputControl from '../components/tracking/SecondsInputControl';
import StatusBadge from '../components/tracking/StatusBadge';
import * as trackingService from '../services/trackingService';

const STATUS_FILTERS = ['TODOS', 'VIENDO', 'PENDIENTE', 'VISTO', 'ABANDONADO'];

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
  const [activeStatusFilter, setActiveStatusFilter] = useState('TODOS');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isDegraded, setIsDegraded] = useState(false);

  const [savingId, setSavingId] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadTracking = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, isDegraded: degraded } = await trackingService.getMyTracking();
      const list = Array.isArray(data) ? data : data?.results || [];
      setRecords(list);
      setIsDegraded(Boolean(degraded));
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
        text: 'Progreso actualizado correctamente en PostgreSQL.',
      });
    } catch (err) {
      setFeedback({
        variant: 'danger',
        text: err.message || 'No se pudo actualizar el progreso.',
      });
    } finally {
      setSavingId(null);
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
        text: 'Registro de seguimiento eliminado.',
      });
      setDeleteTarget(null);
    } catch (err) {
      setFeedback({
        variant: 'danger',
        text: err.message || 'No se pudo eliminar el registro.',
      });
    } finally {
      setDeleting(false);
    }
  };

  const countsByStatus = useMemo(() => {
    const counts = { TODOS: records.length, VIENDO: 0, PENDIENTE: 0, VISTO: 0, ABANDONADO: 0 };
    records.forEach((item) => {
      const key = String(item.status || 'PENDIENTE').toUpperCase();
      if (key in counts) counts[key] += 1;
    });
    return counts;
  }, [records]);

  const filteredRecords = useMemo(() => {
    if (activeStatusFilter === 'TODOS') return records;
    return records.filter(
      (item) => String(item.status || '').toUpperCase() === activeStatusFilter
    );
  }, [records, activeStatusFilter]);

  return (
    <Container className="py-4">
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
        <div>
          <h1 className="h3 mb-1">Mi Progreso de Visualizacion</h1>
          <p className="text-muted small mb-0">
            Administre su historial, estado y tiempo acumulado exacto en segundos (HH:MM:SS).
          </p>
        </div>
        <Button as={Link} to="/" variant="outline-primary" size="sm">
          Explorar Catalogo
        </Button>
      </div>

      <DegradedBanner show={isDegraded} mode="catalog" />

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
        <div className="mb-4 overflow-auto">
          <ButtonGroup size="sm">
            {STATUS_FILTERS.map((statusKey) => (
              <Button
                key={statusKey}
                variant={activeStatusFilter === statusKey ? 'dark' : 'outline-secondary'}
                onClick={() => setActiveStatusFilter(statusKey)}
              >
                {statusKey}{' '}
                <Badge bg={activeStatusFilter === statusKey ? 'light' : 'secondary'} text={activeStatusFilter === statusKey ? 'dark' : 'light'}>
                  {countsByStatus[statusKey]}
                </Badge>
              </Button>
            ))}
          </ButtonGroup>
        </div>
      )}

      {loading && <LoadingSpinner message="Cargando registros de progreso..." />}

      {!loading && error && <ErrorMessage error={error} onRetry={loadTracking} />}

      {!loading && !error && records.length === 0 && (
        <EmptyState
          title="Aun no tienes obras en seguimiento"
          description="Agrega peliculas o series desde el catalogo para registrar tu tiempo exacto de reproduccion."
          actionLabel="Ir al Catalogo"
          onAction={() => navigate('/')}
        />
      )}

      {!loading && !error && records.length > 0 && filteredRecords.length === 0 && (
        <EmptyState
          title="Sin registros en este estado"
          description={`No hay obras registradas con estado ${activeStatusFilter}.`}
          actionLabel="Ver todos"
          onAction={() => setActiveStatusFilter('TODOS')}
        />
      )}

      {!loading && !error && filteredRecords.length > 0 && (
        <div className="d-flex flex-column gap-3">
          {filteredRecords.map((progress) => {
            const media = progress.media_item_detail || {};
            const episodeDuration = getCurrentEpisodeDuration(progress);

            return (
              <Card key={progress.id} className="shadow-sm border-secondary-subtle">
                <Card.Body>
                  <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-2">
                    <div>
                      <div className="d-flex align-items-center gap-2 flex-wrap">
                        <Card.Title as="h5" className="mb-0">
                          <Link
                            to={`/media/${progress.media_item}`}
                            className="text-decoration-none text-dark"
                          >
                            {media.title || `Obra #${progress.media_item}`}
                          </Link>
                        </Card.Title>
                        <StatusBadge status={progress.status} />
                        {progress.is_favorite && (
                          <Badge bg="warning" text="dark">
                            FAVORITO
                          </Badge>
                        )}
                      </div>
                      <div className="text-muted small mt-1">
                        <span>{media.media_type || 'OBRA'}</span>
                        {media.media_type === 'SERIE' && (
                          <span>
                            {' '}
                            | Temporada {progress.current_season_number}, Episodio{' '}
                            {progress.current_episode_number}
                          </span>
                        )}
                      </div>
                    </div>

                    <Button
                      as={Link}
                      to={`/media/${progress.media_item}`}
                      variant="outline-primary"
                      size="sm"
                    >
                      Ver Detalle
                    </Button>
                  </div>

                  <ProgressTrackerBar
                    currentSeconds={progress.current_seconds}
                    totalDurationMinutes={episodeDuration}
                    status={progress.status}
                    startedAt={progress.started_at}
                    finishedAt={progress.finished_at}
                  />

                  <SecondsInputControl
                    progress={progress}
                    isSaving={Number(savingId) === Number(progress.id)}
                    onUpdateProgress={handleUpdateProgress}
                    onDeleteProgress={setDeleteTarget}
                  />
                </Card.Body>
              </Card>
            );
          })}
        </div>
      )}

      <ConfirmModal
        show={Boolean(deleteTarget)}
        title="Eliminar seguimiento"
        body={`Desea eliminar el progreso registrado para "${
          deleteTarget?.media_item_detail?.title || `Obra #${deleteTarget?.media_item}`
        }"?`}
        confirmLabel="Eliminar"
        variant="danger"
        isLoading={deleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </Container>
  );
};

export default MyTrackingPage;

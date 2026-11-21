import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  ButtonGroup,
  Card,
  Col,
  Container,
  Form,
  ListGroup,
  Nav,
  Row,
} from 'react-bootstrap';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import ConfirmModal from '../components/common/ConfirmModal';
import EmptyState from '../components/common/EmptyState';
import ErrorMessage from '../components/common/ErrorMessage';
import GenreMultiSelect from '../components/common/GenreMultiSelect';
import LoadingSpinner from '../components/common/LoadingSpinner';
import PersonalNoteEditor from '../components/notes/PersonalNoteEditor';
import SubmissionForm from '../components/submissions/SubmissionForm';
import StatusBadge from '../components/tracking/StatusBadge';
import TrackingProgressEditor from '../components/tracking/TrackingProgressEditor';
import * as catalogService from '../services/catalogService';
import * as personalNoteService from '../services/personalNoteService';
import * as submissionService from '../services/submissionService';
import * as trackingService from '../services/trackingService';
import { formatDateTime, formatSecondsToHHMMSS } from '../utils/timeFormat';

const STATUS_FILTERS = ['TODOS', 'PENDIENTE', 'VIENDO', 'VISTO', 'ABANDONADO', 'FAVORITOS'];

const SUBMISSION_STATUS_BADGE = {
  PENDING: { bg: 'warning', text: 'dark', label: 'Pendiente de revisión' },
  PUBLISHED: { bg: 'success', text: 'light', label: 'Publicada' },
  MERGED: { bg: 'info', text: 'dark', label: 'Vinculada al catálogo' },
  REJECTED: { bg: 'danger', text: 'light', label: 'No publicada' },
};

const VALID_VIEWS = new Set(['tracking', 'proposals', 'add']);

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
  const [searchParams, setSearchParams] = useSearchParams();
  const rawView = searchParams.get('view') || 'tracking';
  const activeView = VALID_VIEWS.has(rawView) ? rawView : 'tracking';

  const setActiveView = (nextView) => {
    const next = new URLSearchParams(searchParams);
    if (nextView === 'tracking') {
      next.delete('view');
    } else {
      next.set('view', nextView);
    }
    setSearchParams(next);
  };

  // --- Estado "Mis obras" ---
  const [records, setRecords] = useState([]);
  const [reconciliations, setReconciliations] = useState([]);
  const [notesByTrackingId, setNotesByTrackingId] = useState({});
  const [activeStatusFilter, setActiveStatusFilter] = useState('TODOS');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [summaryCounts, setSummaryCounts] = useState(null);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 20;
  const requestSeqRef = useRef(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [expandedEditorId, setExpandedEditorId] = useState(null);
  const [savingId, setSavingId] = useState(null);
  const [savingNoteId, setSavingNoteId] = useState(null);
  const [reconcilingId, setReconcilingId] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // --- Estado "Mis propuestas" ---
  const [submissions, setSubmissions] = useState([]);
  const [allGenres, setAllGenres] = useState([]);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);
  const [submissionsError, setSubmissionsError] = useState(null);
  const [editingSubId, setEditingSubId] = useState(null);
  const [editGenreIds, setEditGenreIds] = useState([]);
  const [savingSubEdit, setSavingSubEdit] = useState(false);

  // --- Estado "Agregar obra" ---
  const [catalogQuery, setCatalogQuery] = useState('');
  const [catalogMatches, setCatalogMatches] = useState([]);
  const [catalogSearching, setCatalogSearching] = useState(false);
  const [quickAddPlatform, setQuickAddPlatform] = useState('Netflix');
  const [quickAddingId, setQuickAddingId] = useState(null);
  const [submittingProposal, setSubmittingProposal] = useState(false);
  const [proposalError, setProposalError] = useState(null);
  const [proposalResult, setProposalResult] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
    }, 250);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const loadTracking = useCallback(
    async (targetPage = page) => {
      const seq = ++requestSeqRef.current;
      setLoading(true);
      setError(null);
      try {
        const params = { page: targetPage, page_size: pageSize };
        if (debouncedSearch) params.search = debouncedSearch;
        if (activeStatusFilter === 'FAVORITOS') {
          params.is_favorite = true;
        } else if (activeStatusFilter !== 'TODOS') {
          params.status = activeStatusFilter;
        }

        const [{ data }, recList, summary] = await Promise.all([
          trackingService.getMyTracking(params),
          trackingService.getReconciliations().catch(() => []),
          trackingService
            .getTrackingSummary(debouncedSearch ? { search: debouncedSearch } : {})
            .catch(() => null),
        ]);
        if (seq !== requestSeqRef.current) return;

        const list = Array.isArray(data) ? data : data?.results || [];
        setRecords(list);
        setTotalCount(Array.isArray(data) ? list.length : data?.count ?? list.length);
        setReconciliations(recList);
        if (summary) setSummaryCounts(summary);

        const ids = [
          ...list.map((item) => item.id),
          ...recList.map((item) => item.id),
        ].filter(Boolean);
        if (ids.length > 0) {
          try {
            const notes = await personalNoteService.getNotesBatch(ids);
            if (seq !== requestSeqRef.current) return;
            const map = {};
            notes.forEach((n) => {
              map[n.trackingEntryId] = n;
            });
            setNotesByTrackingId(map);
          } catch {
            // Las notas privadas pueden no estar disponibles sin bloquear el diario
          }
        }
      } catch (err) {
        if (seq !== requestSeqRef.current) return;
        setError(err);
      } finally {
        if (seq === requestSeqRef.current) {
          setLoading(false);
        }
      }
    },
    [page, debouncedSearch, activeStatusFilter]
  );

  const loadSubmissions = useCallback(async () => {
    setSubmissionsLoading(true);
    setSubmissionsError(null);
    try {
      const [data, genres] = await Promise.all([
        submissionService.getMySubmissions(),
        catalogService.getGenres().catch(() => []),
      ]);
      setSubmissions(data);
      setAllGenres(genres);
    } catch (err) {
      setSubmissionsError(err);
    } finally {
      setSubmissionsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeView === 'tracking') {
      loadTracking(page);
    } else if (activeView === 'proposals') {
      loadSubmissions();
    }
  }, [activeView, loadTracking, loadSubmissions, page]);

  useEffect(() => {
    if (activeView !== 'add') return undefined;
    const trimmed = catalogQuery.trim();
    if (trimmed.length < 2) {
      setCatalogMatches([]);
      return undefined;
    }
    const timer = setTimeout(async () => {
      setCatalogSearching(true);
      try {
        const { data } = await catalogService.getMediaList({ search: trimmed, page_size: 8 });
        const list = Array.isArray(data) ? data : data?.results || [];
        setCatalogMatches(list);
      } catch {
        setCatalogMatches([]);
      } finally {
        setCatalogSearching(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [activeView, catalogQuery]);

  const handleReconcile = async (conflictId, resolution) => {
    setReconcilingId(conflictId);
    setFeedback(null);
    try {
      await trackingService.reconcileTrackingEntry(conflictId, resolution);
      setFeedback({
        variant: 'success',
        text:
          resolution === 'apply_archived_progress'
            ? 'Se aplicó el avance de la propuesta al registro canónico y se resolvió el conflicto.'
            : 'Se conservó tu entrada canónica y se resolvió el conflicto.',
      });
      await loadTracking(page);
    } catch (err) {
      setFeedback({
        variant: 'danger',
        text: err?.message || 'No se pudo resolver la reconciliación.',
      });
    } finally {
      setReconcilingId(null);
    }
  };

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
      if (expandedEditorId === deleteTarget.id) {
        setExpandedEditorId(null);
      }
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

  const handleSaveSubmissionGenres = async (subId) => {
    if (editGenreIds.length < 1 || editGenreIds.length > 5) {
      setFeedback({ variant: 'danger', text: 'Debes seleccionar entre 1 y 5 categorías.' });
      return;
    }
    setSavingSubEdit(true);
    setFeedback(null);
    try {
      await submissionService.updateSubmission(subId, { genres: editGenreIds });
      setEditingSubId(null);
      setFeedback({ variant: 'success', text: 'Categorías actualizadas en tu propuesta.' });
      await loadSubmissions();
    } catch (err) {
      setFeedback({
        variant: 'danger',
        text: err?.message || 'No se pudieron actualizar las categorías.',
      });
    } finally {
      setSavingSubEdit(false);
    }
  };

  const handleQuickAddFromCatalog = async (mediaItem) => {
    setQuickAddingId(mediaItem.id);
    setFeedback(null);
    try {
      await trackingService.createTracking({
        media_item: mediaItem.id,
        status: 'PENDIENTE',
        watch_platform: quickAddPlatform.trim() || 'CineTrack',
      });
      setFeedback({
        variant: 'success',
        text: `"${mediaItem.title}" se agregó a tu diario personal.`,
      });
      setCatalogQuery('');
      setCatalogMatches([]);
      setActiveView('tracking');
      await loadTracking(1);
    } catch (err) {
      setFeedback({
        variant: 'danger',
        text: err?.message || 'No se pudo agregar la obra al diario (es posible que ya la tengas).',
      });
    } finally {
      setQuickAddingId(null);
    }
  };

  const handleCreateSubmission = async (payload) => {
    setSubmittingProposal(true);
    setProposalError(null);
    try {
      const data = await submissionService.createSubmission(payload);
      setProposalResult(data);
    } catch (err) {
      setProposalError(err?.message || 'No se pudo guardar la obra propuesta.');
    } finally {
      setSubmittingProposal(false);
    }
  };

  const countsByStatus = useMemo(() => {
    if (summaryCounts) return summaryCounts;
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
  }, [summaryCounts, records]);

  const filteredRecords = records;
  const hasActiveFilters = Boolean(
    searchTerm.trim() || debouncedSearch || activeStatusFilter !== 'TODOS'
  );

  return (
    <Container className="py-4">
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
        <div>
          <h1 className="h3 mb-1">Mi CineTrack</h1>
          <p className="text-muted small mb-0">
            Tu diario privado unificado: mis obras, mis propuestas y alta de obras nuevas.
          </p>
        </div>
        <Button as={Link} to="/" variant="outline-secondary" size="sm">
          Explorar catálogo
        </Button>
      </div>

      <Nav
        variant="tabs"
        className="mb-3"
        activeKey={activeView}
        onSelect={(key) => {
          if (key) {
            setFeedback(null);
            setProposalResult(null);
            setActiveView(key);
          }
        }}
        data-testid="my-cinetrack-tabs"
      >
        <Nav.Item>
          <Nav.Link eventKey="tracking" data-testid="tab-my-works">
            Mis obras
          </Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link eventKey="proposals" data-testid="tab-my-proposals">
            Mis propuestas
          </Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link eventKey="add" data-testid="tab-add-work">
            + Agregar obra
          </Nav.Link>
        </Nav.Item>
      </Nav>

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

      {activeView === 'tracking' && (
        <>
          {!loading && reconciliations.length > 0 && (
            <Alert variant="warning" className="my-3" data-testid="reconciliation-panel">
              <div className="fw-semibold mb-2">
                Reconciliación pendiente ({reconciliations.length})
              </div>
              <p className="small mb-2">
                Una propuesta tuya se vinculó con una obra que ya tenías en tu diario. Revisa tus datos privados y elige cómo resolverlo sin perder tus notas:
              </p>
              <div className="d-flex flex-column gap-2">
                {reconciliations.map((conflict) => {
                  const conflictNote = notesByTrackingId[conflict.id];
                  const isRecBusy = reconcilingId === conflict.id;
                  return (
                    <Card key={conflict.id} className="border-warning bg-white">
                      <Card.Body className="py-2 px-3">
                        <div className="d-flex justify-content-between align-items-start flex-wrap gap-2">
                          <div className="small">
                            <strong>{conflict.display_title}</strong> • Plataforma propuesta:{' '}
                            <Badge bg="secondary">{conflict.watch_platform}</Badge> • Estado:{' '}
                            <Badge bg="dark">{conflict.status}</Badge>
                            {conflictNote?.comment && (
                              <div className="text-muted mt-1">
                                Nota privada en propuesta: “{conflictNote.comment}”
                              </div>
                            )}
                          </div>
                          <div className="d-flex flex-wrap gap-2">
                            <Button
                              size="sm"
                              variant="outline-secondary"
                              disabled={isRecBusy}
                              onClick={() => handleReconcile(conflict.id, 'keep_canonical')}
                              data-testid={`reconcile-keep-${conflict.id}`}
                            >
                              Conservar entrada actual
                            </Button>
                            <Button
                              size="sm"
                              variant="primary"
                              disabled={isRecBusy}
                              onClick={() =>
                                handleReconcile(conflict.id, 'apply_archived_progress')
                              }
                              data-testid={`reconcile-apply-${conflict.id}`}
                            >
                              Aplicar avance de propuesta
                            </Button>
                          </div>
                        </div>
                      </Card.Body>
                    </Card>
                  );
                })}
              </div>
            </Alert>
          )}

          {!loading && !error && (records.length > 0 || hasActiveFilters) && (
            <Row className="g-2 align-items-center mb-4">
              <Col lg={8} className="overflow-auto">
                <ButtonGroup size="sm">
                  {STATUS_FILTERS.map((statusKey) => (
                    <Button
                      key={statusKey}
                      variant={activeStatusFilter === statusKey ? 'dark' : 'outline-secondary'}
                      onClick={() => {
                        setActiveStatusFilter(statusKey);
                        setPage(1);
                      }}
                    >
                      {statusKey}{' '}
                      <Badge
                        bg={activeStatusFilter === statusKey ? 'light' : 'secondary'}
                        text={activeStatusFilter === statusKey ? 'dark' : 'light'}
                      >
                        {countsByStatus[statusKey] ?? 0}
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
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setPage(1);
                  }}
                />
              </Col>
            </Row>
          )}

          {loading && <LoadingSpinner message="Cargando tu diario privado..." />}
          {!loading && error && <ErrorMessage error={error} onRetry={loadTracking} />}

          {!loading && !error && records.length === 0 && !hasActiveFilters && (
            <EmptyState
              title="Tu diario está vacío"
              description="Explora el catálogo público o agrega una obra nueva desde aquí."
              actionLabel="Agregar obra"
              onAction={() => setActiveView('add')}
            />
          )}

          {!loading && !error && filteredRecords.length === 0 && hasActiveFilters && (
            <EmptyState
              title="Sin coincidencias"
              description="No hay entradas que coincidan con los filtros seleccionados."
              actionLabel="Ver todas"
              onAction={() => {
                setActiveStatusFilter('TODOS');
                setSearchTerm('');
                setDebouncedSearch('');
                setPage(1);
              }}
            />
          )}

          {!loading && !error && filteredRecords.length > 0 && (
            <>
              <div className="d-flex flex-column gap-3">
                {filteredRecords.map((item) => {
                  const title =
                    item.display_title || item.media_item_detail?.title || `Obra #${item.id}`;
                  const poster =
                    item.display_poster_url || item.media_item_detail?.poster_image || '';
                  const mediaType =
                    item.display_media_type || item.media_item_detail?.media_type || 'PELICULA';
                  const displayGenres =
                    Array.isArray(item.display_genres) && item.display_genres.length > 0
                      ? item.display_genres
                      : item.media_item_detail?.genres || [];
                  const isSerie = mediaType === 'SERIE';
                  const durationMinutes = getCurrentEpisodeDuration(item);
                  const note = notesByTrackingId[item.id] || { rating: null, comment: '' };
                  const isEditorOpen = expandedEditorId === item.id;

                  return (
                    <Card key={item.id} className="shadow-sm" data-testid={`tracking-card-${item.id}`}>
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
                                    <Link
                                      to={`/media/${item.media_item}`}
                                      className="h5 mb-0 text-decoration-none"
                                    >
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

                                {displayGenres.length > 0 && (
                                  <div className="d-flex flex-wrap gap-1 mt-1">
                                    {displayGenres.map((g) => (
                                      <Badge key={g.id} bg="" className="ct-genre-badge">
                                        {g.name}
                                      </Badge>
                                    ))}
                                  </div>
                                )}

                                {item.submission_status === 'REJECTED' &&
                                  item.submission_rejection_reason && (
                                    <div className="small text-danger mt-1">
                                      Motivo: {item.submission_rejection_reason}
                                    </div>
                                  )}
                              </div>

                              <div className="d-flex flex-wrap gap-2">
                                <Button
                                  size="sm"
                                  variant={isEditorOpen ? 'secondary' : 'outline-primary'}
                                  onClick={() =>
                                    setExpandedEditorId(isEditorOpen ? null : item.id)
                                  }
                                  data-testid={`toggle-editor-${item.id}`}
                                >
                                  {isEditorOpen ? 'Cerrar editor' : 'Editar progreso'}
                                </Button>
                                <Button
                                  size="sm"
                                  variant={item.is_favorite ? 'warning' : 'outline-secondary'}
                                  disabled={savingId === item.id}
                                  onClick={() =>
                                    handleUpdateProgress(item.id, {
                                      is_favorite: !item.is_favorite,
                                    })
                                  }
                                >
                                  {item.is_favorite ? '★ Favorito' : '☆ Favorito'}
                                </Button>
                              </div>
                            </div>

                            <div className="small text-muted d-flex flex-wrap gap-3 mb-2">
                              <span>
                                Plataforma:{' '}
                                <strong>{item.watch_platform || 'Sin definir'}</strong>
                              </span>
                              {isSerie && (
                                <span>
                                  Capítulo actual:{' '}
                                  <strong>
                                    T{item.current_season_number || 1} · E
                                    {item.current_episode_number || 1}
                                  </strong>
                                </span>
                              )}
                              <span>
                                Posición:{' '}
                                <code>{formatSecondsToHHMMSS(item.current_seconds || 0)}</code>
                              </span>
                              <span>Iniciado: {formatDateTime(item.started_at)}</span>
                              {item.finished_at && (
                                <span>Finalizado: {formatDateTime(item.finished_at)}</span>
                              )}
                            </div>

                            {isSerie && (
                              <div className="pt-2 border-top d-flex flex-wrap align-items-center gap-2 mb-2">
                                <span className="small text-muted fw-semibold">
                                  Historial de capítulos vistos:
                                </span>
                                {Array.isArray(item.episode_history) &&
                                item.episode_history.length > 0 ? (
                                  item.episode_history.map((ep) => (
                                    <Badge
                                      key={`${ep.season}-${ep.episode}`}
                                      bg=""
                                      className="ct-status-badge ct-status-visto tabular-nums"
                                    >
                                      T{ep.season} · E{ep.episode}
                                    </Badge>
                                  ))
                                ) : (
                                  <span className="small text-muted">
                                    Guardá un capítulo con estado VISTO para registrarlo en el historial.
                                  </span>
                                )}
                              </div>
                            )}

                            {isEditorOpen && (
                              <TrackingProgressEditor
                                progress={item}
                                isSaving={savingId === item.id}
                                durationMinutes={durationMinutes}
                                onUpdateProgress={handleUpdateProgress}
                                onDeleteProgress={setDeleteTarget}
                                onCancel={() => setExpandedEditorId(null)}
                              />
                            )}

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

              {totalCount > pageSize && (
                <div
                  className="d-flex justify-content-between align-items-center flex-wrap gap-2 mt-4 pt-3 border-top"
                  data-testid="tracking-pagination"
                >
                  <span className="text-muted small">
                    Página {page} de {Math.max(1, Math.ceil(totalCount / pageSize))} ({totalCount}{' '}
                    registros)
                  </span>
                  <div className="d-flex gap-2">
                    <Button
                      size="sm"
                      variant="outline-secondary"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      data-testid="tracking-prev-page"
                    >
                      Anterior
                    </Button>
                    <Button
                      size="sm"
                      variant="outline-secondary"
                      disabled={page >= Math.ceil(totalCount / pageSize)}
                      onClick={() => setPage((p) => p + 1)}
                      data-testid="tracking-next-page"
                    >
                      Siguiente
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}

      {activeView === 'proposals' && (
        <section data-testid="my-proposals-section">
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
            <p className="text-muted small mb-0">
              Estado de las películas o series que propusiste para el catálogo público.
            </p>
            <Button variant="primary" size="sm" onClick={() => setActiveView('add')}>
              + Nueva propuesta
            </Button>
          </div>

          {submissionsLoading && <LoadingSpinner message="Cargando tus propuestas..." />}
          {!submissionsLoading && submissionsError && (
            <ErrorMessage error={submissionsError} onRetry={loadSubmissions} />
          )}

          {!submissionsLoading && !submissionsError && submissions.length === 0 && (
            <EmptyState
              title="Todavía no propusiste obras nuevas"
              description="Si no encuentras una película o serie en el catálogo, puedes proponerla y guardarla en tu diario."
              actionLabel="Agregar obra nueva"
              onAction={() => setActiveView('add')}
            />
          )}

          {!submissionsLoading && !submissionsError && submissions.length > 0 && (
            <Row className="g-3">
              {submissions.map((sub) => {
                const meta = SUBMISSION_STATUS_BADGE[sub.status] || {
                  bg: 'secondary',
                  text: 'light',
                  label: sub.status,
                };
                return (
                  <Col md={6} key={sub.id}>
                    <Card className="h-100 shadow-sm">
                      <Card.Body className="d-flex gap-3">
                        {sub.effective_poster_url && (
                          <img
                            src={sub.effective_poster_url}
                            alt={sub.title}
                            className="rounded"
                            style={{ width: 80, height: 110, objectFit: 'cover' }}
                          />
                        )}
                        <div className="flex-grow-1">
                          <div className="d-flex justify-content-between align-items-start mb-1">
                            <h2 className="h6 mb-0">{sub.title}</h2>
                            <Badge bg={meta.bg} text={meta.text}>
                              {meta.label}
                            </Badge>
                          </div>
                          <div className="text-muted small mb-2">
                            {sub.media_type} {sub.release_year ? `• ${sub.release_year}` : ''} •
                            Plataforma: {sub.submitted_platform}
                          </div>
                          {Array.isArray(sub.genres) && sub.genres.length > 0 && (
                            <div className="d-flex flex-wrap gap-1 mb-2">
                              {sub.genres.map((g) => (
                                <Badge key={g.id} bg="" className="ct-genre-badge">
                                  {g.name}
                                </Badge>
                              ))}
                            </div>
                          )}
                          {sub.status === 'PENDING' && editingSubId !== sub.id && (
                            <Button
                              size="sm"
                              variant="outline-secondary"
                              className="mb-2"
                              onClick={() => {
                                setEditingSubId(sub.id);
                                setEditGenreIds((sub.genres || []).map((g) => Number(g.id)));
                                setFeedback(null);
                              }}
                              data-testid={`edit-submission-genres-${sub.id}`}
                            >
                              Editar categorías
                            </Button>
                          )}
                          {sub.status === 'PENDING' && editingSubId === sub.id && (
                            <div className="border rounded p-2 mb-2 bg-light">
                              <GenreMultiSelect
                                genres={allGenres}
                                selectedIds={editGenreIds}
                                onChange={setEditGenreIds}
                                disabled={savingSubEdit}
                                showValidation
                                testIdPrefix={`my-sub-genre-${sub.id}`}
                              />
                              <div className="d-flex gap-2">
                                <Button
                                  size="sm"
                                  variant="primary"
                                  disabled={savingSubEdit || editGenreIds.length < 1}
                                  onClick={() => handleSaveSubmissionGenres(sub.id)}
                                  data-testid={`save-submission-genres-${sub.id}`}
                                >
                                  {savingSubEdit ? 'Guardando...' : 'Guardar categorías'}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline-secondary"
                                  disabled={savingSubEdit}
                                  onClick={() => setEditingSubId(null)}
                                >
                                  Cancelar
                                </Button>
                              </div>
                            </div>
                          )}
                          {sub.status === 'REJECTED' && sub.rejection_reason && (
                            <div className="small text-danger mb-2">
                              Motivo: {sub.rejection_reason}
                            </div>
                          )}
                          {sub.resolved_media && (
                            <Button
                              as={Link}
                              to={`/media/${sub.resolved_media}`}
                              size="sm"
                              variant="outline-primary"
                            >
                              Ver ficha publicada
                            </Button>
                          )}
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>
                );
              })}
            </Row>
          )}
        </section>
      )}

      {activeView === 'add' && (
        <section data-testid="add-work-section">
          <Card className="shadow-sm mb-4">
            <Card.Body>
              <h2 className="h5 mb-1">1. Buscar una obra ya publicada en CineTrack</h2>
              <p className="text-muted small mb-3">
                Si ya existe en el catálogo público, agrégala directo a tu diario sin duplicar propuestas.
              </p>
              <Row className="g-2 mb-3">
                <Col md={8}>
                  <Form.Control
                    type="search"
                    placeholder="Buscar por título, productora o país..."
                    value={catalogQuery}
                    onChange={(e) => setCatalogQuery(e.target.value)}
                    data-testid="quick-add-catalog-search"
                  />
                </Col>
                <Col md={4}>
                  <Form.Control
                    type="text"
                    placeholder="Plataforma (ej. Netflix)"
                    value={quickAddPlatform}
                    onChange={(e) => setQuickAddPlatform(e.target.value)}
                  />
                </Col>
              </Row>

              {catalogSearching && (
                <div className="small text-muted">Buscando en el catálogo...</div>
              )}

              {catalogMatches.length > 0 && (
                <ListGroup>
                  {catalogMatches.map((m) => (
                    <ListGroup.Item
                      key={m.id}
                      className="d-flex justify-content-between align-items-center flex-wrap gap-2"
                    >
                      <div>
                        <strong>{m.title}</strong>{' '}
                        <Badge bg="secondary" className="ms-1">
                          {m.media_type}
                        </Badge>{' '}
                        {m.release_year && <span className="text-muted small">({m.release_year})</span>}
                      </div>
                      <Button
                        size="sm"
                        variant="success"
                        disabled={quickAddingId === m.id}
                        onClick={() => handleQuickAddFromCatalog(m)}
                      >
                        {quickAddingId === m.id ? 'Agregando...' : 'Agregar a Mi CineTrack'}
                      </Button>
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              )}
            </Card.Body>
          </Card>

          <h2 className="h5 mb-2">2. ¿No está en el catálogo? Propone una obra nueva</h2>
          <p className="text-muted small mb-3">
            Se guardará de inmediato en tu diario personal y quedará pendiente de revisión para el catálogo público.
          </p>

          {proposalResult ? (
            <Alert variant="success">
              <Alert.Heading className="h5">¡Guardado en tu diario personal!</Alert.Heading>
              <p className="mb-2">
                Tu propuesta (#{proposalResult.submission_id}) quedó{' '}
                <strong>pendiente de revisión</strong>. Ya puedes editar tu progreso, estrellas y
                comentario privado en Mi CineTrack.
              </p>
              <div className="d-flex gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setProposalResult(null);
                    setActiveView('tracking');
                  }}
                >
                  Ir a Mis obras
                </Button>
                <Button
                  variant="outline-secondary"
                  size="sm"
                  onClick={() => {
                    setProposalResult(null);
                    setActiveView('proposals');
                  }}
                >
                  Ver Mis propuestas
                </Button>
              </div>
            </Alert>
          ) : (
            <SubmissionForm
              onSubmit={handleCreateSubmission}
              submitting={submittingProposal}
              error={proposalError}
            />
          )}
        </section>
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

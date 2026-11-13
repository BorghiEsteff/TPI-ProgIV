import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  ButtonGroup,
  Card,
  Col,
  Container,
  Row,
} from 'react-bootstrap';
import { Link, useParams } from 'react-router-dom';
import SeasonAccordion from '../components/catalog/SeasonAccordion';
import ConfirmModal from '../components/common/ConfirmModal';
import DegradedBanner from '../components/common/DegradedBanner';
import EmptyState from '../components/common/EmptyState';
import ErrorMessage from '../components/common/ErrorMessage';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ReviewForm from '../components/reviews/ReviewForm';
import ReviewList from '../components/reviews/ReviewList';
import { useAuth } from '../hooks/useAuth';
import * as catalogService from '../services/catalogService';
import * as reviewService from '../services/reviewService';
import * as trackingService from '../services/trackingService';

const MediaDetailPage = () => {
  const { id } = useParams();
  const { isAuthenticated, user } = useAuth();

  const [fetchMode, setFetchMode] = useState('FEDERATED');
  const [media, setMedia] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [averageRating, setAverageRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isDegraded, setIsDegraded] = useState(false);

  const [isTracked, setIsTracked] = useState(false);
  const [trackingLoading, setTrackingLoading] = useState(false);

  const [creatingReview, setCreatingReview] = useState(false);
  const [updatingReviewId, setUpdatingReviewId] = useState(null);
  const [replyingReviewId, setReplyingReviewId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deletingReview, setDeletingReview] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const loadTrackingStatus = useCallback(async () => {
    if (!isAuthenticated) {
      setIsTracked(false);
      return;
    }
    try {
      const { data } = await trackingService.getMyTracking({ media_item: id });
      const list = Array.isArray(data) ? data : data?.results || [];
      setIsTracked(list.some((entry) => Number(entry.media_item) === Number(id)));
    } catch {
      // No bloquea la vista de detalle
    }
  }, [id, isAuthenticated]);

  const loadMediaAndReviews = useCallback(
    async (mode = fetchMode) => {
      setLoading(true);
      setError(null);
      setIsDegraded(false);

      try {
        if (mode === 'FEDERATED') {
          const federatedRes = await reviewService.getFederatedMediaDetails(id);
          const fed = federatedRes.data;
          let degradedFlag = Boolean(federatedRes.isDegraded);

          // Enriquecimiento opcional con temporadas, generos y poster desde Django
          let catalogDetail = null;
          try {
            const catRes = await catalogService.getMediaDetail(id);
            catalogDetail = catRes.data;
            degradedFlag = degradedFlag || Boolean(catRes.isDegraded);
          } catch {
            // Si Django no responde, la ficha sigue operativa con los datos federados
          }

          if (!fed && !catalogDetail) {
            setMedia(null);
            setReviews([]);
            setTotalReviews(0);
            setAverageRating(0);
          } else {
            setMedia({
              id: Number(id),
              title: catalogDetail?.title || fed?.title || `Obra #${id}`,
              media_type: catalogDetail?.media_type || fed?.mediaType || 'PELICULA',
              release_date: catalogDetail?.release_date || fed?.releaseDate || '',
              producer: catalogDetail?.producer || '',
              poster_image: catalogDetail?.poster_image || '',
              synopsis: catalogDetail?.synopsis || fed?.synopsis || '',
              genres: catalogDetail?.genres || [],
              seasons: catalogDetail?.seasons || [],
            });
            setReviews(fed?.reviews || []);
            setTotalReviews(fed?.totalReviews ?? (fed?.reviews || []).length);
            setAverageRating(fed?.averageRating ?? 0);
          }
          setIsDegraded(degradedFlag);
        } else {
          const [catRes, revRes] = await Promise.all([
            catalogService.getMediaDetail(id),
            reviewService.getReviewsByMedia(id, { page: 1, limit: 20 }),
          ]);

          const revPayload = revRes.data;
          const revList = Array.isArray(revPayload)
            ? revPayload
            : revPayload?.data || [];
          const total = revPayload?.pagination?.total ?? revList.length;
          const avg =
            revList.length > 0
              ? Number(
                  (
                    revList.reduce((acc, item) => acc + Number(item.rating || 0), 0) /
                    revList.length
                  ).toFixed(1)
                )
              : 0;

          setMedia(catRes.data);
          setReviews(revList);
          setTotalReviews(total);
          setAverageRating(avg);
          setIsDegraded(Boolean(catRes.isDegraded || revRes.isDegraded));
        }
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    },
    [fetchMode, id]
  );

  useEffect(() => {
    loadMediaAndReviews(fetchMode);
  }, [fetchMode, loadMediaAndReviews]);

  useEffect(() => {
    loadTrackingStatus();
  }, [loadTrackingStatus]);

  const handleTrackMedia = async () => {
    if (!media) return;
    setTrackingLoading(true);
    setFeedback(null);
    try {
      await trackingService.createTracking({
        media_item: media.id,
        status: 'PENDIENTE',
        current_seconds: 0,
      });
      setIsTracked(true);
      setFeedback({
        variant: 'success',
        text: `"${media.title}" fue agregado a Mi Progreso.`,
      });
    } catch (err) {
      setFeedback({
        variant: 'danger',
        text: err.message || 'No se pudo agregar la obra al seguimiento.',
      });
    } finally {
      setTrackingLoading(false);
    }
  };

  const handleCreateReview = async (payload) => {
    setCreatingReview(true);
    setFeedback(null);
    try {
      const { data: created, isDegraded: degraded } = await reviewService.createReview({
        mediaItemId: Number(id),
        ...payload,
      });
      if (degraded) setIsDegraded(true);
      setReviews((prev) => [created, ...prev]);
      setTotalReviews((prev) => prev + 1);
      setFeedback({
        variant: 'success',
        text: 'Resena publicada correctamente en MongoDB.',
      });
    } catch (err) {
      setFeedback({
        variant: 'danger',
        text: err.message || 'No se pudo publicar la resena.',
      });
    } finally {
      setCreatingReview(false);
    }
  };

  const handleUpdateReview = async (reviewId, payload) => {
    setUpdatingReviewId(reviewId);
    setFeedback(null);
    try {
      const { data: updated, isDegraded: degraded } = await reviewService.updateReview(
        reviewId,
        payload
      );
      if (degraded) setIsDegraded(true);
      setReviews((prev) =>
        prev.map((item) =>
          String(item._id || item.id) === String(reviewId) ? updated : item
        )
      );
      setFeedback({
        variant: 'success',
        text: 'Resena actualizada correctamente.',
      });
    } catch (err) {
      setFeedback({
        variant: 'danger',
        text: err.message || 'No se pudo actualizar la resena.',
      });
    } finally {
      setUpdatingReviewId(null);
    }
  };

  const handleConfirmDeleteReview = async () => {
    if (!deleteTarget) return;
    const targetId = deleteTarget._id || deleteTarget.id;
    setDeletingReview(true);
    setFeedback(null);
    try {
      await reviewService.deleteReview(targetId);
      setReviews((prev) =>
        prev.filter((item) => String(item._id || item.id) !== String(targetId))
      );
      setTotalReviews((prev) => Math.max(0, prev - 1));
      setDeleteTarget(null);
      setFeedback({
        variant: 'info',
        text: 'Resena eliminada correctamente.',
      });
    } catch (err) {
      setFeedback({
        variant: 'danger',
        text: err.message || 'No se pudo eliminar la resena.',
      });
    } finally {
      setDeletingReview(false);
    }
  };

  const handleAddReply = async (reviewId, comment) => {
    setReplyingReviewId(reviewId);
    setFeedback(null);
    try {
      const updatedReview = await reviewService.addReply(reviewId, comment);
      setReviews((prev) =>
        prev.map((item) =>
          String(item._id || item.id) === String(reviewId) ? updatedReview : item
        )
      );
    } catch (err) {
      setFeedback({
        variant: 'danger',
        text: err.message || 'No se pudo agregar la respuesta.',
      });
    } finally {
      setReplyingReviewId(null);
    }
  };

  const computedAverage = useMemo(() => {
    if (reviews.length === 0) return averageRating || 0;
    const sum = reviews.reduce((acc, r) => acc + Number(r.rating || 0), 0);
    return Number((sum / reviews.length).toFixed(1));
  }, [reviews, averageRating]);

  return (
    <Container className="py-4">
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
        <Button as={Link} to="/" variant="outline-secondary" size="sm">
          Volver al Catalogo
        </Button>

        <ButtonGroup size="sm">
          <Button
            variant={fetchMode === 'FEDERATED' ? 'dark' : 'outline-secondary'}
            onClick={() => setFetchMode('FEDERATED')}
          >
            GraphQL Federado (:5000/graphql)
          </Button>
          <Button
            variant={fetchMode === 'REST' ? 'dark' : 'outline-secondary'}
            onClick={() => setFetchMode('REST')}
          >
            REST Poliglota (:8000 + :5000)
          </Button>
        </ButtonGroup>
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

      {loading && <LoadingSpinner message="Cargando ficha de obra y resenas..." />}

      {!loading && error && (
        <ErrorMessage error={error} onRetry={() => loadMediaAndReviews(fetchMode)} />
      )}

      {!loading && !error && !media && (
        <EmptyState
          title="Obra no encontrada"
          description="El contenido solicitado no existe o no se encuentra disponible."
        />
      )}

      {!loading && !error && media && (
        <>
          <Card className="shadow-sm border-secondary-subtle mb-4">
            <Card.Body>
              <Row className="g-4">
                {media.poster_image && (
                  <Col md={4} lg={3}>
                    <img
                      src={media.poster_image}
                      alt={`Poster de ${media.title}`}
                      className="img-fluid rounded w-100"
                      style={{ maxHeight: '360px', objectFit: 'cover' }}
                    />
                  </Col>
                )}
                <Col>
                  <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-2">
                    <div>
                      <h1 className="h3 mb-1">{media.title}</h1>
                      <div className="d-flex align-items-center gap-2 flex-wrap">
                        <Badge bg={media.media_type === 'SERIE' ? 'info' : 'primary'} text={media.media_type === 'SERIE' ? 'dark' : 'light'}>
                          {media.media_type}
                        </Badge>
                        {media.release_date && (
                          <span className="text-muted small">Estreno: {media.release_date}</span>
                        )}
                        {media.producer && (
                          <span className="text-muted small">| {media.producer}</span>
                        )}
                      </div>
                    </div>

                    <div className="text-md-end">
                      <div className="fs-5 fw-bold text-dark">
                        Promedio: {computedAverage} / 10
                      </div>
                      <div className="text-muted small">
                        {totalReviews} {totalReviews === 1 ? 'resena' : 'resenas'}
                      </div>
                    </div>
                  </div>

                  {media.genres && media.genres.length > 0 && (
                    <div className="d-flex flex-wrap gap-1 mb-3">
                      {media.genres.map((g) => (
                        <Badge key={g.id || g.name} bg="light" text="dark" className="border">
                          {g.name}
                        </Badge>
                      ))}
                    </div>
                  )}

                  <p className="text-secondary mb-3">
                    {media.synopsis || 'Sin sinopsis disponible.'}
                  </p>

                  <div className="d-flex flex-wrap gap-2">
                    <Button as={Link} to={`/watch-rooms/${media.id}`} variant="dark" size="sm">
                      Entrar a Sala en Vivo
                    </Button>

                    {isAuthenticated && (
                      isTracked ? (
                        <Button as={Link} to="/my-tracking" variant="success" size="sm">
                          En Mi Progreso (Ver)
                        </Button>
                      ) : (
                        <Button
                          variant="primary"
                          size="sm"
                          disabled={trackingLoading}
                          onClick={handleTrackMedia}
                        >
                          {trackingLoading ? 'Agregando...' : 'Agregar a Mi Progreso'}
                        </Button>
                      )
                    )}
                  </div>
                </Col>
              </Row>
            </Card.Body>
          </Card>

          {media.media_type === 'SERIE' && (
            <div className="mb-4">
              <h2 className="h5 mb-3">Temporadas y Episodios</h2>
              <SeasonAccordion seasons={media.seasons || []} />
            </div>
          )}

          <div className="mb-4">
            <h2 className="h4 mb-3">Comunidad y Resenas</h2>

            {isAuthenticated ? (
              <ReviewForm
                isSubmitting={creatingReview}
                onSubmitReview={handleCreateReview}
              />
            ) : (
              <Alert variant="secondary" className="mb-4">
                <Link to="/login">Inicie sesion</Link> para publicar una resena o responder comentarios.
              </Alert>
            )}

            <ReviewList
              reviews={reviews}
              currentUser={user}
              isAuthenticated={isAuthenticated}
              updatingReviewId={updatingReviewId}
              replyingReviewId={replyingReviewId}
              onUpdateReview={handleUpdateReview}
              onDeleteReview={setDeleteTarget}
              onAddReply={handleAddReply}
            />
          </div>
        </>
      )}

      <ConfirmModal
        show={Boolean(deleteTarget)}
        title="Eliminar resena"
        body="Esta accion eliminara permanentemente la resena de MongoDB. Desea continuar?"
        confirmLabel="Eliminar"
        variant="danger"
        isLoading={deletingReview}
        onConfirm={handleConfirmDeleteReview}
        onCancel={() => setDeleteTarget(null)}
      />
    </Container>
  );
};

export default MediaDetailPage;


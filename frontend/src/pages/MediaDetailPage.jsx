import { useCallback, useEffect, useState } from 'react';
import { Alert, Badge, Button, Card, Col, Container, Row } from 'react-bootstrap';
import { Link, useParams } from 'react-router-dom';
import SeasonAccordion from '../components/catalog/SeasonAccordion';
import EmptyState from '../components/common/EmptyState';
import ErrorMessage from '../components/common/ErrorMessage';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { useAuth } from '../hooks/useAuth';
import * as catalogService from '../services/catalogService';
import * as trackingService from '../services/trackingService';

const MediaDetailPage = () => {
  const { id } = useParams();
  const { isAuthenticated, role } = useAuth();

  const [media, setMedia] = useState(null);
  const [imgError, setImgError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isTracked, setIsTracked] = useState(false);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const loadMedia = useCallback(async () => {
    setLoading(true);
    setError(null);
    setImgError(false);
    try {
      const { data } = await catalogService.getMediaDetail(id);
      setMedia(data);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [id]);

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
      // No bloquea la vista pública
    }
  }, [id, isAuthenticated]);

  useEffect(() => {
    loadMedia();
  }, [loadMedia]);

  useEffect(() => {
    loadTrackingStatus();
  }, [loadTrackingStatus]);

  const handleAddToDiary = async () => {
    setTrackingLoading(true);
    setFeedback(null);
    try {
      await trackingService.createTracking({
        media_item: Number(id),
        status: 'PENDIENTE',
      });
      setIsTracked(true);
      setFeedback({ variant: 'success', text: 'Agregada a tu diario personal (Mi CineTrack).' });
    } catch (err) {
      setFeedback({ variant: 'danger', text: err?.message || 'No se pudo agregar a Mi CineTrack.' });
    } finally {
      setTrackingLoading(false);
    }
  };

  if (loading) {
    return (
      <Container className="py-5">
        <LoadingSpinner message="Cargando ficha de la obra..." />
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="py-5">
        <ErrorMessage error={error} onRetry={loadMedia} />
      </Container>
    );
  }

  if (!media) {
    return (
      <Container className="py-5">
        <EmptyState
          title="Obra no encontrada"
          description="Esta ficha no existe o no está publicada en el catálogo."
        />
      </Container>
    );
  }

  return (
    <Container className="py-4">
      <div className="mb-3">
        <Button as={Link} to="/" size="sm" variant="outline-secondary">
          ← Volver al catálogo
        </Button>
      </div>

      {feedback && (
        <Alert variant={feedback.variant} dismissible onClose={() => setFeedback(null)}>
          {feedback.text}
        </Alert>
      )}

      <Card className="shadow-sm mb-4">
        <Card.Body className="p-4">
          <Row className="g-4">
            <Col md={4} lg={3}>
              {media.poster_image && !imgError ? (
                <div className="ct-poster-frame rounded shadow-sm">
                  <img
                    src={media.poster_image}
                    alt={`Portada de ${media.title}`}
                    className="ct-poster-img"
                    onError={() => setImgError(true)}
                  />
                </div>
              ) : (
                <div className="ct-poster-fallback rounded">
                  <span className="small text-uppercase fw-semibold">
                    {media.media_type === 'SERIE' ? 'Serie' : 'Película'}
                  </span>
                  <span className="small mt-1 opacity-75">{media.title}</span>
                </div>
              )}
            </Col>

            <Col md={8} lg={9}>
              <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-2">
                <h1 className="h2 mb-0">{media.title}</h1>
                <div className="d-flex gap-2 align-items-center">
                  {media.is_active === false && (
                    <Badge bg="warning" text="dark">
                      Oculta del catálogo público
                    </Badge>
                  )}
                  <Badge bg="" className={media.media_type === 'SERIE' ? 'ct-badge-serie' : 'ct-badge-pelicula'}>
                    {media.media_type === 'SERIE' ? 'Serie' : 'Película'}
                  </Badge>
                </div>
              </div>

              <div className="text-muted small mb-3 tabular-nums">
                {(media.release_year || media.release_date) && (
                  <span className="me-3">Año: {media.release_year || media.release_date}</span>
                )}
                {media.country_of_origin && (
                  <span className="me-3">Origen: {media.country_of_origin}</span>
                )}
                {media.producer && <span>Productora: {media.producer}</span>}
              </div>

              {Array.isArray(media.genres) && media.genres.length > 0 && (
                <div className="d-flex gap-2 flex-wrap mb-3">
                  {media.genres.map((g) => (
                    <Badge key={g.id || g.name} bg="" className="ct-genre-badge">
                      {g.name || g}
                    </Badge>
                  ))}
                </div>
              )}

              {media.synopsis && <p className="mb-4">{media.synopsis}</p>}

              <div className="d-flex gap-2 flex-wrap">
                {isAuthenticated ? (
                  isTracked ? (
                    <Button as={Link} to="/my-tracking" variant="success">
                      Abrir mi registro en Mi CineTrack
                    </Button>
                  ) : (
                    <Button variant="primary" disabled={trackingLoading} onClick={handleAddToDiary}>
                      {trackingLoading ? 'Agregando...' : '+ Agregar a Mi CineTrack'}
                    </Button>
                  )
                ) : (
                  <Button as={Link} to="/login" variant="outline-primary">
                    Inicia sesión para guardar en Mi CineTrack
                  </Button>
                )}

                {role === 'ADMIN' && (
                  <Button as={Link} to={`/admin/media/${media.id}`} variant="outline-secondary">
                    Editar ficha pública
                  </Button>
                )}
              </div>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {media.media_type === 'SERIE' && Array.isArray(media.seasons) && media.seasons.length > 0 && (
        <Card className="shadow-sm">
          <Card.Body>
            <h2 className="h5 mb-3">Temporadas y episodios</h2>
            <SeasonAccordion seasons={media.seasons} />
          </Card.Body>
        </Card>
      )}
    </Container>
  );
};

export default MediaDetailPage;

import { useCallback, useEffect, useState } from 'react';
import { Badge, Button, Card, Col, Container, Row } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import EmptyState from '../components/common/EmptyState';
import ErrorMessage from '../components/common/ErrorMessage';
import LoadingSpinner from '../components/common/LoadingSpinner';
import * as submissionService from '../services/submissionService';

const STATUS_BADGE = {
  PENDING: { bg: 'warning', text: 'dark', label: 'Pendiente de revisión' },
  PUBLISHED: { bg: 'success', text: 'light', label: 'Publicada' },
  MERGED: { bg: 'info', text: 'dark', label: 'Vinculada al catálogo' },
  REJECTED: { bg: 'danger', text: 'light', label: 'No publicada' },
};

const MySubmissionsPage = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await submissionService.getMySubmissions();
      setItems(data);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Container className="py-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h1 className="h3 mb-1">Mis Propuestas</h1>
          <p className="text-muted small mb-0">
            Estado de las películas o series que propusiste para el catálogo público.
          </p>
        </div>
        <Button as={Link} to="/new-entry" variant="primary" size="sm">
          + Nueva propuesta
        </Button>
      </div>

      {loading && <LoadingSpinner message="Cargando tus propuestas..." />}
      {!loading && error && <ErrorMessage error={error} onRetry={load} />}
      {!loading && !error && items.length === 0 && (
        <EmptyState
          title="Todavía no propusiste obras nuevas"
          description="Si no encuentras una película o serie en el catálogo, puedes proponerla y guardarla en tu diario."
          actionLabel="Agregar obra nueva"
          onAction={() => {}}
        />
      )}

      {!loading && !error && items.length > 0 && (
        <Row className="g-3">
          {items.map((sub) => {
            const meta = STATUS_BADGE[sub.status] || { bg: 'secondary', text: 'light', label: sub.status };
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
                        {sub.media_type} {sub.release_year ? `• ${sub.release_year}` : ''} • Plataforma: {sub.submitted_platform}
                      </div>
                      {sub.status === 'REJECTED' && sub.rejection_reason && (
                        <div className="small text-danger mb-2">
                          Motivo: {sub.rejection_reason}
                        </div>
                      )}
                      {sub.resolved_media && (
                        <Button as={Link} to={`/media/${sub.resolved_media}`} size="sm" variant="outline-primary">
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
    </Container>
  );
};

export default MySubmissionsPage;

import { useState } from 'react';
import { Alert, Badge, Button, Card, Col, Form, Row } from 'react-bootstrap';
import { Link } from 'react-router-dom';

const RecommendationChat = ({ onAsk, onAddToDiary, loading = false }) => {
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState(null);
  const [error, setError] = useState(null);
  const [addedIds, setAddedIds] = useState(new Set());

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    setError(null);
    try {
      const data = await onAsk(prompt.trim());
      setResponse(data);
    } catch (err) {
      setError(err?.message || 'No se pudo obtener recomendaciones.');
    }
  };

  const handleAdd = async (mediaId) => {
    await onAddToDiary(mediaId);
    setAddedIds((prev) => new Set(prev).add(mediaId));
  };

  return (
    <div>
      <Card className="shadow-sm mb-4">
        <Card.Body>
          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3" controlId="recommendPrompt">
              <Form.Label className="fw-semibold">¿Qué tienes ganas de ver hoy?</Form.Label>
              <Form.Control
                type="text"
                maxLength={500}
                placeholder="Ej. quiero un kdrama romántico del 2026"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                disabled={loading}
                required
              />
            </Form.Group>
            <Button type="submit" variant="primary" disabled={loading || !prompt.trim()}>
              {loading ? 'Buscando en el catálogo...' : 'Pedir recomendaciones'}
            </Button>
          </Form>
        </Card.Body>
      </Card>

      {error && <Alert variant="danger">{error}</Alert>}

      {response && (
        <div>
          <Alert variant={response.degraded ? 'warning' : 'info'} className="d-flex justify-content-between align-items-center">
            <span>{response.message}</span>
            {response.degraded && <Badge bg="dark">Modo limitado</Badge>}
          </Alert>

          <Row className="g-3">
            {(response.recommendations || []).map((rec) => {
              const isAdded = addedIds.has(rec.media_item_id);
              return (
                <Col md={6} lg={4} key={rec.media_item_id}>
                  <Card className="h-100 shadow-sm">
                    {rec.poster_image && (
                      <Card.Img
                        variant="top"
                        src={rec.poster_image}
                        alt={rec.title}
                        style={{ height: 200, objectFit: 'cover' }}
                      />
                    )}
                    <Card.Body className="d-flex flex-column">
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <Card.Title className="h6 mb-0">{rec.title}</Card.Title>
                        <Badge bg="secondary">{rec.media_type}</Badge>
                      </div>
                      <Card.Text className="small text-muted flex-grow-1">{rec.reason}</Card.Text>
                      <div className="d-flex gap-2 mt-2">
                        <Button as={Link} to={`/media/${rec.media_item_id}`} size="sm" variant="outline-secondary">
                          Ver ficha
                        </Button>
                        <Button
                          size="sm"
                          variant={isAdded ? 'success' : 'primary'}
                          disabled={isAdded}
                          onClick={() => handleAdd(rec.media_item_id)}
                        >
                          {isAdded ? 'En Mi CineTrack' : 'Agregar a Mi CineTrack'}
                        </Button>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
              );
            })}
          </Row>
        </div>
      )}
    </div>
  );
};

export default RecommendationChat;

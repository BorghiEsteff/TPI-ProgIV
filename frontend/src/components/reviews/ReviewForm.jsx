import { useState } from 'react';
import { Alert, Button, Card, Col, Form, Row, Spinner } from 'react-bootstrap';

const ReviewForm = ({ isSubmitting = false, onSubmitReview }) => {
  const [rating, setRating] = useState(8);
  const [comment, setComment] = useState('');
  const [isSpoiler, setIsSpoiler] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!comment.trim() || !onSubmitReview) return;
    await onSubmitReview({
      rating: Number(rating),
      comment: comment.trim(),
      isSpoiler,
    });
    setComment('');
    setIsSpoiler(false);
  };

  return (
    <Card className="shadow-sm border-secondary-subtle mb-4">
      <Card.Body>
        <Card.Title as="h5" className="mb-2">
          Publicar Resena
        </Card.Title>
        <Alert variant="info" className="py-2 small mb-3">
          El contenido publicado se almacena en MongoDB y puede ser analizado por el microservicio de IA (POST /ai/review-guard) para deteccion de spoilers y sentimiento.
        </Alert>

        <Form onSubmit={handleSubmit}>
          <Row className="g-3 mb-3 align-items-end">
            <Col sm={4}>
              <Form.Label className="small fw-semibold">Calificacion (1 a 10)</Form.Label>
              <Form.Control
                type="number"
                min={1}
                max={10}
                value={rating}
                onChange={(e) => setRating(e.target.value)}
                disabled={isSubmitting}
                required
              />
            </Col>
            <Col sm={8}>
              <Form.Check
                type="checkbox"
                id="new-review-spoiler"
                label="Esta resena contiene spoilers de la trama"
                checked={isSpoiler}
                onChange={(e) => setIsSpoiler(e.target.checked)}
                disabled={isSubmitting}
              />
            </Col>
          </Row>

          <Form.Group className="mb-3" controlId="reviewComment">
            <Form.Label className="small fw-semibold">Comentario</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              placeholder="Comparta su opinion sobre la obra (maximo 2000 caracteres)..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={2000}
              disabled={isSubmitting}
              required
            />
          </Form.Group>

          <Button type="submit" variant="primary" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Spinner as="span" animation="border" size="sm" className="me-2" />
                Publicando...
              </>
            ) : (
              'Publicar Resena'
            )}
          </Button>
        </Form>
      </Card.Body>
    </Card>
  );
};

export default ReviewForm;


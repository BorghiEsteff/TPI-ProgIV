import { useState } from 'react';
import { Alert, Badge, Button, Card, Col, Form, Row, Spinner } from 'react-bootstrap';
import { formatDateTime } from '../../utils/timeFormat';
import ReplyThread from './ReplyThread';
import SentimentBadge from './SentimentBadge';
import SpoilerBadge from './SpoilerBadge';

const ReviewItem = ({
  review,
  currentUser = null,
  isAuthenticated = false,
  isUpdating = false,
  isReplying = false,
  onUpdateReview,
  onDeleteReview,
  onAddReply,
}) => {
  const reviewId = review._id || review.id;
  const hasSpoiler = Boolean(review.isSpoiler || review.hasSpoilers);
  const [revealSpoiler, setRevealSpoiler] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [editRating, setEditRating] = useState(review.rating || 5);
  const [editComment, setEditComment] = useState(review.comment || '');
  const [editIsSpoiler, setEditIsSpoiler] = useState(Boolean(review.isSpoiler));

  const isAuthor =
    currentUser && String(currentUser.id) === String(review.userId);
  const isAdmin =
    currentUser && String(currentUser.role || '').toUpperCase() === 'ADMIN';
  const canModify = Boolean(isAuthenticated && (isAuthor || isAdmin));

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editComment.trim() || !onUpdateReview) return;
    await onUpdateReview(reviewId, {
      rating: Number(editRating),
      comment: editComment.trim(),
      isSpoiler: Boolean(editIsSpoiler),
    });
    setIsEditing(false);
  };

  return (
    <Card className="shadow-sm border-secondary-subtle">
      <Card.Body>
        <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-2">
          <div>
            <div className="d-flex align-items-center gap-2 flex-wrap">
              <span className="fw-bold">{review.userName || review.userId}</span>
              <Badge bg="dark">Puntaje: {review.rating}/10</Badge>
              <SpoilerBadge
                hasSpoiler={hasSpoiler}
                confidence={review.spoilerConfidence ?? review.confidence}
              />
              <SentimentBadge sentiment={review.sentiment} />
            </div>
            <div className="text-muted small mt-1">
              Publicado: {formatDateTime(review.createdAt)}
            </div>
          </div>

          {canModify && !isEditing && (
            <div className="d-flex gap-2">
              <Button
                variant="outline-secondary"
                size="sm"
                onClick={() => {
                  setEditRating(review.rating);
                  setEditComment(review.comment);
                  setEditIsSpoiler(Boolean(review.isSpoiler));
                  setIsEditing(true);
                }}
              >
                Editar
              </Button>
              <Button
                variant="outline-danger"
                size="sm"
                onClick={() => onDeleteReview && onDeleteReview(review)}
              >
                Eliminar
              </Button>
            </div>
          )}
        </div>

        {isEditing ? (
          <Form onSubmit={handleSaveEdit} className="my-2">
            <Row className="g-2 mb-2">
              <Col sm={4}>
                <Form.Label className="small fw-semibold">Calificacion (1-10)</Form.Label>
                <Form.Control
                  type="number"
                  min={1}
                  max={10}
                  size="sm"
                  value={editRating}
                  onChange={(e) => setEditRating(e.target.value)}
                  disabled={isUpdating}
                  required
                />
              </Col>
              <Col sm={8} className="d-flex align-items-end">
                <Form.Check
                  type="checkbox"
                  id={`edit-spoiler-${reviewId}`}
                  label="Marcar como spoiler"
                  checked={editIsSpoiler}
                  onChange={(e) => setEditIsSpoiler(e.target.checked)}
                  disabled={isUpdating}
                />
              </Col>
            </Row>
            <Form.Group className="mb-2">
              <Form.Control
                as="textarea"
                rows={3}
                value={editComment}
                onChange={(e) => setEditComment(e.target.value)}
                maxLength={2000}
                disabled={isUpdating}
                required
              />
            </Form.Group>
            <div className="d-flex gap-2">
              <Button type="submit" variant="primary" size="sm" disabled={isUpdating}>
                {isUpdating ? (
                  <>
                    <Spinner as="span" animation="border" size="sm" className="me-1" />
                    Guardando
                  </>
                ) : (
                  'Guardar cambios'
                )}
              </Button>
              <Button
                type="button"
                variant="outline-secondary"
                size="sm"
                disabled={isUpdating}
                onClick={() => setIsEditing(false)}
              >
                Cancelar
              </Button>
            </div>
          </Form>
        ) : hasSpoiler && !revealSpoiler ? (
          <Alert variant="warning" className="my-2 d-flex justify-content-between align-items-center flex-wrap gap-2">
            <span className="small mb-0">
              Esta resena ha sido marcada con alerta de spoilers.
            </span>
            <Button
              variant="outline-dark"
              size="sm"
              onClick={() => setRevealSpoiler(true)}
            >
              Mostrar contenido con spoiler
            </Button>
          </Alert>
        ) : (
          <div>
            <p className="mb-1" style={{ whiteSpace: 'pre-line' }}>
              {review.comment}
            </p>
            {hasSpoiler && (
              <Button
                variant="link"
                size="sm"
                className="p-0 text-muted"
                onClick={() => setRevealSpoiler(false)}
              >
                Ocultar spoiler
              </Button>
            )}
          </div>
        )}

        <ReplyThread
          reviewId={reviewId}
          replies={review.replies || []}
          isAuthenticated={isAuthenticated}
          isSubmitting={isReplying}
          onAddReply={onAddReply}
        />
      </Card.Body>
    </Card>
  );
};

export default ReviewItem;


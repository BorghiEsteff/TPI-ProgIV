import { useState } from 'react';
import { Button, Form, InputGroup, ListGroup, Spinner } from 'react-bootstrap';
import { formatDateTime } from '../../utils/timeFormat';

const ReplyThread = ({
  reviewId,
  replies = [],
  isAuthenticated = false,
  isSubmitting = false,
  onAddReply,
}) => {
  const [replyText, setReplyText] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!replyText.trim() || !onAddReply) return;
    await onAddReply(reviewId, replyText.trim());
    setReplyText('');
  };

  return (
    <div className="mt-3 pt-2 border-top">
      <div className="small fw-semibold text-muted mb-2">
        Respuestas ({replies.length})
      </div>

      {replies.length > 0 && (
        <ListGroup variant="flush" className="mb-2">
          {replies.map((reply, idx) => (
            <ListGroup.Item
              key={reply._id || `${reply.userId}-${idx}`}
              className="px-2 py-2 bg-light rounded mb-1 border-0"
            >
              <div className="d-flex justify-content-between align-items-center small">
                <span className="fw-semibold">{reply.userName || reply.userId}</span>
                <span className="text-muted">{formatDateTime(reply.createdAt)}</span>
              </div>
              <div className="small mt-1">{reply.comment}</div>
            </ListGroup.Item>
          ))}
        </ListGroup>
      )}

      {isAuthenticated && onAddReply && (
        <Form onSubmit={handleSubmit}>
          <InputGroup size="sm">
            <Form.Control
              type="text"
              placeholder="Escribir una respuesta..."
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              maxLength={2000}
              disabled={isSubmitting}
              required
            />
            <Button type="submit" variant="outline-primary" disabled={isSubmitting}>
              {isSubmitting ? (
                <Spinner as="span" animation="border" size="sm" role="status" />
              ) : (
                'Responder'
              )}
            </Button>
          </InputGroup>
        </Form>
      )}
    </div>
  );
};

export default ReplyThread;


import { useEffect, useState } from 'react';
import { Alert, Button, Form } from 'react-bootstrap';
import StarRating from './StarRating';

const PersonalNoteEditor = ({
  initialRating = null,
  initialComment = '',
  onSave,
  saving = false,
}) => {
  const [rating, setRating] = useState(initialRating);
  const [comment, setComment] = useState(initialComment || '');
  const [statusMsg, setStatusMsg] = useState(null);

  useEffect(() => {
    setRating(initialRating ?? null);
    setComment(initialComment || '');
  }, [initialRating, initialComment]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatusMsg(null);
    try {
      await onSave({ rating, comment });
      setStatusMsg({ variant: 'success', text: 'Nota privada guardada.' });
    } catch (err) {
      setStatusMsg({
        variant: 'danger',
        text: err?.message || 'No se pudo guardar la nota privada.',
      });
    }
  };

  return (
    <Form onSubmit={handleSubmit} className="border-top pt-3 mt-3">
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-2">
        <span className="fw-semibold small">Mi valoración privada (solo tú la ves)</span>
        <StarRating value={rating} onChange={setRating} disabled={saving} />
      </div>

      <Form.Group className="mb-2">
        <Form.Label className="small text-muted mb-1">Comentario personal (opcional)</Form.Label>
        <Form.Control
          as="textarea"
          rows={2}
          maxLength={2000}
          placeholder="Escribe tus notas personales sobre esta obra..."
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          disabled={saving}
        />
        <div className="text-end text-muted" style={{ fontSize: '0.75rem' }}>
          {comment.length}/2000
        </div>
      </Form.Group>

      {statusMsg && (
        <Alert variant={statusMsg.variant} className="py-1 px-2 small mb-2">
          {statusMsg.text}
        </Alert>
      )}

      <Button type="submit" size="sm" variant="primary" disabled={saving}>
        {saving ? 'Guardando...' : 'Guardar nota privada'}
      </Button>
    </Form>
  );
};

export default PersonalNoteEditor;

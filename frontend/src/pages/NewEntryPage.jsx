import { useState } from 'react';
import { Alert, Button, Container } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import SubmissionForm from '../components/submissions/SubmissionForm';
import * as submissionService from '../services/submissionService';

const NewEntryPage = () => {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const handleCreate = async (payload) => {
    setSubmitting(true);
    setError(null);
    try {
      const data = await submissionService.createSubmission(payload);
      setResult(data);
    } catch (err) {
      setError(err?.message || 'No se pudo guardar la obra propuesta.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Container className="py-4" style={{ maxWidth: 760 }}>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h1 className="h3 mb-1">Agregar una obra nueva</h1>
          <p className="text-muted small mb-0">
            Se guardará de inmediato en tu diario personal y quedará pendiente de revisión para el catálogo público.
          </p>
        </div>
        <Button as={Link} to="/my-tracking" variant="outline-secondary" size="sm">
          Volver a Mi CineTrack
        </Button>
      </div>

      {result ? (
        <Alert variant="success">
          <Alert.Heading className="h5">¡Guardado en tu diario personal!</Alert.Heading>
          <p className="mb-2">
            Tu propuesta (#{result.submission_id}) quedó <strong>pendiente de revisión</strong>. Ya puedes editar tu progreso, estrellas y comentario privado en Mi CineTrack.
          </p>
          <div className="d-flex gap-2">
            <Button as={Link} to="/my-tracking" variant="primary" size="sm">
              Ir a Mi CineTrack
            </Button>
            <Button as={Link} to="/my-submissions" variant="outline-secondary" size="sm">
              Ver mis propuestas
            </Button>
          </div>
        </Alert>
      ) : (
        <SubmissionForm onSubmit={handleCreate} submitting={submitting} error={error} />
      )}
    </Container>
  );
};

export default NewEntryPage;

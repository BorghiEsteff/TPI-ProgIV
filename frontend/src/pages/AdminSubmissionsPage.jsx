import { useCallback, useEffect, useState } from 'react';
import { Alert, ButtonGroup, Button, Container } from 'react-bootstrap';
import SubmissionQueue from '../components/admin/SubmissionQueue';
import EmptyState from '../components/common/EmptyState';
import ErrorMessage from '../components/common/ErrorMessage';
import LoadingSpinner from '../components/common/LoadingSpinner';
import * as submissionService from '../services/submissionService';

const AdminSubmissionsPage = () => {
  const [statusFilter, setStatusFilter] = useState('PENDING');
  const [submissions, setSubmissions] = useState([]);
  const [candidatesById, setCandidatesById] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [feedback, setFeedback] = useState(null);

  const load = useCallback(async (filter = statusFilter) => {
    setLoading(true);
    setError(null);
    try {
      const data = await submissionService.getAdminSubmissions(filter);
      setSubmissions(data);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    load(statusFilter);
  }, [statusFilter, load]);

  const handleLoadCandidates = async (id) => {
    setBusyId(id);
    try {
      const candidates = await submissionService.getSubmissionCandidates(id);
      setCandidatesById((prev) => ({ ...prev, [id]: candidates }));
    } catch (err) {
      setFeedback({ variant: 'danger', text: err?.message || 'Error al buscar duplicados.' });
    } finally {
      setBusyId(null);
    }
  };

  const handlePublish = async (id, payload) => {
    setBusyId(id);
    setFeedback(null);
    try {
      const res = await submissionService.publishSubmission(id, payload);
      setFeedback({ variant: 'success', text: `Propuesta #${id} publicada como obra #${res.media_item_id}.` });
      await load(statusFilter);
    } catch (err) {
      setFeedback({ variant: 'danger', text: err?.message || 'No se pudo publicar la propuesta.' });
    } finally {
      setBusyId(null);
    }
  };

  const handleMerge = async (id, mediaItemId) => {
    setBusyId(id);
    setFeedback(null);
    try {
      await submissionService.mergeSubmission(id, mediaItemId);
      setFeedback({ variant: 'info', text: `Propuesta #${id} vinculada a la obra #${mediaItemId}.` });
      await load(statusFilter);
    } catch (err) {
      setFeedback({ variant: 'danger', text: err?.message || 'No se pudo vincular la propuesta.' });
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async (id, reason) => {
    setBusyId(id);
    setFeedback(null);
    try {
      await submissionService.rejectSubmission(id, reason);
      setFeedback({ variant: 'warning', text: `Propuesta #${id} rechazada.` });
      await load(statusFilter);
    } catch (err) {
      setFeedback({ variant: 'danger', text: err?.message || 'No se pudo rechazar la propuesta.' });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Container className="py-4">
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
        <div>
          <h1 className="h3 mb-1">Cola de Moderación</h1>
          <p className="text-muted small mb-0">
            Revisa propuestas, resuelve posibles duplicados y publica obras en el catálogo sin acceder a notas privadas.
          </p>
        </div>

        <ButtonGroup size="sm">
          {['PENDING', 'PUBLISHED', 'MERGED', 'REJECTED'].map((st) => (
            <Button
              key={st}
              variant={statusFilter === st ? 'dark' : 'outline-secondary'}
              onClick={() => setStatusFilter(st)}
            >
              {st}
            </Button>
          ))}
        </ButtonGroup>
      </div>

      {feedback && (
        <Alert variant={feedback.variant} dismissible onClose={() => setFeedback(null)}>
          {feedback.text}
        </Alert>
      )}

      {loading && <LoadingSpinner message="Cargando propuestas..." />}
      {!loading && error && <ErrorMessage error={error} onRetry={() => load(statusFilter)} />}
      {!loading && !error && submissions.length === 0 && (
        <EmptyState
          title="No hay propuestas en este estado"
          description="Cambia el filtro superior para revisar propuestas ya resueltas."
        />
      )}
      {!loading && !error && submissions.length > 0 && (
        <SubmissionQueue
          submissions={submissions}
          candidatesById={candidatesById}
          onLoadCandidates={handleLoadCandidates}
          onPublish={handlePublish}
          onMerge={handleMerge}
          onReject={handleReject}
          busyId={busyId}
        />
      )}
    </Container>
  );
};

export default AdminSubmissionsPage;

import { Badge, Button, ListGroup } from 'react-bootstrap';

const DuplicateCandidates = ({ candidates = [], onMerge, busy = false }) => {
  if (!candidates.length) {
    return (
      <p className="text-muted small mb-0">
        No se detectaron coincidencias evidentes en el catálogo ni en propuestas pendientes.
      </p>
    );
  }

  return (
    <ListGroup variant="flush">
      {candidates.map((cand, idx) => (
        <ListGroup.Item
          key={`${cand.source}-${cand.media_item_id || cand.submission_id}-${idx}`}
          className="d-flex justify-content-between align-items-center px-0"
        >
          <div>
            <Badge
              bg={cand.match_level === 'EXACT_MATCH' ? 'danger' : 'warning'}
              text={cand.match_level === 'EXACT_MATCH' ? 'light' : 'dark'}
              className="me-2"
            >
              {cand.match_level === 'EXACT_MATCH' ? 'Coincidencia exacta' : 'Posible coincidencia'}
            </Badge>
            <strong>{cand.title}</strong>{' '}
            <span className="text-muted small">
              ({cand.media_type}
              {cand.release_year ? `, ${cand.release_year}` : ''} —{' '}
              {cand.source === 'MEDIA_ITEM' ? 'Publicada' : 'Propuesta pendiente'})
            </span>
          </div>
          {cand.source === 'MEDIA_ITEM' && cand.media_item_id && (
            <Button
              size="sm"
              variant="outline-primary"
              disabled={busy}
              onClick={() => onMerge(cand.media_item_id)}
            >
              Vincular a esta ficha
            </Button>
          )}
        </ListGroup.Item>
      ))}
    </ListGroup>
  );
};

export default DuplicateCandidates;

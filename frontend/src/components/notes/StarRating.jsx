import { Button } from 'react-bootstrap';

const StarRating = ({ value = null, onChange, disabled = false }) => {
  return (
    <div className="d-inline-flex align-items-center gap-1" role="group" aria-label="Puntuación privada de 1 a 5 estrellas">
      {[1, 2, 3, 4, 5].map((star) => {
        const active = value !== null && star <= value;
        return (
          <Button
            key={star}
            type="button"
            size="sm"
            variant={active ? 'warning' : 'outline-secondary'}
            disabled={disabled}
            onClick={() => onChange(star)}
            aria-label={`${star} ${star === 1 ? 'estrella' : 'estrellas'}`}
            aria-pressed={active}
          >
            {active ? '★' : '☆'}
          </Button>
        );
      })}
      {value !== null && (
        <Button
          type="button"
          size="sm"
          variant="link"
          className="text-muted text-decoration-none ms-1 p-0"
          disabled={disabled}
          onClick={() => onChange(null)}
          aria-label="Quitar puntuación"
        >
          Limpiar
        </Button>
      )}
    </div>
  );
};

export default StarRating;

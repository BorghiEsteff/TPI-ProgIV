import { Badge, Button, Card } from 'react-bootstrap';
import { Link } from 'react-router-dom';

const MediaCard = ({
  item,
  isAuthenticated = false,
  isTracked = false,
  isTrackingLoading = false,
  onTrackMedia,
}) => {
  const isSerie = item.media_type === 'SERIE';
  const synopsisText = item.synopsis || 'Sin sinopsis disponible.';
  const truncatedSynopsis =
    synopsisText.length > 130 ? `${synopsisText.slice(0, 130)}...` : synopsisText;

  return (
    <Card className="h-100 shadow-sm border-secondary-subtle">
      {item.poster_image ? (
        <Card.Img
          variant="top"
          src={item.poster_image}
          alt={`Poster de ${item.title}`}
          style={{ height: '220px', objectFit: 'cover' }}
        />
      ) : (
        <div
          className="bg-dark text-light d-flex align-items-center justify-content-center"
          style={{ height: '140px' }}
        >
          <span className="small text-secondary text-uppercase fw-semibold">
            {isSerie ? 'Serie' : 'Pelicula'}
          </span>
        </div>
      )}

      <Card.Body className="d-flex flex-column">
        <div className="d-flex justify-content-between align-items-start gap-2 mb-2">
          <Card.Title as="h5" className="mb-0 fs-6 fw-bold">
            <Link to={`/media/${item.id}`} className="text-decoration-none text-dark">
              {item.title}
            </Link>
          </Card.Title>
          <Badge bg={isSerie ? 'info' : 'primary'} text={isSerie ? 'dark' : 'light'}>
            {item.media_type}
          </Badge>
        </div>

        <div className="text-muted small mb-2">
          <span>{item.producer || 'Productora no especificada'}</span>
          {item.release_date && <span> | {item.release_date}</span>}
        </div>

        <div className="d-flex flex-wrap gap-1 mb-2">
          {(item.genres || []).map((genre) => (
            <Badge key={genre.id || genre.name} bg="light" text="dark" className="border">
              {genre.name}
            </Badge>
          ))}
        </div>

        <Card.Text className="small text-secondary flex-grow-1">
          {truncatedSynopsis}
        </Card.Text>

        <div className="d-grid gap-2 mt-3">
          <Button
            as={Link}
            to={`/media/${item.id}`}
            variant="outline-primary"
            size="sm"
          >
            Ver ficha
          </Button>

          {isAuthenticated && onTrackMedia && (
            <Button
              variant={isTracked ? 'success' : 'primary'}
              size="sm"
              disabled={isTracked || isTrackingLoading}
              onClick={() => onTrackMedia(item)}
            >
              {isTrackingLoading
                ? 'Registrando...'
                : isTracked
                ? 'En Mi Progreso'
                : 'Agregar a Mi Progreso'}
            </Button>
          )}
        </div>
      </Card.Body>
    </Card>
  );
};

export default MediaCard;


import { Alert, Badge } from 'react-bootstrap';

const DEGRADED_MESSAGES = {
  catalog:
    'Algunos datos del catálogo pueden tardar un momento en actualizarse. Mostramos la información disponible.',
  ai:
    'El asistente de recomendaciones está funcionando en modo de respaldo con coincidencias del catálogo.',
};

const DegradedBanner = ({ show, mode = 'catalog' }) => {
  if (!show) return null;

  return (
    <Alert variant="warning" className="my-3 d-flex align-items-center gap-2">
      <Badge bg="warning" text="dark">
        AVISO
      </Badge>
      <span>{DEGRADED_MESSAGES[mode] || DEGRADED_MESSAGES.catalog}</span>
    </Alert>
  );
};

export default DegradedBanner;

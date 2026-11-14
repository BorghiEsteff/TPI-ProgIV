import { Alert, Badge } from 'react-bootstrap';

const DEGRADED_MESSAGES = {
  catalog:
    'Modo de contingencia activo (X-Degraded-Mode): el servicio de catalogo relacional no responde temporalmente. Se muestran datos locales o parciales.',
  ai:
    'Analisis IA en contingencia (X-Degraded-AI): el analizador semantico opera con heuristica local de respaldo.',
};

const DegradedBanner = ({ show, mode = 'catalog' }) => {
  if (!show) return null;

  return (
    <Alert variant="warning" className="my-3 d-flex align-items-center gap-2">
      <Badge bg="warning" text="dark">
        CONTINGENCIA
      </Badge>
      <span>{DEGRADED_MESSAGES[mode] || DEGRADED_MESSAGES.catalog}</span>
    </Alert>
  );
};

export default DegradedBanner;


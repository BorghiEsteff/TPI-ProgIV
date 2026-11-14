import { Badge } from 'react-bootstrap';

const STATUS_CONFIG = {
  PENDIENTE: { bg: 'secondary', label: 'PENDIENTE' },
  VIENDO: { bg: 'primary', label: 'VIENDO' },
  VISTO: { bg: 'success', label: 'VISTO' },
  ABANDONADO: { bg: 'warning', text: 'dark', label: 'ABANDONADO' },
};

const StatusBadge = ({ status }) => {
  const normalized = String(status || 'PENDIENTE').toUpperCase();
  const config = STATUS_CONFIG[normalized] || STATUS_CONFIG.PENDIENTE;

  return (
    <Badge bg={config.bg} text={config.text}>
      {config.label}
    </Badge>
  );
};

export default StatusBadge;


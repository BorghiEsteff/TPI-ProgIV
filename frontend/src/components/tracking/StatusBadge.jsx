import { Badge } from 'react-bootstrap';

const STATUS_CONFIG = {
  PENDIENTE: { className: 'ct-status-badge ct-status-pendiente', label: 'PENDIENTE' },
  VIENDO: { className: 'ct-status-badge ct-status-viendo', label: 'VIENDO' },
  VISTO: { className: 'ct-status-badge ct-status-visto', label: 'VISTO' },
  ABANDONADO: { className: 'ct-status-badge ct-status-abandonado', label: 'ABANDONADO' },
};

const StatusBadge = ({ status }) => {
  const normalized = String(status || 'PENDIENTE').toUpperCase();
  const config = STATUS_CONFIG[normalized] || STATUS_CONFIG.PENDIENTE;

  return (
    <Badge bg="" className={config.className}>
      {config.label}
    </Badge>
  );
};

export default StatusBadge;

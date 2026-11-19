import { ProgressBar } from 'react-bootstrap';
import {
  calculateProgressPercentage,
  formatDateTime,
  formatSecondsToHHMMSS,
} from '../../utils/timeFormat';

const ProgressTrackerBar = ({
  currentSeconds = 0,
  totalDurationMinutes = null,
  status = 'PENDIENTE',
  startedAt = null,
  finishedAt = null,
}) => {
  const formattedTime = formatSecondsToHHMMSS(currentSeconds);
  const percentage = calculateProgressPercentage(currentSeconds, totalDurationMinutes);
  const visualNow =
    status === 'VISTO' ? 100 : percentage !== null ? percentage : currentSeconds > 0 ? 50 : 0;
  const variant =
    status === 'VISTO' ? 'success' : status === 'ABANDONADO' ? 'warning' : 'primary';

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center small mb-1">
        <span className="fw-semibold">
          Tiempo acumulado: <code>{formattedTime}</code> ({currentSeconds} seg)
        </span>
        {percentage !== null && (
          <span className="text-muted">{percentage}% del episodio/obra</span>
        )}
      </div>

      <ProgressBar
        now={visualNow}
        variant={variant}
        striped={status === 'VIENDO'}
        className="mb-2"
        style={{ height: '10px' }}
      />

      <div className="d-flex flex-wrap gap-3 text-muted small">
        <span>Iniciado: {formatDateTime(startedAt)}</span>
        <span>Finalizado: {formatDateTime(finishedAt)}</span>
      </div>
    </div>
  );
};

export default ProgressTrackerBar;


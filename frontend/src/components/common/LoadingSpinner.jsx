import { Spinner } from 'react-bootstrap';

const LoadingSpinner = ({ message = 'Cargando informacion...' }) => {
  return (
    <div
      className="d-flex flex-column align-items-center justify-content-center py-5 text-center"
      role="status"
      aria-live="polite"
    >
      <Spinner animation="border" variant="primary" className="mb-3" />
      <p className="text-muted mb-0">{message}</p>
    </div>
  );
};

export default LoadingSpinner;


import { Alert, Button } from 'react-bootstrap';

const ErrorMessage = ({ error, onRetry }) => {
  if (!error) return null;

  const isString = typeof error === 'string';
  const rawMessage = isString ? error : error.message;
  const message =
    typeof rawMessage === 'string' && rawMessage.trim()
      ? rawMessage
      : 'Ocurrio un error inesperado al procesar la solicitud.';
  const status = !isString && error.status ? ` (Codigo ${error.status})` : '';

  return (
    <Alert variant="danger" className="my-3">
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
        <div>
          <strong>Error{status}:</strong> {message}
        </div>
        {onRetry && (
          <Button variant="outline-danger" size="sm" onClick={onRetry}>
            Reintentar
          </Button>
        )}
      </div>
    </Alert>
  );
};

export default ErrorMessage;


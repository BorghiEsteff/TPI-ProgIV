import { Button, Modal, Spinner } from 'react-bootstrap';

const ConfirmModal = ({
  show,
  title = 'Confirmar accion',
  body = 'Esta seguro de que desea continuar?',
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'danger',
  onConfirm,
  onCancel,
  isLoading = false,
}) => {
  return (
    <Modal show={show} onHide={isLoading ? undefined : onCancel} centered>
      <Modal.Header closeButton={!isLoading}>
        <Modal.Title as="h5">{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>{body}</Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onCancel} disabled={isLoading}>
          {cancelLabel}
        </Button>
        <Button variant={variant} onClick={onConfirm} disabled={isLoading}>
          {isLoading ? (
            <>
              <Spinner
                as="span"
                animation="border"
                size="sm"
                role="status"
                aria-hidden="true"
                className="me-2"
              />
              Procesando...
            </>
          ) : (
            confirmLabel
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default ConfirmModal;


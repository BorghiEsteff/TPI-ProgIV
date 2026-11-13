import { Button, Card } from 'react-bootstrap';

const EmptyState = ({
  title = 'Sin resultados',
  description = 'No hay elementos disponibles para mostrar en este momento.',
  actionLabel,
  onAction,
}) => {
  return (
    <Card className="text-center border-secondary-subtle bg-light my-4">
      <Card.Body className="py-5">
        <Card.Title as="h5" className="text-dark mb-2">
          {title}
        </Card.Title>
        <Card.Text className="text-muted mb-3">{description}</Card.Text>
        {actionLabel && onAction && (
          <Button variant="primary" size="sm" onClick={onAction}>
            {actionLabel}
          </Button>
        )}
      </Card.Body>
    </Card>
  );
};

export default EmptyState;


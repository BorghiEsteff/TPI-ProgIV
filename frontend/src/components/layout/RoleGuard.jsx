import { Alert } from 'react-bootstrap';
import { useAuth } from '../../hooks/useAuth';

const RoleGuard = ({ allowedRoles = [], children, fallback = 'hide' }) => {
  const { isAuthenticated, role } = useAuth();

  const normalizedAllowed = allowedRoles.map((r) => String(r).toUpperCase());
  const hasPermission = isAuthenticated && role && normalizedAllowed.includes(role);

  if (hasPermission) {
    return children;
  }

  if (fallback === 'message') {
    return (
      <Alert variant="secondary" className="my-3">
        Acceso restringido: esta seccion requiere rol {normalizedAllowed.join(' o ')}.
      </Alert>
    );
  }

  return null;
};

export default RoleGuard;


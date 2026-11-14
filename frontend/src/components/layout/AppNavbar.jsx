import { Badge, Button, Container, Nav, Navbar } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const ROLE_VARIANT = {
  ADMIN: 'danger',
  USER: 'secondary',
};

const AppNavbar = () => {
  const { isAuthenticated, user, role, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <Navbar bg="dark" variant="dark" expand="lg" className="shadow-sm">
      <Container>
        <Navbar.Brand as={Link} to="/" className="fw-bold">
          CineTrack
        </Navbar.Brand>
        <Navbar.Toggle aria-controls="cinetrack-navbar" />
        <Navbar.Collapse id="cinetrack-navbar">
          <Nav className="me-auto">
            <Nav.Link as={Link} to="/">
              Catálogo
            </Nav.Link>
            {isAuthenticated && (
              <>
                <Nav.Link as={Link} to="/my-tracking">
                  Mi CineTrack
                </Nav.Link>
                <Nav.Link as={Link} to="/new-entry">
                  Agregar Obra
                </Nav.Link>
                <Nav.Link as={Link} to="/my-submissions">
                  Mis Propuestas
                </Nav.Link>
                <Nav.Link as={Link} to="/recommendations">
                  Recomendaciones IA
                </Nav.Link>
                {role === 'ADMIN' && (
                  <Nav.Link as={Link} to="/admin/submissions">
                    Moderación
                  </Nav.Link>
                )}
              </>
            )}
          </Nav>

          <Nav className="align-items-lg-center gap-2">
            {isAuthenticated ? (
              <>
                <span className="text-light small me-1">
                  {user?.username || 'Usuario'}{' '}
                  {role && (
                    <Badge bg={ROLE_VARIANT[role] || 'secondary'} className="ms-1">
                      {role}
                    </Badge>
                  )}
                </span>
                <Button variant="outline-light" size="sm" onClick={handleLogout}>
                  Cerrar Sesión
                </Button>
              </>
            ) : (
              <>
                <Nav.Link as={Link} to="/login">
                  Iniciar Sesión
                </Nav.Link>
                <Button as={Link} to="/register" variant="primary" size="sm">
                  Registrarse
                </Button>
              </>
            )}
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

export default AppNavbar;

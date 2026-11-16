import { Badge, Button, Container, Nav, Navbar } from 'react-bootstrap';
import { Link, NavLink, useNavigate } from 'react-router-dom';
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
    <Navbar variant="dark" expand="lg" className="shadow-sm ct-navbar">
      <Container>
        <Navbar.Brand as={Link} to="/" className="fw-bold d-flex align-items-center gap-2">
          <span className="ct-brand-mark">CineTrack</span>
        </Navbar.Brand>
        <Navbar.Toggle aria-controls="cinetrack-navbar" />
        <Navbar.Collapse id="cinetrack-navbar">
          <Nav className="me-auto gap-lg-1">
            <Nav.Link as={NavLink} to="/" end>
              Catálogo
            </Nav.Link>
            {isAuthenticated && (
              <>
                <Nav.Link as={NavLink} to="/my-tracking">
                  Mi CineTrack
                </Nav.Link>
                <Nav.Link as={NavLink} to="/new-entry">
                  Agregar Obra
                </Nav.Link>
                <Nav.Link as={NavLink} to="/my-submissions">
                  Mis Propuestas
                </Nav.Link>
                <Nav.Link as={NavLink} to="/recommendations">
                  Recomendaciones IA
                </Nav.Link>
                {role === 'ADMIN' && (
                  <Nav.Link as={NavLink} to="/admin/submissions">
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

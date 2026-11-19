import { Container } from 'react-bootstrap';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="ct-footer py-3 mt-auto">
      <Container className="d-flex flex-column flex-md-row justify-content-between align-items-center gap-2 small">
        <div className="d-flex align-items-center gap-2">
          <span className="fw-semibold ct-brand-mark">CineTrack</span>
          <span className="ct-footer-muted">© {new Date().getFullYear()} • Diario de Cine y Series</span>
        </div>
        <nav aria-label="Enlaces rápidos" className="d-flex flex-wrap gap-3">
          <Link to="/" className="ct-footer-link">
            Catálogo
          </Link>
          <Link to="/my-tracking" className="ct-footer-link">
            Mi Diario
          </Link>
          <Link to="/recommendations" className="ct-footer-link">
            Recomendaciones IA
          </Link>
        </nav>
      </Container>
    </footer>
  );
};

export default Footer;

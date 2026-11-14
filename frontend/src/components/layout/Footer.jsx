import { Container } from 'react-bootstrap';

const Footer = () => {
  return (
    <footer className="bg-dark text-light py-3 mt-auto border-top border-secondary">
      <Container className="d-flex flex-column flex-md-row justify-content-between align-items-center gap-2 small">
        <span>CineTrack - Plataforma de Seguimiento Multimedia y Comunidad</span>
        <span className="text-light opacity-75">
          Arquitectura Poliglota: Django REST/GraphQL + Node.js/Socket.IO + FastAPI IA
        </span>
      </Container>
    </footer>
  );
};

export default Footer;


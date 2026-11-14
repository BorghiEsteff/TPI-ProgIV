import { useEffect, useState } from 'react';
import { Alert, Button, Card, Col, Form, ListGroup, Row } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import * as catalogService from '../../services/catalogService';

const PLATFORMS = ['Netflix', 'HBO / Max', 'Prime Video', 'Disney+', 'Apple TV+', 'Cine', 'TV', 'Otro'];

const SubmissionForm = ({ onSubmit, submitting = false, error = null }) => {
  const [title, setTitle] = useState('');
  const [mediaType, setMediaType] = useState('PELICULA');
  const [posterMode, setPosterMode] = useState('URL');
  const [posterUrl, setPosterUrl] = useState('');
  const [posterFile, setPosterFile] = useState(null);
  const [platformChoice, setPlatformChoice] = useState('Netflix');
  const [customPlatform, setCustomPlatform] = useState('');
  const [releaseYear, setReleaseYear] = useState('');
  const [countryOfOrigin, setCountryOfOrigin] = useState('');
  const [matches, setMatches] = useState([]);

  useEffect(() => {
    const query = title.trim();
    if (query.length < 2) {
      setMatches([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const { data } = await catalogService.getMediaList({ search: query, page_size: 5 });
        const list = Array.isArray(data) ? data : data?.results || [];
        setMatches(list);
      } catch {
        setMatches([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [title]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const watchPlatform =
      platformChoice === 'Otro'
        ? customPlatform.trim() || 'Otro'
        : platformChoice;

    if (posterMode === 'FILE' && posterFile) {
      const fd = new FormData();
      fd.append('title', title.trim());
      fd.append('media_type', mediaType);
      fd.append('poster_file', posterFile);
      fd.append('watch_platform', watchPlatform);
      if (releaseYear) fd.append('release_year', String(releaseYear));
      if (countryOfOrigin.trim()) fd.append('country_of_origin', countryOfOrigin.trim());
      onSubmit(fd);
    } else {
      const payload = {
        title: title.trim(),
        media_type: mediaType,
        poster_url: posterUrl.trim(),
        watch_platform: watchPlatform,
      };
      if (releaseYear) payload.release_year = Number(releaseYear);
      if (countryOfOrigin.trim()) payload.country_of_origin = countryOfOrigin.trim();
      onSubmit(payload);
    }
  };

  return (
    <Card className="shadow-sm">
      <Card.Body className="p-4">
        <Form onSubmit={handleSubmit}>
          {error && <Alert variant="danger">{error}</Alert>}

          <Form.Group className="mb-3" controlId="submissionTitle">
            <Form.Label>Título de la película o serie *</Form.Label>
            <Form.Control
              type="text"
              placeholder="Ej. Matrix"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={submitting}
              required
            />
          </Form.Group>

          {matches.length > 0 && (
            <Alert variant="info" className="mb-3">
              <div className="fw-semibold small mb-1">
                ¿Te refieres a alguna de estas obras ya publicadas?
              </div>
              <ListGroup variant="flush">
                {matches.map((m) => (
                  <ListGroup.Item
                    key={m.id}
                    className="d-flex justify-content-between align-items-center px-0 py-1 bg-transparent"
                  >
                    <span className="small">
                      <strong>{m.title}</strong> ({m.media_type === 'SERIE' ? 'Serie' : 'Película'})
                    </span>
                    <Button as={Link} to={`/media/${m.id}`} size="sm" variant="outline-primary">
                      Ver ficha
                    </Button>
                  </ListGroup.Item>
                ))}
              </ListGroup>
            </Alert>
          )}

          <Row className="g-3 mb-3">
            <Col md={6}>
              <Form.Group controlId="submissionType">
                <Form.Label>Tipo *</Form.Label>
                <Form.Select
                  value={mediaType}
                  onChange={(e) => setMediaType(e.target.value)}
                  disabled={submitting}
                >
                  <option value="PELICULA">Película</option>
                  <option value="SERIE">Serie</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group controlId="submissionPlatform">
                <Form.Label>¿Dónde la viste o estás viendo? *</Form.Label>
                <Form.Select
                  value={platformChoice}
                  onChange={(e) => setPlatformChoice(e.target.value)}
                  disabled={submitting}
                >
                  {PLATFORMS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>

          {platformChoice === 'Otro' && (
            <Form.Group className="mb-3" controlId="submissionCustomPlatform">
              <Form.Label>Especifica la plataforma *</Form.Label>
              <Form.Control
                type="text"
                placeholder="Ej. Mubi, Crunchyroll, Cine local"
                value={customPlatform}
                onChange={(e) => setCustomPlatform(e.target.value)}
                disabled={submitting}
                required
              />
            </Form.Group>
          )}

          <Form.Group className="mb-3">
            <Form.Label>Portada *</Form.Label>
            <div className="d-flex gap-3 mb-2">
              <Form.Check
                type="radio"
                id="posterModeUrl"
                label="Ingresar URL de imagen"
                checked={posterMode === 'URL'}
                onChange={() => setPosterMode('URL')}
              />
              <Form.Check
                type="radio"
                id="posterModeFile"
                label="Subir archivo (JPG, PNG, WEBP)"
                checked={posterMode === 'FILE'}
                onChange={() => setPosterMode('FILE')}
              />
            </div>

            {posterMode === 'URL' ? (
              <Form.Control
                type="url"
                placeholder="https://ejemplo.com/portada.jpg"
                value={posterUrl}
                onChange={(e) => setPosterUrl(e.target.value)}
                disabled={submitting}
                required
              />
            ) : (
              <Form.Control
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => setPosterFile(e.target.files?.[0] || null)}
                disabled={submitting}
                required
              />
            )}
          </Form.Group>

          <Row className="g-3 mb-4">
            <Col md={6}>
              <Form.Group controlId="submissionYear">
                <Form.Label>Año de estreno (opcional)</Form.Label>
                <Form.Control
                  type="number"
                  min={1900}
                  max={2100}
                  placeholder="Ej. 1999"
                  value={releaseYear}
                  onChange={(e) => setReleaseYear(e.target.value)}
                  disabled={submitting}
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group controlId="submissionCountry">
                <Form.Label>País de origen (opcional)</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Ej. US, KR, AR"
                  value={countryOfOrigin}
                  onChange={(e) => setCountryOfOrigin(e.target.value)}
                  disabled={submitting}
                />
              </Form.Group>
            </Col>
          </Row>

          <Button type="submit" variant="primary" disabled={submitting}>
            {submitting ? 'Guardando...' : 'Guardar en Mi CineTrack y enviar a revisión'}
          </Button>
        </Form>
      </Card.Body>
    </Card>
  );
};

export default SubmissionForm;

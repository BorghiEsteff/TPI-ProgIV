import { Button, Col, Form, InputGroup, Row } from 'react-bootstrap';

const MediaFilterBar = ({
  filters,
  genres = [],
  queryMode = 'REST',
  onFilterChange,
  onQueryModeChange,
  onSubmit,
  onReset,
}) => {
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    onFilterChange({ ...filters, [name]: value });
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (onSubmit) onSubmit();
  };

  return (
    <Form onSubmit={handleFormSubmit} className="bg-white p-3 rounded shadow-sm border mb-4">
      <Row className="g-3 align-items-end">
        <Col md={4}>
          <Form.Label className="small fw-semibold">Buscar obra</Form.Label>
          <InputGroup>
            <Form.Control
              type="text"
              name="search"
              placeholder="Titulo, productora o sinopsis..."
              value={filters.search}
              onChange={handleInputChange}
            />
            <Button type="submit" variant="primary">
              Buscar
            </Button>
          </InputGroup>
        </Col>

        <Col md={2}>
          <Form.Label className="small fw-semibold">Tipo</Form.Label>
          <Form.Select
            name="media_type"
            value={filters.media_type}
            onChange={handleInputChange}
          >
            <option value="">Todos</option>
            <option value="PELICULA">Peliculas</option>
            <option value="SERIE">Series</option>
          </Form.Select>
        </Col>

        <Col md={3}>
          <Form.Label className="small fw-semibold">Genero</Form.Label>
          <Form.Select
            name="genre"
            value={filters.genre}
            onChange={handleInputChange}
            disabled={queryMode === 'GRAPHQL'}
          >
            <option value="">Todos los generos</option>
            {genres.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </Form.Select>
        </Col>

        <Col md={3}>
          <Form.Label className="small fw-semibold">Modo de consulta Django</Form.Label>
          <div className="d-flex gap-2">
            <Form.Select
              value={queryMode}
              onChange={(e) => onQueryModeChange(e.target.value)}
            >
              <option value="REST">REST API (/api/v1/media/)</option>
              <option value="GRAPHQL">GraphQL (/graphql/)</option>
            </Form.Select>
            <Button type="button" variant="outline-secondary" onClick={onReset}>
              Limpiar
            </Button>
          </div>
        </Col>
      </Row>
    </Form>
  );
};

export default MediaFilterBar;


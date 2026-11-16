import { Button, Col, Form, InputGroup, Row } from 'react-bootstrap';

const MediaFilterBar = ({
  filters,
  genres = [],
  queryMode = 'REST',
  showQueryMode = false,
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
    <Form onSubmit={handleFormSubmit} className="ct-filter-bar p-3 rounded-3 mb-4">
      <Row className="g-3 align-items-end">
        <Col md={showQueryMode ? 4 : 5}>
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

        <Col md={showQueryMode ? 2 : 3}>
          <Form.Label className="small fw-semibold">Tipo</Form.Label>
          <Form.Select
            name="media_type"
            value={filters.media_type}
            onChange={handleInputChange}
          >
            <option value="">Todos</option>
            <option value="PELICULA">Películas</option>
            <option value="SERIE">Series</option>
          </Form.Select>
        </Col>

        <Col md={3}>
          <Form.Label className="small fw-semibold">Género</Form.Label>
          <Form.Select
            name="genre"
            value={filters.genre}
            onChange={handleInputChange}
          >
            <option value="">Todos los géneros</option>
            {genres.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </Form.Select>
        </Col>

        {showQueryMode ? (
          <Col md={3}>
            <Form.Label className="small fw-semibold">Modo de consulta</Form.Label>
            <div className="d-flex gap-2">
              <Form.Select
                value={queryMode}
                onChange={(e) => onQueryModeChange(e.target.value)}
              >
                <option value="REST">REST</option>
                <option value="GRAPHQL">GraphQL</option>
              </Form.Select>
              <Button type="button" variant="outline-secondary" onClick={onReset}>
                Limpiar
              </Button>
            </div>
          </Col>
        ) : (
          <Col md={1} className="d-grid">
            <Button type="button" variant="outline-secondary" onClick={onReset}>
              Limpiar
            </Button>
          </Col>
        )}
      </Row>
    </Form>
  );
};

export default MediaFilterBar;


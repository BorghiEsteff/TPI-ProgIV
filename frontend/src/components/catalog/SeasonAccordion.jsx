import { Accordion, Badge, ListGroup } from 'react-bootstrap';

const SeasonAccordion = ({ seasons = [] }) => {
  if (!seasons.length) {
    return (
      <p className="text-muted small mb-0">
        No hay temporadas registradas para esta serie.
      </p>
    );
  }

  return (
    <Accordion defaultActiveKey="0">
      {seasons.map((season, index) => (
        <Accordion.Item key={season.id || season.season_number} eventKey={String(index)}>
          <Accordion.Header>
            <span className="fw-semibold me-2">
              Temporada {season.season_number}
            </span>
            <Badge bg="secondary" pill>
              {season.episodes?.length ?? season.episode_count ?? 0} episodios
            </Badge>
          </Accordion.Header>
          <Accordion.Body className="p-0">
            {season.episodes && season.episodes.length > 0 ? (
              <ListGroup variant="flush">
                {season.episodes.map((ep) => (
                  <ListGroup.Item
                    key={ep.id || ep.episode_number}
                    className="d-flex justify-content-between align-items-center"
                  >
                    <div>
                      <span className="fw-semibold me-2">
                        E{String(ep.episode_number).padStart(2, '0')}
                      </span>
                      <span>{ep.title}</span>
                    </div>
                    <Badge bg="light" text="dark" className="border">
                      {ep.duration_minutes} min
                    </Badge>
                  </ListGroup.Item>
                ))}
              </ListGroup>
            ) : (
              <div className="p-3 text-muted small">
                Sin episodios detallados en esta temporada.
              </div>
            )}
          </Accordion.Body>
        </Accordion.Item>
      ))}
    </Accordion>
  );
};

export default SeasonAccordion;


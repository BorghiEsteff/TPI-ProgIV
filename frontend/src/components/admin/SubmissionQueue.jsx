import { useState } from 'react';
import { Alert, Badge, Button, Card, Col, Form, Row } from 'react-bootstrap';
import GenreMultiSelect from '../common/GenreMultiSelect';
import DuplicateCandidates from './DuplicateCandidates';

const SubmissionQueue = ({
  submissions = [],
  genres = [],
  candidatesById = {},
  duplicateConfirmById = {},
  onLoadCandidates,
  onPublish,
  onMerge,
  onReject,
  busyId = null,
}) => {
  const [rejectReasons, setRejectReasons] = useState({});
  const [editTitles, setEditTitles] = useState({});
  const [editGenresById, setEditGenresById] = useState({});
  const [manualMergeIds, setManualMergeIds] = useState({});

  const getSelectedGenres = (sub) => {
    if (Object.prototype.hasOwnProperty.call(editGenresById, sub.id)) {
      return editGenresById[sub.id];
    }
    return (sub.genres || []).map((g) => Number(g.id));
  };

  return (
    <div className="d-flex flex-column gap-3">
      {submissions.map((sub) => {
        const isBusy = busyId === sub.id;
        const candidates = candidatesById[sub.id];

        return (
          <Card key={sub.id} className="shadow-sm">
            <Card.Body>
              <Row className="g-3 align-items-start">
                <Col md={2}>
                  {sub.effective_poster_url ? (
                    <img
                      src={sub.effective_poster_url}
                      alt={sub.title}
                      className="img-fluid rounded"
                      style={{ maxHeight: 140, objectFit: 'cover' }}
                    />
                  ) : (
                    <div className="bg-secondary text-white rounded p-3 text-center small">Sin portada</div>
                  )}
                </Col>

                <Col md={10}>
                  <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-2">
                    <div>
                      <h3 className="h5 mb-1">{sub.title}</h3>
                      <div className="d-flex gap-2 flex-wrap">
                        <Badge bg="dark">{sub.media_type}</Badge>
                        <Badge bg="info" text="dark">
                          Plataforma reportada: {sub.submitted_platform}
                        </Badge>
                        {sub.release_year && <Badge bg="secondary">{sub.release_year}</Badge>}
                        <Badge bg={sub.status === 'PENDING' ? 'warning' : 'secondary'} text={sub.status === 'PENDING' ? 'dark' : 'light'}>
                          {sub.status}
                        </Badge>
                        {Array.isArray(sub.genres) &&
                          sub.genres.map((g) => (
                            <Badge key={g.id} bg="light" text="dark" className="border">
                              {g.name}
                            </Badge>
                          ))}
                      </div>
                    </div>

                    <Button
                      size="sm"
                      variant="outline-secondary"
                      disabled={isBusy}
                      onClick={() => onLoadCandidates(sub.id)}
                    >
                      Buscar duplicados
                    </Button>
                  </div>

                  {candidates && (
                    <div className="bg-light rounded p-2 mb-3">
                      <DuplicateCandidates
                        candidates={candidates}
                        busy={isBusy}
                        onMerge={(mediaId) => onMerge(sub.id, mediaId)}
                      />
                    </div>
                  )}

                  {sub.status === 'PENDING' && (
                    <div className="d-flex flex-column gap-2 pt-2 border-top">
                      <GenreMultiSelect
                        genres={genres}
                        selectedIds={getSelectedGenres(sub)}
                        onChange={(nextIds) =>
                          setEditGenresById((prev) => ({ ...prev, [sub.id]: nextIds }))
                        }
                        disabled={isBusy}
                        label="Categorías / Géneros al publicar *"
                        showValidation
                        testIdPrefix={`admin-sub-genre-${sub.id}`}
                      />

                      {duplicateConfirmById[sub.id] && (
                        <Alert variant="warning" className="mb-1 py-2">
                          <div className="small fw-semibold mb-2">
                            {duplicateConfirmById[sub.id].message ||
                              'Existe una obra muy similar en el catálogo canónico. Puedes vincularla arriba o confirmar la creación separada.'}
                          </div>
                          <Button
                            size="sm"
                            variant="warning"
                            disabled={isBusy || getSelectedGenres(sub).length < 1}
                            onClick={() =>
                              onPublish(sub.id, {
                                title: (editTitles[sub.id] ?? sub.title).trim(),
                                genres: getSelectedGenres(sub),
                                confirm_new: true,
                              })
                            }
                            data-testid={`confirm-publish-new-${sub.id}`}
                          >
                            Confirmar y publicar como obra nueva
                          </Button>
                        </Alert>
                      )}

                      <Row className="g-2 align-items-center">
                        <Col md={5}>
                          <Form.Control
                            size="sm"
                            placeholder="Título definitivo (opcional)"
                            value={editTitles[sub.id] ?? sub.title}
                            onChange={(e) =>
                              setEditTitles((prev) => ({ ...prev, [sub.id]: e.target.value }))
                            }
                            disabled={isBusy}
                          />
                        </Col>
                        <Col md="auto">
                          <Button
                            size="sm"
                            variant="success"
                            disabled={isBusy || getSelectedGenres(sub).length < 1}
                            onClick={() =>
                              onPublish(sub.id, {
                                title: (editTitles[sub.id] ?? sub.title).trim(),
                                genres: getSelectedGenres(sub),
                              })
                            }
                            data-testid={`publish-sub-${sub.id}`}
                          >
                            Publicar como obra nueva
                          </Button>
                        </Col>
                        <Col md={3}>
                          <Form.Control
                            size="sm"
                            type="number"
                            placeholder="ID obra existente"
                            value={manualMergeIds[sub.id] || ''}
                            onChange={(e) =>
                              setManualMergeIds((prev) => ({ ...prev, [sub.id]: e.target.value }))
                            }
                            disabled={isBusy}
                          />
                        </Col>
                        <Col md="auto">
                          <Button
                            size="sm"
                            variant="outline-primary"
                            disabled={isBusy || !manualMergeIds[sub.id]}
                            onClick={() => onMerge(sub.id, Number(manualMergeIds[sub.id]))}
                          >
                            Vincular por ID
                          </Button>
                        </Col>
                      </Row>

                      <Row className="g-2 align-items-center">
                        <Col md={8}>
                          <Form.Control
                            size="sm"
                            placeholder="Motivo de rechazo (ej. portada ilegible, obra inexistente)"
                            value={rejectReasons[sub.id] || ''}
                            onChange={(e) =>
                              setRejectReasons((prev) => ({ ...prev, [sub.id]: e.target.value }))
                            }
                            disabled={isBusy}
                          />
                        </Col>
                        <Col md="auto">
                          <Button
                            size="sm"
                            variant="outline-danger"
                            disabled={isBusy || !(rejectReasons[sub.id] || '').trim()}
                            onClick={() => onReject(sub.id, rejectReasons[sub.id].trim())}
                          >
                            Rechazar propuesta
                          </Button>
                        </Col>
                      </Row>
                    </div>
                  )}
                </Col>
              </Row>
            </Card.Body>
          </Card>
        );
      })}
    </div>
  );
};

export default SubmissionQueue;

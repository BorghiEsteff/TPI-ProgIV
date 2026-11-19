import { useEffect, useState } from 'react';
import { Alert, Button, Card, Container, Form } from 'react-bootstrap';
import { Link, useParams } from 'react-router-dom';
import ErrorMessage from '../components/common/ErrorMessage';
import GenreMultiSelect from '../components/common/GenreMultiSelect';
import LoadingSpinner from '../components/common/LoadingSpinner';
import * as catalogService from '../services/catalogService';
import * as submissionService from '../services/submissionService';

const AdminMediaEditPage = () => {
  const { id } = useParams();
  const [form, setForm] = useState({
    title: '',
    media_type: 'PELICULA',
    poster_image: '',
    release_year: '',
    country_of_origin: '',
    synopsis: '',
    genres: [],
    is_active: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [savedMsg, setSavedMsg] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const { data } = await catalogService.getMediaDetail(id);
        setForm({
          title: data.title || '',
          media_type: data.media_type || 'PELICULA',
          poster_image: data.poster_image || '',
          release_year: data.release_year || '',
          country_of_origin: data.country_of_origin || '',
          synopsis: data.synopsis || '',
          genres: Array.isArray(data.genres) ? data.genres.map((g) => Number(g.id)) : [],
          is_active: Boolean(data.is_active),
        });
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSavedMsg('');
    setError(null);
    try {
      await submissionService.updateCanonicalMedia(id, {
        ...form,
        release_year: form.release_year ? Number(form.release_year) : null,
      });
      setSavedMsg('Ficha pública actualizada correctamente.');
    } catch (err) {
      setError(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Container className="py-4"><LoadingSpinner message="Cargando ficha..." /></Container>;

  return (
    <Container className="py-4" style={{ maxWidth: 720 }}>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h1 className="h3 mb-0">Editar ficha pública #{id}</h1>
        <Button as={Link} to={`/media/${id}`} size="sm" variant="outline-secondary">
          Ver ficha
        </Button>
      </div>

      <Card className="shadow-sm">
        <Card.Body>
          {savedMsg && <Alert variant="success">{savedMsg}</Alert>}
          <ErrorMessage error={error} />
          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>Título</Form.Label>
              <Form.Control
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Tipo</Form.Label>
              <Form.Select
                value={form.media_type}
                onChange={(e) => setForm({ ...form, media_type: e.target.value })}
              >
                <option value="PELICULA">Película</option>
                <option value="SERIE">Serie</option>
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>URL de portada</Form.Label>
              <Form.Control
                type="url"
                value={form.poster_image}
                onChange={(e) => setForm({ ...form, poster_image: e.target.value })}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Año de estreno</Form.Label>
              <Form.Control
                type="number"
                value={form.release_year}
                onChange={(e) => setForm({ ...form, release_year: e.target.value })}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>País de origen</Form.Label>
              <Form.Control
                value={form.country_of_origin}
                onChange={(e) => setForm({ ...form, country_of_origin: e.target.value })}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Sinopsis</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={form.synopsis}
                onChange={(e) => setForm({ ...form, synopsis: e.target.value })}
              />
            </Form.Group>
            <GenreMultiSelect
              selectedIds={form.genres}
              onChange={(nextIds) => setForm((prev) => ({ ...prev, genres: nextIds }))}
              disabled={saving}
              label="Categorías / Géneros *"
              showValidation
              testIdPrefix="admin-media-genre"
            />
            <Form.Check
              type="switch"
              id="mediaIsActive"
              label="Visible en catálogo público"
              checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              className="mb-3"
            />
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </Button>
          </Form>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default AdminMediaEditPage;

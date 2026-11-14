import { useEffect, useMemo, useState } from 'react';
import { Alert, Badge, Button, Form, Spinner } from 'react-bootstrap';
import * as catalogService from '../../services/catalogService';

const GenreMultiSelect = ({
  genres: providedGenres = null,
  selectedIds = [],
  onChange,
  min = 1,
  max = 5,
  disabled = false,
  label = 'Categorías / Géneros *',
  helperText = 'Selecciona entre 1 y 5 géneros para clasificar la obra.',
  testIdPrefix = 'genre-select',
  showValidation = false,
}) => {
  const [internalGenres, setInternalGenres] = useState([]);
  const [loading, setLoading] = useState(!Array.isArray(providedGenres));
  const [loadError, setLoadError] = useState(null);
  const [search, setSearch] = useState('');

  const loadGenres = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const list = await catalogService.getGenres();
      setInternalGenres(Array.isArray(list) ? list : []);
    } catch (err) {
      setLoadError(err?.message || 'No se pudieron cargar las categorías.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (Array.isArray(providedGenres)) {
      setInternalGenres(providedGenres);
      setLoading(false);
      setLoadError(null);
      return;
    }
    loadGenres();
  }, [providedGenres]);

  const genres = Array.isArray(providedGenres) ? providedGenres : internalGenres;
  const normalizedSelected = useMemo(
    () => (Array.isArray(selectedIds) ? selectedIds.map(Number) : []),
    [selectedIds],
  );

  const filteredGenres = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return genres;
    return genres.filter((g) => g.name.toLowerCase().includes(q));
  }, [genres, search]);

  const selectedGenres = useMemo(
    () => genres.filter((g) => normalizedSelected.includes(Number(g.id))),
    [genres, normalizedSelected],
  );

  const toggleGenre = (genreId) => {
    if (disabled) return;
    const id = Number(genreId);
    if (normalizedSelected.includes(id)) {
      onChange(normalizedSelected.filter((item) => item !== id));
    } else if (normalizedSelected.length < max) {
      onChange([...normalizedSelected, id]);
    }
  };

  const atLimit = normalizedSelected.length >= max;
  const belowMin = normalizedSelected.length < min;

  return (
    <Form.Group className="mb-3" data-testid={`${testIdPrefix}-container`}>
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-1">
        <Form.Label className="mb-0 fw-semibold">{label}</Form.Label>
        <Badge
          bg={belowMin && showValidation ? 'danger' : atLimit ? 'warning' : 'secondary'}
          text={atLimit ? 'dark' : undefined}
          data-testid={`${testIdPrefix}-counter`}
        >
          {normalizedSelected.length}/{max} seleccionados
        </Badge>
      </div>
      {helperText && <Form.Text className="text-muted d-block mb-2">{helperText}</Form.Text>}

      {selectedGenres.length > 0 && (
        <div className="d-flex flex-wrap gap-2 mb-2" aria-label="Géneros seleccionados">
          {selectedGenres.map((genre) => (
            <Button
              key={genre.id}
              type="button"
              size="sm"
              variant="primary"
              className="d-inline-flex align-items-center gap-1 rounded-pill px-3"
              style={{ minHeight: '36px' }}
              onClick={() => toggleGenre(genre.id)}
              disabled={disabled}
              aria-label={`Quitar ${genre.name}`}
              data-testid={`${testIdPrefix}-chip-${genre.id}`}
            >
              <span>{genre.name}</span>
              <span aria-hidden="true">×</span>
            </Button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="d-flex align-items-center gap-2 text-muted py-2">
          <Spinner animation="border" size="sm" />
          <span>Cargando categorías...</span>
        </div>
      ) : loadError ? (
        <Alert variant="warning" className="d-flex flex-wrap justify-content-between align-items-center gap-2 py-2">
          <span className="small">{loadError}</span>
          <Button type="button" size="sm" variant="outline-dark" onClick={loadGenres}>
            Reintentar
          </Button>
        </Alert>
      ) : (
        <>
          <Form.Control
            type="search"
            size="sm"
            className="mb-2"
            placeholder="Filtrar categorías (ej. Romance, Comedia, Drama)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            disabled={disabled}
            aria-label="Filtrar categorías o géneros"
            data-testid={`${testIdPrefix}-search`}
          />

          <div
            className="genre-multiselect-grid d-flex flex-wrap gap-2"
            role="group"
            aria-label={label}
          >
            {filteredGenres.map((genre) => {
              const isSelected = normalizedSelected.includes(Number(genre.id));
              const isDisabled = disabled || (!isSelected && atLimit);
              return (
                <Button
                  key={genre.id}
                  type="button"
                  size="sm"
                  variant={isSelected ? 'dark' : 'outline-secondary'}
                  className="genre-option-btn rounded-pill px-3"
                  style={{ minHeight: '44px' }}
                  aria-pressed={isSelected}
                  disabled={isDisabled}
                  onClick={() => toggleGenre(genre.id)}
                  data-testid={`${testIdPrefix}-option-${genre.id}`}
                  data-genre-name={genre.name}
                >
                  {isSelected ? '✓ ' : '+ '}
                  {genre.name}
                </Button>
              );
            })}
            {filteredGenres.length === 0 && (
              <span className="text-muted small py-1">No hay categorías que coincidan con "{search}".</span>
            )}
          </div>
        </>
      )}

      {showValidation && belowMin && (
        <div className="text-danger small mt-2" role="alert" data-testid={`${testIdPrefix}-error`}>
          Debes seleccionar al menos {min} categoría(s) o género(s).
        </div>
      )}
    </Form.Group>
  );
};

export default GenreMultiSelect;

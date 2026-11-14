import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Badge, Button, Container } from 'react-bootstrap';
import MediaFilterBar from '../components/catalog/MediaFilterBar';
import MediaGrid from '../components/catalog/MediaGrid';
import DegradedBanner from '../components/common/DegradedBanner';
import EmptyState from '../components/common/EmptyState';
import ErrorMessage from '../components/common/ErrorMessage';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { useAuth } from '../hooks/useAuth';
import * as catalogService from '../services/catalogService';
import * as trackingService from '../services/trackingService';

const ALL_MEDIA_GRAPHQL_QUERY = `
  query AllMediaItems($mediaType: String, $genreId: Int, $search: String) {
    allMediaItems(mediaType: $mediaType, genreId: $genreId, search: $search) {
      id
      title
      mediaType
      releaseDate
      producer
      posterImage
      synopsis
      isActive
      genres {
        id
        name
      }
      seasons {
        id
        seasonNumber
        episodeCount
        episodes {
          id
          episodeNumber
          title
          durationMinutes
        }
      }
    }
  }
`;

const normalizeGraphQLMediaItem = (item) => ({
  id: Number(item.id),
  title: item.title,
  media_type: item.mediaType,
  release_date: item.releaseDate,
  producer: item.producer,
  poster_image: item.posterImage,
  synopsis: item.synopsis,
  is_active: item.isActive,
  genres: item.genres || [],
  seasons: (item.seasons || []).map((s) => ({
    id: Number(s.id),
    season_number: s.seasonNumber,
    episode_count: s.episodeCount,
    episodes: (s.episodes || []).map((ep) => ({
      id: Number(ep.id),
      episode_number: ep.episodeNumber,
      title: ep.title,
      duration_minutes: ep.durationMinutes,
    })),
  })),
});

const INITIAL_FILTERS = {
  search: '',
  media_type: '',
  genre: '',
};

const CatalogPage = () => {
  const { isAuthenticated } = useAuth();

  const [items, setItems] = useState([]);
  const [genres, setGenres] = useState([]);
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [queryMode, setQueryMode] = useState('REST');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 12;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isDegraded, setIsDegraded] = useState(false);

  const [trackedMediaIds, setTrackedMediaIds] = useState(new Set());
  const [trackingLoadingId, setTrackingLoadingId] = useState(null);
  const [feedback, setFeedback] = useState(null);

  const loadGenres = useCallback(async () => {
    try {
      const response = await catalogService.getGenres();
      const list = Array.isArray(response) ? response : response?.results || [];
      setGenres(list);
    } catch {
      // Generos es auxiliar para filtros; no bloquea el catalogo principal
    }
  }, []);

  const loadMyTrackedIds = useCallback(async () => {
    if (!isAuthenticated) {
      setTrackedMediaIds(new Set());
      return;
    }
    try {
      const { data } = await trackingService.getMyTracking({ page_size: 100 });
      const list = Array.isArray(data) ? data : data?.results || [];
      setTrackedMediaIds(new Set(list.map((entry) => Number(entry.media_item))));
    } catch {
      // Si falla la carga auxiliar de tracking, el catalogo sigue operativo
    }
  }, [isAuthenticated]);

  const loadCatalog = useCallback(
    async (activeFilters = filters, activeMode = queryMode, activePage = page) => {
      setLoading(true);
      setError(null);

      try {
        if (activeMode === 'GRAPHQL') {
          const variables = {};
          if (activeFilters.media_type) {
            variables.mediaType = activeFilters.media_type;
          }
          if (activeFilters.genre) {
            variables.genreId = Number(activeFilters.genre);
          }
          if (activeFilters.search.trim()) {
            variables.search = activeFilters.search.trim();
          }
          const { data, isDegraded: degraded } = await catalogService.queryCatalogGraphQL(
            ALL_MEDIA_GRAPHQL_QUERY,
            variables
          );
          const normalized = (data?.allMediaItems || []).map(normalizeGraphQLMediaItem);
          setItems(normalized);
          setTotalCount(normalized.length);
          setIsDegraded(Boolean(degraded));
        } else {
          const params = { page: activePage, page_size: pageSize };
          if (activeFilters.search.trim()) params.search = activeFilters.search.trim();
          if (activeFilters.media_type) params.media_type = activeFilters.media_type;
          if (activeFilters.genre) params.genres = activeFilters.genre;

          const { data, isDegraded: degraded } = await catalogService.getMediaList(params);
          const list = Array.isArray(data) ? data : data?.results || [];
          setItems(list);
          setTotalCount(Array.isArray(data) ? list.length : data?.count ?? list.length);
          setIsDegraded(Boolean(degraded));
        }
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    },
    [filters, queryMode, page]
  );

  useEffect(() => {
    loadGenres();
  }, [loadGenres]);

  useEffect(() => {
    loadMyTrackedIds();
  }, [loadMyTrackedIds]);

  useEffect(() => {
    setPage(1);
    loadCatalog(filters, queryMode, 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.media_type, filters.genre, queryMode]);

  const handleSearchSubmit = () => {
    setPage(1);
    loadCatalog(filters, queryMode, 1);
  };

  const handleReset = () => {
    setFilters(INITIAL_FILTERS);
    setPage(1);
    loadCatalog(INITIAL_FILTERS, queryMode, 1);
  };

  const handlePageChange = (nextPage) => {
    setPage(nextPage);
    loadCatalog(filters, queryMode, nextPage);
  };

  const handleTrackMedia = async (mediaItem) => {
    setFeedback(null);
    setTrackingLoadingId(mediaItem.id);
    try {
      await trackingService.createTracking({
        media_item: mediaItem.id,
        status: 'PENDIENTE',
        current_seconds: 0,
      });
      setTrackedMediaIds((prev) => new Set([...prev, Number(mediaItem.id)]));
      setFeedback({
        variant: 'success',
        text: `"${mediaItem.title}" fue agregado a Mi Progreso.`,
      });
    } catch (err) {
      setFeedback({
        variant: 'danger',
        text: err.message || 'No se pudo registrar el seguimiento.',
      });
    } finally {
      setTrackingLoadingId(null);
    }
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const resultLabel = useMemo(() => {
    const count = queryMode === 'GRAPHQL' ? items.length : totalCount || items.length;
    return `${count} ${count === 1 ? 'obra encontrada' : 'obras encontradas'}`;
  }, [items.length, totalCount, queryMode]);

  return (
    <Container className="py-4">
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
        <div>
          <h1 className="h3 mb-1">Catalogo Multimedia CineTrack</h1>
          <p className="text-muted small mb-0">
            Explore peliculas y series almacenadas en PostgreSQL (Django).
          </p>
        </div>
        <Badge bg="dark" className="px-3 py-2">
          Origen activo: {queryMode === 'GRAPHQL' ? 'GraphQL (/graphql/)' : 'REST (/api/v1/media/)'}
        </Badge>
      </div>

      <DegradedBanner show={isDegraded} mode="catalog" />

      {feedback && (
        <Alert
          variant={feedback.variant}
          dismissible
          onClose={() => setFeedback(null)}
          className="my-3"
        >
          {feedback.text}
        </Alert>
      )}

      <MediaFilterBar
        filters={filters}
        genres={genres}
        queryMode={queryMode}
        onFilterChange={setFilters}
        onQueryModeChange={setQueryMode}
        onSubmit={handleSearchSubmit}
        onReset={handleReset}
      />

      {loading && <LoadingSpinner message="Consultando catalogo multimedia..." />}

      {!loading && error && (
        <ErrorMessage error={error} onRetry={() => loadCatalog(filters, queryMode)} />
      )}

      {!loading && !error && items.length === 0 && (
        <EmptyState
          title="No se encontraron obras"
          description="Pruebe ajustando los filtros de busqueda o cambiando el tipo de contenido."
          actionLabel="Restablecer filtros"
          onAction={handleReset}
        />
      )}

      {!loading && !error && items.length > 0 && (
        <>
          <div className="text-muted small mb-3">{resultLabel}</div>
          <MediaGrid
            items={items}
            isAuthenticated={isAuthenticated}
            trackedMediaIds={trackedMediaIds}
            trackingLoadingId={trackingLoadingId}
            onTrackMedia={handleTrackMedia}
          />
          {queryMode === 'REST' && totalPages > 1 && (
            <div
              className="d-flex justify-content-between align-items-center flex-wrap gap-2 mt-4 pt-3 border-top"
              data-testid="catalog-pagination"
            >
              <span className="text-muted small">
                Página {page} de {totalPages} ({totalCount} obras)
              </span>
              <div className="d-flex gap-2">
                <Button
                  size="sm"
                  variant="outline-secondary"
                  disabled={page <= 1}
                  onClick={() => handlePageChange(page - 1)}
                  data-testid="catalog-prev-page"
                >
                  Anterior
                </Button>
                <Button
                  size="sm"
                  variant="outline-secondary"
                  disabled={page >= totalPages}
                  onClick={() => handlePageChange(page + 1)}
                  data-testid="catalog-next-page"
                >
                  Siguiente
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </Container>
  );
};

export default CatalogPage;


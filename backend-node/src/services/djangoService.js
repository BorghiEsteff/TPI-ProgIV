import axios from 'axios';

/**
 * Cliente Axios preconfigurado para comunicarse con el backend Django.
 */
export const djangoClient = axios.create({
  baseURL: process.env.DJANGO_API_URL || 'http://localhost:8000/api/v1',
  timeout: parseInt(process.env.DJANGO_TIMEOUT_MS, 10) || 2500,
  headers: {
    Accept: 'application/json',
  },
});

/**
 * Consulta una ficha pública aprobada en Django.
 * Falla cerrado (exists: false) si no existe o si Django no está disponible.
 */
export const validateMediaExists = async (mediaId) => {
  try {
    const response = await djangoClient.get(`/media/${mediaId}/`);
    return { exists: true, data: response.data };
  } catch (error) {
    if (error.response && error.response.status === 404) {
      return { exists: false };
    }
    console.warn(
      `[WARN] Django catalog service unavailable for media validation (mediaId=${mediaId}): ${error.message}`
    );
    return { exists: false, unavailable: true };
  }
};

/**
 * Verifica titularidad de una entrada de progreso en Django (fail-closed).
 */
export const verifyTrackingOwnership = async (trackingEntryId, authHeader) => {
  try {
    const response = await djangoClient.get(`/tracking/${trackingEntryId}/`, {
      headers: { Authorization: authHeader },
    });
    return { authorized: true, data: response.data };
  } catch (error) {
    if (error.response && (error.response.status === 404 || error.response.status === 403 || error.response.status === 401)) {
      return { authorized: false, status: error.response.status };
    }
    return { authorized: false, unavailable: true, status: 503 };
  }
};

/**
 * Obtiene y verifica en lote las entradas de progreso pertenecientes al usuario autenticado (fail-closed).
 */
export const fetchOwnedTrackingIds = async (trackingIds, authHeader) => {
  try {
    const response = await djangoClient.get('/tracking/', {
      headers: { Authorization: authHeader },
      params: { page_size: 100 },
    });
    const results = Array.isArray(response.data) ? response.data : response.data?.results || [];
    const ownedSet = new Set(results.map((entry) => Number(entry.id)));
    const allowedIds = trackingIds.filter((id) => ownedSet.has(Number(id)));
    return { authorized: true, allowedIds };
  } catch (error) {
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      return { authorized: false, allowedIds: [], status: error.response.status };
    }
    return { authorized: false, allowedIds: [], unavailable: true, status: 503 };
  }
};

/**
 * Obtiene candidatos del catálogo publicado en Django para recomendaciones IA.
 */
export const fetchPublishedCatalogCandidates = async () => {
  try {
    const response = await djangoClient.get('/media/', {
      params: { page_size: 50 },
    });
    const results = Array.isArray(response.data) ? response.data : response.data?.results || [];
    return { ok: true, candidates: results };
  } catch (error) {
    return { ok: false, candidates: [], error: error.message };
  }
};

const djangoService = {
  djangoClient,
  validateMediaExists,
  verifyTrackingOwnership,
  fetchOwnedTrackingIds,
  fetchPublishedCatalogCandidates,
};

export default djangoService;

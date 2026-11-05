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
 * Valida la existencia de un MediaItem en el catálogo Django.
 *
 * @param {number} mediaId - ID del MediaItem en PostgreSQL.
 * @returns {Promise<{ exists: boolean, degraded?: boolean, data?: object }>}
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
    return { exists: true, degraded: true };
  }
};

const djangoService = {
  djangoClient,
  validateMediaExists,
};

export default djangoService;

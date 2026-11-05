import axios from 'axios';

/**
 * Cliente HTTP para el microservicio de IA (FastAPI + Ollama).
 * Especificado en TP 3: Detección automática de spoilers y análisis de sentimiento.
 *
 * Configuración:
 * - AI_SERVICE_URL: http://localhost:8002/ai
 * - AI_TIMEOUT_MS: 4000 ms
 */
export const aiClient = axios.create({
  baseURL: process.env.AI_SERVICE_URL || 'http://localhost:8002/ai',
  timeout: parseInt(process.env.AI_TIMEOUT_MS, 10) || 4000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

/**
 * Analiza un comentario para detectar si contiene spoilers y su polaridad emocional.
 *
 * @param {string} comment - Texto del comentario/reseña a clasificar.
 * @param {string|number} mediaItemId - ID de la obra multimedia.
 * @returns {Promise<{ containsSpoiler: boolean, confidence: number, sentiment: string, degraded?: boolean }>}
 */
export const analyzeReviewForSpoilers = async (comment, mediaItemId) => {
  try {
    const response = await aiClient.post('/review-guard', {
      comment,
      media_item_id: Number(mediaItemId),
    });

    return {
      containsSpoiler: Boolean(response.data.contains_spoiler),
      confidence: response.data.confidence ?? 1.0,
      sentiment: response.data.sentiment || 'NEUTRAL',
      degraded: false,
    };
  } catch (error) {
    // Modo de contingencia/resiliencia ante indisponibilidad del servicio de IA o timeout de 4s
    console.warn(
      `[WARN] AI Microservice unavailable for review-guard (mediaItemId=${mediaItemId}): ${error.message}`
    );

    return {
      containsSpoiler: false, // Contingencia segura: no censurar preventivamente
      confidence: 0.0,
      sentiment: 'UNKNOWN',
      degraded: true,
    };
  }
};

const aiService = {
  aiClient,
  analyzeReviewForSpoilers,
};

export default aiService;

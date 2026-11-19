import djangoService from '../services/djangoService.js';
import aiService from '../services/aiService.js';

const MAX_HISTORY_MESSAGES = 6;
const MAX_HISTORY_CONTENT_LENGTH = 500;
const ALLOWED_ROLES = new Set(['user', 'assistant']);

const validateHistory = (rawHistory) => {
  if (rawHistory === undefined || rawHistory === null) {
    return { valid: true, history: [] };
  }
  if (!Array.isArray(rawHistory) || rawHistory.length > MAX_HISTORY_MESSAGES) {
    return { valid: false, message: 'El historial no puede superar los 6 mensajes (3 intercambios).' };
  }

  const sanitized = [];
  for (const item of rawHistory) {
    if (!item || typeof item !== 'object') {
      return { valid: false, message: 'Formato de mensaje invalido en el historial.' };
    }
    const role = typeof item.role === 'string' ? item.role.trim() : '';
    const content = typeof item.content === 'string' ? item.content.trim() : '';
    if (!ALLOWED_ROLES.has(role)) {
      return { valid: false, message: 'Rol no permitido en el historial.' };
    }
    if (!content || content.length > MAX_HISTORY_CONTENT_LENGTH) {
      return { valid: false, message: 'Cada mensaje del historial debe tener entre 1 y 500 caracteres.' };
    }
    sanitized.push({ role, content });
  }

  return { valid: true, history: sanitized };
};

export const getRecommendations = async (req, res, next) => {
  const startedAt = Date.now();
  try {
    const rawPrompt = typeof req.body?.prompt === 'string' ? req.body.prompt.trim() : '';
    if (!rawPrompt || rawPrompt.length > 500) {
      return res.status(422).json({
        error: {
          code: 'INVALID_PROMPT',
          message: 'El pedido debe tener entre 1 y 500 caracteres.',
          details: null,
        },
      });
    }

    const historyCheck = validateHistory(req.body?.history);
    if (!historyCheck.valid) {
      return res.status(422).json({
        error: {
          code: 'INVALID_HISTORY',
          message: historyCheck.message,
          details: null,
        },
      });
    }

    const catalogRes = await djangoService.fetchPublishedCatalogCandidates();
    if (!catalogRes.ok) {
      return res.status(503).json({
        error: {
          code: 'CATALOG_UNAVAILABLE',
          message: 'No se pudo consultar el catálogo publicado en este momento.',
          details: null,
        },
      });
    }

    const candidates = (catalogRes.candidates || []).filter((c) => c?.is_active !== false);
    const aiResult = await aiService.requestCatalogRecommendations(
      rawPrompt,
      candidates,
      historyCheck.history
    );

    const candidateById = new Map(candidates.map((c) => [c.id, c]));
    const preliminary = (aiResult.recommendations || [])
      .filter((r) => candidateById.has(r.media_item_id))
      .slice(0, 3);

    // Revalidacion final contra Django al responder para impedir recomendar obras despublicadas
    const revalidated = [];
    for (const rec of preliminary) {
      const check = await djangoService.validateMediaExists(rec.media_item_id);
      if (!check.exists || check.data?.is_active === false) {
        continue;
      }
      const media = candidateById.get(rec.media_item_id);
      revalidated.push({
        media_item_id: media.id,
        title: media.title,
        media_type: media.media_type,
        poster_image: media.poster_image || '',
        release_year:
          media.release_year ||
          (media.release_date ? Number(String(media.release_date).slice(0, 4)) : null),
        reason: rec.reason,
      });
    }

    if (aiResult.degraded) {
      res.setHeader('X-Degraded-AI', 'true');
    }

    if (process.env.NODE_ENV !== 'test') {
      console.info(
        `[RECOMMEND] status=200 duration_ms=${Date.now() - startedAt} degraded=${Boolean(aiResult.degraded)} count=${revalidated.length}`
      );
    }

    return res.json({
      message: aiResult.message,
      recommendations: revalidated,
      degraded: Boolean(aiResult.degraded),
    });
  } catch (err) {
    next(err);
  }
};

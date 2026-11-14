import djangoService from '../services/djangoService.js';
import aiService from '../services/aiService.js';

export const getRecommendations = async (req, res, next) => {
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

    const candidates = catalogRes.candidates || [];
    const aiResult = await aiService.requestCatalogRecommendations(rawPrompt, candidates);

    const candidateById = new Map(candidates.map((c) => [c.id, c]));
    const enriched = (aiResult.recommendations || [])
      .filter((r) => candidateById.has(r.media_item_id))
      .slice(0, 5)
      .map((r) => {
        const media = candidateById.get(r.media_item_id);
        return {
          media_item_id: media.id,
          title: media.title,
          media_type: media.media_type,
          poster_image: media.poster_image || '',
          release_year: media.release_year || null,
          reason: r.reason,
        };
      });

    if (aiResult.degraded) {
      res.setHeader('X-Degraded-AI', 'true');
    }

    return res.json({
      message: aiResult.message,
      recommendations: enriched,
      degraded: Boolean(aiResult.degraded),
    });
  } catch (err) {
    next(err);
  }
};

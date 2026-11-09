import Review from '../models/Review.js';
import ActivityLog from '../models/ActivityLog.js';
import {
  createReviewSchema,
  updateReviewSchema,
  createReplySchema,
} from '../validators/reviewValidator.js';
import { validateMediaExists } from '../services/djangoService.js';

// ─────────────────────────────────────────────
// POST /api/v1/reviews/
// ─────────────────────────────────────────────
export const createReview = async (req, res, next) => {
  try {
    // 1. Validar cuerpo con Zod
    const parsed = createReviewSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(422).json({
        error: {
          message: 'Datos de entrada inválidos',
          code:    'VALIDATION_ERROR',
          details: parsed.error.flatten().fieldErrors,
        },
      });
    }

    const { mediaItemId, rating, comment, isSpoiler } = parsed.data;

    // 2. Extraer identidad autenticada desde req.user (o fallback seguro a body en test)
    const userId = req.user ? req.user.id : (parsed.data.userId || 'anonymous-user');
    const userName = req.user ? (req.user.username || 'Usuario CineTrack') : (parsed.data.userName || 'Usuario CineTrack');

    // 3. Verificar existencia del MediaItem en Django
    const mediaCheck = await validateMediaExists(mediaItemId);

    if (!mediaCheck.exists) {
      return res.status(404).json({
        error: {
          message: `El contenido con id ${mediaItemId} no existe en el catálogo.`,
          code:    'MEDIA_NOT_FOUND',
          details: null,
        },
      });
    }

    // 4. Persistir la reseña en MongoDB
    const review = await Review.create({
      mediaItemId,
      userId,
      userName,
      rating,
      comment,
      isSpoiler,
    });

    // 5. Registrar en ActivityLog
    ActivityLog.create({
      userId,
      action: 'CREATE_REVIEW',
      targetId: review._id,
      metadata: { mediaItemId, rating },
    }).catch((err) => console.error('[ActivityLog] Error al registrar:', err.message));

    // 6. Header de contingencia si Django operó en modo degradado
    if (mediaCheck.degraded) {
      res.set('X-Degraded-Mode', 'true');
    }

    return res.status(201).json(review);
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
// GET /api/v1/reviews/media/:mediaId
// ─────────────────────────────────────────────
export const getReviewsByMedia = async (req, res, next) => {
  try {
    const mediaId = parseInt(req.params.mediaId, 10);
    if (isNaN(mediaId)) {
      return res.status(400).json({
        error: { message: 'mediaId debe ser un número entero', code: 'INVALID_PARAM', details: null },
      });
    }

    const page  = Math.max(1, parseInt(req.query.page,  10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const skip  = (page - 1) * limit;

    const mediaCheck = await validateMediaExists(mediaId);

    const [reviews, total] = await Promise.all([
      Review.find({ mediaItemId: mediaId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Review.countDocuments({ mediaItemId: mediaId }),
    ]);

    if (mediaCheck.degraded) {
      res.set('X-Degraded-Mode', 'true');
    }

    return res.status(200).json({
      data: reviews,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
// PUT /api/v1/reviews/:id
// ─────────────────────────────────────────────
export const updateReview = async (req, res, next) => {
  try {
    const parsed = updateReviewSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(422).json({
        error: {
          message: 'Datos de entrada inválidos para actualizar',
          code:    'VALIDATION_ERROR',
          details: parsed.error.flatten().fieldErrors,
        },
      });
    }

    const review = await Review.findById(req.params.id);
    if (!review) {
      return res.status(404).json({
        error: { message: 'Reseña no encontrada', code: 'REVIEW_NOT_FOUND', details: null },
      });
    }

    // Control de Autoría (TP 2): El autor original o un ADMIN pueden modificar la reseña
    if (req.user) {
      const isAuthor = String(review.userId) === String(req.user.id);
      const isAdmin = req.user.role === 'ADMIN';

      if (!isAuthor && !isAdmin) {
        return res.status(403).json({
          error: {
            message: 'Acceso denegado: No posee permisos para modificar una reseña que no le pertenece',
            code:    'FORBIDDEN_NOT_AUTHOR',
            details: null,
          },
        });
      }
    }

    if (parsed.data.rating !== undefined) review.rating = parsed.data.rating;
    if (parsed.data.comment !== undefined) review.comment = parsed.data.comment;
    if (parsed.data.isSpoiler !== undefined) review.isSpoiler = parsed.data.isSpoiler;

    await review.save();

    ActivityLog.create({
      userId: req.user ? req.user.id : review.userId,
      action: 'UPDATE_REVIEW',
      targetId: review._id,
      metadata: { changes: parsed.data },
    }).catch((err) => console.error('[ActivityLog] Error al registrar:', err.message));

    return res.status(200).json(review);
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
// POST /api/v1/reviews/:id/replies
// ─────────────────────────────────────────────
export const addReply = async (req, res, next) => {
  try {
    const parsed = createReplySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(422).json({
        error: {
          message: 'Datos de entrada inválidos',
          code:    'VALIDATION_ERROR',
          details: parsed.error.flatten().fieldErrors,
        },
      });
    }

    const review = await Review.findById(req.params.id);
    if (!review) {
      return res.status(404).json({
        error: { message: 'Reseña no encontrada', code: 'REVIEW_NOT_FOUND', details: null },
      });
    }

    const userId = req.user ? req.user.id : (parsed.data.userId || 'anonymous-user');
    const userName = req.user ? (req.user.username || 'Usuario CineTrack') : (parsed.data.userName || 'Usuario CineTrack');

    const replyDocument = {
      userId,
      userName,
      comment: parsed.data.comment,
      createdAt: new Date(),
    };

    review.replies.push(replyDocument);
    await review.save();

    ActivityLog.create({
      userId,
      action: 'ADD_REPLY',
      targetId: review._id,
      metadata: { replyUserName: userName },
    }).catch((err) => console.error('[ActivityLog] Error al registrar:', err.message));

    return res.status(201).json(review);
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
// DELETE /api/v1/reviews/:id
// ─────────────────────────────────────────────
export const deleteReview = async (req, res, next) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) {
      return res.status(404).json({
        error: { message: 'Reseña no encontrada', code: 'REVIEW_NOT_FOUND', details: null },
      });
    }

    // Control de Autoría (TP 2): Solo el autor o ADMIN pueden borrar
    if (req.user) {
      const isAuthor = String(review.userId) === String(req.user.id);
      const isAdmin = req.user.role === 'ADMIN';

      if (!isAuthor && !isAdmin) {
        return res.status(403).json({
          error: {
            message: 'Acceso denegado: No posee permisos para eliminar una reseña ajena',
            code:    'FORBIDDEN_NOT_AUTHOR',
            details: null,
          },
        });
      }
    }

    await Review.findByIdAndDelete(req.params.id);

    ActivityLog.create({
      userId: req.user ? req.user.id : review.userId,
      action: 'DELETE_REVIEW',
      targetId: review._id,
      metadata: { mediaItemId: review.mediaItemId },
    }).catch((err) => console.error('[ActivityLog] Error al registrar:', err.message));

    return res.status(204).send();
  } catch (error) {
    next(error);
  }
};

import PersonalNote from '../models/PersonalNote.js';
import djangoService from '../services/djangoService.js';
import { validatePersonalNoteInput } from '../validators/personalNoteValidator.js';

const parseTrackingId = (raw) => {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
};

export const getPersonalNotesBatch = async (req, res, next) => {
  try {
    const rawIds = String(req.query.tracking_ids || '').trim();
    if (!rawIds) {
      return res.json({ notes: [] });
    }

    const parsedIds = rawIds
      .split(',')
      .map((s) => parseTrackingId(s.trim()))
      .filter((id) => id !== null)
      .slice(0, 100);

    if (parsedIds.length === 0) {
      return res.json({ notes: [] });
    }

    const ownership = await djangoService.fetchOwnedTrackingIds(
      parsedIds,
      req.headers.authorization
    );
    if (!ownership.authorized) {
      return res.status(ownership.status || 503).json({
        error: {
          code: ownership.unavailable ? 'AUTH_VERIFICATION_UNAVAILABLE' : 'UNAUTHORIZED',
          message: ownership.unavailable
            ? 'No se pudo verificar titularidad con el servicio principal.'
            : 'No autorizado.',
          details: null,
        },
      });
    }

    const notes = await PersonalNote.find({
      ownerUserId: req.user.id,
      trackingEntryId: { $in: ownership.allowedIds },
    }).lean();

    return res.json({ notes });
  } catch (err) {
    next(err);
  }
};

export const getPersonalNote = async (req, res, next) => {
  try {
    const trackingEntryId = parseTrackingId(req.params.trackingEntryId);
    if (!trackingEntryId) {
      return res.status(422).json({
        error: { code: 'INVALID_TRACKING_ID', message: 'trackingEntryId inválido.', details: null },
      });
    }

    const ownership = await djangoService.verifyTrackingOwnership(
      trackingEntryId,
      req.headers.authorization
    );
    if (!ownership.authorized) {
      if (ownership.unavailable) {
        return res.status(503).json({
          error: {
            code: 'AUTH_VERIFICATION_UNAVAILABLE',
            message: 'No se pudo verificar titularidad de la entrada.',
            details: null,
          },
        });
      }
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Entrada de diario no encontrada.', details: null },
      });
    }

    const note = await PersonalNote.findOne({
      ownerUserId: req.user.id,
      trackingEntryId,
    }).lean();

    return res.json({ note: note || null });
  } catch (err) {
    next(err);
  }
};

export const upsertPersonalNote = async (req, res, next) => {
  try {
    const trackingEntryId = parseTrackingId(req.params.trackingEntryId);
    if (!trackingEntryId) {
      return res.status(422).json({
        error: { code: 'INVALID_TRACKING_ID', message: 'trackingEntryId inválido.', details: null },
      });
    }

    const validation = validatePersonalNoteInput(req.body);
    if (!validation.valid) {
      return res.status(422).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Datos de nota privada inválidos.',
          details: validation.errors,
        },
      });
    }

    const ownership = await djangoService.verifyTrackingOwnership(
      trackingEntryId,
      req.headers.authorization
    );
    if (!ownership.authorized) {
      if (ownership.unavailable) {
        return res.status(503).json({
          error: {
            code: 'AUTH_VERIFICATION_UNAVAILABLE',
            message: 'No se pudo verificar titularidad de la entrada. Operación rechazada por seguridad.',
            details: null,
          },
        });
      }
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Entrada de diario no encontrada.', details: null },
      });
    }

    const note = await PersonalNote.findOneAndUpdate(
      { ownerUserId: req.user.id, trackingEntryId },
      {
        $set: {
          rating: validation.data.rating,
          comment: validation.data.comment,
        },
      },
      { new: true, upsert: true, runValidators: true }
    ).lean();

    return res.json({ note });
  } catch (err) {
    next(err);
  }
};

export const deletePersonalNote = async (req, res, next) => {
  try {
    const trackingEntryId = parseTrackingId(req.params.trackingEntryId);
    if (!trackingEntryId) {
      return res.status(422).json({
        error: { code: 'INVALID_TRACKING_ID', message: 'trackingEntryId inválido.', details: null },
      });
    }

    const ownership = await djangoService.verifyTrackingOwnership(
      trackingEntryId,
      req.headers.authorization
    );
    if (!ownership.authorized) {
      if (ownership.unavailable) {
        return res.status(503).json({
          error: {
            code: 'AUTH_VERIFICATION_UNAVAILABLE',
            message: 'No se pudo verificar titularidad de la entrada.',
            details: null,
          },
        });
      }
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Entrada de diario no encontrada.', details: null },
      });
    }

    await PersonalNote.deleteOne({ ownerUserId: req.user.id, trackingEntryId });
    return res.status(204).send();
  } catch (err) {
    next(err);
  }
};

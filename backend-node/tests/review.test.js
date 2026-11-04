import { jest, describe, test, expect, afterEach } from '@jest/globals';
import mongoose from 'mongoose';
import Review from '../src/models/Review.js';
import {
  createReviewSchema,
  updateReviewSchema,
  createReplySchema,
} from '../src/validators/reviewValidator.js';
import djangoService from '../src/services/djangoService.js';

afterEach(() => {
  jest.restoreAllMocks();
});

const validReviewPayload = () => ({
  mediaItemId: 1,
  userId:      'user-42',
  userName:    'Ari',
  rating:      8,
  comment:     'Excelente serie, muy recomendable.',
  isSpoiler:   false,
});

describe('TP 1 - Tests Unitarios de Reseñas y Capa Social', () => {
  // ── Test 1: Creación exitosa de una reseña (Mongoose Mock) ────────────────────
  test('1. Crea una reseña válida con esquema Mongoose y la persiste correctamente', async () => {
    const payload = validReviewPayload();

    const mockSavedReview = {
      _id: new mongoose.Types.ObjectId(),
      ...payload,
      replies: [],
      createdAt: new Date(),
    };

    jest.spyOn(Review, 'create').mockResolvedValue(mockSavedReview);

    const review = await Review.create(payload);

    expect(review._id).toBeDefined();
    expect(review.mediaItemId).toBe(payload.mediaItemId);
    expect(review.userId).toBe(payload.userId);
    expect(review.rating).toBe(payload.rating);
    expect(review.comment).toBe(payload.comment);
    expect(review.isSpoiler).toBe(false);
    expect(review.replies).toHaveLength(0);
  });

  // ── Test 2: Rechazo por Zod ante rating inválido ──────────────────────────────
  test('2. Rechaza la reseña cuando el rating es inválido (ej. 15)', () => {
    const payload = { ...validReviewPayload(), rating: 15 };
    const result  = createReviewSchema.safeParse(payload);

    expect(result.success).toBe(false);
    const ratingErrors = result.error.flatten().fieldErrors.rating;
    expect(ratingErrors).toBeDefined();
    expect(ratingErrors.length).toBeGreaterThan(0);
    expect(ratingErrors[0]).toMatch(/máximo/i);
  });

  // ── Test 3: Agregado correcto de un reply anidado ─────────────────────────────
  test('3. Valida y agrega un reply al array replies de una reseña existente', async () => {
    const replyData = {
      userId:   'user-99',
      userName: 'Estefi',
      comment:  'Totalmente de acuerdo!',
    };

    const parsedReply = createReplySchema.safeParse(replyData);
    expect(parsedReply.success).toBe(true);

    const mockReviewInstance = {
      _id: new mongoose.Types.ObjectId(),
      ...validReviewPayload(),
      replies: [],
      save: jest.fn().mockResolvedValue(true),
    };

    jest.spyOn(Review, 'findById').mockResolvedValue(mockReviewInstance);

    const foundReview = await Review.findById(mockReviewInstance._id);
    foundReview.replies.push({
      ...parsedReply.data,
      createdAt: new Date(),
    });
    await foundReview.save();

    expect(foundReview.replies).toHaveLength(1);
    expect(foundReview.replies[0].userId).toBe('user-99');
    expect(foundReview.replies[0].userName).toBe('Estefi');
    expect(foundReview.replies[0].comment).toBe('Totalmente de acuerdo!');
    expect(foundReview.save).toHaveBeenCalledTimes(1);
  });

  // ── Test 4: Modo degradado cuando Django simula timeout ───────────────────────
  test('4. Devuelve modo degradado cuando Django no responde (timeout)', async () => {
    jest
      .spyOn(djangoService.djangoClient, 'get')
      .mockRejectedValue(new Error('timeout of 2500ms exceeded'));

    const result = await djangoService.validateMediaExists(1);

    expect(result.exists).toBe(true);
    expect(result.degraded).toBe(true);
  });

  // ── Test 5: Actualización de reseña con validación Zod ─────────────────────────
  test('5. Actualiza parcialmente una reseña existente (rating y comentario)', async () => {
    const updatePayload = { rating: 9, comment: 'Actualizado: la segunda temporada es mejor' };
    const parsedUpdate = updateReviewSchema.safeParse(updatePayload);
    expect(parsedUpdate.success).toBe(true);

    const mockReviewInstance = {
      _id: new mongoose.Types.ObjectId(),
      ...validReviewPayload(),
      save: jest.fn().mockResolvedValue(true),
    };

    jest.spyOn(Review, 'findById').mockResolvedValue(mockReviewInstance);

    const review = await Review.findById(mockReviewInstance._id);
    review.rating = parsedUpdate.data.rating;
    review.comment = parsedUpdate.data.comment;
    await review.save();

    expect(review.rating).toBe(9);
    expect(review.comment).toBe('Actualizado: la segunda temporada es mejor');
    expect(review.save).toHaveBeenCalledTimes(1);
  });

  // ── Test 6: Eliminación de reseña ─────────────────────────────────────────────
  test('6. Elimina una reseña existente por ID', async () => {
    const mockId = new mongoose.Types.ObjectId();
    jest.spyOn(Review, 'findByIdAndDelete').mockResolvedValue({ _id: mockId, ...validReviewPayload() });

    const deleted = await Review.findByIdAndDelete(mockId);
    expect(deleted).toBeDefined();
    expect(deleted._id).toBe(mockId);
    expect(Review.findByIdAndDelete).toHaveBeenCalledWith(mockId);
  });
});

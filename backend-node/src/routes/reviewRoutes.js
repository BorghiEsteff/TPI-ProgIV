import { Router } from 'express';
import {
  createReview,
  getReviewsByMedia,
  updateReview,
  addReply,
  deleteReview,
} from '../controllers/reviewController.js';

const router = Router();

// POST   /api/v1/reviews/                 → Crear reseña
router.post('/', createReview);

// GET    /api/v1/reviews/media/:mediaId   → Listar reseñas paginadas por obra
router.get('/media/:mediaId', getReviewsByMedia);

// PUT    /api/v1/reviews/:id              → Actualizar reseña (CRUD completo)
router.put('/:id', updateReview);

// POST   /api/v1/reviews/:id/replies      → Agregar reply a una reseña
router.post('/:id/replies', addReply);

// DELETE /api/v1/reviews/:id              → Eliminar reseña
router.delete('/:id', deleteReview);

export default router;

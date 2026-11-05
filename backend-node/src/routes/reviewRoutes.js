import { Router } from 'express';
import {
  createReview,
  getReviewsByMedia,
  updateReview,
  addReply,
  deleteReview,
} from '../controllers/reviewController.js';
import { authenticateJWT, authorizeRoles } from '../middlewares/authMiddleware.js';

const router = Router();

// GET    /api/v1/reviews/media/:mediaId   → Listar reseñas paginadas (lectura pública)
router.get('/media/:mediaId', getReviewsByMedia);

// Rutas protegidas con autenticación JWT de Django SimpleJWT:
// POST   /api/v1/reviews/                 → Crear reseña (requiere autenticación)
router.post('/', authenticateJWT, createReview);

// PUT    /api/v1/reviews/:id              → Actualizar reseña (solo autor o ADMIN)
router.put('/:id', authenticateJWT, updateReview);

// POST   /api/v1/reviews/:id/replies      → Responder reseña (requiere autenticación)
router.post('/:id/replies', authenticateJWT, addReply);

// DELETE /api/v1/reviews/:id              → Eliminar reseña (solo autor o ADMIN)
router.delete('/:id', authenticateJWT, deleteReview);

export default router;

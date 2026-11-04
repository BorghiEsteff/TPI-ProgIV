import { Router } from 'express';
import {
  createReview,
  getReviewsByMedia,
  updateReview,
  addReply,
  deleteReview,
} from '../controllers/reviewController.js';

const router = Router();

/**
 * Rutas de la API REST de Reseñas y Capa Social - CineTrack (TP 1)
 *
 * ⚠️ NOTA DE SEGURIDAD / ARQUITECTURA (TRANSICIÓN TP 1 -> TP 2):
 * De acuerdo al plan de entregas, la autenticación criptográfica centralizada
 * basada en JWT compartido con Django (SimpleJWT) se implementará en la etapa TP 2.
 * Actualmente, los endpoints de mutación (POST, PUT, DELETE) confían en la
 * identidad transmitida en el payload validado con Zod. En el TP 2 se incorporará
 * el middleware de autenticación (authMiddleware) que validará el Bearer token
 * y verificará que el userId del token coincida con el autor de la reseña o respuesta,
 * impidiendo modificaciones no autorizadas en entornos de producción.
 */

// POST   /api/v1/reviews/                 → Crear reseña (valida con Zod y catálogo Django)
router.post('/', createReview);

// GET    /api/v1/reviews/media/:mediaId   → Listar reseñas paginadas por obra (lectura pública)
router.get('/media/:mediaId', getReviewsByMedia);

// PUT    /api/v1/reviews/:id              → Actualizar reseña (protegida lógicamente, auth JWT en TP 2)
router.put('/:id', updateReview);

// POST   /api/v1/reviews/:id/replies      → Agregar respuesta a una reseña
router.post('/:id/replies', addReply);

// DELETE /api/v1/reviews/:id              → Eliminar reseña (protegida lógicamente, auth JWT en TP 2)
router.delete('/:id', deleteReview);

export default router;

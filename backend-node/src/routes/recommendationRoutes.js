import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticateJWT } from '../middlewares/authMiddleware.js';
import { getRecommendations } from '../controllers/recommendationController.js';

export const createRecommendationRateLimiter = ({
  windowMs = 60 * 1000,
  max = parseInt(process.env.RECOMMEND_RATE_LIMIT_PER_MIN, 10) || 5,
  skipInTest = true,
} = {}) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => (req.user?.id ? `user:${req.user.id}` : req.ip),
    skip: () => skipInTest && process.env.NODE_ENV === 'test',
    handler: (_req, res) => {
      res.status(429).json({
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Demasiadas consultas al asistente en poco tiempo. Espera unos segundos antes de intentar nuevamente.',
          details: null,
        },
      });
    },
  });

const router = Router();

router.use(authenticateJWT);
router.use(createRecommendationRateLimiter());
router.post('/', getRecommendations);

export default router;

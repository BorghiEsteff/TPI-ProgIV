import { Router } from 'express';
import { authenticateJWT } from '../middlewares/authMiddleware.js';
import { getRecommendations } from '../controllers/recommendationController.js';

const router = Router();

router.use(authenticateJWT);
router.post('/', getRecommendations);

export default router;

import { Router } from 'express';
import { authenticateJWT } from '../middlewares/authMiddleware.js';
import {
  getPersonalNotesBatch,
  getPersonalNote,
  upsertPersonalNote,
  deletePersonalNote,
} from '../controllers/personalNoteController.js';

const router = Router();

router.use(authenticateJWT);

router.get('/', getPersonalNotesBatch);
router.get('/:trackingEntryId', getPersonalNote);
router.put('/:trackingEntryId', upsertPersonalNote);
router.delete('/:trackingEntryId', deletePersonalNote);

export default router;

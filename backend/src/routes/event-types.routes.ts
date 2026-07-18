import { Router } from 'express';
import { getEventTypes, createEventType, updateEventType, deleteEventType } from '../controllers/event-types.controller';
import { requireAdmin } from '../middleware/auth';

const router = Router();

router.get('/', getEventTypes);
router.post('/', requireAdmin, createEventType);
router.put('/:id', requireAdmin, updateEventType);
router.delete('/:id', requireAdmin, deleteEventType);

export default router;

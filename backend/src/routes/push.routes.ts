import { Router } from 'express';
import { getVapidKey, subscribe, unsubscribe, getStatus, sendTest } from '../controllers/push.controller';
import { requireAdmin } from '../middleware/auth';

const router = Router();

router.get('/vapid-key', getVapidKey);
router.get('/status', requireAdmin, getStatus);
router.post('/subscribe', requireAdmin, subscribe);
router.post('/unsubscribe', requireAdmin, unsubscribe);
router.post('/test', requireAdmin, sendTest);

export default router;

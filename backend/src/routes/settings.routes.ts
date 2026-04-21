import { Router } from 'express';
import { getSettings, updateSettings } from '../controllers/settings.controller';
import { requireAdmin } from '../middleware/auth';

const router = Router();

router.get('/', getSettings);
router.put('/', requireAdmin, updateSettings);

export default router;

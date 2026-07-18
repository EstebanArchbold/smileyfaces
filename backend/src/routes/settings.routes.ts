import { Router } from 'express';
import { getSettings, updateSettings, uploadHeroImage } from '../controllers/settings.controller';
import { requireAdmin } from '../middleware/auth';
import { upload } from '../middleware/upload';

const router = Router();

router.get('/', getSettings);
router.put('/', requireAdmin, updateSettings);
router.post('/hero-image', requireAdmin, upload.single('image'), uploadHeroImage);

export default router;

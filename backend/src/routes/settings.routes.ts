import { Router } from 'express';
import { getSettings, updateSettings, uploadHeroImage, uploadAboutImage } from '../controllers/settings.controller';
import { requireAdmin } from '../middleware/auth';
import { upload, compressUpload } from '../middleware/upload';

const router = Router();

router.get('/', getSettings);
router.put('/', requireAdmin, updateSettings);
router.post('/hero-image', requireAdmin, upload.single('image'), compressUpload, uploadHeroImage);
router.post('/about-image', requireAdmin, upload.single('image'), compressUpload, uploadAboutImage);

export default router;

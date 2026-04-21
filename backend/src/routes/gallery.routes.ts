import { Router } from 'express';
import { getGalleryItems, addGalleryItem, deleteGalleryItem, updateGalleryOrder } from '../controllers/gallery.controller';
import { requireAdmin } from '../middleware/auth';
import { upload } from '../middleware/upload';

const router = Router();

router.get('/', getGalleryItems);
router.post('/', requireAdmin, upload.single('image'), addGalleryItem);
router.put('/order', requireAdmin, updateGalleryOrder);
router.delete('/:id', requireAdmin, deleteGalleryItem);

export default router;

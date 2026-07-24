import { Router } from 'express';
import { getGalleryItems, addGalleryItem, updateGalleryItem, deleteGalleryItem, updateGalleryOrder } from '../controllers/gallery.controller';
import { requireAdmin } from '../middleware/auth';
import { upload } from '../middleware/upload';

const router = Router();

router.get('/', getGalleryItems);
router.post('/', requireAdmin, upload.single('image'), addGalleryItem);
// '/order' must stay above '/:id' so it isn't swallowed by the param route
router.put('/order', requireAdmin, updateGalleryOrder);
router.put('/:id', requireAdmin, upload.single('image'), updateGalleryItem);
router.delete('/:id', requireAdmin, deleteGalleryItem);

export default router;

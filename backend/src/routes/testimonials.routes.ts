import { Router } from 'express';
import {
  getTestimonials,
  getAllTestimonials,
  createTestimonial,
  submitTestimonial,
  updateTestimonial,
  updateTestimonialStatus,
  deleteTestimonial,
} from '../controllers/testimonials.controller';
import { requireAdmin } from '../middleware/auth';
import { upload, compressUploads } from '../middleware/upload';

const router = Router();

// Up to 5 photos per review — enough to show off an event without letting a
// single submission fill the disk.
const MAX_REVIEW_IMAGES = 5;

router.get('/', getTestimonials);
// '/all' and '/submit' must stay above '/:id' so they aren't swallowed by it
router.get('/all', requireAdmin, getAllTestimonials);
router.post('/submit', upload.array('images', MAX_REVIEW_IMAGES), compressUploads, submitTestimonial);
router.post('/', requireAdmin, createTestimonial);
router.patch('/:id/status', requireAdmin, updateTestimonialStatus);
router.put('/:id', requireAdmin, updateTestimonial);
router.delete('/:id', requireAdmin, deleteTestimonial);

export default router;

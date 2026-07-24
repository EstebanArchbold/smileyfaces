import { Router } from 'express';
import { getTestimonials, createTestimonial, updateTestimonial, deleteTestimonial } from '../controllers/testimonials.controller';
import { requireAdmin } from '../middleware/auth';

const router = Router();

router.get('/', getTestimonials);
router.post('/', requireAdmin, createTestimonial);
router.put('/:id', requireAdmin, updateTestimonial);
router.delete('/:id', requireAdmin, deleteTestimonial);

export default router;

import { Router } from 'express';
import { createBooking, getBookings, updateBooking, getBookingStats } from '../controllers/bookings.controller';
import { requireAdmin } from '../middleware/auth';

const router = Router();

router.post('/', createBooking);
router.get('/', requireAdmin, getBookings);
router.get('/stats', requireAdmin, getBookingStats);
router.put('/:id', requireAdmin, updateBooking);

export default router;

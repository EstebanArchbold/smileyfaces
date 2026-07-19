import { Router } from 'express';
import { createBooking, getBookings, updateBooking, getBookingStats, submitConfirmation, getAvailability, createConfirmedBooking } from '../controllers/bookings.controller';
import { requireAdmin } from '../middleware/auth';

const router = Router();

router.post('/', createBooking);
router.post('/confirmed', createConfirmedBooking);
router.get('/', requireAdmin, getBookings);
router.get('/stats', requireAdmin, getBookingStats);
router.get('/availability', getAvailability);
router.put('/:id/confirmation', submitConfirmation);
router.put('/:id', requireAdmin, updateBooking);

export default router;

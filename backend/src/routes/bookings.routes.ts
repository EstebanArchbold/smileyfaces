import { Router } from 'express';
import { createBooking, getBookings, updateBooking, updateBookingBilling, getBookingStats, submitConfirmation, getAvailability, createConfirmedBooking } from '../controllers/bookings.controller';
import { requireAdmin } from '../middleware/auth';

const router = Router();

router.post('/', createBooking);
router.post('/confirmed', createConfirmedBooking);
router.get('/', requireAdmin, getBookings);
router.get('/stats', requireAdmin, getBookingStats);
router.get('/availability', getAvailability);
router.put('/:id/confirmation', submitConfirmation);
router.patch('/:id/billing', requireAdmin, updateBookingBilling);
router.put('/:id', requireAdmin, updateBooking);

export default router;

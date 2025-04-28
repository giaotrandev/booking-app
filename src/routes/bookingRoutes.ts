import express from 'express';
import { createBooking, getUserBookings, updateBookingStatus } from '#controllers/bookingController';

const router = express.Router();

router.post('/', createBooking);
router.get('/', getUserBookings);
router.put('/:id', updateBookingStatus);

export default router;

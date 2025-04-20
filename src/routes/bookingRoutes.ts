import express from 'express';
import { createBooking, getUserBookings, updateBookingStatus } from '../controllers/bookingController';
import { protect, admin } from '../middleware/authMiddleware';

const router = express.Router();

router.post('/', protect, createBooking);
router.get('/', protect, getUserBookings);
router.put('/:id', protect, updateBookingStatus);

export default router;

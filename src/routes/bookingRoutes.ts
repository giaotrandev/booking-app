import express from 'express';
import * as bookingController from '../controllers/bookingController';
import { authenticateToken } from '#middlewares/authMiddleware';
import { validatePermissions } from '#middlewares/permissionMiddleware';

const router = express.Router();

// Public webhook endpoint
router.post('/webhook/payment', bookingController.handlePaymentWebhook);

// Authenticated user routes
router.post('/calculate', authenticateToken, bookingController.calculateBookingWithVoucher);
router.post('/', authenticateToken, bookingController.createBooking);
router.get('/my-bookings', authenticateToken, bookingController.getUserBookings);
router.get('/:id', authenticateToken, bookingController.getBookingDetails);
router.post('/:id/cancel', authenticateToken, bookingController.cancelBooking);
router.get('/:id/history', authenticateToken, bookingController.getBookingHistory);
router.post('/:id/resend-payment', authenticateToken, bookingController.resendPaymentQR);

// Admin routes
router.get('/', authenticateToken, bookingController.getAllBookings);
router.get('/stats', authenticateToken, bookingController.getBookingStats);
router.post('/:id/confirm', authenticateToken, bookingController.confirmBookingManually);
router.get('/export/data', authenticateToken, bookingController.exportBookingData);

export default router;
